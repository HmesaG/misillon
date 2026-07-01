-- =============================================================================
-- MiSillón — Migración 034: Fix guard super_admin en admin_stats / admin_reservas_por_dia
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): las RPCs admin_stats() y
-- admin_reservas_por_dia(int) (010) son SECURITY DEFINER y otorgadas a
-- `authenticated` SIN validar que el caller sea super_admin. Cualquier dueño o
-- peluquero logueado (o cualquier cuenta authenticated) puede llamarlas directo
-- y obtener KPIs GLOBALES de toda la plataforma: total de barberías, barberías
-- aprobadas, peluqueros activos y conteos de reservas (hoy/semana/mes y serie
-- diaria) de TODOS los negocios. Fuga de métricas de negocio a terceros.
--
-- FIX: se agrega al inicio de ambas funciones el mismo guard que ya usan las
-- RPCs admin_* de la migración 023:
--   IF NOT public.is_super_admin() THEN RAISE EXCEPTION ... insufficient_privilege
-- El resto del cuerpo (cálculo de KPIs y de la serie por día, timezone DR,
-- clamp de p_dias) queda IDÉNTICO a 010.
--
-- Flujo legítimo: solo src/pages/panel/SuperAdmin.jsx las llama, y esa página
-- está detrás de <ProtectedRoute rol="super_admin"> en App.jsx. El guard no
-- rompe nada legítimo.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC 1: admin_stats (con guard super_admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_tz               CONSTANT text := 'America/Santo_Domingo';
    v_hoy              date;
    v_total_barberias  bigint;
    v_aprobadas        bigint;
    v_peluqueros       bigint;
    v_reservas_hoy     bigint;
    v_reservas_semana  bigint;
    v_reservas_mes     bigint;
BEGIN
    -- Guard: solo super_admin puede ver KPIs globales.
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Solo el super_admin puede ver las estadísticas globales.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_hoy := (NOW() AT TIME ZONE v_tz)::date;

    SELECT COUNT(*)                                   INTO v_total_barberias FROM public.barberias;
    SELECT COUNT(*) FILTER (WHERE estado = 'aprobada') INTO v_aprobadas       FROM public.barberias;
    SELECT COUNT(*) FILTER (WHERE activo = true)       INTO v_peluqueros       FROM public.peluqueros;

    SELECT COUNT(*)
      INTO v_reservas_hoy
      FROM public.reservas
     WHERE (fecha_hora AT TIME ZONE v_tz)::date = v_hoy
       AND estado != 'cancelada';

    SELECT COUNT(*)
      INTO v_reservas_semana
      FROM public.reservas
     WHERE (fecha_hora AT TIME ZONE v_tz)::date >= v_hoy - 6
       AND estado != 'cancelada';

    SELECT COUNT(*)
      INTO v_reservas_mes
      FROM public.reservas
     WHERE (fecha_hora AT TIME ZONE v_tz)::date >= v_hoy - 29
       AND estado != 'cancelada';

    RETURN json_build_object(
        'total_barberias',    v_total_barberias,
        'barberias_aprobadas', v_aprobadas,
        'peluqueros_activos', v_peluqueros,
        'reservas_hoy',       v_reservas_hoy,
        'reservas_semana',    v_reservas_semana,
        'reservas_mes',       v_reservas_mes
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_stats() TO authenticated;


-- ---------------------------------------------------------------------------
-- RPC 2: admin_reservas_por_dia (con guard super_admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reservas_por_dia(p_dias INT DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_tz   CONSTANT text := 'America/Santo_Domingo';
    v_hoy  date;
    v_dias int;
BEGIN
    -- Guard: solo super_admin puede ver la serie global de reservas.
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Solo el super_admin puede ver las estadísticas globales.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- clampear p_dias a rango [1, 365]
    v_dias := GREATEST(1, LEAST(365, p_dias));
    v_hoy  := (NOW() AT TIME ZONE v_tz)::date;

    RETURN (
        SELECT json_agg(
            json_build_object(
                'fecha', TO_CHAR(d.dia, 'YYYY-MM-DD'),
                'total', COALESCE(r.cnt, 0)
            )
            ORDER BY d.dia ASC
        )
        FROM (
            SELECT generate_series(
                v_hoy - (v_dias - 1),
                v_hoy,
                '1 day'::interval
            )::date AS dia
        ) d
        LEFT JOIN (
            SELECT (fecha_hora AT TIME ZONE v_tz)::date AS dia,
                   COUNT(*)                             AS cnt
              FROM public.reservas
             WHERE (fecha_hora AT TIME ZONE v_tz)::date >= v_hoy - (v_dias - 1)
               AND estado != 'cancelada'
             GROUP BY 1
        ) r ON r.dia = d.dia
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reservas_por_dia(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_reservas_por_dia(int) TO authenticated;

-- FIN 034_fix_admin_stats_guard.sql
