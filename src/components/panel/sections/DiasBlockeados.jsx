import { useEffect, useState } from 'react'
import { Loader2, CalendarOff, X } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonIcono, Alerta, inputClase } from '../ui'
import { drTodayISO } from '../../../utils/tz'

function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function etiquetaFecha(fechaISO) {
  return new Date(`${fechaISO}T12:00:00`).toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Gestión de días no disponibles del peluquero. @param {{ peluqueroId: string }} props */
export default function DiasBloqueados({ peluqueroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const hoy = drTodayISO()

  async function cargar() {
    setCargando(true)
    // Lectura directa de la tabla (protegida por RLS): el peluquero es dueño de
    // sus filas y sí puede ver el `motivo`. La RPC pública get_dias_bloqueados ya
    // no lo expone (migración 038), así que acá no sirve para mostrar la nota.
    const { data, error: err } = await supabase
      .from('dias_bloqueados')
      .select('fecha, motivo')
      .eq('peluquero_id', peluqueroId)
      .gte('fecha', hoy)
      .lte('fecha', sumarDias(hoy, 60))
      .order('fecha', { ascending: true })
    if (err) setError(mensajeError(err, 'No pudimos cargar los días bloqueados.'))
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function bloquear() {
    if (!fecha) return setError('Elegí una fecha para bloquear.')
    setError(null)
    setGuardando(true)
    const { error: err } = await supabase.from('dias_bloqueados').insert({
      peluquero_id: peluqueroId,
      fecha,
      motivo: motivo.trim() || null,
    })
    setGuardando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos bloquear ese día.'))
      return
    }
    setFecha('')
    setMotivo('')
    cargar()
  }

  async function desbloquear(f) {
    const { error: err } = await supabase
      .from('dias_bloqueados')
      .delete()
      .eq('peluquero_id', peluqueroId)
      .eq('fecha', f)
    if (err) {
      setError(mensajeError(err, 'No pudimos desbloquear ese día.'))
      return
    }
    cargar()
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Días no disponibles"
        descripcion="Bloqueá feriados, vacaciones o descansos. Los clientes no verán turnos esos días."
      />

      <div className="border border-line rounded-2xl p-5 mb-5 bg-surface">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Campo label="Fecha">
            <input
              type="date"
              className={inputClase}
              min={hoy}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Campo>
          <Campo label="Motivo (opcional)">
            <input
              type="text"
              className={inputClase}
              placeholder="Vacaciones, feriado..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
          <BotonPrimario onClick={bloquear} disabled={guardando} className="h-11">
            <CalendarOff size={18} strokeWidth={2} />
            Bloquear este día
          </BotonPrimario>
        </div>
        {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      </div>

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">No tenés días bloqueados próximos.</p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.fecha} className="flex items-center gap-4 border border-line rounded-2xl px-4 py-3">
              <span className="font-semibold text-ink capitalize">{etiquetaFecha(d.fecha)}</span>
              <span className="text-ink-muted text-sm flex-1">{d.motivo || '—'}</span>
              <BotonIcono variante="danger" onClick={() => desbloquear(d.fecha)} aria-label={`Desbloquear ${etiquetaFecha(d.fecha)}`}>
                <X size={18} strokeWidth={2} />
              </BotonIcono>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
