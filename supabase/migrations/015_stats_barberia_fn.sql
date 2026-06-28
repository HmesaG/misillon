-- =============================================================================
-- MiSillón v1 — Migración 015: RPC de stats para panel del dueño
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_stats_barberia(p_barberia_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_dueno_id   uuid;
  v_peluqueros int;
  v_confirmadas int;
  v_canceladas  int;
  v_pendientes  int;
BEGIN
  SELECT dueno_id INTO v_dueno_id FROM barberias WHERE id = p_barberia_id;

  IF v_dueno_id IS NULL OR v_dueno_id != v_uid THEN
    IF NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = v_uid) THEN
      RAISE EXCEPTION 'No tenés permisos.';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_peluqueros
    FROM peluqueros WHERE barberia_id = p_barberia_id;

  SELECT COUNT(*) INTO v_confirmadas
    FROM reservas r
    JOIN peluqueros p ON p.id = r.peluquero_id
    WHERE p.barberia_id = p_barberia_id AND r.estado = 'confirmada';

  SELECT COUNT(*) INTO v_canceladas
    FROM reservas r
    JOIN peluqueros p ON p.id = r.peluquero_id
    WHERE p.barberia_id = p_barberia_id AND r.estado = 'cancelada';

  SELECT COUNT(*) INTO v_pendientes
    FROM reservas r
    JOIN peluqueros p ON p.id = r.peluquero_id
    WHERE p.barberia_id = p_barberia_id AND r.estado = 'pendiente';

  RETURN json_build_object(
    'peluqueros',  v_peluqueros,
    'confirmadas', v_confirmadas,
    'canceladas',  v_canceladas,
    'pendientes',  v_pendientes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_stats_barberia FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stats_barberia TO authenticated;
