-- =============================================================================
-- MiSillón — Migración 050: rubro en RPCs de admin (BUG detectado post-047/048)
-- Aplicar después de 049_fix_recursion_rls_barberias_peluqueros.sql
-- Aplicar: `npx supabase db push` (o Supabase Studio → SQL Editor si el CLI
-- no puede conectar)
-- -----------------------------------------------------------------------------
-- CONTEXTO (no reabrir, ya diagnosticado):
-- La migración 047 agregó `barberias.rubro_principal_id uuid NOT NULL` (sin
-- default) y actualizó `registrar_negocio` (RPC de autorregistro público) para
-- incluirlo, pero NUNCA tocó `admin_crear_barberia` ni `admin_editar_barberia`
-- (las RPCs del panel /admin usado por super_admin). Resultado: cualquier
-- llamado a `admin_crear_barberia` desde hoy falla con violación NOT NULL
-- porque su INSERT no setea `rubro_principal_id`. `admin_editar_barberia`
-- tampoco permite cambiar el rubro de un negocio existente.
--
-- Firmas verificadas antes de escribir esta migración:
--   - admin_crear_barberia (023): (text, text, text, text, text, text, text)
--     = nombre, slug, tipo_negocio, contacto, descripcion, direccion, dueno_email
--   - admin_editar_barberia (última en 042): (uuid, text, text, text, text,
--     text, text, boolean, boolean) = barberia_id, nombre, slug, contacto,
--     descripcion, direccion, estado, limpiar_descripcion, limpiar_direccion
--   - Guard de rubro (patrón exacto a replicar, de 047/registrar_negocio):
--     EXISTS(SELECT 1 FROM rubros WHERE id = ... AND activo = true)
--   - Nombres de parámetro pedidos por consistencia con registrar_negocio (047):
--     p_rubro_principal_id, p_rubro_secundario_id DEFAULT NULL
--   - Patrón de DROP explícito de firma vieja + CREATE de la nueva: igual que
--     hicieron 042 (admin_editar_barberia) y 047 (registrar_negocio), para no
--     dejar overloads viejos accesibles vía PostgREST.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_crear_barberia — agrega p_rubro_principal_id (requerido) y
--    p_rubro_secundario_id (opcional).
--    Nota de orden: Postgres exige que todo parámetro sin DEFAULT preceda a
--    los que sí tienen DEFAULT. Por eso p_rubro_principal_id se inserta
--    después de `contacto` (último requerido de la firma vieja) y antes de
--    los tres que ya eran opcionales (descripcion/direccion/dueno_email).
--    p_rubro_secundario_id va al final, opcional.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_crear_barberia(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_crear_barberia(
    nombre                  TEXT,
    slug                    TEXT,
    tipo_negocio            TEXT,
    contacto                TEXT,
    p_rubro_principal_id    uuid,
    descripcion             TEXT DEFAULT NULL,
    direccion               TEXT DEFAULT NULL,
    dueno_email             TEXT DEFAULT NULL,
    p_rubro_secundario_id   uuid DEFAULT NULL
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

    -- Guard (050): el rubro principal debe existir y estar activo (mismo
    -- patrón que registrar_negocio en 047).
    IF NOT EXISTS (
        SELECT 1 FROM public.rubros WHERE id = p_rubro_principal_id AND activo = true
    ) THEN
        RAISE EXCEPTION 'Rubro principal inválido.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Guard (050): si viene secundario, debe existir/estar activo y ser
    -- distinto del principal (la constraint ck_barberias_rubro_secundario_distinto
    -- de 047 lo reforzaría igual, pero acá damos un mensaje más claro antes
    -- del INSERT).
    IF p_rubro_secundario_id IS NOT NULL THEN
        IF p_rubro_secundario_id = p_rubro_principal_id THEN
            RAISE EXCEPTION 'El rubro secundario no puede ser igual al principal.'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.rubros WHERE id = p_rubro_secundario_id AND activo = true
        ) THEN
            RAISE EXCEPTION 'Rubro secundario inválido.'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
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
        qr_url,
        rubro_principal_id,
        rubro_secundario_id
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
        v_qr_url,
        p_rubro_principal_id,
        p_rubro_secundario_id
    )
    RETURNING id INTO v_barberia_id;

    RETURN jsonb_build_object(
        'barberia_id', v_barberia_id,
        'qr_url',      v_qr_url,
        'dueno_id',    v_dueno_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_crear_barberia(text, text, text, text, uuid, text, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_crear_barberia(text, text, text, text, uuid, text, text, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. admin_editar_barberia — agrega p_rubro_principal_id y
--    p_rubro_secundario_id, ambos DEFAULT NULL (mismo patrón "NULL = no
--    cambiar" que nombre/slug/contacto/estado ya usan en esta función).
--    Van al final de la firma existente (después de limpiar_direccion), ya
--    que todos los parámetros de ahí en adelante ya tenían DEFAULT.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_editar_barberia(uuid, text, text, text, text, text, text, boolean, boolean);

CREATE OR REPLACE FUNCTION public.admin_editar_barberia(
    barberia_id           UUID,
    nombre                TEXT DEFAULT NULL,
    slug                  TEXT DEFAULT NULL,
    contacto              TEXT DEFAULT NULL,
    descripcion           TEXT DEFAULT NULL,
    direccion             TEXT DEFAULT NULL,
    estado                TEXT DEFAULT NULL,
    limpiar_descripcion   BOOLEAN DEFAULT FALSE,
    limpiar_direccion     BOOLEAN DEFAULT FALSE,
    p_rubro_principal_id  uuid DEFAULT NULL,
    p_rubro_secundario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id             uuid := auth.uid();
    v_row                   public.barberias%ROWTYPE;
    v_efectivo_principal    uuid;
    v_efectivo_secundario   uuid;
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

    -- Guard (050): si viene rubro principal, validar que exista y esté activo.
    IF p_rubro_principal_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.rubros WHERE id = p_rubro_principal_id AND activo = true
        ) THEN
            RAISE EXCEPTION 'Rubro principal inválido.'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
    END IF;

    -- Guard (050): si viene rubro secundario, validar que exista y esté activo.
    IF p_rubro_secundario_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.rubros WHERE id = p_rubro_secundario_id AND activo = true
        ) THEN
            RAISE EXCEPTION 'Rubro secundario inválido.'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
    END IF;

    -- Guard (050): calcular valores efectivos (nuevo si vino, si no el
    -- existente) y rechazar con mensaje claro si terminarían siendo iguales.
    -- La constraint ck_barberias_rubro_secundario_distinto (047) es la última
    -- línea de defensa, pero acá damos un error más legible antes del UPDATE.
    SELECT
        COALESCE(admin_editar_barberia.p_rubro_principal_id,  b.rubro_principal_id),
        COALESCE(admin_editar_barberia.p_rubro_secundario_id, b.rubro_secundario_id)
    INTO v_efectivo_principal, v_efectivo_secundario
    FROM public.barberias b
    WHERE b.id = admin_editar_barberia.barberia_id;

    IF v_efectivo_secundario IS NOT NULL AND v_efectivo_secundario = v_efectivo_principal THEN
        RAISE EXCEPTION 'El rubro secundario no puede ser igual al principal.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- UPDATE con patrón COALESCE: solo modifica los campos no-NULL
    -- El trigger trg_proteger_estado_barberia verificará is_super_admin() si
    -- el estado cambia; como el caller es super_admin, auth.uid() lo confirma.
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
        rubro_principal_id  = COALESCE(admin_editar_barberia.p_rubro_principal_id,  barberias.rubro_principal_id),
        rubro_secundario_id = COALESCE(admin_editar_barberia.p_rubro_secundario_id, barberias.rubro_secundario_id),
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

REVOKE EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text, boolean, boolean, uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_editar_barberia(uuid, text, text, text, text, text, text, boolean, boolean, uuid, uuid) TO authenticated;

-- FIN 050_rubro_en_admin_rpcs.sql
