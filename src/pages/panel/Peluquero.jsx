import { useEffect, useState } from 'react'
import { Scissors, CalendarClock, FileText, Landmark, QrCode, CalendarCheck, Share2, Bell, BellOff, UserCircle } from 'lucide-react'
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
import ModalCompartirQR from '../../components/ModalCompartirQR'
import MiPerfil from '../../components/panel/sections/MiPerfil'
import { subscribirNotificaciones, desuscribirNotificaciones, estadoNotificaciones } from '../../hooks/usePushNotifications'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function Peluquero() {
  const { peluquero, cargando } = useAuth()
  const [barberiaSlug, setBarberiaSlug] = useState(null)
  const [modalQR, setModalQR] = useState(false)
  const [estadoPush, setEstadoPush] = useState(null)
  const [pushCargando, setPushCargando] = useState(false)
  const [pushMensaje, setPushMensaje] = useState(null)

  useEffect(() => {
    if (!peluquero?.barberia_id) return
    supabase
      .from('barberias')
      .select('slug')
      .eq('id', peluquero.barberia_id)
      .maybeSingle()
      .then(({ data }) => setBarberiaSlug(data?.slug || ''))
  }, [peluquero?.barberia_id])

  useEffect(() => {
    estadoNotificaciones().then(setEstadoPush)
  }, [])

  async function togglePush() {
    setPushCargando(true)
    setPushMensaje(null)
    let resultado
    if (estadoPush === 'active') {
      resultado = await desuscribirNotificaciones(peluquero.id)
    } else {
      resultado = await subscribirNotificaciones(peluquero.id)
    }
    if (resultado.error) {
      setPushMensaje({ tipo: 'error', texto: resultado.error })
    } else {
      const nuevoEstado = await estadoNotificaciones()
      setEstadoPush(nuevoEstado)
      setPushMensaje({ tipo: 'ok', texto: estadoPush === 'active' ? 'Notificaciones desactivadas.' : 'Notificaciones activadas.' })
      setTimeout(() => setPushMensaje(null), 3000)
    }
    setPushCargando(false)
  }

  if (cargando || !peluquero) return <Spinner texto="Cargando tu panel..." />

  const id = peluquero.id
  const qrUrl = barberiaSlug
    ? `${APP_URL}/${barberiaSlug}/${peluquero.slug}`
    : null

  const secciones = [
    { id: 'perfil', label: 'Mi perfil', Icon: UserCircle, render: () => <MiPerfil peluquero={peluquero} /> },
    { id: 'reservas', label: 'Mis reservas', Icon: CalendarCheck, render: () => <MisReservas peluquero={peluquero} /> },
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
  ]

  const botonCompartir = qrUrl ? (
    <button
      type="button"
      onClick={() => setModalQR(true)}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
    >
      <Share2 size={16} strokeWidth={2} />
      Compartir mi QR
    </button>
  ) : null

  const botonNotificaciones =
    estadoPush === 'unsupported' ? null : estadoPush === 'denied' ? (
      <p className="text-xs text-center text-ink-muted px-2">Notificaciones bloqueadas en tu navegador</p>
    ) : (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={togglePush}
          disabled={pushCargando || estadoPush === null}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-muted hover:border-primary hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {estadoPush === 'active' ? <BellOff size={16} strokeWidth={2} /> : <Bell size={16} strokeWidth={2} />}
          {estadoPush === 'active' ? 'Desactivar notificaciones' : 'Activar notificaciones de reservas'}
        </button>
        {pushMensaje && (
          <p className={`text-xs text-center px-2 ${pushMensaje.tipo === 'error' ? 'text-red-600' : 'text-primary'}`}>
            {pushMensaje.texto}
          </p>
        )}
      </div>
    )

  const accionesExtra = (botonCompartir || botonNotificaciones) ? (
    <div className="flex flex-col gap-2">
      {botonCompartir}
      {botonNotificaciones}
    </div>
  ) : null

  return (
    <>
      <SidebarPanel secciones={secciones} accionExtra={accionesExtra} />
      {modalQR && qrUrl && (
        <ModalCompartirQR
          url={qrUrl}
          nombreArchivo={`qr-${peluquero.slug}`}
          onCerrar={() => setModalQR(false)}
        />
      )}
    </>
  )
}
