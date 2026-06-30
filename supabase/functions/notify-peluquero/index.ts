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

Deno.serve(async (req) => {
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
