import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, Alerta, ConfirmDialog, inputClase } from '../ui'

const DURACION_MAX = 480 // 8 horas

const VACIO = {
  nombre: '',
  precio_local: '',
  precio_domicilio: '',
  duracion_minutos: 30,
  ofrece_domicilio: false,
  activo: true,
}

/** CRUD de servicios del peluquero. @param {{ peluqueroId: string }} props */
export default function Servicios({ peluqueroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null) // id | 'nuevo' | null
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [aEliminar, setAEliminar] = useState(null) // { servicio, reservas } | null
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('servicios')
      .select('*')
      .eq('peluquero_id', peluqueroId)
      .order('nombre')
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

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
              <BotonSecundario onClick={() => abrirEditar(s)}>
                <Pencil size={16} />
              </BotonSecundario>
              <button
                type="button"
                onClick={() => pedirEliminar(s)}
                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 size={18} />
              </button>
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
