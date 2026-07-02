-- =============================================================================
-- MiSillón — Migración 037: Dropear índice redundante idx_peluqueros_user
-- -----------------------------------------------------------------------------
-- PROBLEMA (auditoría 2026-07-01, BUG 15A): la migración 001 creó
--   CREATE INDEX idx_peluqueros_user ON public.peluqueros(user_id);
-- La migración 028 (peluquero_user_unico) creó DESPUÉS un índice ÚNICO parcial
-- sobre la misma columna:
--   CREATE UNIQUE INDEX peluqueros_user_id_unico ON public.peluqueros (user_id)
--     WHERE user_id IS NOT NULL;
--
-- Ambos indexan user_id. Todas las lecturas del proyecto sobre peluqueros por
-- user_id filtran filas con user_id NOT NULL (useAuth busca el peluquero del
-- usuario logueado, cuyo user_id nunca es NULL), así que el índice único parcial
-- de 028 cubre esas queries igual de bien. El índice no-único de 001 quedó
-- redundante: solo suma overhead de escritura y espacio, sin aportar un plan de
-- consulta que 028 no cubra ya.
--
-- FIX: DROP INDEX IF EXISTS idx_peluqueros_user. Seguro porque:
--   - No es un constraint (es un índice plano, no respalda PK/UNIQUE/FK).
--   - La unicidad de user_id la garantiza peluqueros_user_id_unico (028), intacto.
--
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

DROP INDEX IF EXISTS public.idx_peluqueros_user;

-- FIN 037_drop_idx_peluqueros_user.sql
