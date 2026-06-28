-- =============================================================================
-- MiSillón v1 — Migración 012: RPC pública para crear reservas
-- =============================================================================
-- El INSERT directo a 'reservas' como anon falla porque PostgreSQL aplica
-- SELECT RLS al RETURNING de INSERT...RETURNING (requiere política SELECT).
-- Solución: SECURITY DEFINER function que corre como propietario y devuelve
-- el token sin exponer la tabla a reads anónimos arbitrarios.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.crear_reserva_publica(
  p_barberia_id      uuid,
  p_peluquero_id     uuid,
  p_servicio_id      uuid,
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_cliente_email    text,
  p_cliente_direccion text,
  p_es_domicilio     boolean,
  p_fecha_hora       timestamptz
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    uuid;
  v_token uuid;
BEGIN
  -- Validar que el peluquero pertenece a la barbería, está activo y aprobada.
  IF NOT EXISTS (
    SELECT 1 FROM peluqueros p
    JOIN barberias b ON b.id = p.barberia_id
    WHERE p.id          = p_peluquero_id
      AND p.barberia_id = p_barberia_id
      AND p.activo      = true
      AND b.estado      = 'aprobada'
  ) THEN
    RAISE EXCEPTION 'Peluquero o barbería no disponibles.';
  END IF;

  -- Validar que el servicio pertenece al peluquero y está activo.
  IF NOT EXISTS (
    SELECT 1 FROM servicios
    WHERE id           = p_servicio_id
      AND peluquero_id = p_peluquero_id
      AND activo       = true
  ) THEN
    RAISE EXCEPTION 'Servicio no disponible.';
  END IF;

  INSERT INTO reservas (
    barberia_id, peluquero_id, servicio_id,
    cliente_nombre, cliente_telefono, cliente_email,
    cliente_direccion, es_domicilio, fecha_hora
  ) VALUES (
    p_barberia_id, p_peluquero_id, p_servicio_id,
    p_cliente_nombre, p_cliente_telefono, p_cliente_email,
    p_cliente_direccion, p_es_domicilio, p_fecha_hora
  )
  RETURNING id, token INTO v_id, v_token;

  RETURN json_build_object('id', v_id, 'token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.crear_reserva_publica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_reserva_publica TO anon;
GRANT EXECUTE ON FUNCTION public.crear_reserva_publica TO authenticated;
