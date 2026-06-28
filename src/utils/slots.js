import { drParts, drMinutes } from './tz'

/**
 * Generación de slots de horario disponibles.
 *
 * Combina la disponibilidad semanal del peluquero con la duración del
 * servicio y las reservas ya tomadas para producir una lista de horarios
 * libres para una fecha dada.
 *
 * Todas las comparaciones de hora se hacen en hora local DR (America/Santo_Domingo)
 * para que coincidan con los horarios que el peluquero configuró.
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
 * Normaliza una entrada de `ocupados` a `{ iso, duracion }`.
 *
 * Acepta tanto el formato antiguo (ISO string plano) como el nuevo
 * (`{ fecha_hora, duracion_minutos }`) para mantener retrocompatibilidad.
 * Si no hay duración disponible, cae a 0 → solo bloquea el inicio exacto.
 */
function normalizarOcupado(o) {
  if (typeof o === 'string') return { iso: o, duracion: 0 }
  if (o && typeof o === 'object') {
    return {
      iso: o.fecha_hora ?? o.iso ?? null,
      duracion: Number(o.duracion_minutos ?? o.duracion ?? 0) || 0,
    }
  }
  return { iso: null, duracion: 0 }
}

/**
 * Genera los slots libres para una fecha.
 * @param {object} params
 * @param {string} params.fechaISO        fecha 'YYYY-MM-DD'
 * @param {Array}  params.disponibilidad  filas de disponibilidad del peluquero
 * @param {number} params.duracionMinutos duración del servicio
 * @param {Array<string|{fecha_hora:string,duracion_minutos:number}>} params.ocupados
 *        reservas ya tomadas. Formato preferido: objetos con `fecha_hora` (ISO)
 *        y `duracion_minutos`. Acepta ISO strings planos (bloquea solo el inicio).
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

  const [anio, mes, dia] = fechaISO.split('-').map(Number)

  // Intervalos ocupados [inicioMin, finMin) de las reservas de ESE día.
  // Supabase devuelve timestamptz como UTC. Convertimos a hora local DR
  // porque los horarios de disponibilidad están definidos en hora DR.
  const intervalosOcupados = ocupados
    .map(normalizarOcupado)
    .filter((o) => o.iso)
    .map((o) => ({ d: new Date(o.iso), duracion: o.duracion }))
    .filter(({ d }) => {
      const { year, month, day } = drParts(d)
      return year === anio && month === mes && day === dia
    })
    .map(({ d, duracion }) => {
      const inicio = drMinutes(d)
      return { inicio, fin: inicio + duracion }
    })

  const ahora = new Date()
  const ahoraDR = drParts(ahora)
  const esHoy = ahoraDR.year === anio && ahoraDR.month === mes && ahoraDR.day === dia
  const minutosAhora = ahoraDR.hour * 60 + ahoraDR.minute

  // ¿El slot [t, t+dur) intersecta alguna reserva ocupada?
  // Intersección de intervalos: t < rFin && t+dur > rInicio.
  // Para reservas sin duración (fin === inicio), solo colisiona el inicio exacto.
  const solapa = (t) =>
    intervalosOcupados.some(({ inicio, fin }) =>
      fin > inicio ? t < fin && t + duracionMinutos > inicio : t === inicio,
    )

  const slots = []
  for (const franja of franjas) {
    const inicio = horaAMinutos(franja.hora_inicio)
    const fin = horaAMinutos(franja.hora_fin)
    for (let t = inicio; t + duracionMinutos <= fin; t += duracionMinutos) {
      if (solapa(t)) continue
      if (esHoy && t <= minutosAhora) continue // no ofrecer horarios pasados
      const hora = minutosAHora(t)
      // Incluir offset DR explícito (-04:00) para que Supabase lo almacene
      // correctamente como UTC. America/Santo_Domingo es siempre UTC-4.
      slots.push({ hora, iso: `${fechaISO}T${hora}:00-04:00` })
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
