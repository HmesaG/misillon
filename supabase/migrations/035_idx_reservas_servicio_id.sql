-- =============================================================================
-- MiSillón — Migración 035: Índice en reservas.servicio_id (FK con CASCADE)
-- -----------------------------------------------------------------------------
-- PROBLEMA (auditoría 2026-07-01, BUG 13A): la migración 027 agregó
-- ON DELETE CASCADE a las 3 FKs de reservas (barberia_id, peluquero_id,
-- servicio_id). PostgreSQL NO crea índices automáticamente sobre columnas FK.
-- Sin índice en la columna referenciante, cada DELETE sobre `servicios` obliga
-- a un sequential scan de toda la tabla `reservas` para encontrar las filas a
-- cascadear. A escala (miles de reservas) esto degrada el borrado de un
-- servicio desde el panel del dueño/admin.
--
-- FIX: crear un índice B-tree sobre reservas(servicio_id). Idempotente vía
-- IF NOT EXISTS. Sigue el mismo patrón de los índices ya existentes en 001
-- (idx_reservas_* sobre peluquero_id / fecha_hora).
--
-- Nota: barberia_id y peluquero_id ya cuentan con índices desde 001, así que
-- solo servicio_id quedaba sin cubrir.
--
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_reservas_servicio_id
    ON public.reservas (servicio_id);

-- FIN 035_idx_reservas_servicio_id.sql
