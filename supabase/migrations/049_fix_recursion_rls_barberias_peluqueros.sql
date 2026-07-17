-- =============================================================================
-- MiSillón — Migración 049: Fix P0 — recursión infinita en RLS (barberias/peluqueros)
-- Aplicar: Supabase Studio → SQL Editor → pegar y Run (o `supabase db push`)
-- -----------------------------------------------------------------------------
-- INCIDENTE P0 (2026-07-17): la migración 048 creó dos políticas TO authenticated
-- que se referencian mutuamente:
--   - barberias_select_propio_peluquero (en barberias) hace EXISTS contra peluqueros
--   - peluqueros_select_dueno (en peluqueros) hace EXISTS contra barberias
-- Evaluar RLS de barberias dispara RLS de peluqueros, que vuelve a disparar RLS
-- de barberias → recursión infinita (Postgres 42P17: infinite recursion detected
-- in policy for relation "barberias"). Rompe TODO SELECT de barberias/peluqueros
-- para el rol authenticated → panel completo caído (dueño, independiente,
-- peluquero, super_admin).
--
-- Reproducido y confirmado simulando la sesión del super_admin real:
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claims', ...);
--   SELECT id, nombre, slug FROM public.barberias ORDER BY created_at DESC;
--   → ERROR: 42P17: infinite recursion detected in policy for relation "barberias"
--
-- FIX: mismo patrón ya usado en este proyecto para is_super_admin() (002_rls.sql)
-- — dos funciones SECURITY DEFINER que rompen el ciclo. Al ejecutarse como el
-- owner de las tablas (no como el rol authenticated que disparó la query), sus
-- subqueries internas NO vuelven a evaluar RLS, cortando la recursión.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Funciones SECURITY DEFINER que rompen el ciclo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_peluquero_de_barberia(p_barberia_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.peluqueros p
    WHERE p.barberia_id = p_barberia_id
      AND p.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.es_peluquero_de_barberia(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.es_peluquero_de_barberia(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.es_dueno_de_barberia(p_barberia_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barberias b
    WHERE b.id = p_barberia_id
      AND b.dueno_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.es_dueno_de_barberia(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.es_dueno_de_barberia(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Reemplazar las 2 políticas que causaban el ciclo, usando las funciones
--    en lugar de EXISTS directo contra la tabla ajena.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "barberias_select_propio_peluquero" ON public.barberias;
CREATE POLICY "barberias_select_propio_peluquero"
    ON public.barberias FOR SELECT
    TO authenticated
    USING (public.es_peluquero_de_barberia(id));

DROP POLICY IF EXISTS "peluqueros_select_dueno" ON public.peluqueros;
CREATE POLICY "peluqueros_select_dueno"
    ON public.peluqueros FOR SELECT
    TO authenticated
    USING (public.es_dueno_de_barberia(barberia_id));

-- FIN 049_fix_recursion_rls_barberias_peluqueros.sql
