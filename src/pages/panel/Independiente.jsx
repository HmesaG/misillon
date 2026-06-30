import { useEffect, useState } from 'react'
import {
  Palette,
  QrCode,
  Scissors,
  CalendarClock,
  FileText,
  Landmark,
  CalendarCheck,
  Share2,
  Bell,
  BellOff,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { subscribirNotificaciones, desuscribirNotificaciones, estadoNotificaciones } from '../../hooks/usePushNotifications'
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
import ModalCompartirQR from '../../components/ModalCompartirQR'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function Independiente() {
  const { barberia: barberiaAuth, peluquero, cargando } = useAuth()
  const [barberia, setBarberia] = useState(null)
  const [modalQR, setModalQR] = useState(false)
  const [estadoPush, setEstadoPush] = useState(null)
  const [pushCargando, setPushCargando] = useState(false)
  const [pushMensaje, setPushMensaje] = useState(null)
  const b = barberia || barberiaAuth

  useEffect(() => { estadoNotificaciones().then(setEstadoPush) }, [])

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

  if (cargando || !b || !peluquero) return <Spinner texto="Cargando tu panel..." />
  if (b.estado === 'pendiente') return <BarberiaPendiente barberia={b} />

  const id = peluquero.id
  const qrUrl = `${APP_URL}/${b.slug}`

  const secciones = [
    { id: 'reservas', label: 'Mis reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
    { id: 'servicios', label: 'Servicios', Icon: Scissors, render: () => <Servicios peluqueroId={id} /> },
    { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock, render: () => <Disponibilidad peluqueroId={id} /> },
    { id: 'politicas', label: 'Políticas', Icon: FileText, render: () => <Politicas peluqueroId={id} /> },
    { id: 'cuentas', label: 'Cuentas', Icon: Landmark, render: () => <CuentasBancarias peluqueroId={id} /> },
    { id: 'qr-mio', label: 'Mi QR', Icon: QrCode, render: () => <MiQR barberiaSlug={b.slug} peluqueroSlug={peluquero.slug} /> },
    { id: 'qr-general', label: 'QR barbería', Icon: QrCode, render: () => <QRGeneral barberia={b} /> },
    { id: 'marca', label: 'Identidad', Icon: Palette, render: () => <IdentidadMarca barberia={b} onActualizar={setBarberia} /> },
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
      {estadoPush === 'denied' && (
        <p className="text-xs text-ink-muted text-center px-2">Notificaciones bloqueadas en tu navegador</p>
      )}
      {estadoPush !== 'unsupported' && estadoPush !== 'denied' && (
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
      {pushMensaje && (
        <p className={`text-xs text-center px-2 ${pushMensaje.tipo === 'error' ? 'text-red-600' : 'text-primary'}`}>
          {pushMensaje.texto}
        </p>
      )}
    </div>
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
