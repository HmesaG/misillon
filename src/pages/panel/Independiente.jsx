import { useState } from 'react'
import {
  Palette,
  QrCode,
  Scissors,
  CalendarClock,
  FileText,
  Landmark,
  CalendarCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/Spinner'
import SidebarPanel from '../../components/panel/SidebarPanel'
import { BarberiaPendiente } from '../../components/panel/ui'
import IdentidadMarca from '../../components/panel/sections/IdentidadMarca'
import QRGeneral from '../../components/panel/sections/QRGeneral'
import MiQR from '../../components/panel/sections/MiQR'
import Servicios from '../../components/panel/sections/Servicios'
import Disponibilidad from '../../components/panel/sections/Disponibilidad'
import Politicas from '../../components/panel/sections/Politicas'
import CuentasBancarias from '../../components/panel/sections/CuentasBancarias'
import MisReservas from '../../components/panel/sections/MisReservas'

/**
 * Panel unificado para peluqueros independientes (es_dueno_mismo).
 * Combina las secciones de Dueño y de Peluquero.
 * Si el usuario agrega un segundo peluquero, useAuth detecta rol='dueno' y
 * ProtectedRoute lo redirige automáticamente a los paneles separados.
 */
export default function Independiente() {
  const { barberia: barberiaAuth, peluquero, cargando } = useAuth()
  const [barberia, setBarberia] = useState(null)
  const b = barberia || barberiaAuth

  if (cargando || !b || !peluquero) return <Spinner texto="Cargando tu panel..." />
  if (b.estado === 'pendiente') return <BarberiaPendiente barberia={b} />

  const id = peluquero.id
  const secciones = [
    { id: 'marca', label: 'Identidad', Icon: Palette, render: () => <IdentidadMarca barberia={b} onActualizar={setBarberia} /> },
    { id: 'qr-general', label: 'QR general', Icon: QrCode, render: () => <QRGeneral barberia={b} /> },
    { id: 'qr-mio', label: 'Mi QR', Icon: QrCode, render: () => <MiQR barberiaSlug={b.slug} peluqueroSlug={peluquero.slug} /> },
    { id: 'servicios', label: 'Servicios', Icon: Scissors, render: () => <Servicios peluqueroId={id} /> },
    { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock, render: () => <Disponibilidad peluqueroId={id} /> },
    { id: 'politicas', label: 'Políticas', Icon: FileText, render: () => <Politicas peluqueroId={id} /> },
    { id: 'cuentas', label: 'Cuentas', Icon: Landmark, render: () => <CuentasBancarias peluqueroId={id} /> },
    { id: 'reservas', label: 'Reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
  ]

  return <SidebarPanel secciones={secciones} />
}
