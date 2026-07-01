-- =============================================================================
-- MiSillón — Migración 027: CASCADE en reservas al borrar barbería/peluquero/servicio
-- PostgreSQL 15+ / Supabase
-- Aplicar: supabase db push   (o: psql $DATABASE_URL < 027_reservas_cascade.sql)
-- =============================================================================
-- PROPÓSITO: El panel admin (super_admin) ahora permite borrar barberías y
-- peluqueros permanentemente. Las FKs de reservas hacia barberias/peluqueros/
-- servicios se crearon en 001_schema.sql sin ON DELETE CASCADE, por lo que
-- cualquier borrado con reservas asociadas fallaba con violación de FK.
-- Decisión (2026-06-30): al borrar una barbería/peluquero/servicio, se borra
-- también su historial de reservas. Es intencional e irreversible.
-- =============================================================================

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_barberia_id_fkey,
    ADD CONSTRAINT reservas_barberia_id_fkey
        FOREIGN KEY (barberia_id) REFERENCES public.barberias(id) ON DELETE CASCADE;

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_peluquero_id_fkey,
    ADD CONSTRAINT reservas_peluquero_id_fkey
        FOREIGN KEY (peluquero_id) REFERENCES public.peluqueros(id) ON DELETE CASCADE;

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_servicio_id_fkey,
    ADD CONSTRAINT reservas_servicio_id_fkey
        FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON DELETE CASCADE;

-- FIN 027_reservas_cascade.sql
