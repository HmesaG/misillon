-- =============================================================================
-- MiSillón v1 — Migración 005: Función pública para cuentas en ReservaWizard
-- =============================================================================
-- El ReservaWizard necesita mostrar cuentas bancarias antes de que exista una
-- reserva (y por tanto un token). La tabla no tiene SELECT público por seguridad,
-- así que se expone solo vía esta función SECURITY DEFINER que valida que el
-- peluquero esté activo en una barbería aprobada.

CREATE OR REPLACE FUNCTION public.get_cuentas_for_peluquero(p_peluquero_id uuid)
RETURNS TABLE (
    id            uuid,
    banco         text,
    numero_cuenta text,
    tipo          text,
    titular       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        JOIN public.barberias b ON b.id = p.barberia_id
        WHERE p.id = p_peluquero_id
          AND p.activo = true
          AND b.estado = 'aprobada'
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT cb.id, cb.banco, cb.numero_cuenta, cb.tipo, cb.titular
    FROM public.cuentas_bancarias_peluquero cb
    WHERE cb.peluquero_id = p_peluquero_id
      AND cb.activa = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cuentas_for_peluquero(uuid) TO anon, authenticated;
