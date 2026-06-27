/** Pequeños helpers de UI compartidos por las secciones de panel. */
import { Clock } from 'lucide-react'

export const inputClase =
  'w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none'

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-3xl border border-line shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

export function SeccionTitulo({ titulo, descripcion, accion }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-black text-ink tracking-tight">{titulo}</h2>
        {descripcion && <p className="text-sm text-ink-muted mt-1">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}

export function BotonPrimario({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-5 py-2.5 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60 ${
        props.className || ''
      }`}
    >
      {children}
    </button>
  )
}

export function BotonSecundario({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors disabled:opacity-60 ${
        props.className || ''
      }`}
    >
      {children}
    </button>
  )
}

export function Campo({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-muted mt-1">{hint}</span>}
    </label>
  )
}

export function BarberiaPendiente({ barberia }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-accent-50 rounded-2xl flex items-center justify-center mb-6">
        <Clock size={32} strokeWidth={1.75} color="#9e4420" />
      </div>
      <h2 className="text-2xl font-black text-ink tracking-tight mb-3">
        Solicitud en revisión
      </h2>
      <p className="text-ink-muted max-w-sm leading-relaxed mb-2">
        Recibimos la solicitud de <span className="font-semibold text-ink">{barberia.nombre}</span>.
        La estamos revisando y te avisaremos cuando esté aprobada.
      </p>
      <p className="text-sm text-ink-muted">
        Mientras tanto, podés cerrar sesión y volver en unos minutos.
      </p>
    </div>
  )
}

export function Alerta({ tipo = 'error', children }) {
  if (!children) return null
  const clase =
    tipo === 'error'
      ? 'bg-red-50 text-red-600'
      : tipo === 'ok'
        ? 'bg-primary-50 text-primary'
        : 'bg-accent-50 text-accent-dark'
  return <p className={`text-sm rounded-xl px-4 py-2.5 ${clase}`}>{children}</p>
}
