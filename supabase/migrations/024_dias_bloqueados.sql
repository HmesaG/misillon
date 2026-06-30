-- =============================================================================
-- MiSillón — Migración 024: Tabla dias_bloqueados
-- Permite que los peluqueros (y sus dueños) bloqueen días específicos
-- (vacaciones, feriados, enfermedad) para que el ReservaWizard no muestre
-- slots disponibles en esas fechas.
-- Aplicar: psql $DATABASE_URL < 024_dias_bloqueados.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLA: dias_bloqueados
-- UNIQUE(peluquero_id, fecha): un peluquero solo puede bloquear una vez
-- cada fecha (no tiene sentido bloquear el mismo día dos veces).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dias_bloqueados (
    id           uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id uuid   NOT NULL REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    fecha        date   NOT NULL,
    motivo       text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (peluquero_id, fecha)
);

-- Índice para lookup eficiente por peluquero + rango de fechas
CREATE INDEX IF NOT EXISTS idx_dias_bloqueados_peluquero_fecha
    ON public.dias_bloqueados (peluquero_id, fecha);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.dias_bloqueados ENABLE ROW LEVEL SECURITY;

-- SELECT público (anon + authenticated): el ReservaWizard necesita saber
-- qué días están bloqueados sin requerir auth. Se expone solo la fecha.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dias_bloqueados'
          AND policyname = 'dias_bloqueados_select_publico'
    ) THEN
        CREATE POLICY "dias_bloqueados_select_publico"
            ON public.dias_bloqueados FOR SELECT
            USING (true);
    END IF;
END;
$$;

-- INSERT/UPDATE/DELETE: peluquero gestiona sus propios días bloqueados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dias_bloqueados'
          AND policyname = 'dias_bloqueados_peluquero'
    ) THEN
        CREATE POLICY "dias_bloqueados_peluquero"
            ON public.dias_bloqueados FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.peluqueros p
                    WHERE p.id       = peluquero_id
                      AND p.user_id  = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.peluqueros p
                    WHERE p.id       = peluquero_id
                      AND p.user_id  = auth.uid()
                )
            );
    END IF;
END;
$$;

-- INSERT/UPDATE/DELETE: el dueño puede gestionar días de los peluqueros de su barbería
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dias_bloqueados'
          AND policyname = 'dias_bloqueados_dueno'
    ) THEN
        CREATE POLICY "dias_bloqueados_dueno"
            ON public.dias_bloqueados FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.peluqueros p
                    JOIN public.barberias b ON b.id = p.barberia_id
                    WHERE p.id       = peluquero_id
                      AND b.dueno_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.peluqueros p
                    JOIN public.barberias b ON b.id = p.barberia_id
                    WHERE p.id       = peluquero_id
                      AND b.dueno_id = auth.uid()
                )
            );
    END IF;
END;
$$;

-- Super_admin: acceso total
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'dias_bloqueados'
          AND policyname = 'dias_bloqueados_superadmin'
    ) THEN
        CREATE POLICY "dias_bloqueados_superadmin"
            ON public.dias_bloqueados FOR ALL
            TO authenticated
            USING (public.is_super_admin())
            WITH CHECK (public.is_super_admin());
    END IF;
END;
$$;

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: get_dias_bloqueados
-- Devuelve las fechas bloqueadas de un peluquero en un rango de fechas.
-- SECURITY DEFINER + sin validación auth: pública como get_cuentas_for_peluquero.
-- El ReservaWizard la llama para deshabilitar fechas en el date picker.
--
-- Parámetros:
--   p_peluquero_id  UUID   — ID del peluquero
--   p_desde         DATE   — inicio del rango (inclusive)
--   p_hasta         DATE   — fin del rango (inclusive)
--
-- Retorno: TABLE(fecha DATE, motivo TEXT)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dias_bloqueados(
    p_peluquero_id uuid,
    p_desde        date,
    p_hasta        date
)
RETURNS TABLE (
    fecha  date,
    motivo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- Validar rango: máximo 90 días para evitar queries abusivas
    IF (p_hasta - p_desde) > 90 THEN
        RAISE EXCEPTION 'El rango máximo permitido es 90 días.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    RETURN QUERY
    SELECT
        db.fecha,
        db.motivo
    FROM public.dias_bloqueados db
    WHERE db.peluquero_id = p_peluquero_id
      AND db.fecha        BETWEEN p_desde AND p_hasta
    ORDER BY db.fecha ASC;
END;
$$;

-- Accesible por anon y authenticated (pública, como el resto del flujo de reserva)
REVOKE EXECUTE ON FUNCTION public.get_dias_bloqueados(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dias_bloqueados(uuid, date, date) TO anon, authenticated;

-- FIN 024_dias_bloqueados.sql
