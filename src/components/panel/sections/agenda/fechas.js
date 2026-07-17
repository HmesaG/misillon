/**
 * Aritmética de calendario (día/semana/mes) para la Agenda. Todo ancla a
 * mediodía local (`T12:00:00`) antes de operar con `Date`, igual que ya hacía
 * `etiquetaFecha` en el Agenda.jsx original — evita que un `new Date(...)`
 * cerca de medianoche se corra de día por el offset de timezone del
 * navegador. Nunca se deriva una fecha-calendario desde un timestamp UTC
 * crudo (`.toISOString()`), eso ya causó bugs (BUG 4, 24A, 43A, 45A).
 *
 * Estas funciones NO conocen la timezone de República Dominicana (eso vive
 * en `src/utils/tz.js`, para convertir timestamps `fecha_hora` de la BD a
 * hora local DR) — solo hacen aritmética de fechas-calendario "YYYY-MM-DD"
 * ya resueltas, que es timezone-agnóstica por diseño.
 */

/** Suma (o resta) días calendario a una fecha ISO 'YYYY-MM-DD'. */
export function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Suma (o resta) meses calendario, clampeando el día si el mes destino es más corto. */
export function sumarMeses(fechaISO, meses) {
  const [y, m, dia] = fechaISO.split('-').map(Number)
  const base = new Date(`${y}-${String(m).padStart(2, '0')}-01T12:00:00`)
  base.setMonth(base.getMonth() + meses)
  const yy = base.getFullYear()
  const mm = base.getMonth() + 1
  const ultimoDelMes = new Date(yy, mm, 0).getDate()
  const dd = Math.min(dia, ultimoDelMes)
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/** Día de semana con lunes=0 ... domingo=6 (a diferencia de Date#getDay, que usa domingo=0). */
export function diaSemanaLunes0(fechaISO) {
  const dow = new Date(`${fechaISO}T12:00:00`).getDay() // 0=dom..6=sab
  return (dow + 6) % 7
}

/** Fecha ISO del lunes de la semana que contiene `fechaISO`. */
export function lunesDeSemana(fechaISO) {
  return sumarDias(fechaISO, -diaSemanaLunes0(fechaISO))
}

/** Los 7 días ISO (lunes a domingo) de la semana que contiene `fechaISO`. */
export function diasDeSemana(fechaISO) {
  const lunes = lunesDeSemana(fechaISO)
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

/** Primer día ISO del mes que contiene `fechaISO`. */
export function primerDiaMes(fechaISO) {
  const [y, m] = fechaISO.split('-')
  return `${y}-${m}-01`
}

/** Último día ISO del mes que contiene `fechaISO`. */
export function ultimoDiaMes(fechaISO) {
  const [y, m] = fechaISO.split('-').map(Number)
  const mm = m === 12 ? 1 : m + 1
  const yy = m === 12 ? y + 1 : y
  const primerDelSiguiente = `${yy}-${String(mm).padStart(2, '0')}-01`
  return sumarDias(primerDelSiguiente, -1)
}

export function etiquetaFecha(fechaISO) {
  return new Date(`${fechaISO}T12:00:00`).toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "14 – 20 de julio" (o "28 jun – 4 jul" si la semana cruza de mes). */
export function etiquetaSemana(fechaISO) {
  const [lunes, , , , , , domingo] = diasDeSemana(fechaISO)
  const dLunes = new Date(`${lunes}T12:00:00`)
  const dDomingo = new Date(`${domingo}T12:00:00`)
  const mesDomingo = dDomingo.toLocaleDateString('es-DO', { month: 'long' })
  if (dLunes.getMonth() === dDomingo.getMonth()) {
    return `${dLunes.getDate()} – ${dDomingo.getDate()} de ${mesDomingo}`
  }
  const mesLunes = dLunes.toLocaleDateString('es-DO', { month: 'short' })
  return `${dLunes.getDate()} ${mesLunes} – ${dDomingo.getDate()} ${mesDomingo}`
}

/** "Julio 2026" (capitalizado). */
export function etiquetaMes(fechaISO) {
  const txt = new Date(`${fechaISO}T12:00:00`).toLocaleDateString('es-DO', {
    month: 'long',
    year: 'numeric',
  })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
