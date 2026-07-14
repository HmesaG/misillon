/**
 * Persistencia efímera del "tipo de negocio" elegido en el paso 1 del registro,
 * para que sobreviva el viaje de ida y vuelta de Google OAuth (que saca al usuario
 * de la app antes de que el estado de React pueda viajar).
 *
 * Mecanismo primario: el tipo viaja en el query param `?tipo=` del redirectTo.
 * Este helper es el FALLBACK por si algún navegador / in-app-browser pisa el query
 * string durante el redirect. Expira solo a los 15 minutos para no arrastrar un
 * tipo viejo si el usuario abandonó el flujo y vuelve más tarde.
 */

const KEY = 'registro_tipo_pendiente'
const TTL_MS = 15 * 60 * 1000 // 15 minutos
const TIPOS_VALIDOS = ['equipo', 'independiente', 'peluquero']

/**
 * Guarda el tipo pendiente con timestamp.
 * @param {string} tipo
 */
export function guardarTipoPendiente(tipo) {
  if (!TIPOS_VALIDOS.includes(tipo)) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ tipo, ts: Date.now() }))
  } catch {
    // localStorage no disponible (modo privado, etc.) — el query param cubre el caso normal.
  }
}

/**
 * Lee el tipo pendiente si no expiró. Limpia y devuelve null si venció o es inválido.
 * @returns {string|null}
 */
export function leerTipoPendiente() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { tipo, ts } = JSON.parse(raw)
    if (!TIPOS_VALIDOS.includes(tipo) || typeof ts !== 'number' || Date.now() - ts > TTL_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    return tipo
  } catch {
    return null
  }
}

/** Borra el tipo pendiente. Llamar una vez consumido. */
export function limpiarTipoPendiente() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // no-op
  }
}
