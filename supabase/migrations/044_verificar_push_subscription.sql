-- =============================================================================
-- MiSillón — Migración 044: Verificar existencia de push subscription (BUG 48A)
-- -----------------------------------------------------------------------------
-- CONTEXTO (BUG 48A): estadoNotificaciones() en el frontend decide si el toggle
-- de notificaciones push muestra "activo" leyendo SOLO pushManager.getSubscription()
-- del navegador. Tras una rotación de VAPID keys (commit d70839a), el navegador
-- puede seguir devolviendo una suscripción vieja firmada con la key anterior: el
-- servidor la rechazaría, pero el toggle igual dice "activado" y la fila en
-- push_subscriptions puede no existir o estar desactualizada. El usuario nunca se
-- entera de que tiene que volver a suscribirse.
--
-- FIX (server-side): RPC liviana que dado un peluquero + endpoint responde si esa
-- suscripción realmente está registrada en la BD. El frontend cruza el endpoint
-- local contra este resultado para detectar suscripciones huérfanas/obsoletas y
-- forzar re-suscripción.
--
-- Sigue el patrón de 032: SECURITY DEFINER + guard de ownership
--   EXISTS (SELECT 1 FROM peluqueros p WHERE p.id = p_peluquero_id
--           AND p.user_id = auth.uid())
-- para que un usuario solo pueda consultar el estado de sus propias suscripciones.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run (o db push).
--   NO la aplica dev-senior; la aplica el agente dba en un paso separado.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verificar_push_subscription(
    p_peluquero_id uuid,
    p_endpoint     text
)
RETURNS boolean
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
        RAISE EXCEPTION 'No podés consultar las notificaciones de otro peluquero.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.push_subscriptions ps
        WHERE ps.peluquero_id = p_peluquero_id
          AND ps.endpoint     = p_endpoint
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verificar_push_subscription(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.verificar_push_subscription(uuid, text) TO authenticated;

-- FIN 044_verificar_push_subscription.sql
