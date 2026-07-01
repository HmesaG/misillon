-- =============================================================================
-- MiSillón — Migración 030: Fix seguridad get_recordatorios_manana (fuga de PII)
-- -----------------------------------------------------------------------------
-- VULNERABILIDAD (auditoría 2026-07-01): la función 026 es SECURITY DEFINER y
-- otorgada a `authenticated`, pero NO valida ownership. Cualquier usuario logueado
-- podía pasar cualquier p_peluquero_id y obtener nombre + teléfono de los clientes
-- de mañana de ese peluquero (fuga de PII / datos personales de terceros).
-- El comentario original delegaba la validación al panel, pero eso no protege la
-- RPC ante llamadas directas.
--
-- FIX: se agrega el mismo guard de ownership que ya usan
-- peluquero_confirmar_reserva / peluquero_rechazar_reserva (025):
--   - el caller es el peluquero de ese p_peluquero_id (p.user_id = auth.uid()), O
--   - el caller es el dueño de la barbería de ese peluquero, O
--   - el caller es super_admin (is_super_admin()).
-- Si ninguna se cumple → RAISE EXCEPTION 'insufficient_privilege'.
--
-- Flujos legítimos (paneles Peluquero e Independiente) pasan siempre el id del
-- propio peluquero logueado (p.user_id = auth.uid()), por lo que no se rompen.
--
-- Idempotente: CREATE OR REPLACE FUNCTION. El resto del cuerpo (construcción del
-- wa_link, timezone DR, etc.) queda idéntico a 026.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

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
BEGIN
    -- Guard de ownership: el caller debe ser el peluquero, el dueño de su
    -- barbería, o super_admin. Si no, no puede ver la PII de esos clientes.
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.peluqueros p
            WHERE p.id = p_peluquero_id
              AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.peluqueros p
            JOIN public.barberias b ON b.id = p.barberia_id
            WHERE p.id = p_peluquero_id
              AND b.dueno_id = auth.uid()
        )
        OR public.is_super_admin()
    ) THEN
        RAISE EXCEPTION 'No tenés permisos para ver los recordatorios de este peluquero.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

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

-- FIN 030_fix_recordatorios_ownership.sql
