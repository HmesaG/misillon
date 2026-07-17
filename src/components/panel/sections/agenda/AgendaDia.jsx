import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { drParts, drMinutes, drTodayISO } from '../../../../utils/tz'
import { estadoBloqueBordeIzqClase } from '../../../../utils/estadoColor'

// Ventana visual por defecto. Se expande si hay reservas fuera de este rango
// para que ninguna quede recortada o fuera del contenedor. (BUG 43A)
const HORA_INICIO_DEFAULT = 8
const HORA_FIN_DEFAULT = 20
export const PX_POR_MIN = 1 // 60px por hora

/**
 * Calcula los límites de hora [inicio, fin] de la línea de tiempo. Parte del
 * rango por defecto (08–20) y lo estira hacia atrás/adelante si alguna reserva
 * empieza antes o termina después. Se acota a [0, 24].
 *
 * NO TOCAR esta lógica de posicionamiento — validada (BUG 43A).
 */
export function calcularLimites(items) {
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

/**
 * Vista timeline de un único día. Presentacional: recibe `items` ya filtrados
 * al día por el contenedor (`Agenda.jsx`) y la `fecha` (ISO) que se está viendo.
 * @param {{ items: object[], fecha: string }} props
 */
export default function AgendaDia({ items, fecha }) {
  // Línea de "ahora": solo tiene sentido si estamos viendo el día de hoy.
  // Se recalcula cada 60s con un interval propio (limpiado al desmontar).
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const { inicio: horaInicio, fin: horaFin } = useMemo(() => calcularLimites(items), [items])
  const altoTotal = (horaFin - horaInicio) * 60 * PX_POR_MIN
  const horas = useMemo(
    () => Array.from({ length: horaFin - horaInicio + 1 }, (_, i) => horaInicio + i),
    [horaInicio, horaFin],
  )

  const esHoy = fecha === drTodayISO()
  const minutosAhora = drMinutes(ahora)
  const mostrarAhora = esHoy && minutosAhora >= horaInicio * 60 && minutosAhora <= horaFin * 60
  const topAhora = (minutosAhora - horaInicio * 60) * PX_POR_MIN

  if (items.length === 0) {
    // Empty state con presencia: sin grilla de 12+ horas vacías, solo un
    // bloque compacto con ícono + mensaje.
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
          <CalendarDays size={28} strokeWidth={1.75} className="text-ink-muted" />
        </div>
        <p className="font-semibold text-ink">Sin reservas este día</p>
        <p className="text-sm text-ink-muted mt-1">Compartí tu link para recibir citas</p>
      </div>
    )
  }

  return (
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
      <div className="relative flex-1 border-l border-line" style={{ height: altoTotal }}>
        {horas.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-line/60"
            style={{ top: (h - horaInicio) * 60 * PX_POR_MIN }}
          />
        ))}

        {mostrarAhora && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
            style={{ top: topAhora }}
            aria-hidden="true"
          >
            <div className="w-2 h-2 rounded-full bg-accent -ml-1 flex-shrink-0" />
            <div className="flex-1 h-0.5 bg-accent" />
          </div>
        )}

        {items.map((r) => {
          const min = drMinutes(new Date(r.fecha_hora))
          const dur = r.servicios?.duracion_minutos || 30
          const top = Math.max((min - horaInicio * 60) * PX_POR_MIN, 0)
          const alto = Math.max(dur * PX_POR_MIN, 32)
          const cp = r.confirmacion_peluquero || 'pendiente'
          const p = drParts(new Date(r.fecha_hora))
          const horaTxt = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
          return (
            <div
              key={r.id}
              className={`absolute left-1 right-1 rounded-xl border-l-4 shadow-sm px-2.5 py-1 overflow-hidden ${estadoBloqueBordeIzqClase(cp)}`}
              style={{ top, height: alto }}
              title={`${horaTxt} · ${r.cliente_nombre} · ${r.servicios?.nombre || 'Servicio'}`}
            >
              <p className="text-xs font-bold leading-tight truncate">
                {horaTxt} · <span className="font-medium">{r.cliente_nombre}</span>
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
  )
}
