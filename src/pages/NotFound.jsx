import { Link } from 'react-router-dom'
import { Scissors, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 text-center">
      <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6">
        <Scissors size={28} strokeWidth={1.75} color="white" />
      </div>
      <h1 className="text-4xl font-black text-ink tracking-tight mb-3">Página no encontrada</h1>
      <p className="text-ink-muted max-w-md mb-8">
        El enlace que seguiste no existe o la página fue movida.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2.5 bg-accent text-primary-dark font-bold px-8 py-4 rounded-2xl hover:bg-accent-dark transition-colors"
      >
        <Home size={20} strokeWidth={1.75} />
        Volver al inicio
      </Link>
    </div>
  )
}
