-- =============================================================================
-- MiSillón — Migración 026: Funciones de recordatorio WA + cron opcional
-- Devuelve recordatorios del día siguiente por peluquero y una función
-- agregadora para el cron. El cron real (pg_net → Edge Function) queda como
-- extensión futura; aquí solo se registra el schedule si pg_cron está activo.
-- Aplicar: psql $DATABASE_URL < 026_recordatorio_wa_cron.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: get_recordatorios_manana
--
-- Devuelve las reservas de mañana (en hora DR) para un peluquero específico,
-- incluyendo el wa_link prefabricado para enviar el recordatorio al cliente.
--
-- Formato wa_link:
--   https://wa.me/{telefono_limpio}?text={mensaje_codificado}
-- donde telefono_limpio = solo dígitos, sin + ni espacios.
-- El número dominicano queda como 1809XXXXXXX (con prefijo país 1).
--
-- Parámetros:
--   p_peluquero_id  UUID — ID del peluquero
--
-- Retorno: TABLE de reservas de mañana con wa_link listo para abrir
--
-- Seguridad: SECURITY DEFINER. Solo authenticated puede llamarla.
-- El caller debe ser el peluquero o el super_admin (la función no verifica
-- auth adicional — la validación la hace el panel antes de llamarla).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_recordatorios_manana(
    p_peluquero_id uuid
)
RETURNS TABLE (
    reserva_id       uuid,
    cliente_nombre   text,
    cliente_telefono text,
    hora_inicio      text,
    servicio_nombre  text,
    wa_link          text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_tz      CONSTANT text := 'America/Santo_Domingo';
    v_manana  date;
    v_mensaje text;
    v_tel_limpio text;
BEGIN
    v_manana := (NOW() AT TIME ZONE v_tz)::date + 1;

    RETURN QUERY
    SELECT
        r.id                                                    AS reserva_id,
        r.cliente_nombre,
        r.cliente_telefono,
        TO_CHAR(
            r.fecha_hora AT TIME ZONE v_tz,
            'HH12:MI AM'
        )                                                       AS hora_inicio,
        s.nombre                                                AS servicio_nombre,
        -- Construir wa_link
        -- Limpiar teléfono: quitar +, espacios, guiones
        -- Para RD: si empieza con 809/829/849 agregar prefijo 1 (país)
        'https://wa.me/'
            || CASE
                WHEN regexp_replace(r.cliente_telefono, '[^0-9]', '', 'g')
                     ~* '^(809|829|849)[0-9]{7}$'
                THEN '1' || regexp_replace(r.cliente_telefono, '[^0-9]', '', 'g')
                ELSE regexp_replace(r.cliente_telefono, '[^0-9]', '', 'g')
               END
            || '?text='
            || replace(
                replace(
                    replace(
                        'Hola ' || r.cliente_nombre || ', te recordamos que mañana '
                        || TO_CHAR(v_manana, 'DD/MM/YYYY')
                        || ' a las '
                        || TO_CHAR(r.fecha_hora AT TIME ZONE v_tz, 'HH12:MI AM')
                        || ' tienes una cita de '
                        || s.nombre
                        || ' con '
                        || p.nombre
                        || '. ¡Te esperamos! — MiSillón',
                        ' ', '%20'
                    ),
                    '¡', '%C2%A1'
                ),
                '!', '%21'
               )                                                AS wa_link
    FROM public.reservas r
    JOIN public.servicios  s ON s.id = r.servicio_id
    JOIN public.peluqueros p ON p.id = r.peluquero_id
    WHERE r.peluquero_id = p_peluquero_id
      AND (r.fecha_hora AT TIME ZONE v_tz)::date = v_manana
      AND r.estado != 'cancelada'
    ORDER BY r.fecha_hora ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_recordatorios_manana(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_recordatorios_manana(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: recordatorios_pendientes_hoy
--
-- Devuelve un resumen de todos los peluqueros que tienen reservas mañana.
-- El cron de Supabase (o la Edge Function programada) llama esta función a
-- las 8:00 AM para disparar los recordatorios.
-- El resultado es informativo: la Edge Function itera y llama
-- get_recordatorios_manana(peluquero_id) por cada fila para construir los links.
--
-- Retorno: TABLE (peluquero_id, peluquero_nombre, total_reservas_manana)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recordatorios_pendientes_hoy()
RETURNS TABLE (
    peluquero_id           uuid,
    peluquero_nombre       text,
    barberia_nombre        text,
    peluquero_whatsapp     text,
    total_reservas_manana  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_tz     CONSTANT text := 'America/Santo_Domingo';
    v_manana date;
BEGIN
    v_manana := (NOW() AT TIME ZONE v_tz)::date + 1;

    RETURN QUERY
    SELECT
        p.id                                      AS peluquero_id,
        p.nombre                                  AS peluquero_nombre,
        b.nombre                                  AS barberia_nombre,
        p.whatsapp                                AS peluquero_whatsapp,
        COUNT(r.id)                               AS total_reservas_manana
    FROM public.peluqueros p
    JOIN public.barberias b ON b.id = p.barberia_id
    JOIN public.reservas  r ON r.peluquero_id = p.id
    WHERE (r.fecha_hora AT TIME ZONE v_tz)::date = v_manana
      AND r.estado != 'cancelada'
      AND p.activo  = true
      AND b.estado  = 'aprobada'
    GROUP BY p.id, p.nombre, b.nombre, p.whatsapp
    ORDER BY COUNT(r.id) DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recordatorios_pendientes_hoy() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.recordatorios_pendientes_hoy() TO authenticated;

-- ---------------------------------------------------------------------------
-- CRON OPCIONAL: registrar schedule si pg_cron está disponible
-- Supabase habilita pg_cron en proyectos Pro/Team. En el plan gratuito no
-- está disponible. El DO block captura el error silenciosamente.
-- El job llama recordatorios_pendientes_hoy() a las 8:00 AM DR (UTC-4 = 12:00 UTC).
-- La función no envía nada por sí sola; sirve como señal para una Edge Function
-- que leyera el resultado y enviara los mensajes vía WhatsApp Business API.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Intentar registrar el cron. Si pg_cron no existe, la excepción se captura.
    -- Limpiar job anterior por nombre para garantizar idempotencia.
    BEGIN
        PERFORM cron.unschedule('recordatorio-wa-diario');
    EXCEPTION WHEN OTHERS THEN
        -- pg_cron no disponible o job no existía; seguir.
        NULL;
    END;

    BEGIN
        PERFORM cron.schedule(
            'recordatorio-wa-diario',
            '0 12 * * *',   -- 12:00 UTC = 08:00 AM America/Santo_Domingo
            $$SELECT public.recordatorios_pendientes_hoy()$$
        );
        RAISE NOTICE 'pg_cron: job "recordatorio-wa-diario" registrado (08:00 AM DR).';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron no disponible en este proyecto. '
                     'El job "recordatorio-wa-diario" no fue registrado. '
                     'Alternativa: crear un Scheduled Webhook en Supabase Dashboard '
                     'que llame la Edge Function recordatorio-wa a las 08:00 AM.';
    END;
END;
$$;

-- FIN 026_recordatorio_wa_cron.sql
