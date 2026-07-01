-- =============================================================================
-- MiSillón — Migración 022: Habilitar Supabase Realtime en tablas clave
-- Agrega las tablas al publication supabase_realtime para que el cliente JS
-- pueda suscribirse a cambios via supabase.channel().on('postgres_changes', ...).
-- Idempotente: verifica pg_publication_tables antes de agregar cada tabla.
-- Aplicar: psql $DATABASE_URL < 022_realtime.sql
-- =============================================================================

DO $$
BEGIN

    -- reservas: el peluquero recibe notificaciones de nuevas citas en tiempo real
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname   = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename  = 'reservas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas;
        RAISE NOTICE 'Realtime habilitado en: reservas';
    ELSE
        RAISE NOTICE 'Realtime ya estaba activo en: reservas';
    END IF;

    -- barberias: el super_admin ve cambios de estado (aprobada/rechazada) en vivo
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname   = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename  = 'barberias'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.barberias;
        RAISE NOTICE 'Realtime habilitado en: barberias';
    ELSE
        RAISE NOTICE 'Realtime ya estaba activo en: barberias';
    END IF;

    -- peluqueros: el dueño ve cuando se activa/desactiva un peluquero
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname   = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename  = 'peluqueros'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.peluqueros;
        RAISE NOTICE 'Realtime habilitado en: peluqueros';
    ELSE
        RAISE NOTICE 'Realtime ya estaba activo en: peluqueros';
    END IF;

    -- disponibilidad: la página pública y el wizard pueden reaccionar a cambios
    -- de horario sin recargar (tabla llamada "disponibilidad" en 001_schema.sql)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname   = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename  = 'disponibilidad'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.disponibilidad;
        RAISE NOTICE 'Realtime habilitado en: disponibilidad';
    ELSE
        RAISE NOTICE 'Realtime ya estaba activo en: disponibilidad';
    END IF;

END;
$$;

-- FIN 022_realtime.sql
