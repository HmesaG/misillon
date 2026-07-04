import { useEffect, useMemo, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Alerta, inputClase } from '../ui'
import { drParts, drMinutes, drTodayISO } from '../../../utils/tz'
import { estadoBloqueClase } from '../../../utils/estadoColor'

// Ventana visual por defecto. Se expande si hay reservas fuera de este rango
// para que ninguna quede recortada o fuera del contenedor. (BUG 43A)
const HORA_INICIO_DEFAULT = 8
const HORA_FIN_DEFAULT = 20
const PX_POR_MIN = 1 // 60px por hora

/**
 * Calcula los límites de hora [inicio, fin] de la línea de tiempo. Parte del
 * rango por defecto (08–20) y lo estira hacia atrás/adelante si alguna reserva
 * empieza antes o termina después. Se acota a [0, 24].
 */
function calcularLimites(items) {
  let inicio = HORA_INICIO_DEFAULT
  let fin = HORA_FIN_DEFAULT
  for (const r of items) {
    const min = drMinutes(new Date(r.fecha_hora))
    const dur = r.servicios?.duracion_minutos || 30
    inicio = Math.min(inicio, Math.floor(min / 60))
    fin = Math.max(fin, Math.ceil((min + dur) / 60))
  }
  return { inicio: Math.max(0, inicio), fin: Math.min(24, fin) }
}

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

/**
 * Vista timeline del día. Recibe peluqueroId (peluquero/independiente) o
 * barberiaId (dueño) — en ese caso muestra selector de peluquero.
 */
export default function Agenda({ peluqueroId, barberiaId }) {
  const [peluqueros, setPeluqueros] = useState([])
  const [seleccionado, setSeleccionado] = useState(peluqueroId || null)
  const [fecha, setFecha] = useState(drTodayISO())
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const activoId = barberiaId ? seleccionado : peluqueroId

  const { inicio: horaInicio, fin: horaFin } = useMemo(() => calcularLimites(items), [items])
  const altoTotal = (horaFin - horaInicio) * 60 * PX_POR_MIN
  const horas = useMemo(
    () => Array.from({ length: horaFin - horaInicio + 1 }, (_, i) => horaInicio + i),
    [horaInicio, horaFin],
  )

  useEffect(() => {
    if (!barberiaId) return
    let activo = true
    supabase
      .from('peluqueros')
      .select('id, nombre')
      .eq('barberia_id', barberiaId)
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        if (!activo) return
        setPeluqueros(data || [])
        setSeleccionado((s) => s || data?.[0]?.id || null)
      })
    return () => {
      activo = false
    }
  }, [barberiaId])

  useEffect(() => {
    if (!activoId) {
      setCargando(false)
      return
    }
    let activo = true
    async function cargar() {
      setCargando(true)
      setError(null)
      const desde = `${fecha}T00:00:00-04:00`
      const hasta = `${fecha}T23:59:59-04:00`
      const { data, error: err } = await supabase
        .from('reservas')
        .select('*, servicios(nombre, duracion_minutos)')
        .eq('peluquero_id', activoId)
        .neq('estado', 'cancelada')
        .gte('fecha_hora', desde)
        .lte('fecha_hora', hasta)
        .order('fecha_hora')
      if (!activo) return
      if (err) setError(mensajeError(err, 'No pudimos cargar la agenda.'))
      setItems(data || [])
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [activoId, fecha])

  function cambiarDia(delta) {
    setFecha((f) => sumarDias(f, delta))
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Agenda"
        descripcion="Tus reservas del día en una línea de tiempo."
      />

      {barberiaId && (
        <select
          className={`${inputClase} mb-4`}
          value={seleccionado || ''}
          onChange={(e) => setSeleccionado(e.target.value)}
        >
          {peluqueros.length === 0 && <option value="">Sin peluqueros</option>}
          {peluqueros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={() => cambiarDia(-1)}
          className="p-2 rounded-xl border border-line text-ink-muted hover:border-primary hover:text-primary transition-colors"
          aria-label="Día anterior"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setFecha(drTodayISO())}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Hoy
          </button>
          <span className="text-sm font-semibold text-ink capitalize">{etiquetaFecha(fecha)}</span>
        </div>
        <button
          type="button"
          onClick={() => cambiarDia(1)}
          className="p-2 rounded-xl border border-line text-ink-muted hover:border-primary hover:text-primary transition-colors"
          aria-label="Día siguiente"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : (
        <div className="flex gap-2">
          {/* Columna de horas */}
          <div className="relative flex-shrink-0 w-12" style={{ height: altoTotal }}>
            {horas.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-xs text-ink-muted"
                style={{ top: (h - horaInicio) * 60 * PX_POR_MIN }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Pista de reservas */}
          <div
            className="relative flex-1 border-l border-line"
            style={{ height: altoTotal }}
          >
            {horas.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-line/60"
                style={{ top: (h - horaInicio) * 60 * PX_POR_MIN }}
              />
            ))}

            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
                <CalendarDays size={16} strokeWidth={1.75} className="mr-2" />
                Sin reservas este día.
              </div>
            )}

            {items.map((r) => {
              const min = drMinutes(new Date(r.fecha_hora))
              const dur = r.servicios?.duracion_minutos || 30
              const top = Math.max((min - horaInicio * 60) * PX_POR_MIN, 0)
              const alto = Math.max(dur * PX_POR_MIN, 26)
              const cp = r.confirmacion_peluquero || 'pendiente'
              const p = drParts(new Date(r.fecha_hora))
              const horaTxt = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
              return (
                <div
                  key={r.id}
                  className={`absolute left-1 right-1 rounded-xl border px-2.5 py-1 overflow-hidden ${estadoBloqueClase(cp)}`}
                  style={{ top, height: alto }}
                  title={`${horaTxt} · ${r.cliente_nombre} · ${r.servicios?.nombre || 'Servicio'}`}
                >
                  <p className="text-xs font-bold leading-tight truncate">
                    {horaTxt} · {r.cliente_nombre}
                  </p>
                  {alto > 34 && (
                    <p className="text-[11px] leading-tight truncate opacity-80">
                      {r.servicios?.nombre || 'Servicio'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
