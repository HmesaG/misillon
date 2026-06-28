/**
 * Timezone de la aplicación: República Dominicana (UTC-4, sin horario de verano).
 * Todas las horas del sistema (slots, display, comparaciones "es hoy") deben
 * resolverse en esta zona para que coincidan con lo que ve el peluquero y el cliente.
 */
export const TZ = 'America/Santo_Domingo'

const _fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * Descompone una Date en sus partes locales DR.
 * @returns {{ year, month, day, hour, minute }}
 */
export function drParts(date) {
  const parts = _fmt.formatToParts(date)
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
  return {
    year:   get('year'),
    month:  get('month'),
    day:    get('day'),
    hour:   get('hour'),
    minute: get('minute'),
  }
}

/** Minutos desde medianoche DR para una Date. */
export function drMinutes(date) {
  const { hour, minute } = drParts(date)
  return hour * 60 + minute
}

/** Fecha local DR en formato 'YYYY-MM-DD'. */
export function drTodayISO() {
  const { year, month, day } = drParts(new Date())
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
