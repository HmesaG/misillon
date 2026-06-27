/**
 * Utilidades para construir links wa.me con mensajes pre-cargados.
 */

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/** Normaliza un número de WhatsApp a solo dígitos (formato wa.me). */
function limpiarTelefono(tel) {
  return (tel || '').replace(/[^\d]/g, '')
}

/** Formatea una fecha/hora ISO a "DD/MM/YYYY" y "HH:MM" legibles. */
export function formatearFechaHora(isoString) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return { fecha: '', hora: '' }
  const fecha = d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return { fecha, hora }
}

/**
 * Construye el link wa.me para enviarle el detalle de la reserva al CLIENTE.
 * El mensaje sale del WhatsApp del peluquero hacia el cliente.
 */
export function buildClienteWALink({
  peluqueroWhatsapp,
  peluqueroNombre,
  clienteNombre,
  servicio,
  fechaHora,
  token,
  anticipo = 0,
  cuentas = [],
  esDomicilio = false,
  direccion = '',
}) {
  const { fecha, hora } = formatearFechaHora(fechaHora)
  const lineas = [
    `Hola ${clienteNombre}, tu reserva con ${peluqueroNombre} para ${servicio} el ${fecha} a las ${hora} fue recibida.`,
  ]

  if (esDomicilio && direccion) {
    lineas.push(`Servicio a domicilio en: ${direccion}`)
  }

  if (anticipo > 0) {
    lineas.push(`Para confirmar, realizá un anticipo del ${anticipo}% a:`)
    if (cuentas.length) {
      cuentas.forEach((c) => {
        lineas.push(`• ${c.banco} — ${c.tipo} ${c.numero_cuenta} (${c.titular})`)
      })
    }
  }

  lineas.push(`Gestioná tu cita aquí: ${APP_URL}/cita/${token}`)

  const texto = encodeURIComponent(lineas.join('\n'))
  return `https://wa.me/${limpiarTelefono(peluqueroWhatsapp)}?text=${texto}`
}

/**
 * Construye el link wa.me para que el PELUQUERO coordine un servicio a domicilio.
 * Pre-carga el mensaje hacia el teléfono del propio peluquero.
 */
export function buildPeluqueroWALink({
  peluqueroWhatsapp,
  clienteNombre,
  clienteTelefono,
  servicio,
  fechaHora,
  direccion,
}) {
  const { fecha, hora } = formatearFechaHora(fechaHora)
  const lineas = [
    'Tenés una reserva a domicilio:',
    `Cliente: ${clienteNombre} — ${clienteTelefono}`,
    `Servicio: ${servicio}`,
    `Fecha: ${fecha} a las ${hora}`,
    `Dirección: ${direccion}`,
    'Coordiná los detalles con el cliente directamente.',
  ]
  const texto = encodeURIComponent(lineas.join('\n'))
  return `https://wa.me/${limpiarTelefono(peluqueroWhatsapp)}?text=${texto}`
}
