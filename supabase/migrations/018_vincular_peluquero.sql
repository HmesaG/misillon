-- =============================================================================
-- MiSillón — Migración 018: RPC vincular_peluquero_por_email
-- Vincula un user_id a su fila de peluquero cuando el email coincide.
-- Usado en AuthCallback para Google OAuth de peluqueros de equipo.
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
BEGIN
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
