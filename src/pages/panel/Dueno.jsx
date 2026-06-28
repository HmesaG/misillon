import { useState } from 'react'
import {
  Palette, QrCode, Users, Share2,
  CalendarCheck, Scissors, CalendarClock, FileText, Landmark,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/Spinner'
import SidebarPanel from '../../components/panel/SidebarPanel'
import { BarberiaPendiente } from '../../components/panel/ui'
import IdentidadMarca from '../../components/panel/sections/IdentidadMarca'
import QRGeneral from '../../components/panel/sections/QRGeneral'
import GestionPeluqueros from '../../components/panel/sections/GestionPeluqueros'
import MisReservas from '../../components/panel/sections/MisReservas'
import Servicios from '../../components/panel/sections/Servicios'
import Disponibilidad from '../../components/panel/sections/Disponibilidad'
import Politicas from '../../components/panel/sections/Politicas'
import CuentasBancarias from '../../components/panel/sections/CuentasBancarias'
import MiQR from '../../components/panel/sections/MiQR'
import ModalCompartirQR from '../../components/ModalCompartirQR'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function Dueno() {
  const { barberia: barberiaAuth, peluquero, cargando } = useAuth()
  const [barberia, setBarberia] = useState(null)
  const [modalQR, setModalQR] = useState(false)
  const b = barberia || barberiaAuth

  if (cargando || !b) return <Spinner texto="Cargando tu panel..." />
  if (b.estado === 'pendiente') return <BarberiaPendiente barberia={b} />

  const qrUrl = `${APP_URL}/${b.slug}`

  const secciones = [
    {
      id: 'peluqueros',
      label: 'Peluqueros',
      Icon: Users,
      render: () => <GestionPeluqueros barberia={b} />,
    },
    {
      id: 'marca',
      label: 'Identidad',
      Icon: Palette,
      render: () => <IdentidadMarca barberia={b} onActualizar={setBarberia} />,
    },
    {
      id: 'qr',
      label: 'QR barbería',
      Icon: QrCode,
      render: () => <QRGeneral barberia={b} />,
    },
    // Secciones de peluquero (solo si el dueño vinculó su cuenta a un peluquero)
    ...(peluquero ? [
      { id: 'reservas', label: 'Mis reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
      { id: 'servicios', label: 'Mis servicios', Icon: Scissors, render: () => <Servicios peluqueroId={peluquero.id} /> },
      { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock, render: () => <Disponibilidad peluqueroId={peluquero.id} /> },
      { id: 'politicas', label: 'Políticas', Icon: FileText, render: () => <Politicas peluqueroId={peluquero.id} /> },
      { id: 'cuentas', label: 'Mis cuentas', Icon: Landmark, render: () => <CuentasBancarias peluqueroId={peluquero.id} /> },
      { id: 'mi-qr', label: 'Mi QR', Icon: QrCode, render: () => <MiQR barberiaSlug={b.slug} peluqueroSlug={peluquero.slug} /> },
    ] : []),
  ]

  const botonCompartir = (
    <button
      type="button"
      onClick={() => setModalQR(true)}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
    >
      <Share2 size={16} strokeWidth={2} />
      Compartir QR
    </button>
  )

  return (
    <>
      <SidebarPanel secciones={secciones} accionExtra={botonCompartir} />
      {modalQR && (
        <ModalCompartirQR
          url={qrUrl}
          nombreArchivo={`qr-${b.slug}`}
          onCerrar={() => setModalQR(false)}
        />
      )}
    </>
  )
}
