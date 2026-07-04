import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

// verify_jwt=true (config.toml) solo exige que el Authorization sea ALGÚN
// JWT válido firmado por el proyecto — la anon key pública (embebida en
// el bundle del frontend) también lo es. Sin este chequeo, cualquiera
// puede invocar la función directo con la anon key y spoofear push
// notifications con texto arbitrario. El trigger (migración 033) manda
// el service_role_key como Bearer; acá se confirma que el claim `role`
// del JWT sea exactamente 'service_role', no solo "válido".
function esServiceRole(req: Request): boolean {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const payloadB64 = token.split('.')[1]
  if (!payloadB64) return false
  try {
    const normalizado = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(normalizado))
    return json.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (!esServiceRole(req)) {
    return new Response('forbidden', { status: 403 })
  }

  const payload = await req.json()
  const reserva = payload.record

  if (!reserva?.peluquero_id) return new Response('ok', { status: 200 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, auth, p256dh')
    .eq('peluquero_id', reserva.peluquero_id)

  if (!subs?.length) return new Response('ok', { status: 200 })

  const { data: servicio } = await supabase
    .from('servicios')
    .select('nombre')
    .eq('id', reserva.servicio_id)
    .maybeSingle()

  const fecha = new Date(reserva.fecha_hora).toLocaleString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const notification = JSON.stringify({
    title: `Nueva reserva — ${reserva.cliente_nombre}`,
    body: `${servicio?.nombre ?? 'Servicio'} · ${fecha}`,
    url: '/panel/peluquero',
  })

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        notification
      )
    )
  )

  return new Response('ok', { status: 200 })
})
