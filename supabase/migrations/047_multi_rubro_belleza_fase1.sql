-- =============================================================================
-- MiSillón — Migración 047: Multi-rubro de belleza (Fase 1)
-- Aplicar después de 046_auto_aprobar_reservas_peluquero.sql
-- Aplicar: Supabase Studio → SQL Editor → pegar y Run
--   (o `npx supabase db push` si la red no bloquea el puerto de Postgres)
-- -----------------------------------------------------------------------------
-- DECISIÓN YA TOMADA (no reabrir): el "rubro" vive en `barberias` (el negocio),
-- no en `peluqueros`, porque el independiente ya ES una barbería de 1 y los
-- reportes/registro operan a nivel barbería.
--
-- Verificado antes de escribir esta migración:
--   - `registrar_negocio` (firma actual, migración 040): (text nombre, text slug,
--     text contacto, text tipo_negocio, uuid dueno_id) → RETURNS json. Se DROPea
--     esa firma explícita y se crea una nueva de 7 params (mismo patrón que
--     admin_editar_barberia en 042), para no dejar overload viejo accesible.
--   - Esquema de `barberias` (001): sin columna de rubro todavía.
--   - Patrón de ownership de otras RPCs (029, 040): auth.uid() contra dueno_id
--     o contra peluqueros.user_id.
--   - Idempotencia: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
--     CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS + CREATE POLICY.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabla: rubros
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rubros (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  text NOT NULL UNIQUE,
    icono   text NOT NULL,   -- nombre de ícono Lucide en PascalCase (ej. "Scissors")
    orden   int  NOT NULL,
    activo  bool NOT NULL DEFAULT true
);

ALTER TABLE public.rubros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rubros_select_publico ON public.rubros;
CREATE POLICY rubros_select_publico
    ON public.rubros FOR SELECT
    TO anon, authenticated
    USING (activo);

-- Sin política de escritura: se gestiona por migración/admin directo (service_role).

-- Seed idempotente (ON CONFLICT sobre el UNIQUE de nombre)
INSERT INTO public.rubros (nombre, icono, orden, activo) VALUES
    ('Peluquería / Barbería',          'Scissors',      1, true),
    ('Uñas / Manicure y Pedicure',     'Sparkles',      2, true),
    ('Maquillaje',                     'Palette',       3, true),
    ('Pestañas y cejas',               'Eye',           4, true),
    ('Estética / Spa',                 'Flower2',       5, true),
    ('Otro',                           'MoreHorizontal',6, true)
ON CONFLICT (nombre) DO UPDATE SET
    icono  = EXCLUDED.icono,
    orden  = EXCLUDED.orden,
    activo = EXCLUDED.activo;

-- ---------------------------------------------------------------------------
-- 2. Tabla: servicio_plantillas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicio_plantillas (
    id                        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    rubro_id                  uuid    NOT NULL REFERENCES public.rubros(id) ON DELETE CASCADE,
    nombre                    text    NOT NULL,
    duracion_sugerida_min     int     NOT NULL CHECK (duracion_sugerida_min > 0),
    precio_sugerido           numeric NULL,
    orden                     int     NOT NULL,
    activo                    bool    NOT NULL DEFAULT true
);

ALTER TABLE public.servicio_plantillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS servicio_plantillas_select_publico ON public.servicio_plantillas;
CREATE POLICY servicio_plantillas_select_publico
    ON public.servicio_plantillas FOR SELECT
    TO anon, authenticated
    USING (activo);

-- Seed idempotente: borra y re-inserta las plantillas de los rubros con seed
-- (evita duplicados en re-ejecución sin depender de UNIQUE compuesto).
DO $$
DECLARE
    v_unas         uuid := (SELECT id FROM public.rubros WHERE nombre = 'Uñas / Manicure y Pedicure');
    v_maquillaje   uuid := (SELECT id FROM public.rubros WHERE nombre = 'Maquillaje');
    v_pestanas     uuid := (SELECT id FROM public.rubros WHERE nombre = 'Pestañas y cejas');
    v_estetica     uuid := (SELECT id FROM public.rubros WHERE nombre = 'Estética / Spa');
BEGIN
    DELETE FROM public.servicio_plantillas
    WHERE rubro_id IN (v_unas, v_maquillaje, v_pestanas, v_estetica);

    INSERT INTO public.servicio_plantillas (rubro_id, nombre, duracion_sugerida_min, precio_sugerido, orden, activo) VALUES
        -- Uñas / Manicure y Pedicure
        (v_unas, 'Manicure clásico', 45, NULL, 1, true),
        (v_unas, 'Pedicure',         60, NULL, 2, true),
        (v_unas, 'Acrílicas',        90, NULL, 3, true),
        (v_unas, 'Gel',              75, NULL, 4, true),
        (v_unas, 'Retoque',          45, NULL, 5, true),
        (v_unas, 'Diseño',           30, NULL, 6, true),
        -- Maquillaje
        (v_maquillaje, 'Social',            60,  NULL, 1, true),
        (v_maquillaje, 'Novia',             120, NULL, 2, true),
        (v_maquillaje, 'Prueba de novia',   60,  NULL, 3, true),
        (v_maquillaje, 'Eventos',           75,  NULL, 4, true),
        -- Pestañas y cejas
        (v_pestanas, 'Extensión clásica', 90,  NULL, 1, true),
        (v_pestanas, 'Volumen',           120, NULL, 2, true),
        (v_pestanas, 'Retoque',           60,  NULL, 3, true),
        (v_pestanas, 'Laminado',          45,  NULL, 4, true),
        (v_pestanas, 'Henna',             30,  NULL, 5, true),
        -- Estética / Spa
        (v_estetica, 'Facial',                 60, NULL, 1, true),
        (v_estetica, 'Limpieza profunda',      75, NULL, 2, true),
        (v_estetica, 'Depilación por zona',    30, NULL, 3, true),
        (v_estetica, 'Masaje',                 60, NULL, 4, true);
    -- "Peluquería / Barbería" y "Otro" quedan sin plantillas a propósito.
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Columnas de rubro en barberias
-- ---------------------------------------------------------------------------
ALTER TABLE public.barberias
    ADD COLUMN IF NOT EXISTS rubro_principal_id  uuid NULL REFERENCES public.rubros(id),
    ADD COLUMN IF NOT EXISTS rubro_secundario_id uuid NULL REFERENCES public.rubros(id);

-- Backfill: negocios existentes se asumen "Peluquería / Barbería" (rubro histórico único)
UPDATE public.barberias
SET rubro_principal_id = (SELECT id FROM public.rubros WHERE nombre = 'Peluquería / Barbería')
WHERE rubro_principal_id IS NULL;

-- Ahora que todas las filas tienen valor, forzar NOT NULL
ALTER TABLE public.barberias
    ALTER COLUMN rubro_principal_id SET NOT NULL;

-- El secundario no puede repetir el principal
ALTER TABLE public.barberias
    DROP CONSTRAINT IF EXISTS ck_barberias_rubro_secundario_distinto;
ALTER TABLE public.barberias
    ADD CONSTRAINT ck_barberias_rubro_secundario_distinto
    CHECK (rubro_secundario_id IS NULL OR rubro_secundario_id IS DISTINCT FROM rubro_principal_id);

CREATE INDEX IF NOT EXISTS idx_barberias_rubro_principal  ON public.barberias(rubro_principal_id);
CREATE INDEX IF NOT EXISTS idx_barberias_rubro_secundario ON public.barberias(rubro_secundario_id);

-- ---------------------------------------------------------------------------
-- 4. RPC registrar_negocio — agrega rubro_principal/secundario
-- Firma vieja (040): (text, text, text, text, uuid) → se DROPea explícitamente
-- para no dejar el overload viejo accesible (mismo patrón que 042 con
-- admin_editar_barberia / BUG 35A-47A).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.registrar_negocio(text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.registrar_negocio(
    p_nombre               text,
    p_slug                 text,
    p_contacto             text,
    p_tipo_negocio         text,
    p_dueno_id             uuid,
    p_rubro_principal_id   uuid,
    p_rubro_secundario_id  uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_barberia_id  uuid;
    v_peluquero_id uuid := NULL;
BEGIN
    IF p_dueno_id IS NULL THEN
        RAISE EXCEPTION 'p_dueno_id no puede ser NULL'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_dueno_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'No podés registrar un negocio a nombre de otro usuario.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Guard nuevo: el rubro principal debe existir y estar activo.
    IF NOT EXISTS (
        SELECT 1 FROM public.rubros WHERE id = p_rubro_principal_id AND activo = true
    ) THEN
        RAISE EXCEPTION 'Rubro principal inválido.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Guard nuevo: si viene secundario, también debe existir/estar activo y ser distinto del principal.
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

    INSERT INTO public.barberias (
        nombre,
        slug,
        estado,
        tipo_negocio,
        contacto,
        dueno_id,
        rubro_principal_id,
        rubro_secundario_id
    )
    VALUES (
        p_nombre,
        p_slug,
        'aprobada',
        p_tipo_negocio,
        p_contacto,
        p_dueno_id,
        p_rubro_principal_id,
        p_rubro_secundario_id
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
$function$;

REVOKE EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.registrar_negocio(text, text, text, text, uuid, uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC opcional: activar_plantillas_servicio
-- Crea servicios reales en `servicios` a partir de plantillas elegidas.
-- Ownership: caller debe ser el propio peluquero (user_id) o el dueño de la
-- barbería a la que pertenece (mismo patrón que reservas_select_dueno, 040).
-- Esquema real de `servicios` verificado (001): nombre NOT NULL,
-- duracion_minutos NOT NULL CHECK>0, precio_local/precio_domicilio nullable,
-- ofrece_domicilio NOT NULL DEFAULT false, activo NOT NULL DEFAULT true.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activar_plantillas_servicio(
    p_peluquero_id  uuid,
    p_plantilla_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_count int := 0;
BEGIN
    IF p_plantilla_ids IS NULL OR array_length(p_plantilla_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'creados', 0);
    END IF;

    -- Guard de ownership: caller es el propio peluquero, o el dueño de su barbería.
    IF NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        WHERE p.id = p_peluquero_id
          AND p.user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM public.peluqueros p
        JOIN public.barberias b ON b.id = p.barberia_id
        WHERE p.id = p_peluquero_id
          AND b.dueno_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No tenés permisos sobre este peluquero.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    WITH creados AS (
        INSERT INTO public.servicios (
            peluquero_id, nombre, precio_local, precio_domicilio,
            duracion_minutos, ofrece_domicilio, activo
        )
        SELECT
            p_peluquero_id,
            sp.nombre,
            NULL,
            NULL,
            sp.duracion_sugerida_min,
            false,
            true
        FROM public.servicio_plantillas sp
        WHERE sp.id = ANY(p_plantilla_ids)
          AND sp.activo = true
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM creados;

    RETURN jsonb_build_object('ok', true, 'creados', v_count);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.activar_plantillas_servicio(uuid, uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.activar_plantillas_servicio(uuid, uuid[]) TO authenticated;

-- FIN 047_multi_rubro_belleza_fase1.sql
