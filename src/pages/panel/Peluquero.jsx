import { useEffect, useState } from 'react'
import { Scissors, CalendarClock, FileText, Landmark, QrCode, CalendarCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/Spinner'
import SidebarPanel from '../../components/panel/SidebarPanel'
import Servicios from '../../components/panel/sections/Servicios'
import Disponibilidad from '../../components/panel/sections/Disponibilidad'
import Politicas from '../../components/panel/sections/Politicas'
import CuentasBancarias from '../../components/panel/sections/CuentasBancarias'
import MiQR from '../../components/panel/sections/MiQR'
import MisReservas from '../../components/panel/sections/MisReservas'

export default function Peluquero() {
  const { peluquero, cargando } = useAuth()
  const [barberiaSlug, setBarberiaSlug] = useState(null)

  useEffect(() => {
    if (!peluquero?.barberia_id) return
    supabase
      .from('barberias')
      .select('slug')
      .eq('id', peluquero.barberia_id)
      .maybeSingle()
      .then(({ data }) => setBarberiaSlug(data?.slug || ''))
  }, [peluquero?.barberia_id])

  if (cargando || !peluquero) return <Spinner texto="Cargando tu panel..." />

  const id = peluquero.id
  const secciones = [
    { id: 'servicios', label: 'Servicios', Icon: Scissors, render: () => <Servicios peluqueroId={id} /> },
    { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock, render: () => <Disponibilidad peluqueroId={id} /> },
    { id: 'politicas', label: 'Políticas', Icon: FileText, render: () => <Politicas peluqueroId={id} /> },
    { id: 'cuentas', label: 'Cuentas', Icon: Landmark, render: () => <CuentasBancarias peluqueroId={id} /> },
    {
      id: 'qr',
      label: 'Mi QR',
      Icon: QrCode,
      render: () =>
        barberiaSlug == null ? (
          <Spinner texto="Generando QR..." />
        ) : (
          <MiQR barberiaSlug={barberiaSlug} peluqueroSlug={peluquero.slug} />
        ),
    },
    { id: 'reservas', label: 'Reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
  ]

  return <SidebarPanel secciones={secciones} />
}
