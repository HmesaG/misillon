-- 041: 3 de los 5 hallazgos "medios de seguridad" de la auditoría QA
-- (Fable 5, 2026-07-04). El 4to (recordatorios_pendientes_hoy sin guard)
-- resultó ser un falso positivo: get_recordatorios_manana ya tiene el
-- guard de ownership correcto desde la migración 030 (BUG 27). El 5to
-- (notify-peluquero acepta cualquier JWT válido, no solo service_role)
-- se corrige en el código de la Edge Function, no en SQL.
--
-- Descubrimiento colateral durante esta verificación: la tabla
-- `dias_bloqueados` (migración 024) estaba marcada como aplicada en
-- schema_migrations pero el DDL nunca había corrido de verdad en
-- producción (se asumió aplicada manualmente en una sesión anterior sin
-- verificarlo). Se re-ejecutó 024 directamente (es 100% idempotente,
-- IF NOT EXISTS everywhere) ANTES de esta migración — no se repite acá.

-- ── 1. dias_bloqueados: cerrar el bypass de la RPC (BUG 17A) ──
-- La política pública sobre la TABLA (`USING (true)`, para cualquier rol
-- incluyendo anon) seguía exponiendo `motivo` vía REST directo
-- (GET /rest/v1/dias_bloqueados?select=motivo), aunque la RPC
-- get_dias_bloqueados (038) ya lo devuelve como NULL. RLS es por fila, no
-- por columna, así que la RPC no protegía el acceso directo a la tabla.
-- El wizard público ya usa exclusivamente la RPC (no la tabla), y los
-- accesos legítimos de peluquero/dueño/superadmin ya están cubiertos por
-- las otras 3 políticas (dias_bloqueados_peluquero/_dueno/_superadmin,
-- todas FOR ALL) — así que se puede eliminar sin ninguna regresión.
DROP POLICY IF EXISTS dias_bloqueados_select_publico ON public.dias_bloqueados;

-- ── 2. barberias: atar dueno_id al caller en el INSERT directo ──
-- registrar_negocio() ya valida esto (migración 040), pero el INSERT
-- directo a la tabla (bypaseando la RPC) seguía sin atar dueno_id al
-- caller — cualquier autenticado podía insertar con el dueno_id de otro
-- usuario, rompiéndole el panel (maybeSingle() de useAuth falla con 2+
-- barberías) o asignándole un rol no consentido.
DROP POLICY IF EXISTS barberias_insert_autenticado ON public.barberias;
CREATE POLICY barberias_insert_autenticado ON public.barberias
  FOR INSERT
  TO authenticated
  WITH CHECK (dueno_id = auth.uid());

-- ── 3. peluqueros: restringir columnas visibles a anon (email/user_id) ──
-- peluqueros_select_publico es correcta a nivel de FILA (activo=true +
-- barbería aprobada), pero RLS no restringe columnas: cualquier anónimo
-- podía pedir email/user_id vía REST directo aunque el frontend solo
-- seleccione columnas seguras. Postgres soporta GRANT column-level:
-- se revoca el SELECT amplio de anon sobre la tabla y se re-otorga solo
-- sobre las columnas que el flujo público realmente necesita
-- (confirmado: useBarberia.js solo pide id, slug, nombre, foto_url,
-- whatsapp). authenticated no se toca — useAuth/AuthCallback siguen
-- necesitando user_id/email para resolver el rol del propio usuario.
REVOKE SELECT ON public.peluqueros FROM anon;
GRANT SELECT (id, barberia_id, slug, nombre, foto_url, whatsapp, activo, es_dueno_mismo, qr_url)
  ON public.peluqueros TO anon;
