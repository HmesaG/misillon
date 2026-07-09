import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, BotonIcono, Alerta, inputClase } from '../ui'

const VACIO = { banco: '', numero_cuenta: '', tipo: 'ahorro', titular: '', activa: true }

/** CRUD de cuentas bancarias del peluquero. @param {{ peluqueroId: string }} props */
export default function CuentasBancarias({ peluqueroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('cuentas_bancarias_peluquero')
      .select('*')
      .eq('peluquero_id', peluqueroId)
      .order('banco')
    if (err) setError(mensajeError(err, 'No pudimos cargar las cuentas bancarias.'))
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function crear() {
    if (!form.banco.trim() || !form.numero_cuenta.trim() || !form.titular.trim())
      return setError('Completá banco, número y titular.')
    setError(null)
    setGuardando(true)
    const { error: err } = await supabase.from('cuentas_bancarias_peluquero').insert({
      peluquero_id: peluqueroId,
      banco: form.banco.trim(),
      numero_cuenta: form.numero_cuenta.trim(),
      tipo: form.tipo,
      titular: form.titular.trim(),
      activa: form.activa,
    })
    setGuardando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos guardar la cuenta.'))
      return
    }
    setForm(VACIO)
    setAbierto(false)
    cargar()
  }

  async function alternar(c) {
    const { error: err } = await supabase.from('cuentas_bancarias_peluquero').update({ activa: !c.activa }).eq('id', c.id)
    if (err) { setError(mensajeError(err, 'No pudimos actualizar la cuenta.')); return }
    cargar()
  }

  async function eliminar(id) {
    const { error: err } = await supabase.from('cuentas_bancarias_peluquero').delete().eq('id', id)
    if (err) { setError(mensajeError(err, 'No pudimos eliminar la cuenta.')); return }
    cargar()
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Cuentas bancarias"
        descripcion="Tus clientes verán estas cuentas para enviar el anticipo cuando lo requieras."
        accion={
          <BotonPrimario onClick={() => setAbierto((v) => !v)}>
            <Plus size={18} strokeWidth={2} />
            Nueva
          </BotonPrimario>
        }
      />

      {abierto && (
        <div className="border border-line rounded-2xl p-5 mb-5 bg-surface">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Banco">
              <input className={inputClase} value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
            </Campo>
            <Campo label="Número de cuenta">
              <input className={inputClase} value={form.numero_cuenta} onChange={(e) => setForm({ ...form, numero_cuenta: e.target.value })} />
            </Campo>
            <Campo label="Tipo">
              <select className={inputClase} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="ahorro">Ahorro</option>
                <option value="corriente">Corriente</option>
              </select>
            </Campo>
            <Campo label="Titular">
              <input className={inputClase} value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} />
            </Campo>
          </div>
          {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
          <div className="flex gap-3 mt-4">
            <BotonPrimario onClick={crear} disabled={guardando}>
              {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar cuenta'}
            </BotonPrimario>
            <BotonSecundario onClick={() => setAbierto(false)}>Cancelar</BotonSecundario>
          </div>
        </div>
      )}

      {!abierto && error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no cargaste cuentas bancarias.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="flex items-center gap-4 border border-line rounded-2xl p-4">
              <div className="flex-1">
                <p className="font-semibold text-ink">{c.banco}</p>
                <p className="text-sm text-ink-muted">
                  {c.tipo} · {c.numero_cuenta} · {c.titular}
                </p>
              </div>
              <button
                type="button"
                onClick={() => alternar(c)}
                className="inline-flex items-center gap-1.5 min-h-11 px-2 text-sm font-semibold text-ink-muted hover:text-primary"
              >
                {c.activa ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
                {c.activa ? 'Activa' : 'Inactiva'}
              </button>
              <BotonIcono variante="danger" onClick={() => eliminar(c.id)} aria-label={`Eliminar cuenta ${c.banco}`}>
                <Trash2 size={18} />
              </BotonIcono>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
