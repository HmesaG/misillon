-- =============================================================================
-- MiSillón v1 — Migración 010: RPCs de estadísticas para panel super_admin
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 009_auto_aprobar.sql
-- Aplicar: mysql -u user -p db < 010_admin_stats.sql
--          (o vía Supabase Studio → SQL Editor)
-- =============================================================================
--
-- CONTRATO DE RPCs — handoff para dev-senior
-- ----------------------------------------------------------------------------
--
-- RPC 1: admin_stats()
--   Firma    : public.admin_stats() RETURNS json
--   Seguridad: SECURITY DEFINER, search_path = public
--   Permisos : REVOKE PUBLIC / GRANT authenticated
--   Retorno  : JSON con un único objeto plano, ej.:
--              {
--                "total_barberias":    42,
--                "barberias_aprobadas": 38,
--                "peluqueros_activos": 61,
--                "reservas_hoy":       12,
--                "reservas_semana":    87,
--                "reservas_mes":      320
--              }
--   Notas    : reservas_hoy/semana/mes excluyen estado = 'cancelada'.
--              reservas_semana = últimos 7 días (fecha_hora >= CURRENT_DATE - 6).
--              reservas_mes    = últimos 30 días (fecha_hora >= CURRENT_DATE - 29).
--              "hoy" usa DATE(fecha_hora AT TIME ZONE 'America/Santo_Domingo').
--
-- RPC 2: admin_reservas_por_dia(p_dias INT DEFAULT 30)
--   Firma    : public.admin_reservas_por_dia(p_dias INT DEFAULT 30) RETURNS json
--   Seguridad: SECURITY DEFINER, search_path = public
--   Permisos : REVOKE PUBLIC / GRANT authenticated
--   Retorno  : Array JSON ordenado ASC por fecha, un elemento por día, ej.:
--              [
--                {"fecha": "2026-06-01", "total": 5},
--                {"fecha": "2026-06-02", "total": 0},
--                ...
--              ]
--   Notas    : Usa generate_series para garantizar un registro por cada día,
--              aunque no haya reservas (total = 0).
--              Solo cuenta reservas con estado != 'cancelada'.
--              p_dias acepta 1..365; valores fuera de rango se clampean al límite.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- RPC 1: admin_stats
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
-- RPC 2: admin_reservas_por_dia
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

-- FIN 010_admin_stats.sql
