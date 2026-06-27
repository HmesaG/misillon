-- =============================================================================
-- MiSillón v1 — Migración 006: Exclusión de solapamiento de reservas
-- =============================================================================
-- El constraint UNIQUE(peluquero_id, fecha_hora) solo protege timestamps
-- exactamente iguales. Esta migración blinda solapamientos reales usando
-- EXCLUDE USING gist con tstzrange, ignorando reservas canceladas.
--
-- NOTA: Postgres requiere que las expresiones en índices sean IMMUTABLE.
-- Por eso se almacena fecha_hora_fin como columna explícita (mantenida por
-- trigger) en vez de calcularla inline en el constraint.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensión btree_gist
-- Requerida para combinar el tipo UUID con tstzrange en el mismo EXCLUDE.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- 2. Columnas desnormalizadas en reservas
-- Los constraints EXCLUDE no permiten subqueries ni expresiones no-IMMUTABLE.
-- Se almacenan duracion_minutos y fecha_hora_fin para que el constraint opere
-- solo sobre valores de columna (referencias IMMUTABLE desde el punto de vista
-- del índice).
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS duracion_minutos int NOT NULL DEFAULT 0
        CHECK (duracion_minutos >= 0);

ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS fecha_hora_fin timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Función sync_reserva_duracion_fin
-- Copia duracion_minutos desde servicios y calcula fecha_hora_fin en cada
-- INSERT o UPDATE que toque servicio_id o fecha_hora.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_reserva_duracion_fin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_dur int;
BEGIN
    SELECT duracion_minutos INTO v_dur
    FROM public.servicios
    WHERE id = NEW.servicio_id;

    NEW.duracion_minutos := v_dur;
    NEW.fecha_hora_fin   := NEW.fecha_hora + (v_dur * interval '1 minute');
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger trg_sync_reserva_duracion_fin
-- DROP IF EXISTS + CREATE para idempotencia (Postgres < 17 no tiene
-- CREATE TRIGGER IF NOT EXISTS).
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_reserva_duracion_fin ON public.reservas;

CREATE TRIGGER trg_sync_reserva_duracion_fin
    BEFORE INSERT OR UPDATE OF servicio_id, fecha_hora ON public.reservas
    FOR EACH ROW EXECUTE FUNCTION public.sync_reserva_duracion_fin();

-- ---------------------------------------------------------------------------
-- 5. Backfill: poblar duracion_minutos y fecha_hora_fin en reservas existentes
-- ---------------------------------------------------------------------------
UPDATE public.reservas r
SET
    duracion_minutos = s.duracion_minutos,
    fecha_hora_fin   = r.fecha_hora + (s.duracion_minutos * interval '1 minute')
FROM public.servicios s
WHERE r.servicio_id = s.id
  AND r.fecha_hora_fin IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Constraint EXCLUDE USING gist
-- Compara intervalos [fecha_hora, fecha_hora_fin) entre reservas del mismo
-- peluquero; las canceladas quedan fuera del check (cláusula WHERE).
-- Idempotente: el DO-block verifica pg_constraint antes de agregar.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname  = 'reservas_no_overlap'
          AND conrelid = 'public.reservas'::regclass
    ) THEN
        ALTER TABLE public.reservas
            ADD CONSTRAINT reservas_no_overlap
            EXCLUDE USING gist (
                peluquero_id WITH =,
                tstzrange(fecha_hora, fecha_hora_fin, '[)') WITH &&
            )
            WHERE (estado <> 'cancelada');
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Comentario
-- ---------------------------------------------------------------------------
COMMENT ON CONSTRAINT reservas_no_overlap ON public.reservas IS
    'Impide solapamiento real de reservas del mismo peluquero. '
    'Compara intervalos [fecha_hora, fecha_hora_fin) con tstzrange. '
    'Las reservas canceladas quedan excluidas (cláusula WHERE). '
    'Requiere extensión btree_gist y columnas desnormalizadas duracion_minutos '
    'y fecha_hora_fin, mantenidas por trigger trg_sync_reserva_duracion_fin.';
