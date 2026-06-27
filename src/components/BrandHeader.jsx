import { Scissors } from 'lucide-react'

/**
 * Encabezado de página pública con la identidad de la barbería.
 * Usa color_primario como fondo (via CSS var --brand-primary).
 */
export default function BrandHeader({ barberia, peluquero }) {
  const fondo = barberia.color_primario || '#1a3a2e'
  return (
    <header style={{ background: fondo }} className="text-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-7 flex items-center gap-4">
        {barberia.logo_url ? (
          <img
            src={barberia.logo_url}
            alt={barberia.nombre}
            className="w-14 h-14 rounded-2xl object-cover bg-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <Scissors size={28} strokeWidth={1.75} color="white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight">{barberia.nombre}</h1>
          <p className="text-sm text-white/70">
            {peluquero ? `Reservá con ${peluquero.nombre}` : 'Elegí tu peluquero y reservá'}
          </p>
        </div>
      </div>
    </header>
  )
}
