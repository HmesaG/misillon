/**
 * Utilidades para construir links wa.me con mensajes pre-cargados.
 */

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/** Normaliza un número de WhatsApp a solo dígitos (formato wa.me). */
function limpiarTelefono(tel) {
  return (tel || '').replace(/[^\d]/g, '')
}

import { TZ } from './tz'

/** Formatea una fecha/hora ISO a "DD/MM/YYYY" y "HH:MM" en hora República Dominicana. */
export function formatearFechaHora(isoString) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return { fecha: '', hora: '' }
  const fecha = d.toLocaleDateString('es-DO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('es-DO', {
    timeZone: TZ,
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
    `Hola ${peluqueroNombre}, soy ${clienteNombre}. Acabo de reservar ${servicio} para el ${fecha} a las ${hora}.`,
  ]

  if (esDomicilio && direccion) {
    lineas.push(`Servicio a domicilio en: ${direccion}`)
  }

  if (anticipo > 0) {
    lineas.push(`Realizaré el anticipo del ${anticipo}% a:`)
    if (cuentas.length) {
      cuentas.forEach((c) => {
        lineas.push(`• ${c.banco} — ${c.tipo} ${c.numero_cuenta} (${c.titular})`)
      })
    }
  }

  lineas.push(`Detalle de la cita: ${APP_URL}/cita/${token}`)

  const texto = encodeURIComponent(lineas.join('\n'))
  return `https://wa.me/${limpiarTelefono(peluqueroWhatsapp)}?text=${texto}`
}

/** Número de soporte de MiSillón (formato wa.me: código país + número, sin espacios ni guiones). */
export const SOPORTE_WHATSAPP = '18097649811'

/**
 * Construye el link wa.me para que un usuario del panel (dueño/peluquero/independiente)
 * le escriba a soporte de MiSillón. El mensaje queda pre-cargado listo para completar.
 */
export function buildSoporteWALink({ contexto, email }) {
  const lineas = [
    `Hola, escribo desde MiSillón (${contexto}).`,
    ...(email ? [`Cuenta: ${email}`] : []),
    'Necesito ayuda con: ',
  ]
  const texto = encodeURIComponent(lineas.join('\n'))
  return `https://wa.me/${SOPORTE_WHATSAPP}?text=${texto}`
}

/**
 * Construye el link wa.me para que el PELUQUERO le escriba DIRECTO al cliente
 * de una reserva (no a sí mismo). Mensaje corto y natural para coordinar
 * cualquier detalle de la cita.
 */
export function buildContactoClienteWALink({
  clienteTelefono,
  clienteNombre,
  servicio,
  fechaHora,
}) {
  const { fecha, hora } = formatearFechaHora(fechaHora)
  const texto = encodeURIComponent(
    `Hola ${clienteNombre}, te escribo por tu cita de ${servicio} el ${fecha} a las ${hora}.`
  )
  return `https://wa.me/${limpiarTelefono(clienteTelefono)}?text=${texto}`
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
