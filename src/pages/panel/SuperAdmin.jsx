import { useEffect, useState, Fragment } from 'react'
import {
  Loader2,
  Store,
  Scissors,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  Building2,
  Clock,
  Share2,
  ChevronDown,
  ChevronUp,
  Users,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { Card, SeccionTitulo, Alerta, BotonPrimario, BotonSecundario, ConfirmDialog } from '../../components/panel/ui'
import EstadoBadge from '../../components/EstadoBadge'
import ModalCompartirQR from '../../components/ModalCompartirQR'
import ModalBarberia from '../../components/ModalBarberia'
import AdminPeluqueroModal from '../../components/panel/AdminPeluqueroModal'

const SELECT_BARBERIAS =
  'id, nombre, slug, estado, tipo_negocio, contacto, descripcion, direccion, created_at, peluqueros(id, nombre, slug, activo, whatsapp, email, foto_url)'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

const KPI_ROWS = [
  [
    { key: 'barberias_aprobadas', label: 'Barberías activas', Icon: Store },
    { key: 'peluqueros_activos', label: 'Peluqueros activos', Icon: Scissors },
    { key: 'reservas_hoy', label: 'Reservas hoy', Icon: CalendarCheck },
  ],
  [
    { key: 'reservas_semana', label: 'Reservas esta semana', Icon: CalendarDays },
    { key: 'reservas_mes', label: 'Reservas este mes', Icon: TrendingUp },
    { key: 'total_barberias', label: 'Total barberías', Icon: Building2 },
  ],
]

const LABEL_INDICES = new Set([0, 7, 14, 21, 29])

function KpiCard({ label, value, Icon }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Icon size={20} strokeWidth={1.75} className="text-primary" />
      </div>
      <div>
        <p className="text-3xl font-black text-ink leading-none">{value ?? '—'}</p>
        <p className="text-xs text-ink-muted mt-1">{label}</p>
      </div>
    </Card>
  )
}

function BadgeTipo({ tipo }) {
  const esIndep = tipo === 'independiente'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${esIndep ? 'bg-accent/10 text-accent-dark' : 'bg-primary/10 text-primary'}`}>
      {esIndep ? <Scissors size={11} strokeWidth={2} /> : <Store size={11} strokeWidth={2} />}
      {esIndep ? 'Individual' : 'Equipo'}
    </span>
  )
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1)

  if (data.length === 0) {
    return (
      <p className="text-sm text-ink-muted text-center py-8">
        Sin reservas en los últimos 30 días.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-px h-40 w-full">
        {data.map((item, i) => {
          const pct = (item.total / max) * 100
          return (
            <div
              key={item.fecha}
              className="flex-1 h-full flex flex-col justify-end"
            >
              <div
                className="w-full bg-primary hover:bg-primary-light transition-colors rounded-t cursor-default"
                style={{ height: `${pct}%`, minHeight: item.total > 0 ? '2px' : '0px' }}
                title={`${item.fecha}: ${item.total} reservas`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex mt-1.5">
        {data.map((item, i) => (
          <div key={item.fecha} className="flex-1 flex justify-center">
            {LABEL_INDICES.has(i) && (
              <span className="text-[10px] text-ink-muted whitespace-nowrap">
                {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-DO', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SuperAdmin() {
  const [stats, setStats] = useState(null)
  const [reservasDia, setReservasDia] = useState([])
  const [barberias, setBarberias] = useState([])
  const [reservasRecientes, setReservasRecientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalQR, setModalQR] = useState(null)
  const [expandida, setExpandida] = useState(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [borrando, setBorrando] = useState(false)
  const [editandoPeluquero, setEditandoPeluquero] = useState(null) // { barberia, peluquero? }

  async function recargarBarberias() {
    const { data, error: err } = await supabase
      .from('barberias')
      .select(SELECT_BARBERIAS)
      .order('created_at', { ascending: false })
    if (err) {
      setError(mensajeError(err, 'No se pudieron recargar las barberías.'))
      return
    }
    setBarberias(data ?? [])
  }

  async function eliminarBarberia(b) {
    setBorrando(true)
    const { error: err } = await supabase.rpc('admin_eliminar_barberia', { barberia_id: b.id })
    setBorrando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos eliminar la barbería.'))
      return
    }
    setBarberias((prev) => prev.filter((x) => x.id !== b.id))
    setEliminando(null)
  }

  useEffect(() => {
    async function cargar() {
      const [statsRes, reservasRes, barberiasRes, recientesRes] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_reservas_por_dia', { p_dias: 30 }),
        supabase
          .from('barberias')
          .select(SELECT_BARBERIAS)
          .order('created_at', { ascending: false }),
        supabase
          .from('reservas')
          .select('id, estado, fecha_hora, cliente_nombre, created_at, servicios(nombre), peluqueros(nombre), barberias(nombre, slug)')
          .order('created_at', { ascending: false })
          .limit(15),
      ])

      const primerError = [statsRes.error, reservasRes.error, barberiasRes.error, recientesRes.error].find(Boolean)
      if (primerError) {
        setError(mensajeError(primerError, 'No se pudieron cargar los datos del panel.'))
      }

      setStats(statsRes.data)
      setReservasDia(reservasRes.data ?? [])
      setBarberias(barberiasRes.data ?? [])
      setReservasRecientes(recientesRes.data ?? [])
      setCargando(false)
    }

    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-primary" size={28} strokeWidth={1.75} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-ink tracking-tight">Panel de administración</h1>

      {error && <Alerta tipo="error">{error}</Alerta>}

      {KPI_ROWS.map((fila, fi) => (
        <div key={fi} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fila.map(({ key, label, Icon }) => (
            <KpiCard key={key} label={label} value={stats?.[key]} Icon={Icon} />
          ))}
        </div>
      ))}

      <Card>
        <SeccionTitulo titulo="Reservas — últimos 30 días" />
        <BarChart data={reservasDia} />
      </Card>

      <Card>
        <SeccionTitulo titulo="Reservas recientes" descripcion="Últimas 15 reservas en todas las barberías." />
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="pb-3 font-semibold pr-4">Cliente</th>
                <th className="pb-3 font-semibold pr-4">Servicio</th>
                <th className="pb-3 font-semibold pr-4">Peluquero</th>
                <th className="pb-3 font-semibold pr-4">Barbería</th>
                <th className="pb-3 font-semibold pr-4">Fecha cita</th>
                <th className="pb-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reservasRecientes.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-ink-muted text-sm">No hay reservas aún.</td></tr>
              ) : (
                reservasRecientes.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-ink">{r.cliente_nombre}</td>
                    <td className="py-3 pr-4 text-ink-muted">{r.servicios?.nombre ?? '—'}</td>
                    <td className="py-3 pr-4 text-ink-muted">{r.peluqueros?.nombre ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span className="text-ink-muted">{r.barberias?.nombre ?? '—'}</span>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {new Date(r.fecha_hora).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3"><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {reservasRecientes.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No hay reservas aún.</p>
          ) : (
            reservasRecientes.map((r) => (
              <div key={r.id} className="border border-line rounded-2xl px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink text-sm">{r.cliente_nombre}</p>
                    <p className="text-xs text-ink-muted">{r.servicios?.nombre ?? '—'} · {r.peluqueros?.nombre ?? '—'}</p>
                  </div>
                  <EstadoBadge estado={r.estado} />
                </div>
                <p className="text-xs text-ink-muted">{r.barberias?.nombre} · {new Date(r.fecha_hora).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <SeccionTitulo
          titulo="Barberías"
          accion={
            <BotonPrimario onClick={() => setModalCrear(true)}>
              <Plus size={18} strokeWidth={2} />
              Nueva barbería
            </BotonPrimario>
          }
        />

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="pb-3 font-semibold pr-4">Nombre</th>
                <th className="pb-3 font-semibold pr-4">Tipo</th>
                <th className="pb-3 font-semibold pr-4">Peluqueros</th>
                <th className="pb-3 font-semibold pr-4">Estado</th>
                <th className="pb-3 font-semibold pr-4">Registro</th>
                <th className="pb-3 font-semibold pr-4">Contacto</th>
                <th className="pb-3 font-semibold pr-4">QR</th>
                <th className="pb-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {barberias.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-ink-muted text-sm">No hay barberías registradas.</td></tr>
              ) : (
                barberias.map((b) => {
                  const peluqueros = b.peluqueros ?? []
                  const abierta = expandida === b.id
                  return (
                    <Fragment key={b.id}>
                      <tr className="border-t border-line hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-ink">{b.nombre}</p>
                          <p className="text-xs text-ink-muted">/{b.slug}</p>
                        </td>
                        <td className="py-3 pr-4"><BadgeTipo tipo={b.tipo_negocio} /></td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => setExpandida(abierta ? null : b.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-primary transition-colors"
                          >
                            <Users size={13} strokeWidth={2} />
                            {peluqueros.length}
                            {abierta ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
                          </button>
                        </td>
                        <td className="py-3 pr-4"><EstadoBadge estado={b.estado} /></td>
                        <td className="py-3 pr-4 text-ink-muted">{new Date(b.created_at).toLocaleDateString('es-DO')}</td>
                        <td className="py-3 pr-4 text-ink-muted">{b.contacto || '—'}</td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => setModalQR({ url: `${APP_URL}/${b.slug}`, nombre: `qr-${b.slug}`, titulo: b.nombre })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                            title="Compartir QR de la barbería"
                          >
                            <Share2 size={15} strokeWidth={2} />
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setModalEditar(b)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                              title="Editar barbería"
                            >
                              <Pencil size={15} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEliminando(b)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar barbería"
                            >
                              <Trash2 size={15} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {abierta && (
                        <tr className="bg-muted/30">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-xs font-semibold text-ink-muted">Peluqueros de {b.nombre}</p>
                              <button
                                type="button"
                                onClick={() => setEditandoPeluquero({ barberia: b })}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                              >
                                <Plus size={13} strokeWidth={2} />
                                Nuevo
                              </button>
                            </div>
                            {peluqueros.length === 0 ? (
                              <p className="text-xs text-ink-muted">Esta barbería no tiene peluqueros.</p>
                            ) : (
                            <div className="flex flex-wrap gap-2">
                              {peluqueros.map((p) => (
                                <div key={p.id} className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditandoPeluquero({ barberia: b, peluquero: p })}
                                    className="flex items-center gap-2 group"
                                    title={`Editar ${p.nombre}`}
                                  >
                                    <Scissors size={13} strokeWidth={1.75} className="text-ink-muted" />
                                    <span className="text-xs font-semibold text-ink group-hover:text-primary transition-colors">{p.nombre}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.activo ? 'bg-primary-50 text-primary' : 'bg-muted text-ink-muted'}`}>
                                      {p.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <Pencil size={11} strokeWidth={2} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModalQR({ url: `${APP_URL}/${b.slug}/${p.slug}`, nombre: `qr-${p.slug}`, titulo: p.nombre })}
                                    className="text-ink-muted hover:text-primary transition-colors"
                                    title={`QR de ${p.nombre}`}
                                  >
                                    <Share2 size={13} strokeWidth={2} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {barberias.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">No hay barberías registradas.</p>
          ) : (
            barberias.map((b) => {
              const peluqueros = b.peluqueros ?? []
              const abierta = expandida === b.id
              return (
                <div key={b.id} className="border border-line rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm">{b.nombre}</p>
                        <p className="text-xs text-ink-muted">/{b.slug}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <EstadoBadge estado={b.estado} />
                        <button
                          type="button"
                          onClick={() => setModalQR({ url: `${APP_URL}/${b.slug}`, nombre: `qr-${b.slug}`, titulo: b.nombre })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                        >
                          <Share2 size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalEditar(b)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminando(b)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <BadgeTipo tipo={b.tipo_negocio} />
                      <button
                        type="button"
                        onClick={() => setExpandida(abierta ? null : b.id)}
                        className="inline-flex items-center gap-1 font-semibold hover:text-primary transition-colors"
                      >
                        <Users size={12} strokeWidth={2} />
                        {peluqueros.length} peluquero{peluqueros.length !== 1 ? 's' : ''}
                        {abierta ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <span>{new Date(b.created_at).toLocaleDateString('es-DO')}</span>
                    </div>
                  </div>
                  {abierta && (
                    <div className="border-t border-line bg-muted/30 px-4 py-3 space-y-2">
                      {peluqueros.length === 0 && (
                        <p className="text-xs text-ink-muted">Esta barbería no tiene peluqueros.</p>
                      )}
                      {peluqueros.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setEditandoPeluquero({ barberia: b, peluquero: p })}
                            className="flex items-center gap-2"
                          >
                            <Scissors size={13} strokeWidth={1.75} className="text-ink-muted" />
                            <span className="text-sm font-semibold text-ink">{p.nombre}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.activo ? 'bg-primary-50 text-primary' : 'bg-muted text-ink-muted'}`}>
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                            <Pencil size={11} strokeWidth={2} className="text-ink-muted" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalQR({ url: `${APP_URL}/${b.slug}/${p.slug}`, nombre: `qr-${p.slug}`, titulo: p.nombre })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                          >
                            <Share2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditandoPeluquero({ barberia: b })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors pt-1"
                      >
                        <Plus size={13} strokeWidth={2} />
                        Nuevo peluquero
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Card>

      {modalQR && (
        <ModalCompartirQR
          url={modalQR.url}
          nombreArchivo={modalQR.nombre}
          onCerrar={() => setModalQR(null)}
        />
      )}

      {modalCrear && (
        <ModalBarberia
          modo="crear"
          onCerrar={() => setModalCrear(false)}
          onGuardado={recargarBarberias}
        />
      )}

      {modalEditar && (
        <ModalBarberia
          modo="editar"
          barberia={modalEditar}
          onCerrar={() => setModalEditar(null)}
          onGuardado={recargarBarberias}
        />
      )}

      {eliminando && (
        <ConfirmDialog
          titulo="Eliminar barbería"
          mensaje={
            <>
              ¿Eliminar <span className="font-semibold text-ink">{eliminando.nombre}</span> y todos sus datos?
              Esta acción no se puede deshacer.
            </>
          }
          confirmarLabel="Eliminar"
          procesando={borrando}
          onConfirmar={() => eliminarBarberia(eliminando)}
          onCancelar={() => !borrando && setEliminando(null)}
        />
      )}

      {editandoPeluquero && (
        <AdminPeluqueroModal
          barberia={editandoPeluquero.barberia}
          peluquero={editandoPeluquero.peluquero}
          onCerrar={() => setEditandoPeluquero(null)}
          onCambio={recargarBarberias}
        />
      )}
    </div>
  )
}
