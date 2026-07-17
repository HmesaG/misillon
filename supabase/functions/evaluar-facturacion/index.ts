// MiSillón — Edge Function: evaluar-facturacion
//
// Dispara el cron diario de facturación llamando a evaluar_facturacion()
// (migración 048), SECURITY DEFINER, sin GRANT a anon/authenticated (guard
// interno rechaza cualquier caller que no sea service_role o sin JWT).
//
// Lógica de la RPC (idempotente por día):
//   - Día 1 del mes: barberías con proximo_corte <= hoy Y pago_confirmado
//     = true pasan a pago_confirmado = false (arranca la gracia de 3 días).
//   - Día 4+ del mes: barberías con pago_confirmado = false Y
//     estado_facturacion = 'al_dia' pasan a 'suspendida'.
//
// -----------------------------------------------------------------------------
// AUTENTICACIÓN — mismo patrón que purgar-reservas (secreto dedicado, NO el
// service_role JWT completo)
// -----------------------------------------------------------------------------
// El caller es un webhook externo gratuito (cron-job.org / GitHub Actions
// schedule) que no puede firmar un JWT de Supabase. Entregarle el service_role
// key sería una credencial god-mode; en su lugar usamos un secreto dedicado
// (`FACTURACION_SECRET`, distinto de `PURGE_SECRET` — blast radius separado)
// que solo autoriza disparar esta evaluación. Si se filtra, el daño máximo es
// ejecutar la evaluación de facturación fuera de horario — idempotente, sin
// pérdida de datos.
//
// El secreto viaja en el header `X-Facturacion-Secret` (preferido) o
// `?secret=` en query string como fallback.
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Comparación en tiempo constante para no filtrar el secreto por timing.
function secretosIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) {
    dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return dif === 0
}

function autorizado(req: Request): boolean {
  const esperado = Deno.env.get('FACTURACION_SECRET')
  if (!esperado) {
    // Fail-closed: sin secreto configurado, nadie pasa.
    console.error('FACTURACION_SECRET no está configurada — rechazando todo.')
    return false
  }
  const header = req.headers.get('X-Facturacion-Secret')
  const url = new URL(req.url)
  const query = url.searchParams.get('secret')
  const provisto = header ?? query ?? ''
  return provisto.length > 0 && secretosIguales(provisto, esperado)
}

Deno.serve(async (req) => {
  if (!autorizado(req)) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    return Response.json({ ok: false, error: 'server misconfigured' }, { status: 500 })
  }

  // Service role: único rol con GRANT sobre evaluar_facturacion() (el guard
  // interno de la función además rechaza cualquier claim distinto de
  // service_role o ausente).
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase.rpc('evaluar_facturacion')

  if (error) {
    console.error('evaluar_facturacion falló:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  console.log(
    `[evaluar-facturacion] fecha=${data?.fecha} cuentas_iniciadas=${data?.cuentas_iniciadas} suspendidas=${data?.suspendidas}`,
  )

  return Response.json(data ?? { ok: true })
})
