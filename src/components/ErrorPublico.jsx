import { Link } from 'react-router-dom'
import { AlertCircle, Home, MapPinOff, RotateCcw, WifiOff } from 'lucide-react'

const VARIANTES = {
  no_encontrada: {
    icono: MapPinOff,
    colorIcono: 'text-ink-muted',
    colorFondo: 'bg-muted',
    titulo: 'Página no encontrada',
    descripcion: 'Esta barbería no existe o el enlace es incorrecto. Verificá que la dirección esté bien escrita.',
  },
  error_red: {
    icono: WifiOff,
    colorIcono: 'text-accent',
    colorFondo: 'bg-accent/10',
    titulo: 'Problema técnico',
    descripcion: 'No pudimos cargar la barbería. Revisá tu conexión o intentá de nuevo en unos minutos.',
  },
  default: {
    icono: AlertCircle,
    colorIcono: 'text-red-600',
    colorFondo: 'bg-red-50',
    titulo: 'Algo no salió bien',
    descripcion: 'No pudimos cargar esta página. Verificá el enlace e intentá de nuevo.',
  },
}

export default function ErrorPublico({ mensaje, tipo, detalle, onReintentar }) {
  const v = VARIANTES[tipo] ?? VARIANTES.default
  const Icono = v.icono

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 text-center">
      <div className={`w-14 h-14 ${v.colorFondo} rounded-2xl flex items-center justify-center mb-6`}>
        <Icono size={28} strokeWidth={1.75} className={v.colorIcono} />
      </div>
      <h1 className="text-2xl font-black text-ink tracking-tight mb-3">{v.titulo}</h1>
      <p className="text-ink-muted max-w-sm mb-8 text-sm leading-relaxed">
        {v.descripcion}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {tipo === 'error_red' && onReintentar && (
          <button
            onClick={onReintentar}
            className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary-light transition-colors"
          >
            <RotateCcw size={16} strokeWidth={2} />
            Reintentar
          </button>
        )}
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors"
        >
          <Home size={18} strokeWidth={2} />
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
