-- =============================================================================
-- MiSillón — Migración 045: Purga automática de reservas
-- Aplicar después de 044_verificar_push_subscription.sql
-- Aplicar: supabase db push  (NO ejecutar sin confirmación de Hector — es DELETE)
--
-- Dos políticas de purga física:
--   1. Canceladas con >= 48h desde que pasaron a 'cancelada' → DELETE. Cron horario.
--   2. Confirmadas cuya CITA (fecha_hora) ya pasó hace >= 1 mes → DELETE. Cron diario.
--
-- Requiere registrar CUÁNDO una reserva pasó a 'cancelada'. La tabla `reservas`
-- no tenía ningún timestamp para eso (solo `created_at`, que es de creación,
-- no de cancelación). Se agrega `cancelada_en` y se actualizan las 3 funciones
-- existentes que transicionan estado a 'cancelada' para que lo seteen:
--   - cancelar_reserva()            (002_rls.sql)      — cliente cancela por token
--   - auto_cancelar_reservas_vencidas() (004_auto_cancelar_fn.sql) — cron no-show
--   - peluquero_rechazar_reserva()  (025_confirmacion_reservas.sql) — peluquero rechaza
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Nueva columna: momento en que la reserva pasó a 'cancelada'
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS cancelada_en timestamptz;

COMMENT ON COLUMN public.reservas.cancelada_en IS
    'Timestamp de cuándo la reserva pasó a estado=cancelada (cliente, no-show automático o rechazo del peluquero). NULL si nunca fue cancelada.';

-- Índice parcial: solo canceladas, para que el cron horario de purga no escanee la tabla entera
CREATE INDEX IF NOT EXISTS idx_reservas_cancelada_en
    ON public.reservas (cancelada_en)
    WHERE estado = 'cancelada';

-- Índice parcial: solo confirmadas, para el cron diario de purga por fecha de cita vieja
CREATE INDEX IF NOT EXISTS idx_reservas_confirmada_fecha
    ON public.reservas (fecha_hora)
    WHERE estado = 'confirmada';

-- ---------------------------------------------------------------------------
-- 2. Re-crear cancelar_reserva() para setear cancelada_en (cliente cancela por token)
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
        motivo_cancelacion = COALESCE(p_motivo, 'Cancelada por el cliente'),
        cancelada_en       = now()
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
-- 3. Re-crear auto_cancelar_reservas_vencidas() para setear cancelada_en (no-show)
-- ---------------------------------------------------------------------------
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
            motivo_cancelacion = 'No confirmada a tiempo',
            cancelada_en       = now()
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
            motivo_cancelacion = 'No confirmada a tiempo',
            cancelada_en       = now()
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

-- ---------------------------------------------------------------------------
-- 4. Re-crear peluquero_rechazar_reserva() para setear cancelada_en (rechazo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peluquero_rechazar_reserva(
    reserva_id uuid,
    motivo     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id    uuid := auth.uid();
    v_peluquero_id uuid;
    v_row          public.reservas%ROWTYPE;
BEGIN
    -- Obtener el peluquero_id de la reserva y verificar que existe
    SELECT r.peluquero_id INTO v_peluquero_id
    FROM public.reservas r
    WHERE r.id = reserva_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada: %', reserva_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Verificar que el caller es el peluquero de esta reserva
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        WHERE p.id      = v_peluquero_id
          AND p.user_id = v_caller_id
    ) THEN
        RAISE EXCEPTION 'No tenés permisos para rechazar esta reserva.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Verificar que la reserva no está ya cancelada
    IF EXISTS (
        SELECT 1 FROM public.reservas r
        WHERE r.id = reserva_id AND r.estado = 'cancelada'
    ) THEN
        RAISE EXCEPTION 'La reserva ya está cancelada.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    UPDATE public.reservas
    SET
        confirmacion_peluquero = 'rechazada',
        estado                 = 'cancelada',
        motivo_cancelacion     = COALESCE(motivo, 'Rechazada por el peluquero'),
        rechazo_motivo         = motivo,
        cancelada_en           = now()
    WHERE id = reserva_id
    RETURNING * INTO v_row;

    -- Al pasar a 'cancelada', el EXCLUDE gist de 006 libera el slot
    -- automáticamente para nuevas reservas.

    RETURN jsonb_build_object(
        'id',                     v_row.id,
        'estado',                 v_row.estado,
        'confirmacion_peluquero', v_row.confirmacion_peluquero,
        'rechazo_motivo',         v_row.rechazo_motivo,
        'motivo_cancelacion',     v_row.motivo_cancelacion,
        'cliente_nombre',         v_row.cliente_nombre,
        'fecha_hora',             v_row.fecha_hora
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Función de purga: reservas canceladas con >= 48h desde cancelada_en
--
-- DELETE físico. Solo actúa sobre filas con cancelada_en NOT NULL (defensivo:
-- reservas canceladas ANTES de esta migración no tienen cancelada_en, así
-- que no se tocan hasta que alguien las vuelva a mutar — se quedan huérfanas
-- de purga automática pero no se borran a ciegas por retroactividad).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purgar_reservas_canceladas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    WITH borradas AS (
        DELETE FROM public.reservas
        WHERE estado = 'cancelada'
          AND cancelada_en IS NOT NULL
          AND cancelada_en < now() - interval '48 hours'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM borradas;

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purgar_reservas_canceladas() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purgar_reservas_canceladas() TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Función de purga: reservas confirmadas cuya CITA (fecha_hora) tiene
--    más de 1 mes de antigüedad. DELETE físico.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purgar_reservas_confirmadas_vencidas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    WITH borradas AS (
        DELETE FROM public.reservas
        WHERE estado = 'confirmada'
          AND fecha_hora < now() - interval '1 month'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM borradas;

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purgar_reservas_confirmadas_vencidas() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purgar_reservas_confirmadas_vencidas() TO service_role;

-- ---------------------------------------------------------------------------
-- 7. CRON: mismo mecanismo que 026_recordatorio_wa_cron.sql — DO block que
--    intenta registrar en pg_cron y captura la excepción si la extensión no
--    está disponible (plan Free). Idempotente: unschedule antes de schedule.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Job 1: purga de canceladas, cada hora
    BEGIN
        PERFORM cron.unschedule('purga-reservas-canceladas');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        PERFORM cron.schedule(
            'purga-reservas-canceladas',
            '0 * * * *',   -- cada hora, en punto
            $cron1$SELECT public.purgar_reservas_canceladas()$cron1$
        );
        RAISE NOTICE 'pg_cron: job "purga-reservas-canceladas" registrado (cada hora).';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron no disponible en este proyecto. '
                     'El job "purga-reservas-canceladas" no fue registrado.';
    END;

    -- Job 2: purga de confirmadas vencidas, diario
    BEGIN
        PERFORM cron.unschedule('purga-reservas-confirmadas-vencidas');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        PERFORM cron.schedule(
            'purga-reservas-confirmadas-vencidas',
            '0 7 * * *',   -- 07:00 UTC = 03:00 AM America/Santo_Domingo (fuera de horario pico)
            $cron2$SELECT public.purgar_reservas_confirmadas_vencidas()$cron2$
        );
        RAISE NOTICE 'pg_cron: job "purga-reservas-confirmadas-vencidas" registrado (03:00 AM DR).';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron no disponible en este proyecto. '
                     'El job "purga-reservas-confirmadas-vencidas" no fue registrado.';
    END;
END;
$$;

-- FIN 045_purga_reservas_canceladas_y_confirmadas_vencidas.sql
