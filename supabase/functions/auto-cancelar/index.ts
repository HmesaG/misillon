/**
 * MiSillón v1 — Edge Function: auto-cancelar
 *
 * Busca reservas con estado='pendiente' cuya fecha_hora +
 * minutos_tolerancia del peluquero ya pasó, y las cancela.
 *
 * Diseñada para ejecutarse vía cron (cada 5 minutos, ver config.toml).
 * También puede invocarse manualmente via HTTP POST.
 *
 * Env vars requeridas:
 *   SUPABASE_URL               — proveída automáticamente por Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — proveída automáticamente por Supabase
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOTIVO_AUTO_CANCELACION = "No confirmada a tiempo";

Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { ok: false, error: "Variables de entorno faltantes" },
        { status: 500 },
      );
    }

    // Service role bypasses RLS — necesario para actualizar reservas sin auth
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    /**
     * Buscamos reservas pendientes donde:
     *   fecha_hora + minutos_tolerancia (de la política del peluquero) < now()
     *
     * Peluqueros sin política registrada usan el default de 15 minutos.
     *
     * La query usa un JOIN LEFT a politicas_peluquero y COALESCE para el default.
     * Ejecutamos via RPC para aprovechar una función SQL que hace el UPDATE
     * directamente con la lógica de JOIN, evitando múltiples round-trips.
     */
    const { data, error } = await supabase.rpc("auto_cancelar_reservas_vencidas");

    if (error) {
      console.error("Error en auto_cancelar_reservas_vencidas:", error);
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const canceladas: number = data ?? 0;
    console.log(`[auto-cancelar] Reservas canceladas: ${canceladas}`);

    return Response.json({ ok: true, canceladas });
  } catch (err) {
    console.error("[auto-cancelar] Error inesperado:", err);
    return Response.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
});

/**
 * NOTA: Esta Edge Function delega la lógica de cancelación a la función SQL
 * `auto_cancelar_reservas_vencidas()` (definida abajo como comentario de
 * referencia — agregar en una migración adicional si se desea usar esta
 * arquitectura, o reemplazar el rpc() por una query directa con el SDK).
 *
 * Función SQL de referencia (agregar en 004_auto_cancelar_fn.sql):
 *
 *   CREATE OR REPLACE FUNCTION public.auto_cancelar_reservas_vencidas()
 *   RETURNS int
 *   LANGUAGE plpgsql
 *   SECURITY DEFINER
 *   SET search_path = public
 *   AS $$
 *   DECLARE
 *       v_count int;
 *   BEGIN
 *       WITH vencidas AS (
 *           UPDATE public.reservas r
 *           SET
 *               estado             = 'cancelada',
 *               motivo_cancelacion = 'No confirmada a tiempo'
 *           FROM public.politicas_peluquero pol
 *           WHERE r.peluquero_id = pol.peluquero_id
 *             AND r.estado       = 'pendiente'
 *             AND r.fecha_hora + (pol.minutos_tolerancia || ' minutes')::interval < now()
 *           RETURNING r.id
 *       ),
 *       -- Peluqueros SIN política: usar 15 minutos por defecto
 *       vencidas_sin_pol AS (
 *           UPDATE public.reservas r
 *           SET
 *               estado             = 'cancelada',
 *               motivo_cancelacion = 'No confirmada a tiempo'
 *           WHERE r.estado    = 'pendiente'
 *             AND r.fecha_hora + interval '15 minutes' < now()
 *             AND NOT EXISTS (
 *                 SELECT 1 FROM public.politicas_peluquero p
 *                 WHERE p.peluquero_id = r.peluquero_id
 *             )
 *           RETURNING r.id
 *       )
 *       SELECT (SELECT COUNT(*) FROM vencidas) +
 *              (SELECT COUNT(*) FROM vencidas_sin_pol)
 *       INTO v_count;
 *
 *       RETURN v_count;
 *   END;
 *   $$;
 *
 * Alternativa sin RPC (query directa con el SDK, para evitar la migración extra):
 * Descomentar el bloque alternativo a continuación y eliminar el rpc() de arriba.
 */

/*
// --- ALTERNATIVA: query directa sin función SQL ---
// Cancela reservas con política
const { error: err1, count: c1 } = await supabase
  .from("reservas")
  .update({
    estado: "cancelada",
    motivo_cancelacion: MOTIVO_AUTO_CANCELACION,
  })
  .eq("estado", "pendiente")
  .lt(
    "fecha_hora",
    // No podemos hacer el JOIN fecha_hora + minutos_tolerancia desde el SDK,
    // por eso el enfoque RPC es superior. Si se usa esta alternativa,
    // aplicar un margen fijo (ej. 60 min) o usar una raw query via supabase.rpc("sql", ...).
    new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  );
*/
