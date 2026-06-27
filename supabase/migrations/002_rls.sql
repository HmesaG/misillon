-- =============================================================================
-- MiSillón v1 — Migración 002: RLS + Funciones seguras
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 001_schema.sql
-- Aplicar: psql $DATABASE_URL < 002_rls.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCIÓN: is_super_admin()
-- DECISIÓN: Se usa una tabla public.super_admins (creada en 003_super_admins.sql)
-- en lugar de hardcodear emails. Ventajas:
--   1. Se pueden agregar/remover admins sin hacer un deploy.
--   2. No hay PII (emails) en el código fuente.
--   3. La función es STABLE + SECURITY DEFINER → un solo lookup por transacción.
-- La tabla super_admins se crea en 003 para poder hacer seed en el mismo archivo.
-- Esta función se crea aquí porque RLS y otros objetos de 002 dependen de ella.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS bool
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.super_admins
        WHERE user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ---------------------------------------------------------------------------
ALTER TABLE public.barberias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peluqueros                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias_peluquero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.politicas_peluquero        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins               ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- POLÍTICAS: barberias
-- ---------------------------------------------------------------------------
-- Limpiar políticas previas (idempotencia)
DROP POLICY IF EXISTS "barberias_select_publico"     ON public.barberias;
DROP POLICY IF EXISTS "barberias_insert_autenticado" ON public.barberias;
DROP POLICY IF EXISTS "barberias_update_dueno"       ON public.barberias;
DROP POLICY IF EXISTS "barberias_update_superadmin"  ON public.barberias;
DROP POLICY IF EXISTS "barberias_all_superadmin"     ON public.barberias;

-- SELECT público: solo barberias aprobadas
CREATE POLICY "barberias_select_publico"
    ON public.barberias FOR SELECT
    USING (estado = 'aprobada');

-- INSERT: cualquier usuario autenticado (self-signup)
CREATE POLICY "barberias_insert_autenticado"
    ON public.barberias FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: dueño puede editar SU barbería (el trigger protege la columna estado)
CREATE POLICY "barberias_update_dueno"
    ON public.barberias FOR UPDATE
    TO authenticated
    USING (dueno_id = auth.uid())
    WITH CHECK (dueno_id = auth.uid());

-- Super Admin: acceso SELECT + UPDATE irrestricto (incluye ver pendientes/rechazadas)
CREATE POLICY "barberias_select_superadmin"
    ON public.barberias FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "barberias_update_superadmin"
    ON public.barberias FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: peluqueros
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "peluqueros_select_publico"   ON public.peluqueros;
DROP POLICY IF EXISTS "peluqueros_insert_dueno"     ON public.peluqueros;
DROP POLICY IF EXISTS "peluqueros_update_dueno"     ON public.peluqueros;
DROP POLICY IF EXISTS "peluqueros_delete_dueno"     ON public.peluqueros;
DROP POLICY IF EXISTS "peluqueros_all_superadmin"   ON public.peluqueros;

-- SELECT público: peluquero activo + barbería aprobada
CREATE POLICY "peluqueros_select_publico"
    ON public.peluqueros FOR SELECT
    USING (
        activo = true
        AND EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.estado = 'aprobada'
        )
    );

-- INSERT/UPDATE/DELETE: solo el dueño de la barbería
CREATE POLICY "peluqueros_insert_dueno"
    ON public.peluqueros FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.dueno_id = auth.uid()
        )
    );

CREATE POLICY "peluqueros_update_dueno"
    ON public.peluqueros FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.dueno_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.dueno_id = auth.uid()
        )
    );

CREATE POLICY "peluqueros_delete_dueno"
    ON public.peluqueros FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.barberias b
            WHERE b.id = barberia_id
              AND b.dueno_id = auth.uid()
        )
    );

-- Super Admin: acceso total
CREATE POLICY "peluqueros_all_superadmin"
    ON public.peluqueros FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: cuentas_bancarias_peluquero
-- Sin SELECT público. El peluquero ve sus propias cuentas.
-- Clientes acceden solo vía función SECURITY DEFINER get_cuentas_for_reserva().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cuentas_select_peluquero"    ON public.cuentas_bancarias_peluquero;
DROP POLICY IF EXISTS "cuentas_insert_peluquero"    ON public.cuentas_bancarias_peluquero;
DROP POLICY IF EXISTS "cuentas_update_peluquero"    ON public.cuentas_bancarias_peluquero;
DROP POLICY IF EXISTS "cuentas_delete_peluquero"    ON public.cuentas_bancarias_peluquero;
DROP POLICY IF EXISTS "cuentas_all_superadmin"      ON public.cuentas_bancarias_peluquero;

-- El peluquero (user_id) ve sus propias cuentas
CREATE POLICY "cuentas_select_peluquero"
    ON public.cuentas_bancarias_peluquero FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "cuentas_insert_peluquero"
    ON public.cuentas_bancarias_peluquero FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "cuentas_update_peluquero"
    ON public.cuentas_bancarias_peluquero FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "cuentas_delete_peluquero"
    ON public.cuentas_bancarias_peluquero FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "cuentas_all_superadmin"
    ON public.cuentas_bancarias_peluquero FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: servicios
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "servicios_select_publico"  ON public.servicios;
DROP POLICY IF EXISTS "servicios_insert_peluquero" ON public.servicios;
DROP POLICY IF EXISTS "servicios_update_peluquero" ON public.servicios;
DROP POLICY IF EXISTS "servicios_delete_peluquero" ON public.servicios;
DROP POLICY IF EXISTS "servicios_all_superadmin"  ON public.servicios;

-- SELECT público: activo + peluquero activo + barbería aprobada
CREATE POLICY "servicios_select_publico"
    ON public.servicios FOR SELECT
    USING (
        activo = true
        AND EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
        )
    );

CREATE POLICY "servicios_insert_peluquero"
    ON public.servicios FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "servicios_update_peluquero"
    ON public.servicios FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "servicios_delete_peluquero"
    ON public.servicios FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "servicios_all_superadmin"
    ON public.servicios FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: disponibilidad
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "disponibilidad_select_publico"   ON public.disponibilidad;
DROP POLICY IF EXISTS "disponibilidad_insert_peluquero" ON public.disponibilidad;
DROP POLICY IF EXISTS "disponibilidad_update_peluquero" ON public.disponibilidad;
DROP POLICY IF EXISTS "disponibilidad_delete_peluquero" ON public.disponibilidad;
DROP POLICY IF EXISTS "disponibilidad_all_superadmin"   ON public.disponibilidad;

-- SELECT público: peluquero activo + barbería aprobada
CREATE POLICY "disponibilidad_select_publico"
    ON public.disponibilidad FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
        )
    );

CREATE POLICY "disponibilidad_insert_peluquero"
    ON public.disponibilidad FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "disponibilidad_update_peluquero"
    ON public.disponibilidad FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "disponibilidad_delete_peluquero"
    ON public.disponibilidad FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "disponibilidad_all_superadmin"
    ON public.disponibilidad FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: politicas_peluquero
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "politicas_select_publico"   ON public.politicas_peluquero;
DROP POLICY IF EXISTS "politicas_insert_peluquero" ON public.politicas_peluquero;
DROP POLICY IF EXISTS "politicas_update_peluquero" ON public.politicas_peluquero;
DROP POLICY IF EXISTS "politicas_all_superadmin"   ON public.politicas_peluquero;

-- SELECT público: peluquero activo + barbería aprobada
CREATE POLICY "politicas_select_publico"
    ON public.politicas_peluquero FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = peluquero_id
              AND p.activo = true
              AND b.estado = 'aprobada'
        )
    );

CREATE POLICY "politicas_insert_peluquero"
    ON public.politicas_peluquero FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "politicas_update_peluquero"
    ON public.politicas_peluquero FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "politicas_all_superadmin"
    ON public.politicas_peluquero FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: reservas
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reservas_insert_publico"       ON public.reservas;
DROP POLICY IF EXISTS "reservas_select_peluquero"     ON public.reservas;
DROP POLICY IF EXISTS "reservas_update_peluquero"     ON public.reservas;
DROP POLICY IF EXISTS "reservas_all_superadmin"       ON public.reservas;

-- INSERT: cualquiera, incluyendo anónimos
CREATE POLICY "reservas_insert_publico"
    ON public.reservas FOR INSERT
    WITH CHECK (true);

-- SELECT: el peluquero ve sus propias reservas
CREATE POLICY "reservas_select_peluquero"
    ON public.reservas FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

-- UPDATE (confirmar / cancelar desde panel peluquero)
CREATE POLICY "reservas_update_peluquero"
    ON public.reservas FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = peluquero_id
              AND p.user_id = auth.uid()
        )
    );

-- Super Admin: acceso total
CREATE POLICY "reservas_all_superadmin"
    ON public.reservas FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- POLÍTICAS: super_admins (solo el propio super admin puede consultar)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admins_select" ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_all"    ON public.super_admins;

CREATE POLICY "super_admins_select"
    ON public.super_admins FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- INSERT/UPDATE/DELETE en super_admins: solo desde service_role (migraciones)
-- No se exponen políticas DML para roles normales.

-- =============================================================================
-- FUNCIONES SEGURAS (SECURITY DEFINER)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCIÓN: get_reserva_by_token(p_token uuid)
-- Devuelve JSON con reserva + peluquero + servicio + política + cuentas
-- (cuentas solo si porcentaje_anticipo > 0).
-- Acceso por token público, sin auth requerida.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_reserva_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_result jsonb;
    v_anticipo int;
    v_peluquero_id uuid;
    v_cuentas jsonb;
BEGIN
    -- Obtener datos principales
    SELECT
        jsonb_build_object(
            'reserva', jsonb_build_object(
                'id',                  r.id,
                'barberia_id',         r.barberia_id,
                'peluquero_id',        r.peluquero_id,
                'servicio_id',         r.servicio_id,
                'cliente_nombre',      r.cliente_nombre,
                'cliente_telefono',    r.cliente_telefono,
                'cliente_email',       r.cliente_email,
                'cliente_direccion',   r.cliente_direccion,
                'es_domicilio',        r.es_domicilio,
                'fecha_hora',          r.fecha_hora,
                'estado',              r.estado,
                'motivo_cancelacion',  r.motivo_cancelacion,
                'created_at',          r.created_at
            ),
            'peluquero', jsonb_build_object(
                'id',        p.id,
                'nombre',    p.nombre,
                'foto_url',  p.foto_url,
                'whatsapp',  p.whatsapp,
                'slug',      p.slug
            ),
            'servicio', jsonb_build_object(
                'id',                s.id,
                'nombre',            s.nombre,
                'precio_local',      s.precio_local,
                'precio_domicilio',  s.precio_domicilio,
                'duracion_minutos',  s.duracion_minutos,
                'ofrece_domicilio',  s.ofrece_domicilio
            ),
            'politica', jsonb_build_object(
                'porcentaje_anticipo',    COALESCE(pol.porcentaje_anticipo, 0),
                'reembolso_inasistencia', COALESCE(pol.reembolso_inasistencia, false),
                'texto_libre',            pol.texto_libre,
                'minutos_tolerancia',     COALESCE(pol.minutos_tolerancia, 15)
            )
        ),
        COALESCE(pol.porcentaje_anticipo, 0),
        r.peluquero_id
    INTO v_result, v_anticipo, v_peluquero_id
    FROM public.reservas r
    JOIN public.peluqueros p   ON p.id = r.peluquero_id
    JOIN public.servicios  s   ON s.id = r.servicio_id
    LEFT JOIN public.politicas_peluquero pol ON pol.peluquero_id = r.peluquero_id
    WHERE r.token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Adjuntar cuentas bancarias solo si hay anticipo requerido
    IF v_anticipo > 0 THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',            cb.id,
                'banco',         cb.banco,
                'numero_cuenta', cb.numero_cuenta,
                'tipo',          cb.tipo,
                'titular',       cb.titular
            )
        )
        INTO v_cuentas
        FROM public.cuentas_bancarias_peluquero cb
        WHERE cb.peluquero_id = v_peluquero_id
          AND cb.activa = true;

        v_result := v_result || jsonb_build_object('cuentas_bancarias', COALESCE(v_cuentas, '[]'::jsonb));
    ELSE
        v_result := v_result || jsonb_build_object('cuentas_bancarias', '[]'::jsonb);
    END IF;

    RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCIÓN: cancelar_reserva(p_token uuid, p_motivo text)
-- Acceso por token público, sin auth requerida.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_reserva(p_token uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reserva public.reservas%ROWTYPE;
BEGIN
    -- Bloquear la fila para evitar race condition
    SELECT * INTO v_reserva
    FROM public.reservas
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Reserva no encontrada');
    END IF;

    IF v_reserva.estado = 'cancelada' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'La reserva ya está cancelada');
    END IF;

    UPDATE public.reservas
    SET
        estado             = 'cancelada',
        motivo_cancelacion = COALESCE(p_motivo, 'Cancelada por el cliente')
    WHERE token = p_token;

    RETURN jsonb_build_object(
        'ok',      true,
        'reserva', jsonb_build_object(
            'id',     v_reserva.id,
            'estado', 'cancelada'
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCIÓN: get_cuentas_for_reserva(p_token uuid)
-- Devuelve cuentas bancarias activas del peluquero, solo si anticipo > 0.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cuentas_for_reserva(p_token uuid)
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
DECLARE
    v_peluquero_id uuid;
    v_anticipo     int;
BEGIN
    SELECT r.peluquero_id, COALESCE(pol.porcentaje_anticipo, 0)
    INTO   v_peluquero_id, v_anticipo
    FROM   public.reservas r
    LEFT JOIN public.politicas_peluquero pol ON pol.peluquero_id = r.peluquero_id
    WHERE  r.token = p_token;

    IF NOT FOUND OR v_anticipo = 0 THEN
        RETURN;  -- Tabla vacía: no hay anticipo o token inválido
    END IF;

    RETURN QUERY
    SELECT
        cb.id,
        cb.banco,
        cb.numero_cuenta,
        cb.tipo,
        cb.titular
    FROM public.cuentas_bancarias_peluquero cb
    WHERE cb.peluquero_id = v_peluquero_id
      AND cb.activa = true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Revocar ejecución pública en funciones sensibles y otorgar explícitamente
-- (Supabase por defecto da EXECUTE a public en funciones nuevas)
-- ---------------------------------------------------------------------------
-- get_reserva_by_token y cancelar_reserva son accesibles por anon (por token)
GRANT EXECUTE ON FUNCTION public.get_reserva_by_token(uuid)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_reserva(uuid, text)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cuentas_for_reserva(uuid)   TO anon, authenticated;

-- is_super_admin solo para uso interno (RLS), no expuesta al cliente
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- FIN 002_rls.sql
