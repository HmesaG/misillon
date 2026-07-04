-- 039: crear_reserva_publica ahora valida server-side que la fecha sea
-- futura y que el horario caiga dentro de la disponibilidad semanal
-- configurada por el peluquero. Antes solo src/utils/slots.js filtraba
-- esto en el cliente; la RPC pública (SECURITY DEFINER, otorgada a anon)
-- confiaba en que el frontend solo mandara slots válidos, dejando un
-- bypass server-side para quien llame la RPC directo (curl/consola).
--
-- El constraint EXCLUDE USING gist (migración 006) solo previene
-- solapamiento entre reservas, no rechaza horarios fuera de rango o en
-- el pasado, por lo que este guard es complementario, no redundante.

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

  -- Guard nuevo (039): rechazar horarios en el pasado.
  IF p_fecha_hora <= now() THEN
    RAISE EXCEPTION 'Ese horario ya pasó.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Guard nuevo (039): rechazar horarios fuera de la disponibilidad
  -- semanal configurada por el peluquero (dia_semana + franja horaria
  -- que alcance a cubrir toda la duración del servicio).
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
$function$;
