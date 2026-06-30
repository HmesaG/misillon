-- =============================================================================
-- MiSillón — Migración 025: Confirmación/rechazo de reservas por el peluquero
-- Agrega dos columnas a reservas y dos RPCs para que el peluquero confirme
-- o rechace una reserva desde su panel.
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION.
-- Aplicar: psql $DATABASE_URL < 025_confirmacion_reservas.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- COLUMNAS NUEVAS en reservas
-- ---------------------------------------------------------------------------

-- confirmacion_peluquero: estado de confirmación desde el lado del peluquero.
-- Independiente del campo "estado" (que refleja el estado operativo general).
-- DEFAULT 'pendiente': todas las reservas existentes quedan en pendiente.
ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS confirmacion_peluquero text
        NOT NULL DEFAULT 'pendiente'
        CHECK (confirmacion_peluquero IN ('pendiente', 'confirmada', 'rechazada'));

-- rechazo_motivo: texto libre opcional que el peluquero completa al rechazar.
-- Se complementa con motivo_cancelacion (usado por el cliente al cancelar).
ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS rechazo_motivo text;

-- Índice para filtrar rápido por confirmacion_peluquero en el panel
CREATE INDEX IF NOT EXISTS idx_reservas_confirmacion
    ON public.reservas (peluquero_id, confirmacion_peluquero);

COMMIT;

-- ---------------------------------------------------------------------------
-- RPC: peluquero_confirmar_reserva
--
-- El peluquero confirma una reserva pendiente de su agenda.
-- Actualiza confirmacion_peluquero = 'confirmada' y estado = 'confirmada'.
--
-- Parámetros:
--   reserva_id  UUID — ID de la reserva a confirmar
--
-- Retorno: JSONB con la reserva actualizada (id, estado, confirmacion_peluquero)
--
-- Errores:
--   'insufficient_privilege' si el caller no es el peluquero de esa reserva
--   'no_data_found' si la reserva no existe
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peluquero_confirmar_reserva(
    reserva_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_peluquero_id uuid;
    v_row       public.reservas%ROWTYPE;
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
        RAISE EXCEPTION 'No tenés permisos para confirmar esta reserva.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Verificar que la reserva no está cancelada
    IF EXISTS (
        SELECT 1 FROM public.reservas r
        WHERE r.id = reserva_id AND r.estado = 'cancelada'
    ) THEN
        RAISE EXCEPTION 'No se puede confirmar una reserva cancelada.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    UPDATE public.reservas
    SET
        confirmacion_peluquero = 'confirmada',
        estado                 = 'confirmada'
    WHERE id = reserva_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
        'id',                     v_row.id,
        'estado',                 v_row.estado,
        'confirmacion_peluquero', v_row.confirmacion_peluquero,
        'cliente_nombre',         v_row.cliente_nombre,
        'fecha_hora',             v_row.fecha_hora
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.peluquero_confirmar_reserva(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.peluquero_confirmar_reserva(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: peluquero_rechazar_reserva
--
-- El peluquero rechaza una reserva (ej: no puede atender ese día).
-- Actualiza confirmacion_peluquero = 'rechazada', estado = 'cancelada',
-- rechazo_motivo = motivo. Al pasar a 'cancelada', el constraint EXCLUDE gist
-- de 006_no_overlap.sql excluye la reserva, liberando el slot.
--
-- Parámetros:
--   reserva_id  UUID   — ID de la reserva a rechazar
--   motivo      TEXT   — motivo opcional del rechazo (NULL permitido)
--
-- Retorno: JSONB con la reserva actualizada
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
        rechazo_motivo         = motivo
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

REVOKE EXECUTE ON FUNCTION public.peluquero_rechazar_reserva(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.peluquero_rechazar_reserva(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- NOTA PARA EL DEV:
-- La función get_reserva_by_token (002_rls.sql) no incluye los nuevos campos
-- confirmacion_peluquero y rechazo_motivo en su respuesta. Si GestionCita.jsx
-- necesita mostrar esos campos, actualizar get_reserva_by_token agregándolos
-- al jsonb_build_object de la reserva.
-- ---------------------------------------------------------------------------

-- FIN 025_confirmacion_reservas.sql
