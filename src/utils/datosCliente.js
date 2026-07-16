const CLAVE = 'misillon_datos_cliente_v1'

/**
 * Datos de contacto del cliente (nombre, teléfono, email) recordados en este
 * dispositivo para no volver a pedirlos en la próxima reserva. NUNCA incluye
 * la dirección de domicilio, que puede cambiar de una cita a otra.
 */
export function cargarDatosCliente() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const datos = JSON.parse(crudo)
    if (!datos || typeof datos !== 'object') return null
    return {
      nombre: datos.nombre || '',
      telefono: datos.telefono || '',
      email: datos.email || '',
    }
  } catch {
    return null
  }
}

export function guardarDatosCliente({ nombre, telefono, email }) {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ nombre: nombre || '', telefono: telefono || '', email: email || '' }),
    )
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.) — no bloquea la reserva.
  }
}

export function borrarDatosCliente() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // sin acción — nada que borrar si localStorage no está disponible.
  }
}
