-- =============================================================================
-- MiSillón — Migración 043: Reparar publicación supabase_realtime nunca aplicada
--
-- HALLAZGO: la migración 022_realtime.sql figuraba en schema_migrations como
-- aplicada (rango 021-026, reconciliado manualmente en la sesión 2026-07-01),
-- pero pg_publication_tables confirmó que supabase_realtime NUNCA tuvo tablas
-- agregadas en producción. Mismo patrón de causa raíz que BUG 46A
-- (dias_bloqueados): reconciliación de schema_migrations sin verificación
-- post-reconciliación contra el schema real.
--
-- IMPACTO: NuevaReservaAviso / useRealtimeReservas.js se suscribía a canales
-- que nunca recibían eventos (payload vacío silencioso, sin error visible),
-- por eso "el realtime no funciona" en el panel de dueño/peluquero.
--
-- Este archivo es idéntico a 022_realtime.sql (mismo bloque idempotente) y
-- documenta la re-ejecución real contra producción del 2026-07-04. Es
-- IF NOT EXISTS en las 4 tablas, así que es seguro re-aplicar aunque el
-- historial ya marque 022 como "aplicada".
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'barberias'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.barberias;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'peluqueros'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.peluqueros;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'disponibilidad'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disponibilidad;
    END IF;
END;
$$;

-- FIN 043_fix_realtime_publication_nunca_aplicada.sql
