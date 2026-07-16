/**
 * Copy neutro reutilizable — MiSillón dejó de ser "solo peluquería" para ser
 * un sistema de citas para profesionales de la belleza (uñas, maquillaje,
 * pestañas/cejas, estética/spa, peluquería). Estas constantes centralizan
 * las palabras que antes asumían peluquería/barbería exclusivamente, para
 * que un ajuste futuro de tono no requiera tocar 30 archivos.
 *
 * Regla: esto es copy FIJO y neutro, no texto dinámico por rubro. No armar
 * lógica "si rubro=uñas mostrar manicurista" — eso queda fuera de alcance.
 *
 * No confundir con identificadores de código (`peluquero_id`, `useBarberia`,
 * nombres de tabla/columna, rutas de archivo) — esos NO se tocan.
 */

export const PROFESIONAL = 'Profesional'
export const PROFESIONALES = 'Profesionales'
export const NEGOCIO = 'Negocio'
export const NEGOCIOS = 'Negocios'
export const SERVICIO = 'Servicio'
export const SERVICIOS = 'Servicios'

/** "Profesional independiente" — tipo de cuenta en registro/onboarding. */
export const PROFESIONAL_INDEPENDIENTE = 'Profesional independiente'

/** "Negocio con equipo" — tipo de cuenta en registro/onboarding. */
export const NEGOCIO_CON_EQUIPO = 'Negocio con equipo'
