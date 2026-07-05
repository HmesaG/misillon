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
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-7 flex items-center gap-3 sm:gap-4">
        {barberia.logo_url ? (
          <img
            src={barberia.logo_url}
            alt={barberia.nombre}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover bg-white/10 ring-1 ring-white/20 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <Scissors size={22} strokeWidth={1.75} color="white" className="sm:hidden" />
            <Scissors size={28} strokeWidth={1.75} color="white" className="hidden sm:block" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">{barberia.nombre}</h1>
          <p className="text-xs sm:text-sm text-white/70">
            {peluquero ? `Reservá con ${peluquero.nombre}` : 'Elegí tu peluquero y reservá'}
          </p>
          {barberia.descripcion && (
            <p className="text-xs sm:text-sm text-white/80 mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
              {barberia.descripcion}
            </p>
          )}
          {barberia.direccion && (
            <p className="text-[11px] sm:text-xs text-white/60 mt-1 flex items-center gap-1 truncate">
              <MapPin size={12} strokeWidth={1.75} className="flex-shrink-0" />
              <span className="truncate">{barberia.direccion}</span>
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
