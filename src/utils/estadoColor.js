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
  confirmada: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary', bordeIzq: 'border-l-primary', dot: 'bg-primary' },
  aprobada: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary', bordeIzq: 'border-l-primary', dot: 'bg-primary' },
  activo: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary', bordeIzq: 'border-l-primary', dot: 'bg-primary' },
  pendiente: { badge: 'bg-accent-50 text-accent-dark', texto: 'text-accent-dark', borde: 'border-accent/30', barra: 'bg-accent', bordeIzq: 'border-l-accent', dot: 'bg-accent' },
  cancelada: { badge: 'bg-red-50 text-red-600', texto: 'text-red-600', borde: 'border-red-200', barra: 'bg-red-500', bordeIzq: 'border-l-red-500', dot: 'bg-red-500' },
  rechazada: { badge: 'bg-red-50 text-red-600', texto: 'text-red-600', borde: 'border-red-200', barra: 'bg-red-500', bordeIzq: 'border-l-red-500', dot: 'bg-red-500' },
  inactivo: { badge: 'bg-muted text-ink-muted', texto: 'text-ink-muted', borde: 'border-line', barra: 'bg-line', bordeIzq: 'border-l-line', dot: 'bg-line' },
  // Facturación (barberias.estado_facturacion, migración 048)
  al_dia: { badge: 'bg-primary-50 text-primary', texto: 'text-primary', borde: 'border-primary/30', barra: 'bg-primary', bordeIzq: 'border-l-primary', dot: 'bg-primary' },
  suspendida: { badge: 'bg-red-50 text-red-600', texto: 'text-red-600', borde: 'border-red-200', barra: 'bg-red-500', bordeIzq: 'border-l-red-500', dot: 'bg-red-500' },
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

/** Clase de borde izquierdo grueso (fondo + texto + borde-izq), para bloques de agenda con jerarquía visual. */
export function estadoBloqueBordeIzqClase(estado) {
  const c = estadoColor(estado)
  return `${c.badge} ${c.bordeIzq}`
}

/** Clase de "dot" (punto) de 5-6px para vistas resumidas, ej. Agenda Mes. */
export function estadoDotClase(estado) {
  return estadoColor(estado).dot
}
