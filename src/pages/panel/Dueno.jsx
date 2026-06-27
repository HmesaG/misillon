import { useState } from 'react'
import { Palette, QrCode, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/Spinner'
import SidebarPanel from '../../components/panel/SidebarPanel'
import { BarberiaPendiente } from '../../components/panel/ui'
import IdentidadMarca from '../../components/panel/sections/IdentidadMarca'
import QRGeneral from '../../components/panel/sections/QRGeneral'
import GestionPeluqueros from '../../components/panel/sections/GestionPeluqueros'

export default function Dueno() {
  const { barberia: barberiaAuth, cargando } = useAuth()
  const [barberia, setBarberia] = useState(null)
  const b = barberia || barberiaAuth

  if (cargando || !b) return <Spinner texto="Cargando tu panel..." />
  if (b.estado === 'pendiente') return <BarberiaPendiente barberia={b} />

  const secciones = [
    {
      id: 'marca',
      label: 'Identidad',
      Icon: Palette,
      render: () => <IdentidadMarca barberia={b} onActualizar={setBarberia} />,
    },
    {
      id: 'qr',
      label: 'QR general',
      Icon: QrCode,
      render: () => <QRGeneral barberia={b} />,
    },
    {
      id: 'peluqueros',
      label: 'Peluqueros',
      Icon: Users,
      render: () => <GestionPeluqueros barberia={b} />,
    },
  ]

  return <SidebarPanel secciones={secciones} />
}
