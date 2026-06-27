-- =============================================================================
-- MiSillón v1 — Migración 004: Función auto_cancelar_reservas_vencidas()
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 003_super_admins.sql
-- Aplicar: psql $DATABASE_URL < 004_auto_cancelar_fn.sql
--
-- Handoff DBA → Dev: la Edge Function `auto-cancelar` (functions/auto-cancelar)
-- invoca esta función vía supabase.rpc('auto_cancelar_reservas_vencidas').
--
-- Cancela reservas pendientes cuya fecha_hora + minutos_tolerancia de la
-- política del peluquero ya venció. Peluqueros SIN política usan 15 min.
-- Retorna la cantidad total de reservas canceladas.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_cancelar_reservas_vencidas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    WITH vencidas AS (
        -- Reservas de peluqueros CON política registrada
        UPDATE public.reservas r
        SET
            estado             = 'cancelada',
            motivo_cancelacion = 'No confirmada a tiempo'
        FROM public.politicas_peluquero pol
        WHERE r.peluquero_id = pol.peluquero_id
          AND r.estado       = 'pendiente'
          AND r.fecha_hora + (pol.minutos_tolerancia || ' minutes')::interval < now()
        RETURNING r.id
    ),
    vencidas_sin_pol AS (
        -- Reservas de peluqueros SIN política: default 15 minutos
        UPDATE public.reservas r
        SET
            estado             = 'cancelada',
            motivo_cancelacion = 'No confirmada a tiempo'
        WHERE r.estado    = 'pendiente'
          AND r.fecha_hora + interval '15 minutes' < now()
          AND NOT EXISTS (
              SELECT 1 FROM public.politicas_peluquero p
              WHERE p.peluquero_id = r.peluquero_id
          )
        RETURNING r.id
    )
    SELECT (SELECT COUNT(*) FROM vencidas) +
           (SELECT COUNT(*) FROM vencidas_sin_pol)
    INTO v_count;

    RETURN v_count;
END;
$$;

-- Solo el service_role (Edge Function) debe ejecutarla. No exponer a anon.
REVOKE EXECUTE ON FUNCTION public.auto_cancelar_reservas_vencidas() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_cancelar_reservas_vencidas() TO service_role;

-- FIN 004_auto_cancelar_fn.sql
