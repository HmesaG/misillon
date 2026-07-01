-- =============================================================================
-- MiSillón — Migración 031: Fix seguridad crear_reserva_publica (días bloqueados)
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): la RPC pública crear_reserva_publica
-- (012) es SECURITY DEFINER y otorgada a anon/authenticated, pero NO valida
-- contra la tabla dias_bloqueados (024). El único filtro de días bloqueados
-- vive en el frontend (src/utils/slots.js), que simplemente no ofrece slots en
-- esas fechas. Un cliente puede llamar la RPC directo (curl / consola) con un
-- p_fecha_hora en un día que el peluquero marcó como bloqueado (vacaciones,
-- feriado, enfermedad) y crear una reserva igual. Bypass de reglas de negocio.
--
-- FIX: se agrega, antes del INSERT, un guard que rechaza la reserva si existe
-- una fila en dias_bloqueados para ese peluquero_id y la fecha (en hora local
-- DR) de p_fecha_hora. La fecha se calcula como
--   (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::date
-- para que coincida exactamente con cómo se guardan/comparan las fechas
-- bloqueadas en el resto del proyecto (slots.js y get_dias_bloqueados operan
-- todos en hora DR). Usar ::date crudo sobre el timestamptz compararía en UTC y
-- podría desfasar un día cerca de medianoche.
--
-- El resto de la lógica (validación de peluquero/barbería/servicio, INSERT y
-- retorno del token) queda IDÉNTICO a 012. El flujo legítimo del ReservaWizard
-- nunca ofrece slots en días bloqueados, así que este guard no lo rompe.
--
-- NOTA: la disponibilidad semanal (tabla disponibilidad) sigue validándose solo
-- en el frontend; el double-booking real ya está blindado en BD por el
-- constraint EXCLUDE USING gist de la migración 006. Esta migración cierra
-- puntualmente el bypass de días bloqueados, que era el hueco server-side.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
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

  -- Guard nuevo (031): rechazar si el día está bloqueado para ese peluquero.
  -- La fecha se evalúa en hora DR para coincidir con dias_bloqueados / slots.js.
  IF EXISTS (
    SELECT 1 FROM dias_bloqueados db
    WHERE db.peluquero_id = p_peluquero_id
      AND db.fecha = (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::date
  ) THEN
    RAISE EXCEPTION 'Ese día no está disponible.'
      USING ERRCODE = 'invalid_parameter_value';
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

-- FIN 031_fix_crear_reserva_dias_bloqueados.sql
