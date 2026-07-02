/**
 * Mapeo centralizado de estado → clases Tailwind, dentro de la paleta
 * chocolate/naranja del proyecto (`primary` / `accent`). Evita repetir
 * verdes/amarillos hardcodeados (`#22c55e`, `bg-green-*`, `bg-yellow-*`)
 * en distintos componentes del panel.
 *
 * Dominios que comparten esta semántica de 3 estados:
 *  - reservas.estado            → pendiente | confirmada | cancelada
 *  - reservas.confirmacion_peluquero → pendiente | confirmada | rechazada
 *  - barberias.estado           → pendiente | aprobada | rechazada
 *  - peluqueros.activo          → activo | inactivo
 */
const MAPA = {
  confirmada: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary' },
  aprobada: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary' },
  activo: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary' },
  pendiente: { badge: 'bg-accent-50 text-accent-dark', texto: 'text-accent-dark', borde: 'border-accent/30', barra: 'bg-accent' },
  cancelada: { badge: 'bg-red-50 text-red-600', texto: 'text-red-600', borde: 'border-red-200', barra: 'bg-red-500' },
  rechazada: { badge: 'bg-red-50 text-red-600', texto: 'text-red-600', borde: 'border-red-200', barra: 'bg-red-500' },
  inactivo: { badge: 'bg-muted text-ink-muted', texto: 'text-ink-muted', borde: 'border-line', barra: 'bg-line' },
}

/** Devuelve el set de clases para un estado. Cae a "pendiente" si no se reconoce. */
export function estadoColor(estado) {
  return MAPA[estado] || MAPA.pendiente
}

/** Clases combinadas (fondo + texto) para un badge/pill de estado. */
export function estadoBadgeClase(estado) {
  return estadoColor(estado).badge
}

/** Clases combinadas (fondo + texto + borde) para bloques con borde, ej. eventos de agenda. */
export function estadoBloqueClase(estado) {
  const c = estadoColor(estado)
  return `${c.badge} ${c.borde}`
}
