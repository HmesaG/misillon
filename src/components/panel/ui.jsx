/** Pequeños helpers de UI compartidos por las secciones de panel. */
import { useEffect } from 'react'
import { Clock, X, AlertTriangle, Loader2, AlertCircle, CheckCircle2, Info, ShieldAlert, MessageCircle } from 'lucide-react'
import { buildSoporteWALink } from '../../utils/whatsapp'

export const inputClase =
  'w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none'

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-3xl shadow-md lg:shadow-sm lg:border lg:border-line p-6 ${className}`}>
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
      className={`inline-flex items-center justify-center gap-2 min-h-11 bg-accent text-primary-dark font-bold px-5 py-2.5 rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-60 ${
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
      className={`inline-flex items-center justify-center gap-2 min-h-11 border border-line bg-surface text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary hover:text-primary active:scale-[0.98] transition-all disabled:opacity-60 ${
        props.className || ''
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Botón solo-icono con área táctil mínima 44×44 (WCAG 2.2). Requiere
 * `aria-label` descriptivo del props consumidor (no se infiere).
 * @param {{ children: any, variante?: 'default'|'danger'|'activo' }} props
 */
export function BotonIcono({ children, variante = 'default', className = '', ...props }) {
  const variantes = {
    default: 'text-ink-muted hover:text-primary hover:bg-muted',
    danger: 'text-red-600 hover:bg-red-50',
    activo: 'bg-primary text-white',
  }
  return (
    <button
      type="button"
      {...props}
      className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantes[variante]} ${className}`}
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

/**
 * Pantalla de bloqueo cuando el negocio está suspendido por falta de
 * confirmación de pago (barberias.estado_facturacion = 'suspendida', migración
 * 048). Distinto de BarberiaPendiente (estado de aprobación): acá ya estuvo
 * operativo y se suspendió por facturación. Ofrece el WhatsApp de soporte.
 * @param {{ barberia?: { nombre?: string }, email?: string }} props
 */
export function CuentaSuspendida({ barberia, email }) {
  const contexto = `cuenta suspendida por facturación${barberia?.nombre ? ` — ${barberia.nombre}` : ''}`
  const waLink = buildSoporteWALink({ contexto, email })
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-6 text-center bg-surface">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <ShieldAlert size={32} strokeWidth={1.75} className="text-red-600" />
      </div>
      <h2 className="text-2xl font-black text-ink tracking-tight mb-3">
        Cuenta suspendida
      </h2>
      <p className="text-ink-muted max-w-sm leading-relaxed mb-6">
        Tu cuenta está suspendida por falta de confirmación de pago. Escribinos
        por WhatsApp para regularizarla y reactivar tu negocio.
      </p>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 min-h-11 bg-accent text-primary-dark font-bold px-5 py-2.5 rounded-xl hover:bg-accent-dark active:scale-[0.98] transition-all"
      >
        <MessageCircle size={18} strokeWidth={2} />
        Contactar a soporte
      </a>
    </div>
  )
}

/**
 * Modal genérico con overlay, título y botón de cierre.
 * @param {{ titulo: string, descripcion?: string, onCerrar: () => void, children: any, ancho?: string }} props
 */
export function Modal({ titulo, descripcion, onCerrar, children, ancho = 'max-w-2xl' }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className={`bg-surface rounded-t-3xl sm:rounded-3xl w-full ${ancho} shadow-xl max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-ink tracking-tight">{titulo}</h2>
            {descripcion && <p className="text-sm text-ink-muted mt-1">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-ink-muted transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const CONFIRM_DIALOG_VARIANTES = {
  // Acción irreversible/destructiva: borrar, eliminar. Rojo + AlertTriangle.
  destructivo: {
    iconoFondo: 'bg-red-50',
    Icon: AlertTriangle,
    iconoColor: 'text-red-600',
    boton: 'bg-red-600 text-white hover:bg-red-700',
  },
  // Acción positiva/neutra que igual merece confirmación (ej. confirmar un
  // pago): no es destructiva, así que no debe leer como una advertencia.
  neutral: {
    iconoFondo: 'bg-accent-50',
    Icon: CheckCircle2,
    iconoColor: 'text-accent-dark',
    boton: 'bg-accent text-primary-dark hover:bg-accent-dark',
  },
}

/**
 * Diálogo de confirmación reusable. `variante="destructivo"` (default) es
 * para acciones irreversibles (rojo). `variante="neutral"` es para acciones
 * positivas que igual piden confirmación (ej. confirmar un pago) — mismo
 * layout, ícono y color de acento en vez de rojo.
 * @param {{ titulo: string, mensaje: any, confirmarLabel?: string, procesando?: boolean, variante?: 'destructivo'|'neutral', onConfirmar: () => void, onCancelar: () => void }} props
 */
export function ConfirmDialog({ titulo, mensaje, confirmarLabel = 'Eliminar', procesando = false, variante = 'destructivo', onConfirmar, onCancelar }) {
  const { iconoFondo, Icon, iconoColor, boton } = CONFIRM_DIALOG_VARIANTES[variante] || CONFIRM_DIALOG_VARIANTES.destructivo
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconoFondo}`}>
          <Icon size={24} strokeWidth={1.75} className={iconoColor} />
        </div>
        <h3 className="text-lg font-black text-ink tracking-tight">{titulo}</h3>
        <div className="text-sm text-ink-muted mt-2 leading-relaxed">{mensaje}</div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={`inline-flex items-center justify-center gap-2 font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${boton}`}
          >
            {procesando && <Loader2 size={18} className="animate-spin" />}
            {confirmarLabel}
          </button>
          <BotonSecundario onClick={onCancelar} disabled={procesando}>Cancelar</BotonSecundario>
        </div>
      </div>
    </div>
  )
}

const ALERTA_CONFIG = {
  error: { clase: 'bg-red-50 text-red-600', Icon: AlertCircle },
  ok: { clase: 'bg-primary-50 text-primary', Icon: CheckCircle2 },
  info: { clase: 'bg-accent-50 text-accent-dark', Icon: Info },
}

export function Alerta({ tipo = 'error', children }) {
  if (!children) return null
  const { clase, Icon } = ALERTA_CONFIG[tipo] || ALERTA_CONFIG.info
  return (
    <p className={`flex items-start gap-2 text-sm rounded-xl px-4 py-2.5 ${clase}`}>
      <Icon size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  )
}
