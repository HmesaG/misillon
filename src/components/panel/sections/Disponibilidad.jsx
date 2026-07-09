import { useEffect, useState } from 'react'
import { CalendarDays, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, BotonIcono, Alerta, inputClase } from '../ui'

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
  const [excluirDomingo, setExcluirDomingo] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

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

  // Rechazar solapamiento con otra franja del mismo día (rangos [inicio, fin) que se cruzan).
  function seSolapa(diaSemana) {
    return items.some(
      (d) =>
        d.dia_semana === diaSemana &&
        d.hora_inicio.slice(0, 5) < fin &&
        inicio < d.hora_fin.slice(0, 5),
    )
  }

  async function agregar() {
    setAviso(null)
    if (fin <= inicio) return setError('La hora de fin debe ser mayor a la de inicio.')
    if (seSolapa(Number(dia))) return setError('Esa franja se solapa con otra ya cargada para ese día.')
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

  async function aplicarASemana() {
    setAviso(null)
    if (fin <= inicio) return setError('La hora de fin debe ser mayor a la de inicio.')
    setError(null)
    const diasObjetivo = DIAS.map((d) => d.v).filter((v) => !(excluirDomingo && v === 0))
    const aInsertar = diasObjetivo.filter((v) => !seSolapa(v))
    const saltados = diasObjetivo.length - aInsertar.length
    if (aInsertar.length === 0) {
      setAviso(`No se agregó ninguna franja: los ${saltados} día(s) ya tienen una franja que se solapa.`)
      return
    }
    const filas = aInsertar.map((v) => ({
      peluquero_id: peluqueroId,
      dia_semana: v,
      hora_inicio: inicio,
      hora_fin: fin,
    }))
    const { error: err } = await supabase.from('disponibilidad').insert(filas)
    if (err) {
      setError(mensajeError(err, 'No pudimos aplicar la franja a la semana.'))
      return
    }
    setAviso(
      saltados > 0
        ? `Se agregaron ${aInsertar.length} día(s). Se saltaron ${saltados} por solaparse con franjas existentes.`
        : `Se agregaron ${aInsertar.length} día(s).`,
    )
    cargar()
  }

  async function eliminar(id) {
    const { error: err } = await supabase.from('disponibilidad').delete().eq('id', id)
    if (err) { setError(mensajeError(err, 'No pudimos eliminar la franja.')); return }
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
          <BotonPrimario onClick={agregar} className="h-11">
            <Plus size={18} strokeWidth={2} />
            Agregar
          </BotonPrimario>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <BotonSecundario onClick={aplicarASemana} className="h-11">
            <CalendarDays size={18} strokeWidth={2} />
            Aplicar a toda la semana
          </BotonSecundario>
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={excluirDomingo}
              onChange={(e) => setExcluirDomingo(e.target.checked)}
              className="rounded border-line text-accent focus:ring-accent"
            />
            Excluir domingo
          </label>
        </div>
        {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
        {aviso && <div className="mt-4"><Alerta tipo="ok">{aviso}</Alerta></div>}
      </div>

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no definiste tus horarios.</p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="flex items-center gap-4 border border-line rounded-2xl pl-4 pr-2 py-2">
              <span className="font-semibold text-ink w-28">{nombreDia(d.dia_semana)}</span>
              <span className="text-ink-muted text-sm flex-1">
                {d.hora_inicio.slice(0, 5)} — {d.hora_fin.slice(0, 5)}
              </span>
              <BotonIcono variante="danger" onClick={() => eliminar(d.id)} aria-label={`Eliminar franja de ${nombreDia(d.dia_semana)}`}>
                <Trash2 size={18} />
              </BotonIcono>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
