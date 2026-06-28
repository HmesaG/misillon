-- =============================================================================
-- MiSillón v1 — Migración 014: Usuario de prueba para panel de dueño
-- =============================================================================
-- Crea cuenta Auth para Barbería El Rincón (tipo_negocio = 'equipo').
-- Credenciales: dueno@elrincon.com / dueno123
-- Incluye registro en auth.identities para evitar fallo de login.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_barberia_id uuid;
BEGIN
  -- Obtener ID de la barbería
  SELECT id INTO v_barberia_id FROM public.barberias WHERE slug = 'el-rincon';

  -- Verificar si el usuario ya existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'dueno@elrincon.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, aud, role,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      created_at, updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'dueno@elrincon.com',
      extensions.crypt('dueno123', extensions.gen_salt('bf')),
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{}',
      '', '', '', '',
      now(), now()
    );

    -- Identity requerida por GoTrue para email/password
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'dueno@elrincon.com', 'email',
      json_build_object('sub', v_user_id::text, 'email', 'dueno@elrincon.com'),
      now(), now(), now()
    );
  END IF;

  -- Asignar como dueño de la barbería
  UPDATE public.barberias
  SET dueno_id = v_user_id
  WHERE id = v_barberia_id;
END;
$$;
