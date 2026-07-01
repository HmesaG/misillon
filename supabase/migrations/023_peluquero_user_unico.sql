-- =============================================================================
-- MiSillón — Migración 023: un user_id no puede estar vinculado a >1 peluquero
-- PostgreSQL 15+ / Supabase
-- Aplicar: supabase db push
-- =============================================================================
-- PROPÓSITO: El panel del dueño permite vincular su propia cuenta a un peluquero
-- para gestionar su agenda. Nada impedía a nivel de BD vincular el mismo user_id
-- a 2+ peluqueros, lo que rompía la resolución de rol en useAuth (maybeSingle
-- devolvía "multiple rows" y el rol de peluquero se perdía silenciosamente).
-- Esta migración agrega la última línea de defensa server-side: un índice único
-- parcial que garantiza a lo sumo un peluquero por user_id (NULL sin restricción,
-- para peluqueros aún no reclamados).
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS peluqueros_user_id_unico
    ON public.peluqueros (user_id)
    WHERE user_id IS NOT NULL;

-- FIN 023_peluquero_user_unico.sql
