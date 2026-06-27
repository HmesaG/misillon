-- =============================================================================
-- MiSillón v1 — Migración 007: columnas de información pública de barbería
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 006_no_overlap.sql
-- Aplicar: psql $DATABASE_URL < 007_barberia_info.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLA: barberias
-- Se agregan dos columnas opcionales de información pública:
--   - descripcion: texto libre con la propuesta de valor de la barbería
--   - direccion:   dirección física del local (aplica solo a barberías presenciales)
--
-- Ambas son NULL por defecto (opcionales). No requieren cambio en RLS:
-- la política "barberias_select_publico" ya cubre SELECT en toda la tabla
-- para barberías aprobadas, y "barberias_update_dueno" ya permite al dueño
-- editar su propia fila.
-- ---------------------------------------------------------------------------
ALTER TABLE public.barberias
    ADD COLUMN IF NOT EXISTS descripcion text,
    ADD COLUMN IF NOT EXISTS direccion   text;

-- FIN 007_barberia_info.sql
