import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useRealtimeReservas } from '../../hooks/useRealtimeReservas'

/**
 * Banner flotante que avisa de nuevas reservas en vivo. Se autodescarta a los
 * 5 segundos. Pasale peluqueroId (panel peluquero/independiente) o barberiaId
 * (panel del dueño).
 */
export default function NuevaReservaAviso({ peluqueroId, barberiaId }) {
  const [aviso, setAviso] = useState(null)

  useRealtimeReservas({
    peluqueroId,
    barberiaId,
    onNueva: (r) => {
      setAviso({ id: r.id, nombre: r.cliente_nombre })
      setTimeout(() => setAviso((a) => (a?.id === r.id ? null : a)), 5000)
    },
  })

  if (!aviso) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-primary text-white rounded-2xl shadow-lg px-4 py-3 max-w-xs">
      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
        <Bell size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight">Nueva reserva</p>
        <p className="text-xs text-white/80 truncate">
          {aviso.nombre ? `de ${aviso.nombre}` : 'Acabás de recibir una reserva'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAviso(null)}
        className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label="Cerrar aviso"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
