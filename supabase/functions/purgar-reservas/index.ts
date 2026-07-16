// MiSillón — Edge Function: purgar-reservas
//
// Dispara la purga física de reservas viejas llamando a dos RPCs
// (migración 045), ambas SECURITY DEFINER y con GRANT solo a service_role:
//   - purgar_reservas_canceladas()            → borra canceladas con >= 48h
//   - purgar_reservas_confirmadas_vencidas()  → borra confirmadas con cita > 1 mes
//
// El caller es un webhook externo GRATUITO (cron-job.org / GitHub Actions
// schedule), porque pg_cron NO está disponible en el plan Free de Supabase.
//
// -----------------------------------------------------------------------------
// AUTENTICACIÓN — secreto compartido, NO el service_role JWT
// -----------------------------------------------------------------------------
// notify-peluquero valida el claim `role === 'service_role'` del JWT porque su
// caller es un trigger de Postgres que YA tiene el service_role key a mano.
// Acá el caller es un servicio externo (cron-job.org): darle el service_role
// key completo sería entregarle una credencial god-mode (bypassa toda la RLS,
// lee/escribe cualquier tabla) a un tercero que la guardaría en su config y la
// mandaría en cada request. Si ese servicio se filtra o loguea headers, se fuga
// el control total de la base.
//
// En su lugar usamos un SECRETO DEDICADO (`PURGE_SECRET`) que SOLO autoriza
// disparar esta purga. Blast radius si se filtra: alguien puede ejecutar purgas
// idempotentes que borran filas YA vencidas — daño nulo. El service_role key
// nunca sale del entorno de la Edge Function.
//
// El secreto viaja en el header `X-Purge-Secret` (preferido: no queda en logs
// de URL). Se acepta también `?secret=` en query string como fallback para
// servicios que solo permiten configurar la URL, pero se recomienda el header.
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
  const esperado = Deno.env.get('PURGE_SECRET')
  if (!esperado) {
    // Fail-closed: sin secreto configurado, nadie pasa.
    console.error('PURGE_SECRET no está configurada — rechazando todo.')
    return false
  }
  const header = req.headers.get('X-Purge-Secret')
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

  // Service role bypassa RLS y es el único rol con GRANT sobre las RPCs de purga.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Ambas purgas se corren siempre en cada invocación: son idempotentes y
  // rápidas (índices parciales en 045), así basta UN solo webhook diario en
  // vez de dos schedules separados.
  const [canceladasRes, confirmadasRes] = await Promise.all([
    supabase.rpc('purgar_reservas_canceladas'),
    supabase.rpc('purgar_reservas_confirmadas_vencidas'),
  ])

  const errores: string[] = []

  let canceladas = 0
  if (canceladasRes.error) {
    console.error('purgar_reservas_canceladas falló:', canceladasRes.error.message)
    errores.push(`canceladas: ${canceladasRes.error.message}`)
  } else {
    canceladas = canceladasRes.data ?? 0
    console.log(`[purgar-reservas] canceladas borradas: ${canceladas}`)
  }

  let confirmadas = 0
  if (confirmadasRes.error) {
    console.error('purgar_reservas_confirmadas_vencidas falló:', confirmadasRes.error.message)
    errores.push(`confirmadas: ${confirmadasRes.error.message}`)
  } else {
    confirmadas = confirmadasRes.data ?? 0
    console.log(`[purgar-reservas] confirmadas vencidas borradas: ${confirmadas}`)
  }

  if (errores.length) {
    return Response.json(
      { ok: false, canceladas, confirmadas, errores },
      { status: 500 },
    )
  }

  return Response.json({ ok: true, canceladas, confirmadas })
})
