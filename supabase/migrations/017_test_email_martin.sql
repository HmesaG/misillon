-- Agrega email de prueba a Martín López para poder probar el flujo
-- de registro de peluquero de equipo (auto-link por email).
UPDATE public.peluqueros
SET email = 'martin@elrincon.com'
WHERE slug = 'martin-lopez'
  AND email IS NULL;
