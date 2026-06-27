import { Loader2 } from 'lucide-react'

/** Spinner simple centrado. */
export default function Spinner({ texto = 'Cargando...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Loader2 className="animate-spin text-primary" size={28} strokeWidth={1.75} />
      {texto && <p className="text-ink-muted text-sm">{texto}</p>}
    </div>
  )
}
