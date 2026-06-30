-- =============================================================================
-- MiSillón — Migración 023: RPCs de gestión de barberías para super_admin
-- Todas las funciones son SECURITY DEFINER y validan que el caller sea
-- super_admin antes de operar. Ejecutan como postgres (bypassRLS).
-- Aplicar: psql $DATABASE_URL < 023_admin_rpcs.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: admin_crear_barberia
--
-- Parámetros:
--   nombre        TEXT   — nombre visible de la barbería
--   slug          TEXT   — slug único (URL-safe, sin espacios)
--   tipo_negocio  TEXT   — 'equipo' | 'independiente'
--   contacto      TEXT   — número WhatsApp de contacto
--   descripcion   TEXT   — descripción pública (puede ser vacío)
--   direccion     TEXT   — dirección física (puede ser vacío)
--   dueno_email   TEXT   — email del dueño (opcional). Si existe en auth.users
--                          se asigna como dueno_id. Si no, dueno_id queda NULL.
--
-- Retorno JSON:
--   { "barberia_id": "uuid", "qr_url": "text", "dueno_id": "uuid|null" }
--
-- Errores:
--   'insufficient_privilege' si el caller no es super_admin
--   violaciones de UNIQUE en slug se propagan al caller
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_crear_barberia(
    nombre       TEXT,
    slug         TEXT,
    tipo_negocio TEXT,
    contacto     TEXT,
    descripcion  TEXT    DEFAULT NULL,
    direccion    TEXT    DEFAULT NULL,
    dueno_email  TEXT    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id   uuid := auth.uid();
    v_dueno_id    uuid := NULL;
    v_barberia_id uuid;
    v_qr_url      text;
BEGIN
    -- Guardia: solo super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.super_admins WHERE user_id = v_caller_id
    ) THEN
        RAISE EXCEPTION 'Solo el super_admin puede crear barberías vía RPC.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Resolver dueno_id desde email si se proporcionó
    IF dueno_email IS NOT NULL THEN
        SELECT id INTO v_dueno_id
        FROM auth.users
        WHERE email = dueno_email
        LIMIT 1;
        -- Si no se encuentra el email simplemente queda NULL (se puede asignar después)
    END IF;

    -- Construir QR URL
    v_qr_url := 'https://misillon.com/' || slug;

    -- INSERT barbería con estado='aprobada' directo (admin la aprueba al crear)
    -- Nota: el trigger trg_proteger_estado_barberia solo actúa en UPDATE, no INSERT.
    INSERT INTO public.barberias (
        nombre,
        slug,
        estado,
        tipo_negocio,
        contacto,
        descripcion,
        direccion,
        dueno_id,
        qr_url
    )
    VALUES (
        nombre,
        slug,
        'aprobada',
        tipo_negocio,
        contacto,
        descripcion,
        direccion,
        v_dueno_id,
        v_qr_url
    )
    RETURNING id INTO v_barberia_id;

    RETURN jsonb_build_object(
        'barberia_id', v_barberia_id,
        'qr_url',      v_qr_url,
        'dueno_id',    v_dueno_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_crear_barberia(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_crear_barberia(text, text, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: admin_editar_barberia
--
-- Parámetros (todos opcionales excepto barberia_id):
--   barberia_id   UUID   — ID de la barbería a editar (obligatorio)
--   nombre        TEXT   — nuevo nombre (NULL = no cambiar)
--   slug          TEXT   — nuevo slug (NULL = no cambiar; cuidado: cambia QR)
--   contacto      TEXT   — nuevo contacto
--   descripcion   TEXT   — nueva descripción
--   direccion     TEXT   — nueva dirección
--   estado        TEXT   — nuevo estado ('pendiente'|'aprobada'|'rechazada')
--                          Solo super_admin puede cambiar estado (garantizado
--                          por el trigger trg_proteger_estado_barberia vía
--                          is_super_admin(), que usa auth.uid() del caller).
--
-- Retorno: fila barberias actualizada como JSONB
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_editar_barberia(
    barberia_id  UUID,
    nombre       TEXT DEFAULT NULL,
    slug         TEXT DEFAULT NULL,
    contacto     TEXT DEFAULT NULL,
    descripcion  TEXT DEFAULT NULL,
    direccion    TEXT DEFAULT NULL,
    estado       TEXT DEFAULT NULL
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

    -- UPDATE con patrón COALESCE: solo modifica los campos no-NULL
    -- El trigger trg_proteger_estado_barberia verificará is_super_admin() si
    -- el estado cambia; como el caller es super_admin, auth.uid() lo confirma.
    UPDATE public.barberias
    SET
        nombre      = COALESCE(admin_editar_barberia.nombre,      barberias.nombre),
        slug        = COALESCE(admin_editar_barberia.slug,        barberias.slug),
        contacto    = COALESCE(admin_editar_barberia.contacto,    barberias.contacto),
        descripcion = COALESCE(admin_editar_barberia.descripcion, barberias.descripcion),
        direccion   = COALESCE(admin_editar_barberia.direccion,   barberias.direccion),
        estado      = COALESCE(admin_editar_barberia.estado,      barberias.estado),
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

REVOKE EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: admin_eliminar_barberia
--
-- Parámetros:
--   barberia_id   UUID   — ID de la barbería a eliminar
--
-- ADVERTENCIA: elimina en cascada peluqueros, servicios, disponibilidad,
--              cuentas bancarias, políticas y reservas asociadas.
--              Esta acción es irreversible.
--
-- Retorno: TRUE si se eliminó, FALSE si no existía
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_eliminar_barberia(
    barberia_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_filas     int;
BEGIN
    -- Guardia: solo super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.super_admins WHERE user_id = v_caller_id
    ) THEN
        RAISE EXCEPTION 'Solo el super_admin puede eliminar barberías.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Primero borrar reservas (no tienen CASCADE hacia barberias)
    DELETE FROM public.reservas
    WHERE public.reservas.barberia_id = admin_eliminar_barberia.barberia_id;

    -- Luego borrar la barbería (CASCADE elimina peluqueros y todo lo dependiente)
    DELETE FROM public.barberias
    WHERE id = admin_eliminar_barberia.barberia_id;

    GET DIAGNOSTICS v_filas = ROW_COUNT;

    RETURN v_filas > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_eliminar_barberia(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_eliminar_barberia(uuid) TO authenticated;

-- FIN 023_admin_rpcs.sql
