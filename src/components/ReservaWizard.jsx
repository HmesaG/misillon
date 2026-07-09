import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Check,
  Scissors,
  MapPin,
  Home,
  MessageCircle,
  Landmark,
} from 'lucide-react'
import { usePeluquero } from '../hooks/usePeluquero'
import { useReserva } from '../hooks/useReserva'
import { supabasePublic as supabase } from '../lib/supabase'
import { generarSlots } from '../utils/slots'
import { buildClienteWALink, buildPeluqueroWALink, formatearFechaHora } from '../utils/whatsapp'
import { drTodayISO } from '../utils/tz'

const inputClase =
  'w-full px-4 py-3 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none'

function precio(n) {
  if (n == null) return ''
  return `RD$${Number(n).toLocaleString('es-DO')}`
}

/**
 * Wizard de reserva embebido en la página pública.
 *
 * Toda la reserva vive en UNA sola página scrolleable (mobile-first): cada
 * etapa es un bloque acordeón con estado pendiente / activo / completado. El
 * bloque activo muestra sus controles; los completados colapsan a un resumen
 * compacto con opción "Cambiar". No hay transiciones entre pantallas ni
 * indicador "Paso X de Y".
 *
 * @param {object} props
 * @param {object} props.barberia
 * @param {Array}  props.peluqueros      lista de peluqueros activos
 * @param {string} [props.peluqueroInicial] id preseleccionado (PeluqueroPub)
 */
export default function ReservaWizard({ barberia, peluqueros, peluqueroInicial }) {
  const [peluqueroId, setPeluqueroId] = useState(peluqueroInicial || null)

  const [servicio, setServicio] = useState(null)
  const [esDomicilio, setEsDomicilio] = useState(false)
  const [fechaISO, setFechaISO] = useState('')
  const [slotISO, setSlotISO] = useState('')
  const [politicaOk, setPoliticaOk] = useState(false)

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

  // Bloque actualmente expandido. Arranca en el primero según haya que elegir
  // peluquero o venga preseleccionado.
  const [abierto, setAbierto] = useState(peluqueroInicial ? 'servicio' : 'peluquero')

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

  // ---- Secuencia de bloques + completitud ----
  const secuencia = useMemo(() => {
    const s = []
    if (!peluqueroInicial) s.push('peluquero')
    s.push('servicio', 'fecha')
    if (tienePolitica) s.push('politica')
    s.push('cliente')
    return s
  }, [peluqueroInicial, tienePolitica])

  const completado = {
    peluquero: !!peluqueroId,
    servicio: !!servicio,
    fecha: !!slotISO,
    politica: politicaOk,
    cliente: false, // solo se "completa" al confirmar (pasa a pantalla de éxito)
  }

  function estadoDe(id) {
    if (completado[id]) return 'completado'
    const idx = secuencia.indexOf(id)
    const previosOk = secuencia.slice(0, idx).every((p) => completado[p])
    return previosOk ? 'activo' : 'pendiente'
  }

  // ---- Handlers de avance ----
  function elegirPeluquero(id) {
    setPeluqueroId(id)
    setServicio(null)
    setEsDomicilio(false)
    setFechaISO('')
    setSlotISO('')
    setPoliticaOk(false)
    setError(null)
    setAbierto('servicio')
  }

  function elegirServicio(s) {
    setServicio(s)
    setEsDomicilio(false)
    setFechaISO('')
    setSlotISO('')
    setError(null)
    setAbierto('fecha')
  }

  // Elegir un horario avanza automáticamente al siguiente bloque, igual que
  // elegirPeluquero/elegirServicio. Antes exigía un clic extra en "Continuar".
  function elegirSlot(iso) {
    setSlotISO(iso)
    setError(null)
    setAbierto(tienePolitica ? 'politica' : 'cliente')
  }

  function aceptarPolitica() {
    setPoliticaOk(true)
    setAbierto('cliente')
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
      setAbierto('fecha')
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
      // quedó fuera de rango), volver al bloque "fecha" y refrescar los ocupados
      // para que el usuario no reintente el mismo slot condenado. (BUG 39A)
      const m = (res.error || '').toLowerCase()
      if (m.includes('reservado') || m.includes('disponible') || m.includes('pasó')) {
        setSlotISO('')
        setOcupados([])
        fetchOcupados(peluqueroId)
          .then(setOcupados)
          .catch(() => setOcupados([]))
        setAbierto('fecha')
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
  }

  // ---- Pantalla de éxito (reemplaza los bloques al confirmar) ----
  if (resultado) {
    return (
      <div className="flex-1 flex flex-col bg-white border-y sm:border border-line shadow-none sm:shadow-sm sm:rounded-3xl p-6 sm:p-8">
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

          {politica?.porcentaje_anticipo > 0 && cuentasPeluquero.length > 0 && (
            <div className="text-left max-w-sm mx-auto bg-accent-50 border border-accent/20 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={18} strokeWidth={1.75} className="text-accent-dark flex-shrink-0" />
                <p className="font-bold text-ink text-sm">
                  Anticipo del {politica.porcentaje_anticipo}% — Cuentas para transferir
                </p>
              </div>
              <div className="space-y-3">
                {cuentasPeluquero.map((c, i) => (
                  <div key={i} className={i > 0 ? 'pt-3 border-t border-accent/20' : ''}>
                    <p className="font-semibold text-ink text-sm">{c.banco}</p>
                    <p className="text-ink-muted text-sm capitalize">{c.tipo} · {c.numero_cuenta}</p>
                    <p className="text-ink-muted text-sm">Titular: {c.titular}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div className="mt-6 pt-6 border-t border-line">
            <Link
              to={
                peluqueroInicial && peluquero?.slug
                  ? `/${barberia.slug}/${peluquero.slug}`
                  : `/${barberia.slug}`
              }
              className="inline-flex items-center gap-2 text-sm text-ink-muted font-semibold hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Volver a {peluqueroInicial && peluquero?.nombre ? peluquero.nombre : barberia.nombre}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Numeración visible de cada bloque según su posición en la secuencia.
  const numero = (id) => secuencia.indexOf(id) + 1

  // ---- Página única scrolleable ----
  // Mobile-first: ancho completo sin card flotante (bordes solo arriba/abajo);
  // desde `sm:` se centra con ancho máximo y look de card sutil.
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden bg-white border-y sm:border border-line shadow-none sm:shadow-sm sm:rounded-3xl px-5 sm:px-8 divide-y divide-line">
      {/* Peluquero */}
      {!peluqueroInicial && (
        <Bloque
          n={numero('peluquero')}
          titulo="Peluquero"
          estado={estadoDe('peluquero')}
          expandido={abierto === 'peluquero'}
          resumen={peluquero?.nombre}
          onCambiar={() => setAbierto('peluquero')}
        >
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
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    peluqueroId === p.id
                      ? 'border-primary bg-primary-50'
                      : 'border-line hover:border-primary hover:shadow-sm hover:bg-primary-50/40'
                  }`}
                >
                  <Foto url={p.foto_url} nombre={p.nombre} />
                  <span className="font-semibold text-ink">{p.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </Bloque>
      )}

      {/* Servicio */}
      <Bloque
        n={numero('servicio')}
        titulo="Servicio"
        estado={estadoDe('servicio')}
        expandido={abierto === 'servicio'}
        resumen={
          servicio
            ? `${servicio.nombre} · ${servicio.duracion_minutos} min · ${precio(
                esDomicilio ? servicio.precio_domicilio : servicio.precio_local,
              )}`
            : null
        }
        onCambiar={() => setAbierto('servicio')}
      >
        {servicios.length === 0 ? (
          <p className="text-ink-muted text-sm">Este peluquero todavía no cargó servicios.</p>
        ) : (
          <div className="space-y-3">
            {servicios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => elegirServicio(s)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  servicio?.id === s.id
                    ? 'border-primary bg-primary-50'
                    : 'border-line hover:border-primary hover:shadow-sm hover:bg-primary-50/40'
                }`}
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
      </Bloque>

      {/* Fecha y hora */}
      <Bloque
        n={numero('fecha')}
        titulo="Fecha y hora"
        estado={estadoDe('fecha')}
        expandido={abierto === 'fecha'}
        resumen={
          slotISO
            ? (() => {
                const { fecha, hora } = formatearFechaHora(slotISO)
                return `${fecha} · ${hora}${esDomicilio ? ' · A domicilio' : ''}`
              })()
            : null
        }
        onCambiar={() => setAbierto('fecha')}
      >
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
          className={`${inputClase} min-w-0 max-w-full mb-4`}
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
                    onClick={() => elegirSlot(s.iso)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
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

        {error && abierto === 'fecha' && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </Bloque>

      {/* Política */}
      {tienePolitica && (
        <Bloque
          n={numero('politica')}
          titulo="Política de reserva"
          estado={estadoDe('politica')}
          expandido={abierto === 'politica'}
          resumen={
            politicaOk
              ? politica?.porcentaje_anticipo > 0
                ? `Anticipo del ${politica.porcentaje_anticipo}% · Aceptada`
                : 'Aceptada'
              : null
          }
          onCambiar={() => setAbierto('politica')}
        >
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
            onClick={aceptarPolitica}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3.5 rounded-xl hover:bg-accent-dark transition-colors"
          >
            Entendido, continuar
            <ArrowRight size={18} strokeWidth={2} />
          </button>
        </Bloque>
      )}

      {/* Tus datos + confirmar */}
      <Bloque
        n={numero('cliente')}
        titulo="Tus datos"
        estado={estadoDe('cliente')}
        expandido={abierto === 'cliente'}
        resumen={null}
        onCambiar={() => setAbierto('cliente')}
      >
        <form onSubmit={confirmar}>
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

          {error && abierto === 'cliente' && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <button
            type="submit"
            disabled={creando}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3.5 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {creando ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar reserva'}
          </button>
        </form>
      </Bloque>
    </div>
  )
}

/**
 * Bloque acordeón de una etapa de la reserva.
 * @param {object} props
 * @param {number} props.n         número de orden visible
 * @param {string} props.titulo
 * @param {'pendiente'|'activo'|'completado'} props.estado
 * @param {boolean} props.expandido  si muestra sus controles (children)
 * @param {string|null} [props.resumen] texto compacto cuando está completado/colapsado
 * @param {Function} props.onCambiar
 */
function Bloque({ n, titulo, estado, expandido, resumen, onCambiar, children }) {
  const completadoColapsado = estado === 'completado' && !expandido
  return (
    <section className={`py-5 min-w-0 ${estado === 'pendiente' ? 'opacity-45' : ''}`}>
      <div className="flex items-center gap-3">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            estado === 'completado'
              ? 'bg-primary text-white'
              : estado === 'activo'
                ? 'bg-accent text-primary-dark'
                : 'bg-muted text-ink-muted'
          }`}
        >
          {estado === 'completado' ? <Check size={16} strokeWidth={2.5} /> : n}
        </span>
        <h3 className="font-bold text-ink flex-1">{titulo}</h3>
        {completadoColapsado && (
          <button
            type="button"
            onClick={onCambiar}
            className="text-sm text-primary font-semibold hover:underline flex-shrink-0"
          >
            Cambiar
          </button>
        )}
      </div>

      {completadoColapsado && resumen && (
        <p className="text-sm text-ink-muted mt-1.5 pl-10">{resumen}</p>
      )}

      {expandido && <div className="mt-4 pl-0 sm:pl-10 min-w-0">{children}</div>}
    </section>
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
