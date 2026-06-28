import { useEffect, useState } from 'react'
import {
  Loader2,
  Store,
  Scissors,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  Building2,
} from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { Card, SeccionTitulo, Alerta } from '../../components/panel/ui'

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

function BadgeEstado({ estado }) {
  const clases = {
    aprobada: 'bg-green-50 text-green-700',
    pendiente: 'bg-yellow-50 text-yellow-700',
    rechazada: 'bg-red-50 text-red-600',
  }
  const labels = {
    aprobada: 'Aprobada',
    pendiente: 'Pendiente',
    rechazada: 'Rechazada',
  }
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
        clases[estado] ?? 'bg-muted text-ink-muted'
      }`}
    >
      {labels[estado] ?? estado}
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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      const [statsRes, reservasRes, barberiasRes] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_reservas_por_dia', { p_dias: 30 }),
        supabase
          .from('barberias')
          .select('id, nombre, slug, estado, tipo_negocio, contacto, created_at')
          .order('created_at', { ascending: false }),
      ])

      const primerError = [statsRes.error, reservasRes.error, barberiasRes.error].find(Boolean)
      if (primerError) {
        setError(mensajeError(primerError, 'No se pudieron cargar los datos del panel.'))
      }

      setStats(statsRes.data)
      setReservasDia(reservasRes.data ?? [])
      setBarberias(barberiasRes.data ?? [])
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
        <SeccionTitulo titulo="Barberías" />

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="pb-3 font-semibold pr-4">Nombre</th>
                <th className="pb-3 font-semibold pr-4">Tipo</th>
                <th className="pb-3 font-semibold pr-4">Estado</th>
                <th className="pb-3 font-semibold pr-4">Fecha de registro</th>
                <th className="pb-3 font-semibold">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {barberias.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-muted text-sm">
                    No hay barberías registradas.
                  </td>
                </tr>
              ) : (
                barberias.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{b.nombre}</p>
                      <p className="text-xs text-ink-muted">/{b.slug}</p>
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {b.tipo_negocio === 'independiente' ? 'Independiente' : 'Equipo'}
                    </td>
                    <td className="py-3 pr-4">
                      <BadgeEstado estado={b.estado} />
                    </td>
                    <td className="py-3 pr-4 text-ink-muted">
                      {new Date(b.created_at).toLocaleDateString('es-DO')}
                    </td>
                    <td className="py-3 text-ink-muted">{b.contacto || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {barberias.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">
              No hay barberías registradas.
            </p>
          ) : (
            barberias.map((b) => (
              <div key={b.id} className="border border-line rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink text-sm">{b.nombre}</p>
                    <p className="text-xs text-ink-muted">/{b.slug}</p>
                  </div>
                  <BadgeEstado estado={b.estado} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                  <span>{b.tipo_negocio === 'independiente' ? 'Independiente' : 'Equipo'}</span>
                  <span>{new Date(b.created_at).toLocaleDateString('es-DO')}</span>
                  {b.contacto && <span>{b.contacto}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
