-- =============================================================================
-- MiSillón v1 — Migración 013: Usuario de prueba para panel de peluquero
-- =============================================================================
-- Crea una cuenta Auth para testear el panel del peluquero sin pasar por el
-- flujo de registro completo. Se vincula a Martín López (seed el-rincon).
-- Credenciales: martin@elrincon.com / peluquero123
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verificar si ya existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'martin@elrincon.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, aud, role,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'martin@elrincon.com',
      extensions.crypt('peluquero123', extensions.gen_salt('bf')),
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}',
      '{}', now(), now()
    );
  END IF;

    -- Identity requerida por GoTrue para email/password
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_user_id, 'martin@elrincon.com', 'email',
      json_build_object('sub', v_user_id::text, 'email', 'martin@elrincon.com'),
      now(), now(), now()
    );
  END IF;

  -- Vincular al peluquero Martín López (seed el-rincon)
  UPDATE public.peluqueros
  SET user_id = v_user_id
  WHERE id = 'aaaa0001-0000-0000-0000-000000000001';
END;
$$;
