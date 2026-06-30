import { useEffect, useState } from 'react'
import { Loader2, BarChart2, Calendar, XCircle, Award } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Alerta } from '../ui'

const METRICAS = [
  { key: 'confirmadas', label: 'Reservas confirmadas', Icon: BarChart2 },
  { key: 'pendientes', label: 'Pendientes', Icon: Calendar },
  { key: 'canceladas', label: 'Canceladas', Icon: XCircle },
  { key: 'peluqueros', label: 'Peluqueros', Icon: Award },
]

function MetricaCard({ label, value, Icon }) {
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

/** KPIs de la barbería del dueño. @param {{ barberia: object }} props */
export default function EstadisticasDueno({ barberia }) {
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError(null)
      const { data, error: err } = await supabase.rpc('get_stats_barberia', {
        p_barberia_id: barberia.id,
      })
      if (!activo) return
      if (err) setError(mensajeError(err, 'No pudimos cargar las estadísticas.'))
      setStats(data || null)
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [barberia.id])

  return (
    <div className="space-y-6">
      <SeccionTitulo titulo="Estadísticas" descripcion="Resumen de la actividad de tu barbería." />

      {error && <Alerta tipo="error">{error}</Alerta>}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} strokeWidth={1.75} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {METRICAS.map(({ key, label, Icon }) => (
            <MetricaCard key={key} label={label} value={stats?.[key]} Icon={Icon} />
          ))}
        </div>
      )}
    </div>
  )
}
