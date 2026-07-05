import { useEffect, useState } from 'react'
import {
  Palette, QrCode, Users, Share2,
  CalendarCheck, Scissors, CalendarClock, FileText, Landmark,
  CalendarRange, BarChart2, CalendarOff, MessageCircle, Bell, BellOff,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { subscribirNotificaciones, desuscribirNotificaciones, estadoNotificaciones } from '../../hooks/usePushNotifications'
import Spinner from '../../components/Spinner'
import SidebarPanel from '../../components/panel/SidebarPanel'
import { BarberiaPendiente } from '../../components/panel/ui'
import MiNegocio from '../../components/panel/sections/MiNegocio'
import QRGeneral from '../../components/panel/sections/QRGeneral'
import GestionPeluqueros from '../../components/panel/sections/GestionPeluqueros'
import MisReservas from '../../components/panel/sections/MisReservas'
import Servicios from '../../components/panel/sections/Servicios'
import Disponibilidad from '../../components/panel/sections/Disponibilidad'
import Politicas from '../../components/panel/sections/Politicas'
import CuentasBancarias from '../../components/panel/sections/CuentasBancarias'
import MiQR from '../../components/panel/sections/MiQR'
import Agenda from '../../components/panel/sections/Agenda'
import DiasBloqueados from '../../components/panel/sections/DiasBlockeados'
import RecordatoriosWA from '../../components/panel/sections/RecordatoriosWA'
import EstadisticasDueno from '../../components/panel/sections/EstadisticasDueno'
import ModalCompartirQR from '../../components/ModalCompartirQR'
import NuevaReservaAviso from '../../components/panel/NuevaReservaAviso'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function Dueno() {
  const { barberia: barberiaAuth, peluquero, cargando } = useAuth()
  const [barberia, setBarberia] = useState(null)
  const [modalQR, setModalQR] = useState(false)
  const [estadoPush, setEstadoPush] = useState(null)
  const [pushCargando, setPushCargando] = useState(false)
  const [pushMensaje, setPushMensaje] = useState(null)
  const b = barberia || barberiaAuth

  // El dueño puede vincular su cuenta a un peluquero (ser su propio peluquero).
  // En ese caso habilitamos las notificaciones push como en Independiente.
  useEffect(() => {
    if (peluquero) estadoNotificaciones().then(setEstadoPush)
  }, [peluquero])

  async function togglePush() {
    setPushCargando(true)
    setPushMensaje(null)
    const resultado = estadoPush === 'active'
      ? await desuscribirNotificaciones(peluquero.id)
      : await subscribirNotificaciones(peluquero.id)
    if (resultado.error) {
      setPushMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      const nuevo = await estadoNotificaciones()
      setEstadoPush(nuevo)
      setPushMensaje({ tipo: 'ok', texto: estadoPush === 'active' ? 'Notificaciones desactivadas.' : 'Notificaciones activadas.' })
      setTimeout(() => setPushMensaje(null), 3000)
    }
    setPushCargando(false)
  }

  if (cargando || !b) return <Spinner texto="Cargando tu panel..." />
  if (b.estado === 'pendiente') return <BarberiaPendiente barberia={b} />

  const qrUrl = `${APP_URL}/${b.slug}`

  const secciones = [
    {
      id: 'estadisticas',
      label: 'Estadísticas',
      Icon: BarChart2,
      render: () => <EstadisticasDueno barberia={b} />,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      Icon: CalendarRange,
      render: () => <Agenda barberiaId={b.id} />,
    },
    {
      id: 'peluqueros',
      label: 'Peluqueros',
      Icon: Users,
      render: () => <GestionPeluqueros barberia={b} />,
    },
    {
      id: 'mi-negocio',
      label: 'Mi Negocio',
      Icon: Palette,
      render: () => <MiNegocio barberia={b} peluquero={peluquero} onActualizarBarberia={setBarberia} />,
    },
    {
      id: 'qr',
      label: 'QR barbería',
      Icon: QrCode,
      render: () => <QRGeneral barberia={b} onActualizar={setBarberia} />,
    },
    // Secciones de peluquero (solo si el dueño vinculó su cuenta a un peluquero)
    ...(peluquero ? [
      { id: 'reservas', label: 'Mis reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
      { id: 'recordatorios', label: 'Recordatorios', Icon: MessageCircle, render: () => <RecordatoriosWA peluqueroId={peluquero.id} /> },
      { id: 'servicios', label: 'Mis servicios', Icon: Scissors, render: () => <Servicios peluqueroId={peluquero.id} /> },
      { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock, render: () => <Disponibilidad peluqueroId={peluquero.id} /> },
      { id: 'dias-bloqueados', label: 'Días bloqueados', Icon: CalendarOff, render: () => <DiasBloqueados peluqueroId={peluquero.id} /> },
      { id: 'politicas', label: 'Políticas', Icon: FileText, render: () => <Politicas peluqueroId={peluquero.id} /> },
      { id: 'cuentas', label: 'Mis cuentas', Icon: Landmark, render: () => <CuentasBancarias peluqueroId={peluquero.id} /> },
      { id: 'mi-qr', label: 'Mi QR', Icon: QrCode, render: () => <MiQR barberiaSlug={b.slug} peluqueroSlug={peluquero.slug} /> },
    ] : []),
  ]

  const botonCompartir = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setModalQR(true)}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
      >
        <Share2 size={16} strokeWidth={2} />
        Compartir QR
      </button>
      {/* Toggle de notificaciones push: solo si el dueño es su propio peluquero */}
      {peluquero && estadoPush === 'denied' && (
        <p className="text-xs text-ink-muted text-center px-2">Notificaciones bloqueadas en tu navegador</p>
      )}
      {peluquero && estadoPush !== 'unsupported' && estadoPush !== 'denied' && (
        <button
          type="button"
          onClick={togglePush}
          disabled={pushCargando || estadoPush === null}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:border-primary hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {estadoPush === 'active' ? <BellOff size={16} strokeWidth={2} /> : <Bell size={16} strokeWidth={2} />}
          {estadoPush === 'active' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
        </button>
      )}
      {peluquero && pushMensaje && (
        <p className={`text-xs text-center px-2 ${pushMensaje.tipo === 'error' ? 'text-red-600' : 'text-primary'}`}>
          {pushMensaje.texto}
        </p>
      )}
    </div>
  )

  return (
    <>
      <NuevaReservaAviso barberiaId={b.id} />
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
