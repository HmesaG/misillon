-- =============================================================================
-- MiSillón v1 — Migración 046: auto-aprobación de reservas por peluquero
-- =============================================================================
-- Contexto de negocio:
--   Cada PELUQUERO (fila de public.peluqueros) puede activar
--   `auto_aprobar_reservas` para que sus reservas públicas nuevas se creen
--   directamente en estado 'confirmada' en lugar de 'pendiente', saltando la
--   aprobación manual.
--
--   Regla dura: si el peluquero tiene AL MENOS UNA cuenta bancaria activa
--   (public.cuentas_bancarias_peluquero.activa = true), NUNCA puede tener
--   auto_aprobar_reservas = true. Cuenta activa implica cobro de anticipo, y
--   el peluquero necesita revisar cada reserva antes de comprometerse.
--
--   Defensa en profundidad (no confiar solo en el frontend):
--     1) Trigger BEFORE INSERT/UPDATE en peluqueros: si intentan poner
--        auto_aprobar_reservas = true teniendo cuenta activa, se fuerza a
--        false silenciosamente (no se aborta la transacción — el frontend
--        debe leer el valor real devuelto por el UPDATE/RPC, no asumir que
--        lo que mandó quedó guardado tal cual).
--     2) Trigger AFTER INSERT/UPDATE en cuentas_bancarias_peluquero: al
--        activarse una cuenta, resetea auto_aprobar_reservas = false en el
--        peluquero dueño de esa cuenta si estaba en true.
--     3) crear_reserva_publica vuelve a chequear ambas condiciones (columna +
--        ausencia de cuenta activa) antes de decidir el estado inicial de la
--        reserva, aunque los triggers ya lo garanticen — barato y evita
--        depender de un solo mecanismo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columna nueva en peluqueros
-- ---------------------------------------------------------------------------
ALTER TABLE public.peluqueros
  ADD COLUMN IF NOT EXISTS auto_aprobar_reservas boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2) Trigger BEFORE INSERT/UPDATE en peluqueros:
--    defensa en profundidad — nunca permitir auto_aprobar_reservas = true
--    si existe una cuenta bancaria activa para ese peluquero.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_auto_aprobar_reservas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auto_aprobar_reservas = true THEN
    IF EXISTS (
      SELECT 1
      FROM public.cuentas_bancarias_peluquero cb
      WHERE cb.peluquero_id = NEW.id
        AND cb.activa = true
    ) THEN
      -- No RAISE: se corrige silenciosamente. El frontend debe confiar en el
      -- valor real devuelto por la operación, no en lo que intentó mandar.
      NEW.auto_aprobar_reservas := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_auto_aprobar_reservas ON public.peluqueros;
CREATE TRIGGER trg_validar_auto_aprobar_reservas
  BEFORE INSERT OR UPDATE ON public.peluqueros
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_auto_aprobar_reservas();

-- ---------------------------------------------------------------------------
-- 3) Trigger AFTER INSERT/UPDATE en cuentas_bancarias_peluquero:
--    si se activa una cuenta, resetear auto_aprobar_reservas = false en el
--    peluquero correspondiente (si estaba en true).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resetear_auto_aprobar_por_cuenta_activa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activa = true THEN
    UPDATE public.peluqueros
    SET auto_aprobar_reservas = false
    WHERE id = NEW.peluquero_id
      AND auto_aprobar_reservas = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resetear_auto_aprobar_por_cuenta_activa ON public.cuentas_bancarias_peluquero;
CREATE TRIGGER trg_resetear_auto_aprobar_por_cuenta_activa
  AFTER INSERT OR UPDATE ON public.cuentas_bancarias_peluquero
  FOR EACH ROW
  EXECUTE FUNCTION public.resetear_auto_aprobar_por_cuenta_activa();

-- ---------------------------------------------------------------------------
-- 4) crear_reserva_publica: mismo cuerpo vigente (migración 042), agregando
--    el chequeo de auto-aprobación antes del INSERT final. El estado inicial
--    de la reserva es 'confirmada' cuando el peluquero tiene
--    auto_aprobar_reservas = true Y no tiene ninguna cuenta activa; 'pendiente'
--    en cualquier otro caso (columna reservas.estado ya tenía default
--    'pendiente' desde 001_schema.sql, con CHECK que ya incluye 'confirmada').
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_reserva_publica(
  p_barberia_id uuid,
  p_peluquero_id uuid,
  p_servicio_id uuid,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_cliente_email text,
  p_cliente_direccion text,
  p_es_domicilio boolean,
  p_fecha_hora timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id    uuid;
  v_token uuid;
  v_duracion int;
  v_dia_semana int;
  v_hora_local time;
  v_auto_aprobar boolean;
  v_tiene_cuenta_activa boolean;
  v_estado_inicial text;
BEGIN
  -- Guard (044): límites de longitud de los inputs del cliente.
  IF char_length(coalesce(p_cliente_nombre, ''))    > 100 THEN
    RAISE EXCEPTION 'El nombre es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_telefono, ''))  > 20 THEN
    RAISE EXCEPTION 'El teléfono es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_email, ''))     > 150 THEN
    RAISE EXCEPTION 'El email es demasiado largo.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF char_length(coalesce(p_cliente_direccion, '')) > 300 THEN
    RAISE EXCEPTION 'La dirección es demasiado larga.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

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
  SELECT duracion_minutos INTO v_duracion
  FROM servicios
  WHERE id           = p_servicio_id
    AND peluquero_id = p_peluquero_id
    AND activo       = true;

  IF v_duracion IS NULL THEN
    RAISE EXCEPTION 'Servicio no disponible.';
  END IF;

  -- Guard (031): rechazar si el día está bloqueado para ese peluquero.
  IF EXISTS (
    SELECT 1 FROM dias_bloqueados db
    WHERE db.peluquero_id = p_peluquero_id
      AND db.fecha = (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::date
  ) THEN
    RAISE EXCEPTION 'Ese día no está disponible.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Guard (039): rechazar horarios en el pasado.
  IF p_fecha_hora <= now() THEN
    RAISE EXCEPTION 'Ese horario ya pasó.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Guard (039): rechazar horarios fuera de la disponibilidad semanal.
  v_dia_semana := EXTRACT(DOW FROM (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo'))::int;
  v_hora_local := (p_fecha_hora AT TIME ZONE 'America/Santo_Domingo')::time;

  IF NOT EXISTS (
    SELECT 1 FROM disponibilidad d
    WHERE d.peluquero_id = p_peluquero_id
      AND d.dia_semana   = v_dia_semana
      AND v_hora_local >= d.hora_inicio
      AND (v_hora_local + (v_duracion || ' minutes')::interval) <= d.hora_fin
  ) THEN
    RAISE EXCEPTION 'Ese horario está fuera de la disponibilidad del peluquero.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- (046) Auto-aprobación: solo si el flag está activo Y no hay cuenta activa.
  -- Chequeo redundante con los triggers de peluqueros/cuentas_bancarias, pero
  -- barato y es defensa adicional ante cualquier vía que los haya evitado.
  SELECT p.auto_aprobar_reservas INTO v_auto_aprobar
  FROM peluqueros p
  WHERE p.id = p_peluquero_id;

  SELECT EXISTS (
    SELECT 1 FROM cuentas_bancarias_peluquero cb
    WHERE cb.peluquero_id = p_peluquero_id
      AND cb.activa = true
  ) INTO v_tiene_cuenta_activa;

  IF coalesce(v_auto_aprobar, false) = true AND v_tiene_cuenta_activa = false THEN
    v_estado_inicial := 'confirmada';
  ELSE
    v_estado_inicial := 'pendiente';
  END IF;

  INSERT INTO reservas (
    barberia_id, peluquero_id, servicio_id,
    cliente_nombre, cliente_telefono, cliente_email,
    cliente_direccion, es_domicilio, fecha_hora, estado
  ) VALUES (
    p_barberia_id, p_peluquero_id, p_servicio_id,
    p_cliente_nombre, p_cliente_telefono, p_cliente_email,
    p_cliente_direccion, p_es_domicilio, p_fecha_hora, v_estado_inicial
  )
  RETURNING id, token INTO v_id, v_token;

  RETURN json_build_object('id', v_id, 'token', v_token);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.crear_reserva_publica TO anon;
GRANT EXECUTE ON FUNCTION public.crear_reserva_publica TO authenticated;

-- FIN 046_auto_aprobar_reservas_peluquero.sql
