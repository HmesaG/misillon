/**
 * Generación de slots de horario disponibles.
 *
 * Combina la disponibilidad semanal del peluquero con la duración del
 * servicio y las reservas ya tomadas para producir una lista de horarios
 * libres para una fecha dada.
 */

/** Convierte "HH:MM[:SS]" a minutos desde medianoche. */
function horaAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Formatea minutos desde medianoche a "HH:MM". */
function minutosAHora(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0')
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Genera los slots libres para una fecha.
 * @param {object} params
 * @param {string} params.fechaISO        fecha 'YYYY-MM-DD'
 * @param {Array}  params.disponibilidad  filas de disponibilidad del peluquero
 * @param {number} params.duracionMinutos duración del servicio
 * @param {Array<string>} params.ocupados ISO strings de reservas ya tomadas
 * @returns {Array<{ hora: string, iso: string }>}
 */
export function generarSlots({
  fechaISO,
  disponibilidad,
  duracionMinutos,
  ocupados = [],
}) {
  if (!fechaISO || !duracionMinutos || !disponibilidad?.length) return []

  // dia_semana: 0=domingo ... 6=sábado (igual que getDay())
  const fecha = new Date(`${fechaISO}T00:00:00`)
  const diaSemana = fecha.getDay()

  const franjas = disponibilidad.filter((d) => d.dia_semana === diaSemana)
  if (!franjas.length) return []

  // Set de minutos ocupados (inicio de cada reserva en ese día)
  const ocupadosMin = new Set(
    ocupados
      .map((iso) => new Date(iso))
      .filter(
        (d) =>
          d.getFullYear() === fecha.getFullYear() &&
          d.getMonth() === fecha.getMonth() &&
          d.getDate() === fecha.getDate(),
      )
      .map((d) => d.getHours() * 60 + d.getMinutes()),
  )

  const ahora = new Date()
  const esHoy =
    fecha.getFullYear() === ahora.getFullYear() &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getDate() === ahora.getDate()
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()

  const slots = []
  for (const franja of franjas) {
    const inicio = horaAMinutos(franja.hora_inicio)
    const fin = horaAMinutos(franja.hora_fin)
    for (let t = inicio; t + duracionMinutos <= fin; t += duracionMinutos) {
      if (ocupadosMin.has(t)) continue
      if (esHoy && t <= minutosAhora) continue // no ofrecer horarios pasados
      const hora = minutosAHora(t)
      slots.push({ hora, iso: `${fechaISO}T${hora}:00` })
    }
  }

  // Ordenar y deduplicar por hora
  const vistos = new Set()
  return slots
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .filter((s) => {
      if (vistos.has(s.hora)) return false
      vistos.add(s.hora)
      return true
    })
}
