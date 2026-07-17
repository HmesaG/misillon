import { drParts, drTodayISO } from '../../../../utils/tz'
import { estadoBloqueBordeIzqClase } from '../../../../utils/estadoColor'
import { diasDeSemana } from './fechas'

const DIAS_ABREV = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

/** Clave 'YYYY-MM-DD' de una reserva, derivada en hora local DR (nunca UTC crudo). */
function claveDia(fechaHora) {
  const p = drParts(new Date(fechaHora))
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Vista de semana: lista vertical de 7 filas (lunes a domingo), cada una con
 * las reservas de ese día como mini-tarjetas horizontales apiladas.
 * @param {{ items: object[], fecha: string, onIrADia: (fechaISO: string) => void }} props
 */
export default function AgendaSemana({ items, fecha, onIrADia }) {
  const dias = diasDeSemana(fecha)
  const hoy = drTodayISO()

  const porDia = {}
  for (const r of items) {
    const clave = claveDia(r.fecha_hora)
    if (!porDia[clave]) porDia[clave] = []
    porDia[clave].push(r)
  }

  return (
    <div className="space-y-2">
      {dias.map((diaISO, i) => {
        const reservasDia = (porDia[diaISO] || []).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        const esHoy = diaISO === hoy
        const numero = Number(diaISO.slice(8, 10))
        return (
          <div key={diaISO} className="flex gap-3 rounded-2xl border border-line overflow-hidden">
            <button
              type="button"
              onClick={() => onIrADia(diaISO)}
              className={`flex-shrink-0 w-16 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors ${
                esHoy ? 'bg-accent text-white' : 'bg-muted text-ink-muted hover:bg-line'
              }`}
              aria-label={`Ver ${diaISO} en vista de día`}
            >
              <span className="text-[10px] font-bold tracking-wide">{DIAS_ABREV[i]}</span>
              <span className="text-lg font-black leading-none">{numero}</span>
            </button>

            <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center gap-1.5">
              {reservasDia.length === 0 ? (
                <p className="text-xs text-ink-muted py-2">Sin reservas</p>
              ) : (
                reservasDia.map((r) => {
                  const cp = r.confirmacion_peluquero || 'pendiente'
                  const p = drParts(new Date(r.fecha_hora))
                  const horaTxt = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg border-l-4 px-2.5 py-1.5 min-w-0 ${estadoBloqueBordeIzqClase(cp)}`}
                    >
                      <p className="text-xs leading-tight truncate">
                        <span className="font-bold">{horaTxt}</span>{' '}
                        <span className="font-medium">{r.cliente_nombre}</span>
                        {r.servicios?.nombre && (
                          <span className="opacity-80"> · {r.servicios.nombre}</span>
                        )}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
