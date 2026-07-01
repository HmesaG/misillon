-- =============================================================================
-- MiSillón — Seed peligroso (ex-migración 021): Limpieza de datos y seed demo
-- -----------------------------------------------------------------------------
-- ⚠️  ESTE ARCHIVO FUE SACADO A PROPÓSITO DEL FLUJO DE MIGRACIONES.
--
--   * Ya se aplicó UNA vez a producción el 2026-06-30 (figura en el historial
--     schema_migrations como 021_truncate_seed_demo). NO volver a aplicarlo.
--   * Vive en supabase/seeds-peligrosos/ (NO en supabase/migrations/) para que
--     `supabase db push` / el flujo de migraciones NO lo re-ejecute nunca.
--   * BORRA TODA LA PRODUCCIÓN REAL (todas las barberías, peluqueros, servicios,
--     disponibilidad, reservas, cuentas y push_subscriptions). Solo se conservan
--     super_admins y auth.users.
--
-- GUARDA DE SEGURIDAD: el bloque de abajo aborta el script a menos que se setee
-- explícitamente la variable de sesión de confirmación. Para correrlo a propósito
-- (solo en un entorno que querés vaciar) ejecutar ANTES, en la misma sesión:
--     SET app.confirm_wipe = 'si-quiero-borrar-todo';
-- =============================================================================

-- Parte A: elimina todos los datos de barberías y dependientes (sin tocar super_admins).
-- Parte B: inserta dos barberías demo con peluqueros, servicios, disponibilidad y reservas.

BEGIN;

-- ---------------------------------------------------------------------------
-- GUARDA DE SEGURIDAD — abortar salvo confirmación explícita de sesión.
-- Se ejecuta ANTES de cualquier DELETE. Sin la variable de sesión seteada,
-- el script falla acá y el BEGIN/COMMIT hace rollback sin tocar nada.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF current_setting('app.confirm_wipe', true) IS DISTINCT FROM 'si-quiero-borrar-todo' THEN
    RAISE EXCEPTION 'Este script borra TODA la produccion. Para confirmar, ejecutar primero: SET app.confirm_wipe = ''si-quiero-borrar-todo'';';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- PARTE A — Limpieza ordenada por dependencias FK
-- Orden crítico:
--   1. reservas (referencia barberias/peluqueros/servicios sin CASCADE)
--   2. barberias (CASCADE a peluqueros → cuentas, servicios, disponibilidad,
--                 politicas_peluquero, push_subscriptions)
-- ---------------------------------------------------------------------------

DELETE FROM public.reservas;

-- El DELETE en barberias propaga vía ON DELETE CASCADE a:
--   peluqueros → cuentas_bancarias_peluquero
--              → servicios
--              → disponibilidad
--              → politicas_peluquero
--              → push_subscriptions
DELETE FROM public.barberias;

-- ---------------------------------------------------------------------------
-- PARTE B — Seed demo
-- Se obtiene el user_id del super_admin y se usa como dueno_id en ambas
-- barberías. Si no hay super_admin la migración falla con mensaje claro.
-- Los peluqueros de equipo (El Rincón) quedan sin user_id (solo demo visual).
-- Pedro Álvarez (independiente) recibe user_id del super_admin para que el
-- panel independiente muestre reservas al iniciar sesión.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_dueno_id    uuid;

    -- IDs de barberías
    v_bar1_id     uuid;   -- El Rincón del Caballero
    v_bar2_id     uuid;   -- Studio Hair Pedro Álvarez

    -- IDs de peluqueros
    v_carlos_id   uuid;
    v_miguel_id   uuid;
    v_rafael_id   uuid;
    v_pedro_id    uuid;

    -- IDs de servicios de Carlos
    v_c_clasico   uuid;
    v_c_fade      uuid;
    v_c_barba     uuid;
    v_c_combo     uuid;

    -- IDs de servicios de Miguel
    v_m_clasico   uuid;
    v_m_fade      uuid;
    v_m_barba     uuid;
    v_m_combo     uuid;

    -- IDs de servicios de Rafael
    v_r_clasico   uuid;
    v_r_fade      uuid;
    v_r_barba     uuid;
    v_r_combo     uuid;

    -- IDs de servicios de Pedro
    v_p_moderno   uuid;
    v_p_color     uuid;
    v_p_trat      uuid;

BEGIN

    -- Obtener el super_admin registrado
    SELECT user_id INTO v_dueno_id FROM public.super_admins LIMIT 1;

    IF v_dueno_id IS NULL THEN
        RAISE EXCEPTION 'No hay super_admin en la tabla super_admins. '
                        'Aplicar 011_seed_super_admin.sql antes de este seed.';
    END IF;

    -- -----------------------------------------------------------------------
    -- BARBERÍA 1: El Rincón del Caballero (tipo equipo, Santo Domingo)
    -- -----------------------------------------------------------------------
    INSERT INTO public.barberias (
        nombre, slug, estado, tipo_negocio,
        contacto, descripcion, direccion,
        dueno_id, qr_url
    )
    VALUES (
        'El Rincón del Caballero',
        'el-rincon',
        'aprobada',
        'equipo',
        '8096231100',
        'Barbería premium en la Zona Colonial. Cortes clásicos y modernos '
        'por maestros artesanos con más de 15 años de experiencia.',
        'Calle El Conde No. 45, Zona Colonial, Santo Domingo DN',
        v_dueno_id,
        'https://misillon.com/el-rincon'
    )
    RETURNING id INTO v_bar1_id;

    -- -----------------------------------------------------------------------
    -- Peluquero 1: Carlos Méndez
    -- -----------------------------------------------------------------------
    INSERT INTO public.peluqueros (
        barberia_id, slug, nombre, whatsapp, activo, es_dueno_mismo,
        qr_url
    )
    VALUES (
        v_bar1_id, 'carlos-mendez', 'Carlos Méndez',
        '8096231101', true, false,
        'https://misillon.com/el-rincon/carlos-mendez'
    )
    RETURNING id INTO v_carlos_id;

    INSERT INTO public.servicios (peluquero_id, nombre, precio_local, duracion_minutos, activo)
    VALUES
        (v_carlos_id, 'Corte Clásico',      200, 30, true),
        (v_carlos_id, 'Fade + Diseño',       350, 45, true),
        (v_carlos_id, 'Barba + Perfilado',   150, 20, true),
        (v_carlos_id, 'Combo Corte + Barba', 450, 60, true)
    RETURNING id INTO v_c_clasico;   -- solo captura el primero; los demás vía SELECT

    SELECT id INTO v_c_clasico FROM public.servicios
        WHERE peluquero_id = v_carlos_id AND nombre = 'Corte Clásico';
    SELECT id INTO v_c_fade   FROM public.servicios
        WHERE peluquero_id = v_carlos_id AND nombre = 'Fade + Diseño';
    SELECT id INTO v_c_barba  FROM public.servicios
        WHERE peluquero_id = v_carlos_id AND nombre = 'Barba + Perfilado';
    SELECT id INTO v_c_combo  FROM public.servicios
        WHERE peluquero_id = v_carlos_id AND nombre = 'Combo Corte + Barba';

    -- Disponibilidad Carlos: Lun–Sáb 09:00–18:00 (dia_semana 0=domingo)
    INSERT INTO public.disponibilidad (peluquero_id, dia_semana, hora_inicio, hora_fin)
    VALUES
        (v_carlos_id, 1, '09:00', '18:00'),
        (v_carlos_id, 2, '09:00', '18:00'),
        (v_carlos_id, 3, '09:00', '18:00'),
        (v_carlos_id, 4, '09:00', '18:00'),
        (v_carlos_id, 5, '09:00', '18:00'),
        (v_carlos_id, 6, '09:00', '18:00');

    -- -----------------------------------------------------------------------
    -- Peluquero 2: Miguel Santos
    -- -----------------------------------------------------------------------
    INSERT INTO public.peluqueros (
        barberia_id, slug, nombre, whatsapp, activo, es_dueno_mismo,
        qr_url
    )
    VALUES (
        v_bar1_id, 'miguel-santos', 'Miguel Santos',
        '8096231102', true, false,
        'https://misillon.com/el-rincon/miguel-santos'
    )
    RETURNING id INTO v_miguel_id;

    INSERT INTO public.servicios (peluquero_id, nombre, precio_local, duracion_minutos, activo)
    VALUES
        (v_miguel_id, 'Corte Clásico',      200, 30, true),
        (v_miguel_id, 'Fade + Diseño',       350, 45, true),
        (v_miguel_id, 'Barba + Perfilado',   150, 20, true),
        (v_miguel_id, 'Combo Corte + Barba', 450, 60, true);

    SELECT id INTO v_m_clasico FROM public.servicios
        WHERE peluquero_id = v_miguel_id AND nombre = 'Corte Clásico';
    SELECT id INTO v_m_fade   FROM public.servicios
        WHERE peluquero_id = v_miguel_id AND nombre = 'Fade + Diseño';
    SELECT id INTO v_m_barba  FROM public.servicios
        WHERE peluquero_id = v_miguel_id AND nombre = 'Barba + Perfilado';
    SELECT id INTO v_m_combo  FROM public.servicios
        WHERE peluquero_id = v_miguel_id AND nombre = 'Combo Corte + Barba';

    INSERT INTO public.disponibilidad (peluquero_id, dia_semana, hora_inicio, hora_fin)
    VALUES
        (v_miguel_id, 1, '09:00', '18:00'),
        (v_miguel_id, 2, '09:00', '18:00'),
        (v_miguel_id, 3, '09:00', '18:00'),
        (v_miguel_id, 4, '09:00', '18:00'),
        (v_miguel_id, 5, '09:00', '18:00'),
        (v_miguel_id, 6, '09:00', '18:00');

    -- -----------------------------------------------------------------------
    -- Peluquero 3: Rafael Jiménez
    -- -----------------------------------------------------------------------
    INSERT INTO public.peluqueros (
        barberia_id, slug, nombre, whatsapp, activo, es_dueno_mismo,
        qr_url
    )
    VALUES (
        v_bar1_id, 'rafael-jimenez', 'Rafael Jiménez',
        '8096231103', true, false,
        'https://misillon.com/el-rincon/rafael-jimenez'
    )
    RETURNING id INTO v_rafael_id;

    INSERT INTO public.servicios (peluquero_id, nombre, precio_local, duracion_minutos, activo)
    VALUES
        (v_rafael_id, 'Corte Clásico',      200, 30, true),
        (v_rafael_id, 'Fade + Diseño',       350, 45, true),
        (v_rafael_id, 'Barba + Perfilado',   150, 20, true),
        (v_rafael_id, 'Combo Corte + Barba', 450, 60, true);

    SELECT id INTO v_r_clasico FROM public.servicios
        WHERE peluquero_id = v_rafael_id AND nombre = 'Corte Clásico';
    SELECT id INTO v_r_fade   FROM public.servicios
        WHERE peluquero_id = v_rafael_id AND nombre = 'Fade + Diseño';
    SELECT id INTO v_r_barba  FROM public.servicios
        WHERE peluquero_id = v_rafael_id AND nombre = 'Barba + Perfilado';
    SELECT id INTO v_r_combo  FROM public.servicios
        WHERE peluquero_id = v_rafael_id AND nombre = 'Combo Corte + Barba';

    INSERT INTO public.disponibilidad (peluquero_id, dia_semana, hora_inicio, hora_fin)
    VALUES
        (v_rafael_id, 1, '09:00', '18:00'),
        (v_rafael_id, 2, '09:00', '18:00'),
        (v_rafael_id, 3, '09:00', '18:00'),
        (v_rafael_id, 4, '09:00', '18:00'),
        (v_rafael_id, 5, '09:00', '18:00'),
        (v_rafael_id, 6, '09:00', '18:00');

    -- -----------------------------------------------------------------------
    -- BARBERÍA 2: Studio Hair Pedro Álvarez (tipo independiente, Santiago)
    -- -----------------------------------------------------------------------
    INSERT INTO public.barberias (
        nombre, slug, estado, tipo_negocio,
        contacto, descripcion, direccion,
        dueno_id, qr_url
    )
    VALUES (
        'Studio Hair Pedro Álvarez',
        'studio-pedro',
        'aprobada',
        'independiente',
        '8093454422',
        'Estudio de peluquería moderna en Santiago. Especialidad en coloración '
        'y tratamientos capilares premium para cabello dañado y teñido.',
        'Av. Juan Pablo Duarte No. 289, Santiago de los Caballeros',
        v_dueno_id,
        'https://misillon.com/studio-pedro'
    )
    RETURNING id INTO v_bar2_id;

    -- Peluquero Pedro Álvarez (es_dueno_mismo=true, user_id del super_admin para demo)
    INSERT INTO public.peluqueros (
        barberia_id, user_id, slug, nombre, whatsapp,
        activo, es_dueno_mismo, qr_url
    )
    VALUES (
        v_bar2_id,
        v_dueno_id,
        'pedro-alvarez',
        'Pedro Álvarez',
        '8093454422',
        true,
        true,
        'https://misillon.com/studio-pedro'
    )
    RETURNING id INTO v_pedro_id;

    INSERT INTO public.servicios (peluquero_id, nombre, precio_local, duracion_minutos, activo)
    VALUES
        (v_pedro_id, 'Corte Moderno',       250,  30, true),
        (v_pedro_id, 'Coloración',           800,  90, true),
        (v_pedro_id, 'Tratamiento Capilar',  400,  45, true);

    SELECT id INTO v_p_moderno FROM public.servicios
        WHERE peluquero_id = v_pedro_id AND nombre = 'Corte Moderno';
    SELECT id INTO v_p_color  FROM public.servicios
        WHERE peluquero_id = v_pedro_id AND nombre = 'Coloración';
    SELECT id INTO v_p_trat   FROM public.servicios
        WHERE peluquero_id = v_pedro_id AND nombre = 'Tratamiento Capilar';

    -- Disponibilidad Pedro: Mar–Sáb 10:00–19:00
    INSERT INTO public.disponibilidad (peluquero_id, dia_semana, hora_inicio, hora_fin)
    VALUES
        (v_pedro_id, 2, '10:00', '19:00'),   -- martes
        (v_pedro_id, 3, '10:00', '19:00'),   -- miércoles
        (v_pedro_id, 4, '10:00', '19:00'),   -- jueves
        (v_pedro_id, 5, '10:00', '19:00'),   -- viernes
        (v_pedro_id, 6, '10:00', '19:00');   -- sábado

    -- -----------------------------------------------------------------------
    -- RESERVAS DEMO — próximos 7 días (desde 2026-06-30)
    -- Fechas calculadas en hora local America/Santo_Domingo (UTC-4 fijo).
    -- El trigger trg_sync_reserva_duracion_fin calcula duracion_minutos y
    -- fecha_hora_fin automáticamente desde el servicio referenciado.
    -- -----------------------------------------------------------------------

    -- 2026-07-01 (miércoles) 10:00 DR — Carlos, Corte Clásico (30 min)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar1_id, v_carlos_id, v_c_clasico,
        'Andrés Reyes', '8091234567', 'andres.reyes@demo.misillon.com',
        false,
        ('2026-07-01 10:00:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'confirmada'
    );

    -- 2026-07-01 (miércoles) 11:00 DR — Carlos, Combo Corte+Barba (60 min, hasta 12:00)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar1_id, v_carlos_id, v_c_combo,
        'José Martínez', '8097654321', 'jose.martinez@demo.misillon.com',
        false,
        ('2026-07-01 11:00:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'pendiente'
    );

    -- 2026-07-02 (jueves) 09:30 DR — Miguel, Fade+Diseño (45 min)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar1_id, v_miguel_id, v_m_fade,
        'Luis Taveras', '8094561234', 'luis.taveras@demo.misillon.com',
        false,
        ('2026-07-02 09:30:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'confirmada'
    );

    -- 2026-07-02 (jueves) 14:00 DR — Rafael, Barba+Perfilado (20 min)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar1_id, v_rafael_id, v_r_barba,
        'William Sánchez', '8093217654', 'william.sanchez@demo.misillon.com',
        false,
        ('2026-07-02 14:00:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'pendiente'
    );

    -- 2026-07-03 (viernes) 15:00 DR — Pedro, Coloración (90 min)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar2_id, v_pedro_id, v_p_color,
        'María García', '8096543210', 'maria.garcia@demo.misillon.com',
        false,
        ('2026-07-03 15:00:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'confirmada'
    );

    -- 2026-07-04 (sábado) 10:30 DR — Pedro, Corte Moderno (30 min)
    INSERT INTO public.reservas (
        barberia_id, peluquero_id, servicio_id,
        cliente_nombre, cliente_telefono, cliente_email,
        es_domicilio, fecha_hora, estado
    ) VALUES (
        v_bar2_id, v_pedro_id, v_p_moderno,
        'Ana Ramírez', '8099876543', 'ana.ramirez@demo.misillon.com',
        false,
        ('2026-07-04 10:30:00'::timestamp AT TIME ZONE 'America/Santo_Domingo'),
        'pendiente'
    );

END;
$$;

COMMIT;

-- FIN 021_truncate_seed_demo.sql
