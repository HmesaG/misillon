import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BERG4SzsVoJGs9U19Cg9N_ErmBRqJOrUAfR0-xtw20udx9cK3nmtXOU6GqxhZbXcwEbXlNbnVQnI1SkCqsSVyM4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function subscribirNotificaciones(peluqueroId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { error: 'Tu navegador no soporta notificaciones push.' }
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    return { error: 'Permiso de notificaciones denegado.' }
  }

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_peluquero_id: peluqueroId,
    p_endpoint: json.endpoint,
    p_auth: json.keys.auth,
    p_p256dh: json.keys.p256dh,
    p_user_agent: navigator.userAgent,
  })

  if (error) return { error: error.message }
  return { ok: true, endpoint: json.endpoint }
}

export async function desuscribirNotificaciones(peluqueroId) {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return { ok: true }

  await supabase.rpc('delete_push_subscription', {
    p_peluquero_id: peluqueroId,
    p_endpoint: sub.endpoint,
  })

  await sub.unsubscribe()
  return { ok: true }
}

// Reactiva una suscripción obsoleta (estado 'stale'): limpia la suscripción local
// vieja —firmada con la VAPID key anterior— y crea una nueva con la key actual.
// Sin el unsubscribe previo, pushManager.subscribe() lanza InvalidStateError porque
// ya existe una suscripción con distinta applicationServerKey.
export async function reactivarNotificaciones(peluqueroId) {
  await desuscribirNotificaciones(peluqueroId)
  return subscribirNotificaciones(peluqueroId)
}

// Calcula el estado del toggle de notificaciones push.
// Estados: 'unsupported' | 'denied' | 'inactive' | 'active' | 'stale'
//   - 'stale': el navegador tiene una PushSubscription local, pero su endpoint no
//     está registrado en push_subscriptions para este peluquero (típico tras una
//     rotación de VAPID keys). El toggle debe pedir reactivar, no decir "activo".
// Se pasa peluqueroId para poder cruzar contra la BD. Sin él (compat) no se
// verifica y una suscripción local se reporta como 'active'.
export async function estadoNotificaciones(peluqueroId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'inactive'
  if (!peluqueroId) return 'active'

  const { data, error } = await supabase.rpc('verificar_push_subscription', {
    p_peluquero_id: peluqueroId,
    p_endpoint: sub.endpoint,
  })
  // Ante un error de red/RPC no marcamos 'stale' falsamente: dejamos 'active'
  // para no forzar reactivaciones por fallos transitorios.
  if (error) return 'active'
  return data === true ? 'active' : 'stale'
}
