-- Seed super_admin para hmesag@gmail.com
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'hmesag@gmail.com'
ON CONFLICT DO NOTHING;
