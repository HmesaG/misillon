-- =============================================================================
-- MiSillón v1 — Migración 008: RPC registrar_negocio (registro atómico)
-- PostgreSQL 15+ / Supabase
-- Aplicar después de 007_barberia_info.sql
-- Aplicar: mysql -u user -p db < 008_registro_atomico.sql
--   (Supabase Studio: SQL Editor → Run)
--   (psql): psql $DATABASE_URL < 008_registro_atomico.sql
-- =============================================================================
-- PROPÓSITO: Resolver BUG-23 — estado limbo en registro de tipo independiente.
-- AuthCallback.jsx hacía dos INSERTs separados (barberias → peluqueros). Si el
-- segundo fallaba, quedaba una barbería huérfana sin peluquero. El usuario tenía
-- cuenta Auth + barbería en BD pero useAuth no encontraba su peluquero → panel
-- irrecuperable sin intervención manual.
-- Esta función ejecuta ambos INSERTs en una sola transacción plpgsql. Cualquier
-- error en cualquier punto hace rollback automático de toda la transacción.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCIÓN: registrar_negocio
--
-- PARÁMETROS:
--   p_nombre        TEXT   — nombre visible de la barbería / peluquero
--   p_slug          TEXT   — slug único (URL-safe). Se usa en barberias.slug y,
--                            si es independiente, también en peluqueros.slug
--   p_contacto      TEXT   — número de WhatsApp (guardado en ambas tablas)
--   p_tipo_negocio  TEXT   — 'equipo' | 'independiente'
--   p_dueno_id      UUID   — auth.uid() del usuario que se acaba de registrar
--
-- RETORNO JSON:
--   { "barberia_id": "uuid", "peluquero_id": "uuid" }   -- tipo independiente
--   { "barberia_id": "uuid", "peluquero_id": null  }   -- tipo equipo
--
-- ERRORES (se propagan al cliente como PostgreSQL exceptions):
--   - 'invalid_parameter_value' si p_dueno_id es NULL
--   - cualquier violación de UNIQUE / FK se propaga y hace rollback automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_negocio(
    p_nombre       TEXT,
    p_slug         TEXT,
    p_contacto     TEXT,
    p_tipo_negocio TEXT,
    p_dueno_id     UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_barberia_id  uuid;
    v_peluquero_id uuid := NULL;
BEGIN
    -- ------------------------------------------------------------------
    -- Guardia: dueno_id nunca puede ser NULL
    -- ------------------------------------------------------------------
    IF p_dueno_id IS NULL THEN
        RAISE EXCEPTION 'p_dueno_id no puede ser NULL'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- ------------------------------------------------------------------
    -- 1. INSERT barberias
    -- estado arranca en 'pendiente' (valor por defecto del schema).
    -- Si p_slug ya existe → violación UNIQUE → exception → rollback.
    -- ------------------------------------------------------------------
    INSERT INTO public.barberias (
        nombre,
        slug,
        estado,
        tipo_negocio,
        contacto,
        dueno_id
    )
    VALUES (
        p_nombre,
        p_slug,
        'pendiente',
        p_tipo_negocio,
        p_contacto,
        p_dueno_id
    )
    RETURNING id INTO v_barberia_id;

    -- ------------------------------------------------------------------
    -- 2. INSERT peluqueros (solo para tipo independiente)
    -- slug del peluquero == slug de la barbería: el independiente es su
    -- propia URL. Si falla (slug duplicado dentro de la barbería, FK, etc.)
    -- → exception → rollback automático del INSERT de barberias.
    -- ------------------------------------------------------------------
    IF p_tipo_negocio = 'independiente' THEN
        INSERT INTO public.peluqueros (
            barberia_id,
            user_id,
            slug,
            nombre,
            whatsapp,
            activo,
            es_dueno_mismo
        )
        VALUES (
            v_barberia_id,
            p_dueno_id,
            p_slug,
            p_nombre,
            p_contacto,
            true,
            true
        )
        RETURNING id INTO v_peluquero_id;
    END IF;

    -- ------------------------------------------------------------------
    -- 3. Retornar IDs al caller
    -- ------------------------------------------------------------------
    RETURN json_build_object(
        'barberia_id',  v_barberia_id,
        'peluquero_id', v_peluquero_id
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- PERMISOS
-- Supabase otorga EXECUTE a PUBLIC en funciones nuevas por defecto.
-- Se revoca de PUBLIC (incluye anon) y se otorga solo a authenticated.
-- La función usa SECURITY DEFINER, por lo que se ejecuta con los privilegios
-- del owner (postgres) y no necesita permisos DML directos del caller.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid) TO authenticated;

-- FIN 008_registro_atomico.sql
