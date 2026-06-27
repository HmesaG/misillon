-- =============================================================================
-- MiSillón v1 — Migración 003: Seed Super Admins
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 002_rls.sql
-- Aplicar: psql $DATABASE_URL < 003_super_admins.sql
--
-- NOTA IMPORTANTE:
--   El INSERT usa auth.users para resolver el UUID por email.
--   Esto solo funcionará si el usuario hmesag@gmail.com ya tiene
--   una cuenta creada en Supabase Auth ANTES de aplicar esta migración.
--
--   Si el usuario aún no existe:
--     1. Crear la cuenta en Supabase Auth (Dashboard > Authentication > Users)
--        o via: SELECT supabase_admin.create_user(email := 'hmesag@gmail.com', ...)
--     2. Luego re-ejecutar este script.
--
--   Alternativa manual (si ya conocés el UUID):
--     INSERT INTO public.super_admins (user_id) VALUES ('<uuid-aqui>') ON CONFLICT DO NOTHING;
-- =============================================================================

-- La tabla ya fue creada en 002_rls.sql junto con is_super_admin().
-- Este archivo solo contiene el seed.

-- Seed: primer Super Admin
INSERT INTO public.super_admins (user_id)
SELECT id
FROM   auth.users
WHERE  email = 'hmesag@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Verificación: imprimir cuántos admins quedaron
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.super_admins;
    RAISE NOTICE 'super_admins activos: %', v_count;

    IF v_count = 0 THEN
        RAISE WARNING
            'No se insertó ningún super admin. '
            'Asegurate de que hmesag@gmail.com tenga cuenta en Supabase Auth antes de ejecutar este script.';
    END IF;
END;
$$;

-- FIN 003_super_admins.sql
