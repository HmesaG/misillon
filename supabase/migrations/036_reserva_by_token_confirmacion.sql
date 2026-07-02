-- =============================================================================
-- MiSillón — Migración 036: get_reserva_by_token expone confirmación/rechazo
-- -----------------------------------------------------------------------------
-- PROBLEMA (auditoría 2026-07-01, BUG 14A): la RPC pública get_reserva_by_token
-- (002_rls.sql) arma el JSON de la reserva SIN incluir confirmacion_peluquero
-- ni rechazo_motivo (columnas agregadas en 025_confirmacion_reservas.sql).
-- Resultado: cuando el peluquero rechaza una cita, el cliente entra a
-- /cita/:token y nunca ve por qué se la rechazaron — solo ve estado 'cancelada'.
--
-- FIX: CREATE OR REPLACE de la función agregando 'confirmacion_peluquero' y
-- 'rechazo_motivo' al jsonb_build_object del objeto 'reserva'. El resto del
-- cuerpo (peluquero, servicio, política, cuentas bancarias condicionadas al
-- anticipo, GRANTs) queda IDÉNTICO a 002. El tipo de retorno (jsonb) no cambia,
-- por eso CREATE OR REPLACE es suficiente (sin DROP).
--
-- Frontend acompañante: src/pages/public/GestionCita.jsx muestra
-- reserva.rechazo_motivo cuando confirmacion_peluquero = 'rechazada'.
--
-- Idempotente: CREATE OR REPLACE FUNCTION.
-- APLICAR MANUALMENTE: Supabase Studio → SQL Editor → pegar y Run.
--   (Héctor no tiene acceso CLI a la DB desde su red; se aplica vía SQL Editor.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_reserva_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_result jsonb;
    v_anticipo int;
    v_peluquero_id uuid;
    v_cuentas jsonb;
BEGIN
    -- Obtener datos principales
    SELECT
        jsonb_build_object(
            'reserva', jsonb_build_object(
                'id',                     r.id,
                'barberia_id',            r.barberia_id,
                'peluquero_id',           r.peluquero_id,
                'servicio_id',            r.servicio_id,
                'cliente_nombre',         r.cliente_nombre,
                'cliente_telefono',       r.cliente_telefono,
                'cliente_email',          r.cliente_email,
                'cliente_direccion',      r.cliente_direccion,
                'es_domicilio',           r.es_domicilio,
                'fecha_hora',             r.fecha_hora,
                'estado',                 r.estado,
                'motivo_cancelacion',     r.motivo_cancelacion,
                'confirmacion_peluquero', r.confirmacion_peluquero,
                'rechazo_motivo',         r.rechazo_motivo,
                'created_at',             r.created_at
            ),
            'peluquero', jsonb_build_object(
                'id',        p.id,
                'nombre',    p.nombre,
                'foto_url',  p.foto_url,
                'whatsapp',  p.whatsapp,
                'slug',      p.slug
            ),
            'servicio', jsonb_build_object(
                'id',                s.id,
                'nombre',            s.nombre,
                'precio_local',      s.precio_local,
                'precio_domicilio',  s.precio_domicilio,
                'duracion_minutos',  s.duracion_minutos,
                'ofrece_domicilio',  s.ofrece_domicilio
            ),
            'politica', jsonb_build_object(
                'porcentaje_anticipo',    COALESCE(pol.porcentaje_anticipo, 0),
                'reembolso_inasistencia', COALESCE(pol.reembolso_inasistencia, false),
                'texto_libre',            pol.texto_libre,
                'minutos_tolerancia',     COALESCE(pol.minutos_tolerancia, 15)
            )
        ),
        COALESCE(pol.porcentaje_anticipo, 0),
        r.peluquero_id
    INTO v_result, v_anticipo, v_peluquero_id
    FROM public.reservas r
    JOIN public.peluqueros p   ON p.id = r.peluquero_id
    JOIN public.servicios  s   ON s.id = r.servicio_id
    LEFT JOIN public.politicas_peluquero pol ON pol.peluquero_id = r.peluquero_id
    WHERE r.token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Adjuntar cuentas bancarias solo si hay anticipo requerido
    IF v_anticipo > 0 THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',            cb.id,
                'banco',         cb.banco,
                'numero_cuenta', cb.numero_cuenta,
                'tipo',          cb.tipo,
                'titular',       cb.titular
            )
        )
        INTO v_cuentas
        FROM public.cuentas_bancarias_peluquero cb
        WHERE cb.peluquero_id = v_peluquero_id
          AND cb.activa = true;

        v_result := v_result || jsonb_build_object('cuentas_bancarias', COALESCE(v_cuentas, '[]'::jsonb));
    ELSE
        v_result := v_result || jsonb_build_object('cuentas_bancarias', '[]'::jsonb);
    END IF;

    RETURN v_result;
END;
$$;

-- get_reserva_by_token es accesible por anon (por token), como en 002.
GRANT EXECUTE ON FUNCTION public.get_reserva_by_token(uuid) TO anon, authenticated;

-- FIN 036_reserva_by_token_confirmacion.sql
