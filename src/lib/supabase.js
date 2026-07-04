import { createClient } from '@supabase/supabase-js'

// Trim strips invisible chars (BOM, zero-width spaces) that break HTTP headers.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  const mensaje =
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Completá el archivo .env'
  if (import.meta.env.DEV) {
    // En desarrollo fallamos rápido para no confundir con errores de red.
    throw new Error(mensaje)
  }
  // En producción no crasheamos: solo avisamos en consola.
  console.warn(mensaje)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente sin sesión — para queries públicas que no deben verse afectadas
// por sesiones expiradas del usuario logueado en el panel.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Traduce errores crudos de Supabase a mensajes amigables en español.
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function mensajeError(error, fallback = 'Ocurrió un error. Intentá de nuevo.') {
  if (!error) return fallback
  const msg = typeof error === 'string' ? error : error.message || ''
  const m = msg.toLowerCase()

  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Confirmá tu email antes de iniciar sesión.'
  if (m.includes('user already registered') || m.includes('already registered'))
    return 'Ya existe una cuenta con ese email.'
  if (m.includes('duplicate key') && m.includes('slug'))
    return 'Ese enlace (slug) ya está en uso. Probá con otro.'
  if (m.includes('duplicate key') && m.includes('peluquero_id_fecha_hora'))
    return 'Ese horario ya fue reservado. Elegí otro.'
  if (m.includes('duplicate key')) return 'Ese registro ya existe.'
  if (m.includes('conflicting key value violates exclusion constraint'))
    return 'Ese horario ya fue reservado. Elegí otro.'
  if (m.includes('peluquero o barbería no disponibles')) return 'Ese peluquero ya no está disponible.'
  if (m.includes('servicio no disponible')) return 'Ese servicio ya no está disponible.'
  if (m.includes('ese día no está disponible')) return 'Ese día no está disponible. Elegí otra fecha.'
  if (m.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('over_request_rate_limit') || m.includes('too many requests') || m.includes('rate limit'))
    return 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return 'No pudimos conectar con el servidor. Revisá tu conexión o desactivá extensiones del navegador.'
  if (m.includes('row-level security') || m.includes('violates row-level'))
    return 'No tenés permisos para realizar esta acción.'

  return fallback
}
