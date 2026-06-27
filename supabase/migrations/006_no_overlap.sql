-- =============================================================================
-- MiSillón v1 — Migración 006: Exclusión de solapamiento de reservas
-- =============================================================================
-- El constraint UNIQUE(peluquero_id, fecha_hora) solo protege timestamps
-- exactamente iguales. Esta migración blinda solapamientos reales usando
-- EXCLUDE USING gist con tstzrange, ignorando reservas canceladas.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensión btree_gist
-- Requerida para combinar el tipo UUID con tstzrange en el mismo EXCLUDE.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- 2. Columna duracion_minutos en reservas
-- Los constraints EXCLUDE no permiten subqueries; se desnormaliza la duración
-- desde servicios.duracion_minutos para que el constraint opere sin JOINs.
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS duracion_minutos int NOT NULL DEFAULT 0
        CHECK (duracion_minutos >= 0);

-- ---------------------------------------------------------------------------
-- 3. Función sync_duracion_reserva
-- Copia duracion_minutos desde servicios a reservas en cada INSERT o UPDATE
-- que toque servicio_id, manteniendo la columna desnormalizada consistente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_duracion_reserva()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    SELECT duracion_minutos INTO NEW.duracion_minutos
    FROM public.servicios
    WHERE id = NEW.servicio_id;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger trg_sync_duracion_reserva
-- DROP IF EXISTS + CREATE para idempotencia (Postgres < 17 no tiene
-- CREATE TRIGGER IF NOT EXISTS).
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_duracion_reserva ON public.reservas;

CREATE TRIGGER trg_sync_duracion_reserva
    BEFORE INSERT OR UPDATE OF servicio_id ON public.reservas
    FOR EACH ROW EXECUTE FUNCTION public.sync_duracion_reserva();

-- ---------------------------------------------------------------------------
-- 5. Backfill: poblar duracion_minutos en reservas ya existentes
-- Solo actualiza filas con duracion_minutos = 0 (valor default inicial).
-- ---------------------------------------------------------------------------
UPDATE public.reservas r
SET duracion_minutos = s.duracion_minutos
FROM public.servicios s
WHERE r.servicio_id = s.id
  AND r.duracion_minutos = 0;

-- ---------------------------------------------------------------------------
-- 6. Constraint EXCLUDE USING gist
-- Compara intervalos [inicio, inicio+duración) entre reservas del mismo
-- peluquero; las canceladas quedan fuera del check (cláusula WHERE).
-- Idempotente: el DO-block verifica pg_constraint antes de agregar.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname    = 'reservas_no_overlap'
          AND conrelid   = 'public.reservas'::regclass
    ) THEN
        ALTER TABLE public.reservas
            ADD CONSTRAINT reservas_no_overlap
            EXCLUDE USING gist (
                peluquero_id WITH =,
                tstzrange(
                    fecha_hora,
                    fecha_hora + (duracion_minutos * interval '1 minute'),
                    '[)'
                ) WITH &&
            )
            WHERE (estado <> 'cancelada');
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Comentario sobre el constraint
-- ---------------------------------------------------------------------------
COMMENT ON CONSTRAINT reservas_no_overlap ON public.reservas IS
    'Impide solapamiento real de reservas del mismo peluquero. '
    'Compara intervalos [fecha_hora, fecha_hora + duracion_minutos) con tstzrange. '
    'Las reservas canceladas quedan excluidas del check (cláusula WHERE). '
    'Requiere extensión btree_gist y columna desnormalizada duracion_minutos '
    '(mantenida por trigger trg_sync_duracion_reserva).';
