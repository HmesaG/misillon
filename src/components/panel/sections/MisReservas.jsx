import { useEffect, useState } from 'react'
import { Loader2, Check, X, MessageCircle, MapPin } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Alerta } from '../ui'
import EstadoBadge from '../../EstadoBadge'
import { buildPeluqueroWALink, formatearFechaHora } from '../../../utils/whatsapp'

const FILTROS = [
  { v: 'todas', n: 'Todas' },
  { v: 'pendiente', n: 'Pendientes' },
  { v: 'confirmada', n: 'Confirmadas' },
  { v: 'cancelada', n: 'Canceladas' },
]

/**
 * Tabla de reservas del peluquero con filtros y acciones.
 * @param {{ peluquero: object }} props  peluquero con id y whatsapp
 */
export default function MisReservas({ peluquero }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [error, setError] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre)')
      .eq('peluquero_id', peluquero.id)
      .order('fecha_hora', { ascending: false })
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluquero.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cambiarEstado(r, estado) {
    const { error: err } = await supabase
      .from('reservas')
      .update({
        estado,
        motivo_cancelacion: estado === 'cancelada' ? 'Cancelada por el peluquero' : null,
      })
      .eq('id', r.id)
    if (err) {
      setError(mensajeError(err, 'No pudimos actualizar la reserva.'))
      return
    }
    cargar()
  }

  const visibles = filtro === 'todas' ? items : items.filter((r) => r.estado === filtro)

  return (
    <Card>
      <SeccionTitulo titulo="Mis reservas" descripcion="Gestioná tus citas. Confirmá o cancelá las pendientes." />

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFiltro(f.v)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              filtro === f.v ? 'bg-primary text-white' : 'bg-muted text-ink-muted hover:text-ink'
            }`}
          >
            {f.n}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : visibles.length === 0 ? (
        <p className="text-ink-muted text-sm">No hay reservas en esta categoría.</p>
      ) : (
        <div className="space-y-3">
          {visibles.map((r) => {
            const { fecha, hora } = formatearFechaHora(r.fecha_hora)
            return (
              <div key={r.id} className="border border-line rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-ink">{r.servicios?.nombre || 'Servicio'}</p>
                    <p className="text-sm text-ink-muted">
                      {fecha} a las {hora}
                    </p>
                  </div>
                  <EstadoBadge estado={r.estado} />
                </div>

                <p className="text-sm text-ink-muted">
                  {r.cliente_nombre} · {r.cliente_telefono}
                </p>

                {r.es_domicilio && (
                  <div className="mt-2 text-sm text-ink flex items-start gap-1.5">
                    <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span>{r.cliente_direccion}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {r.estado === 'pendiente' && (
                    <>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(r, 'confirmada')}
                        className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
                      >
                        <Check size={16} strokeWidth={2.5} />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(r, 'cancelada')}
                        className="inline-flex items-center gap-1.5 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <X size={16} strokeWidth={2.5} />
                        Cancelar
                      </button>
                    </>
                  )}
                  {r.es_domicilio && r.estado !== 'cancelada' && (
                    <a
                      href={buildPeluqueroWALink({
                        peluqueroWhatsapp: peluquero.whatsapp,
                        clienteNombre: r.cliente_nombre,
                        clienteTelefono: r.cliente_telefono,
                        servicio: r.servicios?.nombre || 'Servicio',
                        fechaHora: r.fecha_hora,
                        direccion: r.cliente_direccion,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-line text-ink text-sm font-semibold px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors"
                    >
                      <MessageCircle size={16} />
                      Coordinar domicilio
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
