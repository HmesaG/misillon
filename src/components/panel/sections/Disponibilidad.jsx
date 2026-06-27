import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, Alerta, inputClase } from '../ui'

const DIAS = [
  { v: 1, n: 'Lunes' },
  { v: 2, n: 'Martes' },
  { v: 3, n: 'Miércoles' },
  { v: 4, n: 'Jueves' },
  { v: 5, n: 'Viernes' },
  { v: 6, n: 'Sábado' },
  { v: 0, n: 'Domingo' },
]

function nombreDia(v) {
  return DIAS.find((d) => d.v === v)?.n || ''
}

/** CRUD de franjas de disponibilidad semanal. @param {{ peluqueroId: string }} props */
export default function Disponibilidad({ peluqueroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [dia, setDia] = useState(1)
  const [inicio, setInicio] = useState('09:00')
  const [fin, setFin] = useState('18:00')
  const [error, setError] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('disponibilidad')
      .select('*')
      .eq('peluquero_id', peluqueroId)
    const orden = [1, 2, 3, 4, 5, 6, 0]
    const sorted = (data || []).sort(
      (a, b) => orden.indexOf(a.dia_semana) - orden.indexOf(b.dia_semana) ||
        a.hora_inicio.localeCompare(b.hora_inicio),
    )
    setItems(sorted)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function agregar() {
    if (fin <= inicio) return setError('La hora de fin debe ser mayor a la de inicio.')
    setError(null)
    const { error: err } = await supabase.from('disponibilidad').insert({
      peluquero_id: peluqueroId,
      dia_semana: Number(dia),
      hora_inicio: inicio,
      hora_fin: fin,
    })
    if (err) {
      setError(mensajeError(err, 'No pudimos agregar la franja.'))
      return
    }
    cargar()
  }

  async function eliminar(id) {
    await supabase.from('disponibilidad').delete().eq('id', id)
    cargar()
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Disponibilidad"
        descripcion="Definí tus horarios por día. Los clientes solo verán turnos dentro de estas franjas."
      />

      <div className="border border-line rounded-2xl p-5 mb-5 bg-surface">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <Campo label="Día">
            <select className={inputClase} value={dia} onChange={(e) => setDia(e.target.value)}>
              {DIAS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.n}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Desde">
            <input type="time" className={inputClase} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
          <Campo label="Hasta">
            <input type="time" className={inputClase} value={fin} onChange={(e) => setFin(e.target.value)} />
          </Campo>
          <BotonPrimario onClick={agregar} className="h-[42px]">
            <Plus size={18} strokeWidth={2} />
            Agregar
          </BotonPrimario>
        </div>
        {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      </div>

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no definiste tus horarios.</p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center gap-4 border border-line rounded-2xl px-4 py-3">
              <span className="font-semibold text-ink w-28">{nombreDia(d.dia_semana)}</span>
              <span className="text-ink-muted text-sm flex-1">
                {d.hora_inicio.slice(0, 5)} — {d.hora_fin.slice(0, 5)}
              </span>
              <button
                type="button"
                onClick={() => eliminar(d.id)}
                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
