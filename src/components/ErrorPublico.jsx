import { Link } from 'react-router-dom'
import { AlertCircle, Home } from 'lucide-react'

/** Pantalla de error amigable para páginas públicas. */
export default function ErrorPublico({ mensaje }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
        <AlertCircle size={28} strokeWidth={1.75} className="text-red-600" />
      </div>
      <h1 className="text-2xl font-black text-ink tracking-tight mb-3">Algo no salió bien</h1>
      <p className="text-ink-muted max-w-md mb-8">
        {mensaje || 'No pudimos cargar esta página. Verificá el enlace e intentá de nuevo.'}
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-accent text-primary-dark font-bold px-8 py-3 rounded-xl hover:bg-accent-dark transition-colors"
      >
        <Home size={18} strokeWidth={2} />
        Ir al inicio
      </Link>
    </div>
  )
}
