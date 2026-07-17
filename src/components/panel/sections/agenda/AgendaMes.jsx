import { drParts, drTodayISO } from '../../../../utils/tz'
import { estadoDotClase } from '../../../../utils/estadoColor'
import { diaSemanaLunes0, primerDiaMes, ultimoDiaMes, sumarDias } from './fechas'

const DIAS_ABREV = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MAX_DOTS = 3

/** Clave 'YYYY-MM-DD' de una reserva, derivada en hora local DR (nunca UTC crudo). */
function claveDia(fechaHora) {
  const p = drParts(new Date(fechaHora))
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Vista de mes: grid 7×5-6 con puntos de color por día según estado de sus
 * reservas (no números de cantidad). `items` viene con columnas reducidas
 * (sin PII de cliente) desde el contenedor — acá solo se usa
 * confirmacion_peluquero/estado para colorear los dots.
 * @param {{ items: object[], fecha: string, onIrADia: (fechaISO: string) => void }} props
 */
export default function AgendaMes({ items, fecha, onIrADia }) {
  const hoy = drTodayISO()
  const mesActual = fecha.slice(0, 7) // 'YYYY-MM'

  const primer = primerDiaMes(fecha)
  const ultimo = ultimoDiaMes(fecha)
  const inicioGrid = sumarDias(primer, -diaSemanaLunes0(primer))
  const finGrid = sumarDias(ultimo, 6 - diaSemanaLunes0(ultimo))

  const celdas = []
  for (let cur = inicioGrid; cur <= finGrid; cur = sumarDias(cur, 1)) {
    celdas.push(cur)
  }

  const porDia = {}
  for (const r of items) {
    const clave = claveDia(r.fecha_hora)
    if (!porDia[clave]) porDia[clave] = []
    porDia[clave].push(r.confirmacion_peluquero || 'pendiente')
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_ABREV.map((d, i) => (
          <div key={i} className="text-center text-xs text-ink-muted font-semibold py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((diaISO) => {
          const delMesActual = diaISO.slice(0, 7) === mesActual
          const esHoy = diaISO === hoy
          const numero = Number(diaISO.slice(8, 10))
          const estados = porDia[diaISO] || []
          const visibles = estados.slice(0, MAX_DOTS)
          const restantes = estados.length - visibles.length

          const contenido = (
            <>
              <span className={`text-xs ${delMesActual ? 'text-ink font-semibold' : 'text-ink-muted/50'}`}>
                {numero}
              </span>
              {delMesActual && estados.length > 0 && (
                <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  {visibles.map((estado, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${estadoDotClase(estado)}`} />
                  ))}
                  {restantes > 0 && (
                    <span className="text-[10px] leading-none text-ink-muted ml-0.5">+{restantes}</span>
                  )}
                </div>
              )}
            </>
          )

          if (!delMesActual) {
            return (
              <div
                key={diaISO}
                className="min-h-11 flex flex-col items-center justify-center rounded-xl"
              >
                {contenido}
              </div>
            )
          }

          return (
            <button
              key={diaISO}
              type="button"
              onClick={() => onIrADia(diaISO)}
              className={`min-h-11 flex flex-col items-center justify-center rounded-xl transition-colors hover:bg-muted ${
                esHoy ? 'ring-2 ring-accent' : ''
              }`}
              aria-label={`Ver ${diaISO} en vista de día`}
            >
              {contenido}
            </button>
          )
        })}
      </div>
    </div>
  )
}
