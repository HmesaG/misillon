import { useState } from 'react'
import { QrCode, Building2 } from 'lucide-react'
import { Card, SeccionTitulo } from '../ui'
import MiQR from './MiQR'
import QRGeneral from './QRGeneral'

const TABS = [
  { id: 'mio', label: 'Mi QR', Icon: QrCode },
  { id: 'general', label: 'QR barbería', Icon: Building2 },
]

/**
 * Fusiona "Mi QR" (personal) y "QR barbería" (general) en una sola sección
 * de navegación con pestañas internas, para no duplicar ítems de menú en el
 * sidebar cuando el dueño/independiente es también su propio peluquero.
 * @param {object} props
 * @param {object} props.barberia
 * @param {string} props.barberiaSlug
 * @param {string} props.peluqueroSlug
 * @param {(barberia: object) => void} [props.onActualizarBarberia]
 */
export default function MisQR({ barberia, barberiaSlug, peluqueroSlug, onActualizarBarberia }) {
  const [tab, setTab] = useState('mio')

  return (
    <div className="space-y-4">
      <SeccionTitulo titulo="Mis QR" descripcion="Compartí tu enlace personal o el general de la barbería." />

      <div
        role="tablist"
        aria-label="Tipo de QR"
        className="inline-flex gap-1 bg-muted rounded-2xl p-1"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === id ? 'bg-white text-primary shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'mio' ? (
        <MiQR barberiaSlug={barberiaSlug} peluqueroSlug={peluqueroSlug} />
      ) : (
        <QRGeneral barberia={barberia} onActualizar={onActualizarBarberia} />
      )}
    </div>
  )
}
