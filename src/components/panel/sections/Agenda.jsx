import { useEffect, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Alerta, inputClase } from '../ui'
import { drTodayISO } from '../../../utils/tz'
import AgendaDia from './agenda/AgendaDia'
import AgendaSemana from './agenda/AgendaSemana'
import AgendaMes from './agenda/AgendaMes'
import { sumarDias, sumarMeses, diasDeSemana, primerDiaMes, ultimoDiaMes, etiquetaFecha, etiquetaSemana, etiquetaMes } from './agenda/fechas'

const VISTAS = [
  { v: 'dia', n: 'Día' },
  { v: 'semana', n: 'Semana' },
  { v: 'mes', n: 'Mes' },
]

// Columnas reducidas para la vista Mes: los dots solo necesitan estado, no
// datos de cliente. Evita traer PII innecesaria para pintar un punto de color.
const COLUMNAS_MES = 'id, fecha_hora, confirmacion_peluquero, estado'
const COLUMNAS_COMPLETAS = '*, servicios(nombre, duracion_minutos)'

/**
 * Etiqueta central de navegación, según la vista activa.
 */
function etiqueta(vista, fecha) {
  if (vista === 'semana') return etiquetaSemana(fecha)
  if (vista === 'mes') return etiquetaMes(fecha)
  return etiquetaFecha(fecha)
}

/**
 * Delta de navegación (←/→) según la vista activa: ±1 día, ±7 días o ±1 mes.
 */
function navegar(vista, fecha, direccion) {
  if (vista === 'semana') return sumarDias(fecha, 7 * direccion)
  if (vista === 'mes') return sumarMeses(fecha, direccion)
  return sumarDias(fecha, direccion)
}

/**
 * Contenedor de Agenda: estado de vista/fecha/peluquero, fetch de reservas y
 * navegación. Delega el render de cada vista a los subcomponentes
 * presentacionales en `./agenda/`. Recibe peluqueroId (peluquero/independiente)
 * o barberiaId (dueño) — en ese caso muestra selector de peluquero.
 */
export default function Agenda({ peluqueroId, barberiaId }) {
  const [peluqueros, setPeluqueros] = useState([])
  const [seleccionado, setSeleccionado] = useState(peluqueroId || null)
  const [vista, setVista] = useState('dia')
  const [fecha, setFecha] = useState(drTodayISO())
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const activoId = barberiaId ? seleccionado : peluqueroId

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
      setItems([])

      let desdeFecha, hastaFecha
      if (vista === 'semana') {
        const dias = diasDeSemana(fecha)
        desdeFecha = dias[0]
        hastaFecha = dias[6]
      } else if (vista === 'mes') {
        desdeFecha = primerDiaMes(fecha)
        hastaFecha = ultimoDiaMes(fecha)
      } else {
        desdeFecha = fecha
        hastaFecha = fecha
      }

      // Offset -04:00 (DR) explícito siempre — nunca inferir tz del servidor.
      const desde = `${desdeFecha}T00:00:00-04:00`
      const hasta = `${hastaFecha}T23:59:59-04:00`
      const columnas = vista === 'mes' ? COLUMNAS_MES : COLUMNAS_COMPLETAS

      const { data, error: err } = await supabase
        .from('reservas')
        .select(columnas)
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
  }, [activoId, fecha, vista])

  function irAHoy() {
    setFecha(drTodayISO())
  }

  function irADia(fechaISO) {
    setVista('dia')
    setFecha(fechaISO)
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Agenda"
        descripcion="Tus reservas en día, semana o mes."
      />

      {barberiaId && (
        <select
          className={`${inputClase} mb-4`}
          value={seleccionado || ''}
          onChange={(e) => setSeleccionado(e.target.value)}
        >
          {peluqueros.length === 0 && <option value="">Sin profesionales</option>}
          {peluqueros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2 mb-4">
        {VISTAS.map((op) => (
          <button
            key={op.v}
            type="button"
            onClick={() => setVista(op.v)}
            className={`px-4 py-2.5 min-h-11 rounded-full text-sm font-semibold transition-colors ${
              vista === op.v ? 'bg-primary text-white' : 'bg-muted text-ink-muted hover:text-ink'
            }`}
          >
            {op.n}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={() => setFecha((f) => navegar(vista, f, -1))}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-line text-ink-muted hover:border-primary hover:text-primary transition-colors flex-shrink-0"
          aria-label="Anterior"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex flex-col items-center min-w-0">
          <button
            type="button"
            onClick={irAHoy}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Hoy
          </button>
          <span className="text-sm font-semibold text-ink capitalize text-center">{etiqueta(vista, fecha)}</span>
        </div>
        <button
          type="button"
          onClick={() => setFecha((f) => navegar(vista, f, 1))}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-line text-ink-muted hover:border-primary hover:text-primary transition-colors flex-shrink-0"
          aria-label="Siguiente"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : vista === 'semana' ? (
        <AgendaSemana items={items} fecha={fecha} onIrADia={irADia} />
      ) : vista === 'mes' ? (
        <AgendaMes items={items} fecha={fecha} onIrADia={irADia} />
      ) : (
        <AgendaDia items={items} fecha={fecha} />
      )}
    </Card>
  )
}
