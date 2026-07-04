-- 042: hallazgos menores de UX/calidad de la auditoría QA (Fable 5, 2026-07-04)
-- Agrupa los fixes que requieren SQL de los BUG 34A-45A. Todo idempotente
-- (CREATE OR REPLACE / DROP ... IF EXISTS / CREATE POLICY con drop previo).
-- NO se aplica en esta sesión: queda para que el dba lo revise y lo corra.
--
-- Incluye:
--   BUG 34A — auto-vínculo de peluquero por email: comparar en lower()
--   BUG 35A — admin_editar_barberia: permitir vaciar descripcion/direccion
--   BUG 37A — política peluqueros_select_self (leer la propia fila aunque
--             esté inactiva, para poder avisar "cuenta desactivada")
--   BUG 44A — crear_reserva_publica: límites de longitud en inputs cliente

-- ===========================================================================
-- BUG 34A — Auto-vínculo de peluquero por email, case-insensitive
-- ---------------------------------------------------------------------------
-- Los triggers de la migración 016 comparaban emails con `=` (case-sensitive),
-- inconsistente con vincular_peluquero_por_email (029), que usa lower(). Un
-- peluquero registrado como john@x.com no quedaba vinculado si el dueño cargó
-- John@x.com (o viceversa). Se normaliza con lower() en ambos triggers.
-- Solo se reemplazan las funciones; los triggers de 016 siguen apuntando a
-- ellas, no hace falta recrearlos.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.auto_vincular_peluquero_on_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.peluqueros
  SET user_id = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_vincular_peluquero_on_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND (OLD.email IS DISTINCT FROM NEW.email) THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;
    IF v_user_id IS NOT NULL AND NEW.user_id IS NULL THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===========================================================================
-- BUG 35A — admin_editar_barberia: permitir vaciar descripcion / direccion
-- ---------------------------------------------------------------------------
-- El patrón COALESCE(p, col) trataba NULL como "no cambiar", así que el admin
-- no podía borrar la descripción/dirección desde el modal. Se agregan dos
-- flags booleanos (limpiar_descripcion / limpiar_direccion) que, en true,
-- fuerzan el campo a NULL sin importar el valor de texto recibido.
-- Se DROPea la firma anterior de 7 args para evitar ambigüedad de overload
-- en PostgREST al llamar la RPC por nombre.
-- ===========================================================================
DROP FUNCTION IF EXISTS public.admin_editar_barberia(uuid, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_editar_barberia(
    barberia_id         UUID,
    nombre              TEXT DEFAULT NULL,
    slug                TEXT DEFAULT NULL,
    contacto            TEXT DEFAULT NULL,
    descripcion         TEXT DEFAULT NULL,
    direccion           TEXT DEFAULT NULL,
    estado              TEXT DEFAULT NULL,
    limpiar_descripcion BOOLEAN DEFAULT FALSE,
    limpiar_direccion   BOOLEAN DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_row       public.barberias%ROWTYPE;
BEGIN
    -- Guardia: solo super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.super_admins WHERE user_id = v_caller_id
    ) THEN
        RAISE EXCEPTION 'Solo el super_admin puede editar barberías vía RPC.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Verificar que la barbería existe
    IF NOT EXISTS (SELECT 1 FROM public.barberias WHERE id = barberia_id) THEN
        RAISE EXCEPTION 'Barbería no encontrada: %', barberia_id
            USING ERRCODE = 'no_data_found';
    END IF;

    UPDATE public.barberias
    SET
        nombre      = COALESCE(admin_editar_barberia.nombre,   barberias.nombre),
        slug        = COALESCE(admin_editar_barberia.slug,     barberias.slug),
        contacto    = COALESCE(admin_editar_barberia.contacto, barberias.contacto),
        descripcion = CASE
                        WHEN admin_editar_barberia.limpiar_descripcion THEN NULL
                        ELSE COALESCE(admin_editar_barberia.descripcion, barberias.descripcion)
                      END,
        direccion   = CASE
                        WHEN admin_editar_barberia.limpiar_direccion THEN NULL
                        ELSE COALESCE(admin_editar_barberia.direccion, barberias.direccion)
                      END,
        estado      = COALESCE(admin_editar_barberia.estado,   barberias.estado),
        -- Si cambió el slug, regenerar qr_url
        qr_url      = CASE
                        WHEN admin_editar_barberia.slug IS NOT NULL
                        THEN 'https://misillon.com/' || admin_editar_barberia.slug
                        ELSE barberias.qr_url
                      END
    WHERE id = barberia_id
    RETURNING * INTO v_row;

    RETURN row_to_json(v_row)::jsonb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text, boolean, boolean) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text, boolean, boolean) TO authenticated;

-- ===========================================================================
-- BUG 37A — Política peluqueros_select_self
-- ---------------------------------------------------------------------------
-- peluqueros_select_publico exige activo=true, así que un peluquero
-- desactivado por el dueño no podía leer su propia fila → useAuth no resolvía
-- rol y quedaba en loop de login sin explicación. Esta política permite al
-- peluquero leer SU fila siempre (activo o no), para poder detectar el estado
-- y mostrar "Tu cuenta ha sido desactivada". Las políticas permissive se
-- combinan con OR, así que no afecta el acceso público ni el del dueño.
-- ===========================================================================
DROP POLICY IF EXISTS peluqueros_select_self ON public.peluqueros;
CREATE POLICY peluqueros_select_self ON public.peluqueros
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ===========================================================================
-- BUG 44A — crear_reserva_publica: límites de longitud en inputs del cliente
-- ---------------------------------------------------------------------------
-- La RPC pública (anon) no acotaba el largo de nombre/teléfono/email/dirección,
-- dejando margen a spam/abuso (payloads enormes). Se agregan guards de longitud
-- al inicio. El resto del cuerpo es idéntico a la migración 039 (validación de
-- disponibilidad + futuro + día bloqueado).
-- Límites: nombre<=100, teléfono<=20, email<=150, dirección<=300.
-- ===========================================================================
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

-- FIN 042_fixes_ux_menores_qa_fable.sql
