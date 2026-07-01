-- =============================================================================
-- MiSillón — Migración 029: Fix seguridad vincular_peluquero_por_email
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): la función 018 es SECURITY DEFINER y
-- otorgada a `authenticated`, pero NO valida que p_user_id sea el caller ni que
-- p_email sea el email real del caller. Cualquier usuario logueado podía llamarla
-- con su propio uid y el email de un peluquero no reclamado para apropiarse de
-- esa fila (account takeover / toma de cuenta ajena).
--
-- FIX: se agrega al inicio del body la validación de que p_user_id = auth.uid()
-- y de que p_email coincide (case-insensitive) con el email real de auth.users
-- para ese auth.uid(). El resto de la lógica queda idéntico a 018.
--
-- El flujo legítimo (AuthCallback.jsx → onboarding Google de peluquero de equipo)
-- ya pasa p_user_id = uid de la sesión y p_email = session.user.email, por lo que
-- este guard no lo rompe.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vincular_peluquero_por_email(
    p_user_id uuid,
    p_email   text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated int;
    v_caller_email text;
BEGIN
    -- Guard 1: p_user_id debe ser el caller autenticado.
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'No podés vincular una cuenta que no es la tuya.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Guard 2: p_email debe coincidir (case-insensitive) con el email real
    -- del caller en auth.users. Impide reclamar filas con un email ajeno.
    SELECT email INTO v_caller_email
    FROM auth.users
    WHERE id = auth.uid();

    IF v_caller_email IS NULL
       OR lower(v_caller_email) IS DISTINCT FROM lower(p_email) THEN
        RAISE EXCEPTION 'El email no coincide con tu cuenta.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Lógica original (018): vincular la fila de peluquero no reclamada.
    UPDATE public.peluqueros
       SET user_id = p_user_id
     WHERE lower(email) = lower(p_email)
       AND user_id IS NULL
       AND activo = true;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.vincular_peluquero_por_email(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.vincular_peluquero_por_email(uuid, text) TO authenticated;

-- FIN 029_fix_vincular_peluquero_auth.sql
