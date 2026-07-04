-- 040: 4 hallazgos críticos/altos de la auditoría QA (Fable 5, 2026-07-04)
--
-- 1. No existía política SELECT de `reservas` para `anon` — fetchOcupados()
--    (llamado desde el wizard público) siempre devolvía [] silenciosamente,
--    por lo que ningún slot ocupado se descontaba y el cliente podía elegir
--    horarios ya tomados (el INSERT fallaba recién al confirmar, por el
--    constraint EXCLUDE de la migración 006). Fix: RPC pública que expone
--    solo fecha_hora + duracion_minutos (sin PII de otros clientes), en vez
--    de abrir la tabla completa a anon.
--
-- 2. `registrar_negocio` no validaba que `p_dueno_id` fuera el caller
--    autenticado (mismo patrón de IDOR que se cerró en `vincular_peluquero_
--    por_email`, migración 029, pero acá había quedado sin guard).
--
-- 3. Faltaba política SELECT de `reservas` para el dueño de la barbería
--    (solo existía para el propio peluquero) — la Agenda del dueño, el
--    aviso realtime de nueva reserva, y el conteo de cascade al borrar un
--    servicio quedaban vacíos en silencio para reservas de su equipo.
--
-- 4. Faltaba política UPDATE de `peluqueros` para que un peluquero de
--    equipo edite su propia fila (solo existía para el dueño) — "Mi
--    perfil" mostraba "Cambios guardados" pero el UPDATE afectaba 0 filas
--    por RLS, sin error visible.

-- ── 1. RPC pública de horarios ocupados (reemplaza el SELECT directo) ──
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
    AND r.fecha_hora >= p_desde;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ocupados_publico(uuid, timestamp with time zone) TO anon, authenticated;

-- ── 2. Guard de ownership en registrar_negocio ──
CREATE OR REPLACE FUNCTION public.registrar_negocio(
  p_nombre text,
  p_slug text,
  p_contacto text,
  p_tipo_negocio text,
  p_dueno_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_barberia_id  uuid;
    v_peluquero_id uuid := NULL;
BEGIN
    IF p_dueno_id IS NULL THEN
        RAISE EXCEPTION 'p_dueno_id no puede ser NULL'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_dueno_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'No podés registrar un negocio a nombre de otro usuario.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    INSERT INTO public.barberias (
        nombre,
        slug,
        estado,
        tipo_negocio,
        contacto,
        dueno_id
    )
    VALUES (
        p_nombre,
        p_slug,
        'aprobada',
        p_tipo_negocio,
        p_contacto,
        p_dueno_id
    )
    RETURNING id INTO v_barberia_id;

    IF p_tipo_negocio = 'independiente' THEN
        INSERT INTO public.peluqueros (
            barberia_id,
            user_id,
            slug,
            nombre,
            whatsapp,
            activo,
            es_dueno_mismo
        )
        VALUES (
            v_barberia_id,
            p_dueno_id,
            p_slug,
            p_nombre,
            p_contacto,
            true,
            true
        )
        RETURNING id INTO v_peluquero_id;
    END IF;

    RETURN json_build_object(
        'barberia_id',  v_barberia_id,
        'peluquero_id', v_peluquero_id
    );
END;
$function$;

-- ── 3. Política SELECT de reservas para el dueño de la barbería ──
CREATE POLICY reservas_select_dueno ON public.reservas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM peluqueros p
      JOIN barberias b ON b.id = p.barberia_id
      WHERE p.id = reservas.peluquero_id
        AND b.dueno_id = auth.uid()
    )
  );

-- ── 4. Política UPDATE de peluqueros para el propio peluquero ──
CREATE POLICY peluqueros_update_self ON public.peluqueros
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
