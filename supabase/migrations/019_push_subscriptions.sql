-- =============================================================================
-- MiSillón — Migración 019: tabla push_subscriptions para Web Push API
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 018_vincular_peluquero.sql
-- Aplicar: supabase db push   (o: psql $DATABASE_URL < 019_push_subscriptions.sql)
-- =============================================================================
-- Almacena las suscripciones push de los peluqueros (una por dispositivo).
-- La clave única es (peluquero_id, endpoint) — si el mismo dispositivo
-- re-suscribe, upsert_push_subscription actualiza auth/p256dh sin duplicar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLA: push_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id uuid        NOT NULL REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    endpoint     text        NOT NULL,
    auth         text        NOT NULL,
    p256dh       text        NOT NULL,
    user_agent   text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (peluquero_id, endpoint)
);

-- ---------------------------------------------------------------------------
-- RLS: solo el peluquero dueño puede ver/insertar/borrar sus propias subs
-- ---------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename  = 'push_subscriptions'
           AND policyname = 'peluquero gestiona sus subs'
    ) THEN
        CREATE POLICY "peluquero gestiona sus subs"
            ON public.push_subscriptions
            FOR ALL
            USING (
                peluquero_id IN (
                    SELECT id FROM public.peluqueros WHERE user_id = auth.uid()
                )
            )
            WITH CHECK (
                peluquero_id IN (
                    SELECT id FROM public.peluqueros WHERE user_id = auth.uid()
                )
            );
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: guardar/actualizar una suscripción (upsert por endpoint)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
    p_peluquero_id  uuid,
    p_endpoint      text,
    p_auth          text,
    p_p256dh        text,
    p_user_agent    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.push_subscriptions (peluquero_id, endpoint, auth, p256dh, user_agent)
    VALUES (p_peluquero_id, p_endpoint, p_auth, p_p256dh, p_user_agent)
    ON CONFLICT (peluquero_id, endpoint)
    DO UPDATE SET
        auth       = EXCLUDED.auth,
        p256dh     = EXCLUDED.p256dh,
        user_agent = EXCLUDED.user_agent;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_push_subscription(uuid, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.upsert_push_subscription(uuid, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: eliminar una suscripción (cuando el usuario desactiva notificaciones)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_push_subscription(
    p_peluquero_id uuid,
    p_endpoint     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.push_subscriptions
     WHERE peluquero_id = p_peluquero_id
       AND endpoint     = p_endpoint;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text) TO authenticated;

-- FIN 019_push_subscriptions.sql
