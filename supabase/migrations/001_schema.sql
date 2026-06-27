-- =============================================================================
-- MiSillón v1 — Migración 001: Esquema base (tablas + índices)
-- PostgreSQL 15+ / Supabase
-- Aplicar: psql $DATABASE_URL < 001_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabla: barberias
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barberias (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre           text        NOT NULL,
    slug             text        UNIQUE NOT NULL,
    estado           text        NOT NULL DEFAULT 'pendiente'
                                 CHECK (estado IN ('pendiente','aprobada','rechazada')),
    tipo_negocio     text        CHECK (tipo_negocio IN ('equipo','independiente')),
    contacto         text,
    logo_url         text,
    color_primario   text,
    color_secundario text,
    qr_url           text,
    dueno_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tabla: peluqueros
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.peluqueros (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id    uuid        NOT NULL REFERENCES public.barberias(id) ON DELETE CASCADE,
    user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    slug           text        NOT NULL,
    nombre         text        NOT NULL,
    foto_url       text,
    whatsapp       text,
    activo         bool        NOT NULL DEFAULT true,
    es_dueno_mismo bool        NOT NULL DEFAULT false,
    qr_url         text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE(barberia_id, slug)
);

-- ---------------------------------------------------------------------------
-- Tabla: cuentas_bancarias_peluquero
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cuentas_bancarias_peluquero (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id  uuid        NOT NULL REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    banco         text        NOT NULL,
    numero_cuenta text        NOT NULL,
    tipo          text        NOT NULL,   -- 'corriente' | 'ahorro'
    titular       text        NOT NULL,
    activa        bool        NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tabla: servicios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicios (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id      uuid        NOT NULL REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    nombre            text        NOT NULL,
    precio_local      numeric(10,2),
    precio_domicilio  numeric(10,2),   -- NULL si no ofrece domicilio
    duracion_minutos  int         NOT NULL CHECK (duracion_minutos > 0),
    ofrece_domicilio  bool        NOT NULL DEFAULT false,
    activo            bool        NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tabla: disponibilidad
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disponibilidad (
    id            uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id  uuid   NOT NULL REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    dia_semana    int    NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),  -- 0=domingo
    hora_inicio   time   NOT NULL,
    hora_fin      time   NOT NULL,
    CONSTRAINT chk_disponibilidad_horas CHECK (hora_fin > hora_inicio)
);

-- ---------------------------------------------------------------------------
-- Tabla: politicas_peluquero
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.politicas_peluquero (
    id                     uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
    peluquero_id           uuid  NOT NULL UNIQUE REFERENCES public.peluqueros(id) ON DELETE CASCADE,
    porcentaje_anticipo    int   NOT NULL DEFAULT 0
                                 CHECK (porcentaje_anticipo BETWEEN 0 AND 100),
    reembolso_inasistencia bool  NOT NULL DEFAULT false,
    texto_libre            text,
    minutos_tolerancia     int   NOT NULL DEFAULT 15 CHECK (minutos_tolerancia >= 0)
);

-- ---------------------------------------------------------------------------
-- Tabla: reservas
-- DECISIÓN UNIQUE(peluquero_id, fecha_hora):
--   Previene doble-booking exacto en BD como última línea de defensa.
--   La lógica de aplicación debe verificar solapamiento real usando
--   duracion_minutos del servicio (ej: reserva a las 10:00 + 30 min bloquea
--   hasta 10:30). Esta constraint cubre la colisión de timestamp exacto;
--   la cobertura de intervalos requiere lógica en Edge Function o función SQL.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservas (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    barberia_id         uuid        NOT NULL REFERENCES public.barberias(id),
    peluquero_id        uuid        NOT NULL REFERENCES public.peluqueros(id),
    servicio_id         uuid        NOT NULL REFERENCES public.servicios(id),
    cliente_nombre      text        NOT NULL,
    cliente_telefono    text        NOT NULL,
    cliente_email       text        NOT NULL,
    cliente_direccion   text,                   -- obligatorio si es_domicilio=true (enforce en app)
    es_domicilio        bool        NOT NULL DEFAULT false,
    fecha_hora          timestamptz NOT NULL,
    estado              text        NOT NULL DEFAULT 'pendiente'
                                    CHECK (estado IN ('pendiente','confirmada','cancelada')),
    motivo_cancelacion  text,
    token               uuid        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE(peluquero_id, fecha_hora)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_barberias_slug   ON public.barberias(slug);
CREATE INDEX IF NOT EXISTS idx_barberias_dueno  ON public.barberias(dueno_id);
CREATE INDEX IF NOT EXISTS idx_barberias_estado ON public.barberias(estado);

CREATE INDEX IF NOT EXISTS idx_peluqueros_barberia ON public.peluqueros(barberia_id);
CREATE INDEX IF NOT EXISTS idx_peluqueros_user     ON public.peluqueros(user_id);
CREATE INDEX IF NOT EXISTS idx_peluqueros_activo   ON public.peluqueros(activo);

CREATE INDEX IF NOT EXISTS idx_cuentas_peluquero ON public.cuentas_bancarias_peluquero(peluquero_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_activa    ON public.cuentas_bancarias_peluquero(peluquero_id, activa);

CREATE INDEX IF NOT EXISTS idx_servicios_peluquero ON public.servicios(peluquero_id);
CREATE INDEX IF NOT EXISTS idx_servicios_activo    ON public.servicios(activo);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_peluquero ON public.disponibilidad(peluquero_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_dia       ON public.disponibilidad(peluquero_id, dia_semana);

CREATE INDEX IF NOT EXISTS idx_reservas_peluquero ON public.reservas(peluquero_id);
CREATE INDEX IF NOT EXISTS idx_reservas_barberia  ON public.reservas(barberia_id);
CREATE INDEX IF NOT EXISTS idx_reservas_token     ON public.reservas(token);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha     ON public.reservas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_reservas_estado    ON public.reservas(estado);
-- Índice compuesto para la Edge Function de auto-cancelación
CREATE INDEX IF NOT EXISTS idx_reservas_pendientes_fecha
    ON public.reservas(estado, fecha_hora)
    WHERE estado = 'pendiente';

-- ---------------------------------------------------------------------------
-- Función utilitaria: updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger: barberias.updated_at
DROP TRIGGER IF EXISTS trg_barberias_updated_at ON public.barberias;
CREATE TRIGGER trg_barberias_updated_at
    BEFORE UPDATE ON public.barberias
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: protección de columna barberias.estado
-- DECISIÓN: RLS no puede restringir actualizaciones a columnas específicas
-- dentro de una misma política. Usamos un trigger BEFORE UPDATE que impide
-- que cualquier usuario no-superadmin modifique la columna "estado".
-- La función is_super_admin() se crea en 002_rls.sql; este trigger depende
-- de ella, pero CREATE TRIGGER se evalúa en tiempo de ejecución (no de parse),
-- por lo que es seguro definirlo aquí siempre que 002 se aplique inmediatamente.
-- Si aplicás 001 sin 002, el trigger fallará en la primera UPDATE hasta que
-- is_super_admin() exista. Alternativa: mover el trigger a 002_rls.sql.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_estado_barberia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Si estado no cambió, dejamos pasar sin verificar
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- Solo super admin puede cambiar estado
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Solo un Super Admin puede cambiar el estado de una barbería'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_estado_barberia ON public.barberias;
CREATE TRIGGER trg_proteger_estado_barberia
    BEFORE UPDATE ON public.barberias
    FOR EACH ROW EXECUTE FUNCTION public.proteger_estado_barberia();

-- FIN 001_schema.sql
