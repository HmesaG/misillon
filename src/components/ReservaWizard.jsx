import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Scissors,
  MapPin,
  Home,
  MessageCircle,
} from 'lucide-react'
import { usePeluquero } from '../hooks/usePeluquero'
import { useReserva } from '../hooks/useReserva'
import { supabasePublic as supabase } from '../lib/supabase'
import { generarSlots } from '../utils/slots'
import { buildClienteWALink, buildPeluqueroWALink, formatearFechaHora } from '../utils/whatsapp'
import { drTodayISO } from '../utils/tz'

const inputClase =
  'w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none'

function precio(n) {
  if (n == null) return ''
  return `RD$${Number(n).toLocaleString('es-DO')}`
}

/**
 * Wizard de reserva embebido en la página pública.
 * @param {object} props
 * @param {object} props.barberia
 * @param {Array}  props.peluqueros      lista de peluqueros activos
 * @param {string} [props.peluqueroInicial] id preseleccionado (PeluqueroPub)
 */
export default function ReservaWizard({ barberia, peluqueros, peluqueroInicial }) {
  const [peluqueroId, setPeluqueroId] = useState(peluqueroInicial || null)
  // pasos: peluquero, servicio, fecha, politica, cliente, ok
  const [paso, setPaso] = useState(peluqueroInicial ? 'servicio' : 'peluquero')

  const [servicio, setServicio] = useState(null)
  const [esDomicilio, setEsDomicilio] = useState(false)
  const [fechaISO, setFechaISO] = useState('')
  const [slotISO, setSlotISO] = useState('')

  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  })

  const [ocupados, setOcupados] = useState([])
  const [cuentasPeluquero, setCuentasPeluquero] = useState([])
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null) // { token, waLink }

  const { servicios, disponibilidad, politica, diasBloqueados } = usePeluquero(peluqueroId)
  const { creando, crearReserva, fetchOcupados } = useReserva()

  const peluquero = useMemo(
    () => peluqueros.find((p) => p.id === peluqueroId) || null,
    [peluqueros, peluqueroId],
  )

  // Al elegir peluquero, traer sus horarios ocupados y cuentas bancarias activas
  useEffect(() => {
    if (!peluqueroId) return
    setOcupados([])
    fetchOcupados(peluqueroId)
      .then(setOcupados)
      .catch(() => {
        setOcupados([])
        setError('No pudimos verificar los horarios disponibles. Intentá de nuevo.')
      })
    supabase
      .rpc('get_cuentas_for_peluquero', { p_peluquero_id: peluqueroId })
      .then(({ data }) => setCuentasPeluquero(data || []))
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useMemo(() => {
    if (!fechaISO || !servicio) return []
    return generarSlots({
      fechaISO,
      disponibilidad,
      duracionMinutos: servicio.duracion_minutos,
      ocupados,
      diasBloqueados,
    })
  }, [fechaISO, servicio, disponibilidad, ocupados, diasBloqueados])

  const tienePolitica =
    politica && (politica.porcentaje_anticipo > 0 || (politica.texto_libre || '').trim() !== '')

  function elegirPeluquero(id) {
    setPeluqueroId(id)
    setServicio(null)
    setPaso('servicio')
  }

  function elegirServicio(s) {
    setServicio(s)
    setEsDomicilio(false)
    setFechaISO('')
    setSlotISO('')
    setPaso('fecha')
  }

  function continuarDesdeFecha() {
    setError(null)
    setPaso(tienePolitica ? 'politica' : 'cliente')
  }

  async function confirmar(e) {
    e.preventDefault()
    setError(null)

    if (!cliente.nombre.trim() || !cliente.telefono.trim()) {
      setError('Completá tu nombre y teléfono.')
      return
    }
    if (esDomicilio && !cliente.direccion.trim()) {
      setError('La dirección es obligatoria para un servicio a domicilio.')
      return
    }
    if (new Date(slotISO) <= new Date()) {
      setError('Ese horario ya pasó mientras completabas el formulario. Elegí otro.')
      setPaso('fecha')
      return
    }

    const payload = {
      barberia_id: barberia.id,
      peluquero_id: peluqueroId,
      servicio_id: servicio.id,
      cliente_nombre: cliente.nombre.trim(),
      cliente_telefono: cliente.telefono.trim(),
      cliente_email: cliente.email.trim(),
      cliente_direccion: esDomicilio ? cliente.direccion.trim() : null,
      es_domicilio: esDomicilio,
      fecha_hora: slotISO,
    }

    const res = await crearReserva(payload)
    if (!res.ok) {
      setError(res.error)
      // Si el horario ya no está disponible (lo tomó otro cliente, venció, o
      // quedó fuera de rango), volver al paso "fecha" y refrescar los ocupados
      // para que el usuario no reintente el mismo slot condenado. (BUG 39A)
      const m = (res.error || '').toLowerCase()
      if (m.includes('reservado') || m.includes('disponible') || m.includes('pasó')) {
        setSlotISO('')
        setOcupados([])
        fetchOcupados(peluqueroId)
          .then(setOcupados)
          .catch(() => setOcupados([]))
        setPaso('fecha')
      }
      return
    }

    const waLink = buildClienteWALink({
      peluqueroWhatsapp: peluquero?.whatsapp,
      peluqueroNombre: peluquero?.nombre,
      clienteNombre: cliente.nombre.trim(),
      servicio: servicio.nombre,
      fechaHora: slotISO,
      token: res.reserva.token,
      anticipo: politica?.porcentaje_anticipo || 0,
      cuentas: cuentasPeluquero,
      esDomicilio,
      direccion: cliente.direccion.trim(),
    })

    setResultado({ token: res.reserva.token, waLink })
    setPaso('ok')
  }

  // ---- Render por paso ----
  return (
    <div className="bg-white rounded-3xl border border-line shadow-sm p-6 sm:p-8">
      {paso !== 'ok' && (
        <Pasos
          actual={paso}
          tienePolitica={tienePolitica}
          omitePeluquero={!!peluqueroInicial}
        />
      )}

      {paso === 'peluquero' && (
        <div>
          <h3 className="font-bold text-ink text-lg mb-4">Elegí tu peluquero</h3>
          {peluqueros.length === 0 ? (
            <p className="text-ink-muted text-sm">
              Esta barbería no tiene peluqueros disponibles por el momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {peluqueros.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirPeluquero(p.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-line hover:border-primary hover:shadow-sm hover:bg-primary-50/40 transition-all text-left"
                >
                  <Foto url={p.foto_url} nombre={p.nombre} />
                  <span className="font-semibold text-ink">{p.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 'servicio' && (
        <div>
          <BotonAtras onClick={() => setPaso(peluqueroInicial ? 'servicio' : 'peluquero')} oculto={!!peluqueroInicial} />
          <h3 className="font-bold text-ink text-lg mb-4">Elegí el servicio</h3>
          {servicios.length === 0 ? (
            <p className="text-ink-muted text-sm">Este peluquero todavía no cargó servicios.</p>
          ) : (
            <div className="space-y-3">
              {servicios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => elegirServicio(s)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-line hover:border-primary hover:shadow-sm hover:bg-primary-50/40 transition-all text-left"
                >
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Scissors size={20} strokeWidth={1.75} color="#2c1a0e" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{s.nombre}</p>
                    <p className="text-sm text-ink-muted">
                      {s.duracion_minutos} min · {precio(s.precio_local)}
                      {s.ofrece_domicilio && s.precio_domicilio != null && (
                        <> · Domicilio {precio(s.precio_domicilio)}</>
                      )}
                    </p>
                  </div>
                  <ArrowRight size={18} strokeWidth={2} className="text-ink-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {paso === 'fecha' && (
        <div>
          <BotonAtras onClick={() => setPaso('servicio')} />
          <h3 className="font-bold text-ink text-lg mb-4">Elegí fecha y hora</h3>

          {servicio?.ofrece_domicilio && (
            <div className="flex gap-2 mb-4">
              <OpcionLugar
                activa={!esDomicilio}
                onClick={() => setEsDomicilio(false)}
                Icon={MapPin}
                label="En el local"
                detalle={precio(servicio.precio_local)}
              />
              <OpcionLugar
                activa={esDomicilio}
                onClick={() => setEsDomicilio(true)}
                Icon={Home}
                label="A domicilio"
                detalle={precio(servicio.precio_domicilio)}
              />
            </div>
          )}

          <label htmlFor="fecha" className="block text-xs font-semibold text-ink-muted mb-1.5">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            value={fechaISO}
            min={drTodayISO()}
            onChange={(e) => {
              setFechaISO(e.target.value)
              setSlotISO('')
            }}
            className={`${inputClase} mb-4`}
          />

          {fechaISO && (
            <>
              <p className="text-xs font-semibold text-ink-muted mb-2">Horarios disponibles</p>
              {slots.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No hay horarios disponibles para esa fecha. Probá otro día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      type="button"
                      onClick={() => setSlotISO(s.iso)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        slotISO === s.iso
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-primary border-primary-100 hover:border-primary'
                      }`}
                    >
                      {s.hora}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <button
            type="button"
            onClick={continuarDesdeFecha}
            disabled={!slotISO}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            Continuar
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      )}

      {paso === 'politica' && (
        <div>
          <BotonAtras onClick={() => setPaso('fecha')} />
          <h3 className="font-bold text-ink text-lg mb-4">Política de reserva</h3>
          {politica?.porcentaje_anticipo > 0 && (
            <div className="bg-accent-50 text-accent-dark rounded-2xl p-4 mb-4 text-sm">
              Para confirmar tu cita se requiere un anticipo del{' '}
              <strong>{politica.porcentaje_anticipo}%</strong>. Te enviaremos los datos de pago por
              WhatsApp.
            </div>
          )}
          {(politica?.texto_libre || '').trim() && (
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line mb-4">
              {politica.texto_libre}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPaso('cliente')}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors"
          >
            Entendido, continuar
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </div>
      )}

      {paso === 'cliente' && (
        <form onSubmit={confirmar}>
          <BotonAtras onClick={() => setPaso(tienePolitica ? 'politica' : 'fecha')} />
          <h3 className="font-bold text-ink text-lg mb-4">Tus datos</h3>
          <div className="space-y-4">
            <input
              type="text"
              required
              placeholder="Nombre completo"
              value={cliente.nombre}
              onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
              className={inputClase}
            />
            <input
              type="tel"
              required
              placeholder="WhatsApp (ej: 8095551234)"
              value={cliente.telefono}
              onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
              className={inputClase}
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={cliente.email}
              onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
              className={inputClase}
            />
            {esDomicilio && (
              <input
                type="text"
                required
                placeholder="Dirección (obligatoria para domicilio)"
                value={cliente.direccion}
                onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                className={inputClase}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {creando ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar reserva'}
          </button>
        </form>
      )}

      {paso === 'ok' && resultado && (
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} strokeWidth={1.75} color="#2c1a0e" />
          </div>
          <h3 className="text-xl font-black text-ink tracking-tight mb-2">
            ¡Tu reserva fue recibida!
          </h3>
          <p className="text-ink-muted text-sm mb-2">
            {servicio?.nombre} con {peluquero?.nombre}
          </p>
          <p className="text-ink-muted text-sm mb-6">
            {(() => {
              const { fecha, hora } = formatearFechaHora(slotISO)
              return `${fecha} a las ${hora}`
            })()}
          </p>
          <p className="text-ink-muted text-sm mb-6 max-w-sm mx-auto">
            Recibirás los detalles por WhatsApp. Podés gestionar tu cita desde el enlace que te
            enviamos.
          </p>
          {peluquero?.whatsapp && (
            <a
              href={resultado.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors"
            >
              <MessageCircle size={18} strokeWidth={2} />
              Enviar mensaje por WhatsApp
            </a>
          )}
          {esDomicilio && peluquero?.whatsapp && (
            <a
              href={buildPeluqueroWALink({
                peluqueroWhatsapp: peluquero.whatsapp,
                clienteNombre: cliente.nombre,
                clienteTelefono: cliente.telefono,
                servicio: servicio.nombre,
                fechaHora: slotISO,
                direccion: cliente.direccion,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-primary text-primary font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors mt-2"
            >
              <MessageCircle size={18} strokeWidth={2} />
              Enviar dirección al peluquero
            </a>
          )}
          <a
            href={`/cita/${resultado.token}`}
            className="block text-sm text-primary font-semibold hover:underline mt-4"
          >
            Ver y gestionar mi cita
          </a>
        </div>
      )}
    </div>
  )
}

const ETIQUETAS_PASO = {
  peluquero: 'Peluquero',
  servicio: 'Servicio',
  fecha: 'Fecha y hora',
  politica: 'Política',
  cliente: 'Tus datos',
}

function Pasos({ actual, tienePolitica, omitePeluquero }) {
  let secuencia = ['peluquero', 'servicio', 'fecha', 'politica', 'cliente']
  if (omitePeluquero) secuencia = secuencia.filter((s) => s !== 'peluquero')
  if (!tienePolitica) secuencia = secuencia.filter((s) => s !== 'politica')
  const idx = secuencia.indexOf(actual)
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        {secuencia.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full flex-1 transition-colors ${
              i <= idx ? 'bg-primary' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-semibold text-ink-muted tracking-wide">
        Paso {idx + 1} de {secuencia.length} · {ETIQUETAS_PASO[actual]}
      </p>
    </div>
  )
}

function BotonAtras({ onClick, oculto }) {
  if (oculto) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary mb-4"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      Atrás
    </button>
  )
}

function OpcionLugar({ activa, onClick, Icon, label, detalle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border transition-colors ${
        activa ? 'border-primary bg-primary-50' : 'border-line hover:border-primary'
      }`}
    >
      <Icon size={20} strokeWidth={1.75} color="#2c1a0e" />
      <span className="text-sm font-semibold text-ink">{label}</span>
      {detalle && <span className="text-xs text-ink-muted">{detalle}</span>}
    </button>
  )
}

function Foto({ url, nombre }) {
  if (url) {
    return <img src={url} alt={nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
  }
  return (
    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
      <span className="font-bold text-primary">{nombre?.charAt(0).toUpperCase()}</span>
    </div>
  )
}
