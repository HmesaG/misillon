import { Scissors, MapPin } from 'lucide-react'

/**
 * Encabezado de página pública con la identidad de la barbería.
 * Usa color_primario como fondo (via CSS var --brand-primary).
 */
export default function BrandHeader({ barberia, peluquero }) {
  const fondo = barberia.color_primario || '#2c1a0e'
  return (
    <header
      style={{
        background: `linear-gradient(135deg, ${fondo} 0%, ${fondo} 55%, rgba(0,0,0,0.18) 100%)`,
      }}
      className="text-white relative overflow-hidden"
    >
      {/* Decorativo: halo suave, no interactivo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-7 flex items-center gap-4">
        {barberia.logo_url ? (
          <img
            src={barberia.logo_url}
            alt={barberia.nombre}
            className="w-14 h-14 rounded-2xl object-cover bg-white/10 ring-1 ring-white/20 flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <Scissors size={28} strokeWidth={1.75} color="white" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight truncate">{barberia.nombre}</h1>
          <p className="text-sm text-white/70">
            {peluquero ? `Reservá con ${peluquero.nombre}` : 'Elegí tu peluquero y reservá'}
          </p>
          {barberia.descripcion && (
            <p className="text-sm text-white/80 mt-0.5 leading-snug">{barberia.descripcion}</p>
          )}
          {barberia.direccion && (
            <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
              <MapPin size={13} strokeWidth={1.75} />
              {barberia.direccion}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
