import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Pencil, Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, BotonIcono, Alerta, ConfirmDialog, inputClase } from '../ui'

const DURACION_MAX = 480 // 8 horas

const VACIO = {
  nombre: '',
  precio_local: '',
  precio_domicilio: '',
  duracion_minutos: 30,
  ofrece_domicilio: false,
  activo: true,
}

/**
 * CRUD de servicios del profesional.
 * @param {{ peluqueroId: string, rubroId?: string }} props
 *   rubroId: rubro principal del negocio (migración 047). Si viene y tiene
 *   plantillas, se muestra el bloque "Sugerencias para tu rubro".
 */
export default function Servicios({ peluqueroId, rubroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null) // id | 'nuevo' | null
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [aEliminar, setAEliminar] = useState(null) // { servicio, reservas } | null
  const [eliminando, setEliminando] = useState(false)

  // Sugerencias por rubro (plantillas de servicio, migración 047).
  const [plantillas, setPlantillas] = useState([])
  const [seleccionadas, setSeleccionadas] = useState([])
  const [sugerenciasAbierto, setSugerenciasAbierto] = useState(true)
  const [activando, setActivando] = useState(false)
  const [sugerenciasMensaje, setSugerenciasMensaje] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('servicios')
      .select('*')
      .eq('peluquero_id', peluqueroId)
      .order('nombre')
    if (err) setError(mensajeError(err, 'No pudimos cargar los servicios.'))
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rubroId) { setPlantillas([]); return }
    let activo = true
    supabase
      .from('servicio_plantillas')
      .select('id, nombre, duracion_sugerida_min, orden')
      .eq('rubro_id', rubroId)
      .eq('activo', true)
      .order('orden')
      .then(({ data }) => { if (activo) setPlantillas(data || []) })
    return () => { activo = false }
  }, [rubroId])

  function alternarPlantilla(id) {
    setSugerenciasMensaje(null)
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function activarSeleccionadas() {
    if (seleccionadas.length === 0) return
    setActivando(true)
    setError(null)
    setSugerenciasMensaje(null)
    const n = seleccionadas.length
    const { error: err } = await supabase.rpc('activar_plantillas_servicio', {
      p_peluquero_id: peluqueroId,
      p_plantilla_ids: seleccionadas,
    })
    setActivando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos activar los servicios sugeridos.'))
      return
    }
    setSeleccionadas([])
    setSugerenciasAbierto(false)
    setSugerenciasMensaje(`Se activ${n === 1 ? 'ó' : 'aron'} ${n} servicio${n !== 1 ? 's' : ''}. Ajustá precio y duración cuando quieras.`)
    cargar()
  }

  function abrirNuevo() {
    setForm(VACIO)
    setEditando('nuevo')
    setError(null)
  }
  function abrirEditar(s) {
    setForm({
      nombre: s.nombre,
      precio_local: s.precio_local ?? '',
      precio_domicilio: s.precio_domicilio ?? '',
      duracion_minutos: s.duracion_minutos,
      ofrece_domicilio: s.ofrece_domicilio,
      activo: s.activo,
    })
    setEditando(s.id)
    setError(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) return setError('Ingresá el nombre del servicio.')
    if (!form.duracion_minutos || form.duracion_minutos <= 0)
      return setError('La duración debe ser mayor a 0.')
    if (Number(form.duracion_minutos) > DURACION_MAX)
      return setError(`La duración no puede superar ${DURACION_MAX} minutos (8 horas).`)

    const payload = {
      peluquero_id: peluqueroId,
      nombre: form.nombre.trim(),
      precio_local: form.precio_local === '' ? null : Number(form.precio_local),
      precio_domicilio:
        form.ofrece_domicilio && form.precio_domicilio !== ''
          ? Number(form.precio_domicilio)
          : null,
      duracion_minutos: Number(form.duracion_minutos),
      ofrece_domicilio: form.ofrece_domicilio,
      activo: form.activo,
    }

    const resp =
      editando === 'nuevo'
        ? await supabase.from('servicios').insert(payload)
        : await supabase.from('servicios').update(payload).eq('id', editando)

    if (resp.error) {
      setError(mensajeError(resp.error, 'No pudimos guardar el servicio.'))
      return
    }
    setEditando(null)
    cargar()
  }

  async function pedirEliminar(s) {
    setError(null)
    // Contamos las reservas asociadas para advertir que se borran en cascada (migración 022).
    const { count } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('servicio_id', s.id)
    setAEliminar({ servicio: s, reservas: count || 0 })
  }

  async function confirmarEliminar() {
    if (!aEliminar) return
    setEliminando(true)
    const { error: err } = await supabase.from('servicios').delete().eq('id', aEliminar.servicio.id)
    setEliminando(false)
    if (err) {
      setAEliminar(null)
      setError(mensajeError(err, 'No pudimos eliminar el servicio.'))
      return
    }
    setAEliminar(null)
    cargar()
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Servicios"
        descripcion="Definí qué ofrecés, a qué precio y cuánto dura cada servicio."
        accion={
          <BotonPrimario onClick={abrirNuevo}>
            <Plus size={18} strokeWidth={2} />
            Nuevo
          </BotonPrimario>
        }
      />

      {!editando && error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}
      {!editando && sugerenciasMensaje && <div className="mb-4"><Alerta tipo="ok">{sugerenciasMensaje}</Alerta></div>}

      {/* Sugerencias para tu rubro (migración 047): activá varios servicios de un clic. */}
      {!editando && plantillas.length > 0 && (
        <div className="border border-accent/30 bg-accent-50 rounded-2xl mb-5 overflow-hidden">
          <button
            type="button"
            onClick={() => setSugerenciasAbierto((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-bold text-accent-dark">
              <Sparkles size={18} strokeWidth={2} />
              Sugerencias para tu rubro
            </span>
            {sugerenciasAbierto
              ? <ChevronUp size={18} strokeWidth={2} className="text-accent-dark flex-shrink-0" />
              : <ChevronDown size={18} strokeWidth={2} className="text-accent-dark flex-shrink-0" />}
          </button>
          {sugerenciasAbierto && (
            <div className="px-4 pb-4">
              <p className="text-sm text-ink-muted mb-3">
                Elegí los servicios que ofrecés y activalos de un clic. Después
                podés ajustar precios y duración.
              </p>
              <div className="space-y-2">
                {plantillas.map((p) => {
                  const sel = seleccionadas.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => alternarPlantilla(p.id)}
                      aria-pressed={sel}
                      className={`w-full flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors ${
                        sel ? 'border-primary' : 'border-line hover:border-primary'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${
                          sel ? 'bg-primary border-primary text-white' : 'border-line'
                        }`}
                      >
                        {sel && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-ink text-sm">{p.nombre}</span>
                        <span className="block text-xs text-ink-muted">{p.duracion_sugerida_min} min</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4">
                <BotonPrimario onClick={activarSeleccionadas} disabled={activando || seleccionadas.length === 0}>
                  {activando && <Loader2 size={18} className="animate-spin" />}
                  {seleccionadas.length > 0
                    ? `Activar ${seleccionadas.length} servicio${seleccionadas.length !== 1 ? 's' : ''}`
                    : 'Activar seleccionados'}
                </BotonPrimario>
              </div>
            </div>
          )}
        </div>
      )}

      {editando && (
        <div className="border border-line rounded-2xl p-5 mb-5 bg-surface">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nombre">
              <input className={inputClase} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Campo>
            <Campo label="Duración (minutos)">
              <input type="number" min="1" max={DURACION_MAX} className={inputClase} value={form.duracion_minutos} onChange={(e) => setForm({ ...form, duracion_minutos: e.target.value })} />
            </Campo>
            <Campo label="Precio en el local (RD$)">
              <input type="number" min="0" className={inputClase} value={form.precio_local} onChange={(e) => setForm({ ...form, precio_local: e.target.value })} />
            </Campo>
            <Campo label="Precio a domicilio (RD$)">
              <input type="number" min="0" className={inputClase} value={form.precio_domicilio} onChange={(e) => setForm({ ...form, precio_domicilio: e.target.value })} disabled={!form.ofrece_domicilio} />
            </Campo>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm text-ink">
            <input type="checkbox" checked={form.ofrece_domicilio} onChange={(e) => setForm({ ...form, ofrece_domicilio: e.target.checked })} />
            Ofrezco este servicio a domicilio
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm text-ink">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Servicio activo (visible para clientes)
          </label>
          {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
          <div className="flex gap-3 mt-4">
            <BotonPrimario onClick={guardar}>Guardar</BotonPrimario>
            <BotonSecundario onClick={() => setEditando(null)}>Cancelar</BotonSecundario>
          </div>
        </div>
      )}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no cargaste servicios.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-4 border border-line rounded-2xl p-4">
              <div className="flex-1">
                <p className="font-semibold text-ink">
                  {s.nombre}{' '}
                  {!s.activo && <span className="text-xs text-ink-muted">(inactivo)</span>}
                </p>
                <p className="text-sm text-ink-muted">
                  {s.duracion_minutos} min · RD${Number(s.precio_local || 0).toLocaleString('es-DO')}
                  {s.ofrece_domicilio && s.precio_domicilio != null && (
                    <> · Domicilio RD${Number(s.precio_domicilio).toLocaleString('es-DO')}</>
                  )}
                </p>
              </div>
              <BotonSecundario onClick={() => abrirEditar(s)} aria-label={`Editar ${s.nombre}`}>
                <Pencil size={16} />
              </BotonSecundario>
              <BotonIcono variante="danger" onClick={() => pedirEliminar(s)} aria-label={`Eliminar ${s.nombre}`}>
                <Trash2 size={18} />
              </BotonIcono>
            </div>
          ))}
        </div>
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar servicio"
          mensaje={
            aEliminar.reservas > 0 ? (
              <>
                Vas a eliminar <span className="font-semibold text-ink">{aEliminar.servicio.nombre}</span>.
                Esto también borrará {aEliminar.reservas === 1 ? '1 reserva asociada' : `${aEliminar.reservas} reservas asociadas`} de forma permanente. Esta acción no se puede deshacer.
              </>
            ) : (
              <>¿Seguro que querés eliminar <span className="font-semibold text-ink">{aEliminar.servicio.nombre}</span>? Esta acción no se puede deshacer.</>
            )
          }
          procesando={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </Card>
  )
}
