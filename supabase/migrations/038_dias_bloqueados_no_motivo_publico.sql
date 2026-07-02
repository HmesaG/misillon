-- =============================================================================
-- MiSillón — Migración 038: get_dias_bloqueados deja de exponer `motivo`
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01, BUG 17A): la RPC pública
-- get_dias_bloqueados(uuid, date, date) (024) es SECURITY DEFINER, está
-- otorgada a `anon` y devuelve TABLE(fecha, motivo). El `motivo` es una nota
-- interna del peluquero ("Vacaciones", "Cita médica", etc.) que se filtra a
-- cualquier visitante anónimo: basta llamar a la RPC con un peluquero_id (que
-- es público, viaja en la URL del wizard) para leer todos sus motivos de
-- bloqueo. La página pública de reservas solo necesita las FECHAS para
-- deshabilitarlas en el date picker — nunca el motivo.
--
-- FIX: CREATE OR REPLACE de la función devolviendo `motivo` SIEMPRE como NULL.
-- Se mantiene la firma RETURNS TABLE(fecha date, motivo text) para no romper el
-- tipo de retorno (CREATE OR REPLACE sin DROP, grants preservados) ni el
-- contrato de los callers que desestructuran `motivo`. La columna real sigue
-- viva en la tabla dias_bloqueados y accesible al dueño/peluquero vía RLS.
--
-- Frontend acompañante: src/components/panel/sections/DiasBlockeados.jsx pasa a
-- leer fecha+motivo directamente de la tabla (protegida por las políticas RLS
-- dias_bloqueados_peluquero / _dueno de 024), en vez de esta RPC pública, para
-- que el propio peluquero siga viendo sus notas. El wizard público
-- (usePeluquero.js) sigue usando la RPC y solo consume `fecha`.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

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
        -- motivo es nota interna del peluquero: NO se expone en esta RPC pública.
        -- Se mantiene la columna en la firma (siempre NULL) por compatibilidad.
        NULL::text AS motivo
    FROM public.dias_bloqueados db
    WHERE db.peluquero_id = p_peluquero_id
      AND db.fecha        BETWEEN p_desde AND p_hasta
    ORDER BY db.fecha ASC;
END;
$$;

-- Accesible por anon y authenticated (pública, como el resto del flujo de reserva)
REVOKE EXECUTE ON FUNCTION public.get_dias_bloqueados(uuid, date, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_dias_bloqueados(uuid, date, date) TO anon, authenticated;

-- FIN 038_dias_bloqueados_no_motivo_publico.sql
