-- =============================================================================
-- MiSillón — Migración 020: trigger pg_net para notificar reservas nuevas
-- Llama la Edge Function notify-peluquero en cada INSERT en reservas.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_peluquero_on_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://avvmgeufrnusjopdydie.supabase.co/functions/v1/notify-peluquero',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('type', 'INSERT', 'record', row_to_json(NEW))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reserva_insert_notify ON public.reservas;
CREATE TRIGGER on_reserva_insert_notify
  AFTER INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.notify_peluquero_on_reserva();
