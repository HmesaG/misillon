-- =============================================================================
-- MiSillón v1 — Migración 021: DELETE de barberías para Super Admin
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 020_webhook_notify_peluquero.sql
-- Aplicar: supabase db push
-- =============================================================================
--
-- CONTEXTO: en 002_rls.sql el Super Admin recibió SELECT + UPDATE sobre
-- public.barberias (políticas "barberias_select_superadmin" y
-- "barberias_update_superadmin"), pero NO se creó una política DELETE.
-- El panel /admin necesita poder borrar una barbería completa (borra en
-- cascada peluqueros/servicios/disponibilidad/politicas/cuentas/reservas
-- vía ON DELETE CASCADE definido en 001_schema.sql).
--
-- Esta migración es ADITIVA: solo agrega el permiso DELETE al Super Admin.
-- No modifica ni relaja ninguna política existente.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "barberias_delete_superadmin" ON public.barberias;

CREATE POLICY "barberias_delete_superadmin"
    ON public.barberias FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- FIN 021_admin_delete_barberias.sql
