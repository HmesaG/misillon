-- =============================================================================
-- MiSillón v1 — Migración 016: Email en peluqueros + auto-link triggers
-- =============================================================================
-- Permite que el dueño registre el email de su peluquero en el panel.
-- Cuando el peluquero se registra con ese email, queda vinculado
-- automáticamente a su registro en peluqueros sin intervención manual.
-- =============================================================================

-- 1. Agregar columna email a peluqueros
ALTER TABLE public.peluqueros
  ADD COLUMN IF NOT EXISTS email text;

-- Índice para lookup eficiente por email
CREATE INDEX IF NOT EXISTS peluqueros_email_idx ON public.peluqueros (email);

-- =============================================================================
-- Trigger A: Cuando un nuevo usuario Auth se crea con un email que coincide
-- con un peluquero sin user_id → lo vincula.
-- Esto cubre el caso: dueño registró el email ANTES de que el peluquero se registre.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_vincular_peluquero_on_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.peluqueros
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_vincular ON auth.users;
CREATE TRIGGER on_auth_user_created_vincular
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_vincular_peluquero_on_user();

-- =============================================================================
-- Trigger B: Cuando el dueño agrega/actualiza el email de un peluquero →
-- si ya existe un usuario Auth con ese email, lo vincula de inmediato.
-- Esto cubre el caso: peluquero ya tenía cuenta antes de que el dueño lo registre.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_vincular_peluquero_on_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND (OLD.email IS DISTINCT FROM NEW.email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.email LIMIT 1;
    IF v_user_id IS NOT NULL AND NEW.user_id IS NULL THEN
      NEW.user_id := v_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_peluquero_email_change ON public.peluqueros;
CREATE TRIGGER on_peluquero_email_change
  BEFORE INSERT OR UPDATE OF email ON public.peluqueros
  FOR EACH ROW EXECUTE FUNCTION public.auto_vincular_peluquero_on_email();
