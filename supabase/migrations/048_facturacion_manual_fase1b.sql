-- =============================================================================
-- MiSillón — Migración 048: Control de facturación manual (Fase 1b)
-- Aplicar después de 047_multi_rubro_belleza_fase1.sql
-- Aplicar: Supabase Studio → SQL Editor → pegar y Run
-- -----------------------------------------------------------------------------
-- DISEÑO YA DECIDIDO (no reabrir):
--   - Corte fijo el día 1 de cada mes para todos los negocios, 3 días de gracia
--     (recién se suspende el día 4 si no se confirmó pago).
--   - Negocios nuevos exentos del corte más próximo: su primer corte real es
--     el 1° del mes SIGUIENTE al de su registro.
--   - Suspendida: se bloquea panel Y página pública de reservas (/:slug).
--   - Super_admin confirma pago individual o bulk.
--
-- Verificado antes de escribir esta migración:
--   - Estilo de RPCs de purga (045: purgar_reservas_canceladas/confirmadas):
--     SECURITY DEFINER, sin GRANT a anon/authenticated, solo service_role,
--     invocadas desde una Edge Function con service_role (igual patrón acá
--     para evaluar_facturacion()).
--   - Helper is_super_admin() (002) — mismo guard que admin_stats/admin_editar_barberia.
--   - Políticas públicas actuales de barberias/peluqueros/servicios/disponibilidad/
--     politicas_peluquero (002) filtran por estado='aprobada' / activo=true —
--     se AGREGA la condición de facturación, no se reemplaza el filtro existente.
--   - RPCs públicas que dependen de que el negocio esté operativo:
--     get_cuentas_for_peluquero (005), get_ocupados_publico (040),
--     crear_reserva_publica (042 es la versión vigente). Se les agrega el
--     mismo guard. get_reserva_by_token/cancelar_reserva (002/045) NO se tocan
--     a propósito: gestionan una reserva YA creada por token; un negocio
--     suspendido no debería impedirle a un cliente cancelar su propia cita.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columnas de facturación en barberias
-- ---------------------------------------------------------------------------
ALTER TABLE public.barberias
    ADD COLUMN IF NOT EXISTS estado_facturacion text NOT NULL DEFAULT 'al_dia'
        CHECK (estado_facturacion IN ('al_dia','suspendida')),
    ADD COLUMN IF NOT EXISTS pago_confirmado    boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS proximo_corte      date NOT NULL DEFAULT (
        date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') + interval '1 month'
    )::date;

-- Backfill explícito (no confiar en que el DEFAULT de ALTER TABLE se recalculó
-- fila por fila correctamente): negocios ya existentes quedan al_dia/pagados,
-- con proximo_corte = 1° del mes siguiente al momento en que corre esta
-- migración, para entrar al ciclo normal desde ya. No se suspende a nadie
-- retroactivamente.
UPDATE public.barberias
SET
    proximo_corte      = (date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') + interval '1 month')::date,
    pago_confirmado    = true,
    estado_facturacion = 'al_dia'
WHERE proximo_corte IS NULL
   OR proximo_corte = (date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') + interval '1 month')::date;

CREATE INDEX IF NOT EXISTS idx_barberias_estado_facturacion ON public.barberias(estado_facturacion);
CREATE INDEX IF NOT EXISTS idx_barberias_proximo_corte       ON public.barberias(proximo_corte);

-- ---------------------------------------------------------------------------
-- 2. Función evaluar_facturacion() — cron diario, SECURITY DEFINER,
--    sin GRANT a anon/authenticated (solo service_role, invocada desde Edge
--    Function, mismo patrón que purgar_reservas_*() de la migración 045).
--
--    Idempotente por día:
--      - Si hoy es 1° del mes: barberías con proximo_corte <= hoy Y
--        pago_confirmado = true pasan pago_confirmado = false (arranca la
--        cuenta de gracia). No cambia estado_facturacion todavía.
--      - Si hoy >= día 4 del mes: barberías con pago_confirmado = false Y
--        estado_facturacion = 'al_dia' pasan a 'suspendida'.
--
--    Fix Héctor 2026-07-16 (bug crítico QA): el filtro del paso 1 pasó de
--    `proximo_corte = v_hoy` (igualdad exacta) a `proximo_corte <= v_hoy`.
--    Motivo: admin_confirmar_pago()/admin_confirmar_pago_bulk() ahora
--    garantizan (ver fix abajo) que el proximo_corte que dejan siempre es
--    >= al 1° del mes siguiente a HOY, así que en el camino normal nunca
--    queda una fecha pasada colgando. Pero el `<=` es la defensa que además
--    cubre el caso en que el cron no corrió exactamente el día 1 (ej. Edge
--    Function caída, outage) — con `=` exacto ese corte se perdía para
--    siempre porque ningún día futuro vuelve a coincidir con esa fecha ya
--    pasada. La condición `AND pago_confirmado = true` sigue intacta: una
--    barbería que ya pasó a pago_confirmado = false (en gracia o ya
--    suspendida) no vuelve a "reiniciar" su gracia en corridas subsiguientes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluar_facturacion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hoy           date := (now() AT TIME ZONE 'America/Santo_Domingo')::date;
    v_dia_del_mes   int  := EXTRACT(DAY FROM v_hoy)::int;
    v_iniciadas     int  := 0;
    v_suspendidas   int  := 0;
    v_role          text := coalesce(
        current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
BEGIN
    -- Guard interno (defensa en profundidad). El GRANT/REVOKE por sí solo no
    -- alcanza: en Supabase el privilegio EXECUTE llega a anon/authenticated vía
    -- el grant DEFAULT a PUBLIC (comportamiento de supabase_admin ya documentado
    -- en este proyecto — REVOKE FROM anon/authenticated es un no-op contra el
    -- grant a PUBLIC). Esta función solo debe correr desde la Edge Function con
    -- service_role, o directo en SQL Editor / cron como postgres (sin claims JWT).
    -- Se rechaza explícitamente a 'anon' y 'authenticated'.
    IF v_role NOT IN ('', 'service_role') THEN
        RAISE EXCEPTION 'evaluar_facturacion solo puede invocarse con service_role.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Paso 1: si hoy es el corte (día 1), arrancar cuenta de gracia para las
    -- barberías cuyo próximo corte ya llegó (<=, no =: tolera que el cron no
    -- haya corrido exactamente el día 1 de algún mes anterior). El AND
    -- pago_confirmado = true evita re-disparar sobre negocios que ya están
    -- en gracia o suspendidos.
    IF v_dia_del_mes = 1 THEN
        WITH iniciadas AS (
            UPDATE public.barberias
            SET pago_confirmado = false
            WHERE proximo_corte <= v_hoy
              AND pago_confirmado = true
            RETURNING id
        )
        SELECT COUNT(*) INTO v_iniciadas FROM iniciadas;
    END IF;

    -- Paso 2: pasados los 3 días de gracia (día 4 en adelante), suspender a
    -- quienes no confirmaron pago.
    IF v_dia_del_mes >= 4 THEN
        WITH suspendidas AS (
            UPDATE public.barberias
            SET estado_facturacion = 'suspendida'
            WHERE pago_confirmado = false
              AND estado_facturacion = 'al_dia'
            RETURNING id
        )
        SELECT COUNT(*) INTO v_suspendidas FROM suspendidas;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'fecha', v_hoy,
        'cuentas_iniciadas', v_iniciadas,
        'suspendidas', v_suspendidas
    );
END;
$$;

-- REVOKE FROM PUBLIC (no FROM anon/authenticated): el grant EXECUTE por default
-- va a PUBLIC al crear la función; revocarlo solo de anon/authenticated no quita
-- el grant a PUBLIC y ambos roles conservarían EXECUTE. FROM PUBLIC sí lo saca.
-- (El guard interno de arriba es la protección real; esto es la primera capa.)
REVOKE EXECUTE ON FUNCTION public.evaluar_facturacion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.evaluar_facturacion() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.evaluar_facturacion() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. RPC admin_confirmar_pago(p_barberia_id uuid) — super_admin
--    Avanza proximo_corte al 1° del mes SIGUIENTE al proximo_corte actual
--    (no al mes siguiente a "hoy"), para no perder ciclos si se confirma tarde.
--
--    Idempotencia anti-doble-click (decisión Héctor 2026-07-16): si la
--    barbería YA tenía pago_confirmado = true para este ciclo, la función es
--    un no-op seguro sobre proximo_corte — no adelanta el ciclo dos veces por
--    un doble-click o por individual+bulk combinados. Solo avanza la fecha
--    cuando el estado previo era pago_confirmado = false (primera confirmación
--    del ciclo pendiente).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirmar_pago(p_barberia_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row              public.barberias%ROWTYPE;
    v_estaba_pendiente boolean;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Solo el super_admin puede confirmar pagos.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_row FROM public.barberias WHERE id = p_barberia_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barbería no encontrada: %', p_barberia_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Solo el ciclo pendiente (pago_confirmado = false) dispara el avance de
    -- proximo_corte. Si ya estaba true, este UPDATE deja la fecha intacta.
    v_estaba_pendiente := (v_row.pago_confirmado = false);

    -- Fix Héctor 2026-07-16 (bug crítico QA): calcular el corte SOLO desde el
    -- valor viejo de proximo_corte deja fechas pasadas cuando se confirma con
    -- atraso (ej. confirmado 2+ meses tarde) — esa barbería no vuelve a
    -- coincidir nunca con "proximo_corte <= hoy" en evaluar_facturacion() y
    -- queda al_dia para siempre. GREATEST garantiza que el nuevo corte nunca
    -- quede en el pasado respecto a HOY.
    UPDATE public.barberias
    SET
        pago_confirmado    = true,
        estado_facturacion = 'al_dia',
        proximo_corte      = CASE
            WHEN v_estaba_pendiente
            THEN GREATEST(
                (date_trunc('month', proximo_corte) + interval '1 month')::date,
                (date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') + interval '1 month')::date
            )
            ELSE proximo_corte
        END
    WHERE id = p_barberia_id
    RETURNING * INTO v_row;

    RETURN row_to_json(v_row)::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_confirmar_pago(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_confirmar_pago(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC admin_confirmar_pago_bulk() — super_admin
--
--    Fix Héctor 2026-07-16 (hallazgo de security-analyst): el bulk YA NO
--    afecta a todas las barberías sin filtro. Solo toca negocios en gracia
--    que aún no confirmaron (pago_confirmado = false) O ya suspendidos
--    (estado_facturacion = 'suspendida') — ambos casos cubiertos aunque en la
--    práctica 'suspendida' siempre implica pago_confirmado = false (ver
--    evaluar_facturacion() arriba). Las barberías ya al_dia/pago_confirmado
--    no se tocan: no se les regala un mes.
--
--    Misma idempotencia anti-doble-click que admin_confirmar_pago(): el CASE
--    en el SET lee pago_confirmado de la fila ANTES del UPDATE (Postgres
--    evalúa todas las expresiones del SET contra la fila vieja), así que solo
--    avanza proximo_corte para las filas que de verdad estaban pendientes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirmar_pago_bulk()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Solo el super_admin puede confirmar pagos.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Mismo fix de GREATEST que admin_confirmar_pago() — ver comentario ahí.
    WITH actualizadas AS (
        UPDATE public.barberias
        SET
            pago_confirmado    = true,
            estado_facturacion = 'al_dia',
            proximo_corte      = CASE
                WHEN pago_confirmado = false
                THEN GREATEST(
                    (date_trunc('month', proximo_corte) + interval '1 month')::date,
                    (date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') + interval '1 month')::date
                )
                ELSE proximo_corte
            END
        WHERE pago_confirmado = false
           OR estado_facturacion = 'suspendida'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM actualizadas;

    RETURN jsonb_build_object('ok', true, 'actualizadas', v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_confirmar_pago_bulk() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_confirmar_pago_bulk() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS pública: agregar estado_facturacion = 'al_dia' sin romper el filtro
--    existente de estado='aprobada' (se suma con AND, no se reemplaza).
--
--    Fix Héctor 2026-07-16 (bug crítico encontrado al revisar el hallazgo de
--    QA sobre el peluquero de equipo): las 5 políticas "_publico" de abajo
--    NO tenían cláusula `TO`, lo que en Postgres significa que aplican a
--    PUBLIC (anon Y authenticated). Antes de esta migración eso era inocuo
--    porque el panel de dueño/peluquero SOLO dependía de ellas para leer SUS
--    PROPIOS datos, y su propia barbería casi siempre estaba 'aprobada'. Pero
--    al sumarles `estado_facturacion = 'al_dia'`, un negocio suspendido queda
--    invisible TAMBIÉN para su propio dueño/peluquero autenticado — ni
--    useAuth() puede leer `barberia.estado_facturacion` para saber que está
--    suspendido, ni el panel puede cargar sus propios servicios/disponibilidad/
--    políticas. El bloqueo se vuelve indetectable en vez de una pantalla clara.
--
--    Fix: estas 5 políticas pasan a `TO anon` explícito (solo gobiernan el
--    acceso público real: páginas /:slug vía supabasePublic). Se agregan
--    políticas SELECT nuevas para `authenticated` que permiten a cada dueño/
--    peluquero leer SUS PROPIOS datos sin el gate de facturación — así el
--    panel puede cargar y mostrar la pantalla de "suspendido" en vez de
--    romperse en silencio.
-- ---------------------------------------------------------------------------

-- barberias_select_publico (002) — ahora solo anon
DROP POLICY IF EXISTS "barberias_select_publico" ON public.barberias;
CREATE POLICY "barberias_select_publico"
    ON public.barberias FOR SELECT
    TO anon
    USING (estado = 'aprobada' AND estado_facturacion = 'al_dia');

-- Nuevo: dueño lee su propia barbería sin importar estado de facturación
DROP POLICY IF EXISTS "barberias_select_dueno" ON public.barberias;
CREATE POLICY "barberias_select_dueno"
    ON public.barberias FOR SELECT
    TO authenticated
    USING (dueno_id = auth.uid());

-- Nuevo: peluquero (de equipo o independiente) lee la barbería a la que pertenece
DROP POLICY IF EXISTS "barberias_select_propio_peluquero" ON public.barberias;
CREATE POLICY "barberias_select_propio_peluquero"
    ON public.barberias FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.barberia_id = barberias.id
              AND p.user_id = auth.uid()
        )
    );

-- peluqueros_select_publico (002) — ahora solo anon
DROP POLICY IF EXISTS "peluqueros_select_publico" ON public.peluqueros;
CREATE POLICY "peluqueros_select_publico"
    ON public.peluqueros FOR SELECT
    TO anon
    USING (
        activo = true
        AND EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.estado = 'aprobada'
              AND b.estado_facturacion = 'al_dia'
        )
    );

-- Nuevo: dueño lee TODOS los peluqueros de su propia barbería (GestionPeluqueros.jsx)
-- sin importar estado de facturación. peluqueros_select_self (042) ya cubre que
-- cada peluquero se lea a sí mismo, sin cambios.
DROP POLICY IF EXISTS "peluqueros_select_dueno" ON public.peluqueros;
CREATE POLICY "peluqueros_select_dueno"
    ON public.peluqueros FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = peluqueros.barberia_id
              AND b.dueno_id = auth.uid()
        )
    );

-- servicios_select_publico (002) — ahora solo anon
DROP POLICY IF EXISTS "servicios_select_publico" ON public.servicios;
CREATE POLICY "servicios_select_publico"
    ON public.servicios FOR SELECT
    TO anon
    USING (
        activo = true
        AND EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
              AND b.estado_facturacion = 'al_dia'
        )
    );

-- Nuevo: el propio peluquero (dueño de la fila) o el dueño de su barbería leen
-- sus servicios sin importar estado de facturación (mismo criterio de
-- ownership que servicios_update_peluquero, más el dueño vía join).
DROP POLICY IF EXISTS "servicios_select_propio" ON public.servicios;
CREATE POLICY "servicios_select_propio"
    ON public.servicios FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND b.dueno_id = auth.uid()
        )
    );

-- disponibilidad_select_publico (002) — ahora solo anon
DROP POLICY IF EXISTS "disponibilidad_select_publico" ON public.disponibilidad;
CREATE POLICY "disponibilidad_select_publico"
    ON public.disponibilidad FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
              AND b.estado_facturacion = 'al_dia'
        )
    );

-- Nuevo: mismo criterio que servicios_select_propio
DROP POLICY IF EXISTS "disponibilidad_select_propio" ON public.disponibilidad;
CREATE POLICY "disponibilidad_select_propio"
    ON public.disponibilidad FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND b.dueno_id = auth.uid()
        )
    );

-- politicas_select_publico (002) — ahora solo anon
DROP POLICY IF EXISTS "politicas_select_publico" ON public.politicas_peluquero;
CREATE POLICY "politicas_select_publico"
    ON public.politicas_peluquero FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
              AND b.estado_facturacion = 'al_dia'
        )
    );

-- Nuevo: mismo criterio que servicios_select_propio
DROP POLICY IF EXISTS "politicas_select_propio" ON public.politicas_peluquero;
CREATE POLICY "politicas_select_propio"
    ON public.politicas_peluquero FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND b.dueno_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 6. RPCs públicas SECURITY DEFINER: agregar el mismo guard
-- ---------------------------------------------------------------------------

-- get_cuentas_for_peluquero (005)
CREATE OR REPLACE FUNCTION public.get_cuentas_for_peluquero(p_peluquero_id uuid)
RETURNS TABLE (
    id            uuid,
    banco         text,
    numero_cuenta text,
    tipo          text,
    titular       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        JOIN public.barberias b ON b.id = p.barberia_id
        WHERE p.id = p_peluquero_id
          AND p.activo = true
          AND b.estado = 'aprobada'
          AND b.estado_facturacion = 'al_dia'
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT cb.id, cb.banco, cb.numero_cuenta, cb.tipo, cb.titular
    FROM public.cuentas_bancarias_peluquero cb
    WHERE cb.peluquero_id = p_peluquero_id
      AND cb.activa = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cuentas_for_peluquero(uuid) TO anon, authenticated;

-- get_ocupados_publico (040) — no validaba ownership/estado del negocio en
-- absoluto (gap preexistente, fuera del alcance original de 040). Se agrega
-- acá el guard de facturación aprovechando el CREATE OR REPLACE, sin cambiar
-- su firma ni su contrato de retorno.
CREATE OR REPLACE FUNCTION public.get_ocupados_publico(
  p_peluquero_id uuid,
  p_desde timestamp with time zone
)
RETURNS TABLE (fecha_hora timestamp with time zone, duracion_minutos integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $function$
  SELECT r.fecha_hora, r.duracion_minutos
  FROM reservas r
  WHERE r.peluquero_id = p_peluquero_id
    AND r.estado <> 'cancelada'
    AND r.fecha_hora >= p_desde
    AND EXISTS (
      SELECT 1 FROM public.peluqueros p
      JOIN public.barberias b ON b.id = p.barberia_id
      WHERE p.id = r.peluquero_id
        AND b.estado = 'aprobada'
        AND b.estado_facturacion = 'al_dia'
    );
$function$;

GRANT EXECUTE ON FUNCTION public.get_ocupados_publico(uuid, timestamp with time zone) TO anon, authenticated;

-- crear_reserva_publica (versión vigente: 042) — se agrega el guard de
-- facturación al check existente de peluquero activo + barbería aprobada.
CREATE OR REPLACE FUNCTION public.crear_reserva_publica(
  p_barberia_id uuid,
  p_peluquero_id uuid,
  p_servicio_id uuid,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_cliente_email text,
  p_cliente_direccion text,
  p_es_domicilio boolean,
  p_fecha_hora timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id    uuid;
  v_token uuid;
  v_duracion int;
  v_dia_semana int;
  v_hora_local time;
BEGIN
  -- Guard (044): límites de longitud de los inputs del cliente.
  IF char_length(coalesce(p_cliente_nombre, ''))    > 100 THEN
    RAISE EXCEPTION 'El nombre es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_telefono, ''))  > 20 THEN
    RAISE EXCEPTION 'El teléfono es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_email, ''))     > 150 THEN
    RAISE EXCEPTION 'El email es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_direccion, '')) > 300 THEN
    RAISE EXCEPTION 'La dirección es demasiado larga.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Validar que el peluquero pertenece a la barbería, está activo, aprobada
  -- y AL DÍA con su facturación (048).
  IF NOT EXISTS (
    SELECT 1 FROM peluqueros p
    JOIN barberias b ON b.id = p.barberia_id
    WHERE p.id          = p_peluquero_id
      AND p.barberia_id = p_barberia_id
      AND p.activo      = true
      AND b.estado      = 'aprobada'
      AND b.estado_facturacion = 'al_dia'
  ) THEN
    RAISE EXCEPTION 'Peluquero o barbería no disponibles.';
  END IF;

  -- Validar que el servicio pertenece al peluquero y está activo.
  SELECT duracion_minutos INTO v_duracion
  FROM servicios
  WHERE id           = p_servicio_id
    AND peluquero_id = p_peluquero_id
    AND activo       = true;

  IF v_duracion IS NULL THEN
    RAISE EXCEPTION 'Servicio no disponible.';
  END IF;

  -- Guard (031): rechazar si el día está bloqueado para ese peluquero.
  IF EXISTS (
    SELECT 1 FROM dias_bloqueados db
    WHERE db.peluquero_id = p_peluquero_id
      AND db.fecha = (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::date
  ) THEN
    RAISE EXCEPTION 'Ese día no está disponible.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Guard (039): rechazar horarios en el pasado.
  IF p_fecha_hora <= now() THEN
    RAISE EXCEPTION 'Ese horario ya pasó.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Guard (039): rechazar horarios fuera de la disponibilidad semanal.
  v_dia_semana := EXTRACT(DOW FROM (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo'))::int;
  v_hora_local := (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::time;

  IF NOT EXISTS (
    SELECT 1 FROM disponibilidad d
    WHERE d.peluquero_id = p_peluquero_id
      AND d.dia_semana   = v_dia_semana
      AND v_hora_local >= d.hora_inicio
      AND (v_hora_local + (v_duracion || ' minutes')::interval) <= d.hora_fin
  ) THEN
    RAISE EXCEPTION 'Ese horario está fuera de la disponibilidad del peluquero.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO reservas (
    barberia_id, peluquero_id, servicio_id,
    cliente_nombre, cliente_telefono, cliente_email,
    cliente_direccion, es_domicilio, fecha_hora
  ) VALUES (
    p_barberia_id, p_peluquero_id, p_servicio_id,
    p_cliente_nombre, p_cliente_telefono, p_cliente_email,
    p_cliente_direccion, p_es_domicilio, p_fecha_hora
  )
  RETURNING id, token INTO v_id, v_token;

  RETURN json_build_object('id', v_id, 'token', v_token);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Column-level GRANT de `barberias` para anon (mismo patrón que BUG 31A /
--    migración 041 con `peluqueros`) — fix Héctor 2026-07-16.
--
--    `barberias` nunca tuvo column-level grants: el rol `anon` tenía SELECT
--    de tabla completa vía el grant default de Supabase (mismo gap que tenía
--    `peluqueros` antes de 041). Con las columnas nuevas de facturación
--    (048) y rubro (047), un anónimo podía pedir por API REST directo
--    columnas internas como proximo_corte, pago_confirmado, dueno_id.
--
--    Columnas verificadas contra los consumidores públicos reales:
--      - src/hooks/useBarberia.js (usado por BarberiaPub.jsx y PeluqueroPub.jsx
--        vía useBarberia(slug), con supabasePublic): `.select('*')` sobre
--        barberias — se ajusta abajo a la lista explícita.
--      - src/components/BrandHeader.jsx: nombre, logo_url, descripcion,
--        direccion, color_primario, color_secundario.
--      - src/pages/public/BarberiaPub.jsx: nombre, contacto, color_primario,
--        color_secundario.
--      - src/components/ReservaWizard.jsx: barberia.id (para armar el payload
--        de crear_reserva_publica), barberia.slug, barberia.nombre.
--      - src/hooks/usePeluquero.js NO consulta `barberias` directo (solo
--        servicios/disponibilidad/politicas_peluquero + RPC), no aporta columnas.
--
--    Quedan AFUERA del grant a anon (no las pide ningún consumidor público, y
--    varias son sensibles): estado (detalle interno de aprobación pendiente/
--    rechazada — el filtro real que importa al público ya lo aplica la
--    política RLS, no hace falta que la columna sea legible), tipo_negocio,
--    qr_url, dueno_id, estado_facturacion, pago_confirmado, proximo_corte,
--    created_at, updated_at.
--
--    rubro_principal_id/rubro_secundario_id (047) SÍ se incluyen: son
--    categoría de negocio pública por naturaleza (no PII, no dato de
--    facturación), y Héctor espera mostrarlas próximamente en la página
--    pública aunque hoy ningún componente las consuma todavía — evita una
--    migración de un solo GRANT cuando se agregue esa UI.
--
--    `authenticated` NO se toca: sigue con SELECT de tabla completa vía el
--    grant default preexistente, protegido por las políticas RLS normales de
--    dueño/peluquero/super_admin (no por estas columnas).
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.barberias FROM anon;

GRANT SELECT (
    id,
    nombre,
    slug,
    descripcion,
    direccion,
    contacto,
    logo_url,
    color_primario,
    color_secundario,
    rubro_principal_id,
    rubro_secundario_id
) ON public.barberias TO anon;

-- ---------------------------------------------------------------------------
-- 8. PENDIENTE (no se hace en esta migración):
--    Falta crear `supabase/functions/evaluar-facturacion/`, análoga a
--    `supabase/functions/purgar-reservas/` (mismo patrón: autenticación vía
--    secreto dedicado tipo X-Purge-Secret, invoca evaluar_facturacion() con
--    service_role, responde el jsonb de resumen). Lo hace dev-senior/hawkeye
--    cuando se necesite el endpoint HTTP.
--    Héctor deberá configurar un webhook diario externo (cron-job.org u
--    similar) apuntando a esa función, igual que quedó pendiente para
--    purgar-reservas (recomendado también fuera de horario pico, ej. 04:00 AM
--    hora DR, después de la purga de reservas de las 03:00 AM).
-- ---------------------------------------------------------------------------

-- FIN 048_facturacion_manual_fase1b.sql
