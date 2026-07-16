import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Scissors,
  Calendar,
  MapPin,
  Home,
  Tag,
  Landmark,
  Loader2,
  X,
} from 'lucide-react'
import { supabasePublic as supabase } from '../../lib/supabase'
import EstadoBadge from '../../components/EstadoBadge'
import Spinner from '../../components/Spinner'
import ErrorPublico from '../../components/ErrorPublico'
import BotonCopiar from '../../components/BotonCopiar'
import { formatearFechaHora } from '../../utils/whatsapp'

function precio(n) {
  if (n == null) return ''
  return `RD$${Number(n).toLocaleString('es-DO')}`
}

export default function GestionCita() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [errorCancel, setErrorCancel] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data: rpc, error: err } = await supabase.rpc('get_reserva_by_token', {
      p_token: token,
    })
    setCargando(false)
    if (err || !rpc) {
      setError('No encontramos esta cita. Verificá el enlace.')
      return
    }
    setData(rpc)
  }

  useEffect(() => {
    cargar()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cancelar() {
    setCancelando(true)
    setErrorCancel(null)
    const { data: res, error: err } = await supabase.rpc('cancelar_reserva', {
      p_token: token,
      p_motivo: motivo.trim() || null,
    })
    setCancelando(false)
    if (err || !res?.ok) {
      setErrorCancel(res?.error || 'No pudimos cancelar la cita. Intentá de nuevo.')
      return
    }
    setModalAbierto(false)
    setMotivo('')
    cargar()
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner texto="Cargando tu cita..." />
      </div>
    )
  }

  if (error || !data) {
    return <ErrorPublico mensaje={error} />
  }

  const { reserva, peluquero, servicio, politica, cuentas_bancarias = [] } = data
  const { fecha, hora } = formatearFechaHora(reserva.fecha_hora)
  const cancelada = reserva.estado === 'cancelada'

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-primary text-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Scissors size={20} strokeWidth={2} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Gestión de tu cita</h1>
            <p className="text-sm text-white/70">MiSillón</p>
          </div>
        </div>
      </header>

      <main className="w-full sm:max-w-xl sm:mx-auto sm:px-6 sm:py-8 space-y-4 sm:space-y-5">
        <div className="bg-white border-y sm:border sm:rounded-3xl border-line shadow-none sm:shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-ink text-lg">{servicio.nombre}</h2>
            <EstadoBadge estado={reserva.estado} />
          </div>

          <ul className="space-y-3 text-sm">
            <Dato Icon={Scissors} label="Profesional" valor={peluquero.nombre} />
            <Dato Icon={Calendar} label="Fecha y hora" valor={`${fecha} a las ${hora}`} />
            <Dato
              Icon={reserva.es_domicilio ? Home : MapPin}
              label="Modalidad"
              valor={reserva.es_domicilio ? 'A domicilio' : 'En el local'}
            />
            <Dato
              Icon={Tag}
              label="Precio"
              valor={
                reserva.es_domicilio && servicio.precio_domicilio != null
                  ? precio(servicio.precio_domicilio)
                  : precio(servicio.precio_local)
              }
            />
            {reserva.es_domicilio && reserva.cliente_direccion && (
              <Dato Icon={MapPin} label="Dirección" valor={reserva.cliente_direccion} />
            )}
          </ul>

          {reserva.confirmacion_peluquero === 'rechazada' ? (
            <div className="mt-5 bg-red-50 text-red-600 text-sm rounded-2xl px-4 py-3">
              El profesional rechazó esta cita
              {reserva.rechazo_motivo ? `: ${reserva.rechazo_motivo}` : '.'}
            </div>
          ) : (
            cancelada && reserva.motivo_cancelacion && (
              <div className="mt-5 bg-red-50 text-red-600 text-sm rounded-2xl px-4 py-3">
                Motivo de cancelación: {reserva.motivo_cancelacion}
              </div>
            )
          )}
        </div>

        {/* Anticipo + cuentas bancarias */}
        {!cancelada && politica?.porcentaje_anticipo > 0 && (
          <div className="bg-white border-y sm:border sm:rounded-3xl border-line shadow-none sm:shadow-sm p-5 sm:p-6">
            <h3 className="font-bold text-ink mb-1">
              Anticipo requerido: {politica.porcentaje_anticipo}%
            </h3>
            <p className="text-sm text-ink-muted mb-4">
              Realizá el anticipo a una de estas cuentas para confirmar tu cita.
            </p>
            {cuentas_bancarias.length === 0 ? (
              <p className="text-sm text-ink-muted">
                El profesional todavía no cargó sus cuentas. Coordiná el pago por WhatsApp.
              </p>
            ) : (
              <div className="space-y-3">
                {cuentas_bancarias.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 border border-line rounded-2xl p-4">
                    <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Landmark size={18} strokeWidth={1.75} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink">{c.banco}</p>
                      <p className="text-sm text-ink-muted">
                        {c.tipo} · {c.numero_cuenta}
                      </p>
                      <p className="text-sm text-ink-muted">Titular: {c.titular}</p>
                    </div>
                    <BotonCopiar
                      texto={c.numero_cuenta}
                      label="Copiar número"
                      className="ml-auto"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cancelar */}
        <div className="px-4 sm:px-0 space-y-4">
          {!cancelada && (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              <X size={18} strokeWidth={2} />
              Cancelar mi cita
            </button>
          )}

          <Link to="/" className="block text-center text-sm text-ink-muted hover:text-primary">
            Volver al inicio
          </Link>
        </div>
      </main>

      {/* Modal de cancelación */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-ink text-lg mb-2">Cancelar cita</h3>
            <p className="text-sm text-ink-muted mb-4">
              Contanos el motivo (opcional). Esta acción no se puede deshacer.
            </p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo de la cancelación"
              className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none mb-4 resize-none"
            />
            {errorCancel && <p className="text-sm text-red-600 mb-3">{errorCancel}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 border border-line text-ink font-semibold px-4 py-2.5 rounded-xl hover:border-primary transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={cancelando}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {cancelando ? <Loader2 size={18} className="animate-spin" /> : 'Cancelar cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Dato({ Icon, label, valor }) {
  return (
    <li className="flex items-start gap-3">
      <Icon size={18} strokeWidth={1.75} className="text-primary mt-0.5 flex-shrink-0" />
      <div>
        <span className="block text-xs text-ink-muted">{label}</span>
        <span className="font-semibold text-ink">{valor}</span>
      </div>
    </li>
  )
}
