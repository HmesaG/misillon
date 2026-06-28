-- =============================================================================
-- MiSillón v1 — Migración 009: auto-aprobación de barberías en registro
-- Las barberías nuevas arrancan en 'aprobada' directamente.
-- =============================================================================
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
    IF p_dueno_id IS NULL THEN
        RAISE EXCEPTION 'p_dueno_id no puede ser NULL'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

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
        'aprobada',
        p_tipo_negocio,
        p_contacto,
        p_dueno_id
    )
    RETURNING id INTO v_barberia_id;

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

    RETURN json_build_object(
        'barberia_id',  v_barberia_id,
        'peluquero_id', v_peluquero_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid) TO authenticated;
