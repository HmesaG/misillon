import { CheckCircle, Clock, X } from 'lucide-react'

const CONFIG = {
  confirmada: {
    label: 'Confirmada',
    Icon: CheckCircle,
    clase: 'bg-primary-50 text-primary',
  },
  aprobada: {
    label: 'Aprobada',
    Icon: CheckCircle,
    clase: 'bg-primary-50 text-primary',
  },
  pendiente: {
    label: 'Pendiente',
    Icon: Clock,
    clase: 'bg-accent-50 text-accent-dark',
  },
  cancelada: {
    label: 'Cancelada',
    Icon: X,
    clase: 'bg-red-50 text-red-600',
  },
  rechazada: {
    label: 'Rechazada',
    Icon: X,
    clase: 'bg-red-50 text-red-600',
  },
}

/** Badge de estado: soporta citas (pendiente | confirmada | cancelada) y barberías (pendiente | aprobada | rechazada). */
export default function EstadoBadge({ estado }) {
  const cfg = CONFIG[estado] || CONFIG.pendiente
  const { Icon, label, clase } = cfg
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-full ${clase}`}
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  )
}
