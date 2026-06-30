import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BD4pFbzEoRW-IX1unCmlOJDxPFfpxQxUq5NQIqsD09ONYJgBei9YSI5kYVVL6TKjS9mRqH139GNR0du-7kKZXqQ'

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

export async function estadoNotificaciones() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'active' : 'inactive'
}
