-- =============================================================================
-- MiSillón — Migración 033: Fix autenticación Edge Function notify-peluquero
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): el trigger notify_peluquero_on_reserva
-- (020) invoca la Edge Function notify-peluquero vía net.http_post SIN header de
-- Authorization. La función (supabase/functions/notify-peluquero/index.ts) no
-- verifica el caller y dispara web-push a los peluqueros con el payload recibido.
-- Cualquiera que descubra la URL pública
--   https://avvmgeufrnusjopdydie.supabase.co/functions/v1/notify-peluquero
-- puede POSTear un payload arbitrario (peluquero_id + textos) y disparar push
-- notifications FALSAS a los dispositivos de los peluqueros (spam / phishing).
--
-- FIX (dos capas):
--   1) Autenticar la invocación: el trigger ahora manda
--      Authorization: Bearer <service_role_key>. Sin un patrón previo de secretos
--      en triggers, se usa Supabase Vault (recomendado): la clave se lee de
--      vault.decrypted_secrets. El trigger es SECURITY DEFINER (corre como owner)
--      y puede leer el Vault.
--   2) Exigir JWT en la función: en supabase/config.toml se agrega
--      [functions.notify-peluquero] verify_jwt = true, para que Supabase rechace
--      las requests sin un JWT/servicio válido en el borde, antes de ejecutar el
--      código.
--
-- El resto de la lógica del trigger (payload {type, record}, EXCEPTION que traga
-- errores para no bloquear el INSERT de la reserva) queda IDÉNTICO a 020.
--
-- -----------------------------------------------------------------------------
-- ⚠️ PASO MANUAL REQUERIDO (sin esto, la notificación deja de dispararse):
-- Antes/después de aplicar esta migración, Héctor debe guardar el service_role
-- key en Supabase Vault con el nombre 'service_role_key'. En Supabase Studio →
-- SQL Editor, ejecutar UNA vez (reemplazando el valor real de la key, que está
-- en Dashboard → Settings → API → service_role):
--
--   SELECT vault.create_secret(
--     '<SERVICE_ROLE_KEY_REAL>',   -- valor secreto
--     'service_role_key',          -- nombre que este trigger busca
--     'Service role key para invocar Edge Functions desde triggers'
--   );
--
-- Si el secreto ya existe y hay que rotarlo:
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'service_role_key'),
--     '<SERVICE_ROLE_KEY_NUEVO>'
--   );
--
-- Por qué no se pudo automatizar aquí: el service_role key es un secreto que NO
-- debe quedar en un archivo de migración versionado en git. Debe cargarse a mano
-- una sola vez en el Vault. Si el secreto NO existe, el trigger detecta la clave
-- nula y NO hace el POST (fail-closed): mejor no notificar que notificar sin
-- autenticación. Esto no bloquea la creación de la reserva.
--
-- Idempotente: CREATE OR REPLACE FUNCTION (el trigger ya existe desde 020).
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_peluquero_on_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_key text;
BEGIN
  -- Leer el service_role key desde Supabase Vault (ver PASO MANUAL en el header).
  SELECT decrypted_secret
    INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  -- Fail-closed: sin clave no autenticamos → no disparamos push sin auth.
  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'notify_peluquero_on_reserva: falta el secreto ''service_role_key'' en Vault; no se envió la notificación.';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://avvmgeufrnusjopdydie.supabase.co/functions/v1/notify-peluquero',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_service_key
               ),
    body    := jsonb_build_object('type', 'INSERT', 'record', row_to_json(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- No bloquear nunca el INSERT de la reserva por un fallo de notificación.
  RETURN NEW;
END;
$$;

-- El trigger on_reserva_insert_notify (020) ya apunta a esta función; al usar
-- CREATE OR REPLACE no hace falta recrearlo. Se deja el DROP/CREATE por
-- idempotencia y para que quede autocontenido si se aplica en un entorno limpio.
DROP TRIGGER IF EXISTS on_reserva_insert_notify ON public.reservas;
CREATE TRIGGER on_reserva_insert_notify
  AFTER INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.notify_peluquero_on_reserva();

-- FIN 033_fix_notify_peluquero_auth.sql
