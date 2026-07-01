-- =============================================================================
-- MiSillón — Migración 032: Fix IDOR en push subscriptions
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): las RPCs upsert_push_subscription y
-- delete_push_subscription (019) son SECURITY DEFINER, otorgadas a
-- `authenticated`, y aceptan un p_peluquero_id ARBITRARIO sin validar que ese
-- peluquero sea el del caller. Al correr como owner, bypassean la RLS de la
-- tabla push_subscriptions. Consecuencias:
--   - upsert: un usuario registra su propio endpoint bajo el peluquero_id de
--     OTRO peluquero → empieza a recibir las notificaciones push de las reservas
--     ajenas (fuga de actividad / IDOR de escritura).
--   - delete: un usuario borra suscripciones de otro peluquero (DoS de sus
--     notificaciones).
--
-- FIX: se agrega al inicio de ambas funciones el guard de ownership
--   EXISTS (SELECT 1 FROM peluqueros p
--           WHERE p.id = p_peluquero_id AND p.user_id = auth.uid())
-- Si no se cumple → RAISE EXCEPTION 'insufficient_privilege'. El resto del
-- cuerpo (upsert por (peluquero_id, endpoint) / delete por endpoint) queda
-- IDÉNTICO a 019.
--
-- Flujo legítimo: src/hooks/usePushNotifications.js pasa siempre el id del
-- peluquero logueado (el que resuelve useAuth), por lo que el guard no lo rompe.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: upsert_push_subscription (con guard de ownership)
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
    -- Guard de ownership: el caller debe ser el peluquero de p_peluquero_id.
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        WHERE p.id = p_peluquero_id
          AND p.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No podés gestionar las notificaciones de otro peluquero.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

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
-- RPC: delete_push_subscription (con guard de ownership)
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
    -- Guard de ownership: el caller debe ser el peluquero de p_peluquero_id.
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        WHERE p.id = p_peluquero_id
          AND p.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No podés gestionar las notificaciones de otro peluquero.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    DELETE FROM public.push_subscriptions
     WHERE peluquero_id = p_peluquero_id
       AND endpoint     = p_endpoint;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text) TO authenticated;

-- FIN 032_fix_push_subscriptions_idor.sql
