import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, Alerta, inputClase } from '../ui'

/** Configuración de políticas del peluquero (upsert). @param {{ peluqueroId: string }} props */
export default function Politicas({ peluqueroId }) {
  const [form, setForm] = useState({
    porcentaje_anticipo: 0,
    reembolso_inasistencia: false,
    texto_libre: '',
    minutos_tolerancia: 15,
  })
  const [existeId, setExisteId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let activo = true
    supabase
      .from('politicas_peluquero')
      .select('*')
      .eq('peluquero_id', peluqueroId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) setError(mensajeError(err, 'No pudimos cargar las políticas.'))
        if (data) {
          setExisteId(data.id)
          setForm({
            porcentaje_anticipo: data.porcentaje_anticipo,
            reembolso_inasistencia: data.reembolso_inasistencia,
            texto_libre: data.texto_libre || '',
            minutos_tolerancia: data.minutos_tolerancia,
          })
        }
        setCargando(false)
      })
    return () => {
      activo = false
    }
  }, [peluqueroId])

  async function guardar() {
    setGuardando(true)
    setError(null)
    setOk(false)
    const payload = {
      peluquero_id: peluqueroId,
      porcentaje_anticipo: Number(form.porcentaje_anticipo),
      reembolso_inasistencia: form.reembolso_inasistencia,
      texto_libre: form.texto_libre.trim() || null,
      minutos_tolerancia: Number(form.minutos_tolerancia),
    }
    const resp = existeId
      ? await supabase.from('politicas_peluquero').update(payload).eq('id', existeId)
      : await supabase.from('politicas_peluquero').insert(payload)
    setGuardando(false)
    if (resp.error) {
      setError(mensajeError(resp.error, 'No pudimos guardar las políticas.'))
      return
    }
    setOk(true)
    if (!existeId) {
      const { data } = await supabase
        .from('politicas_peluquero')
        .select('id')
        .eq('peluquero_id', peluqueroId)
        .maybeSingle()
      if (data) setExisteId(data.id)
    }
  }

  if (cargando) return <Card><Loader2 className="animate-spin text-primary" /></Card>

  return (
    <Card>
      <SeccionTitulo
        titulo="Políticas"
        descripcion="Definí tu anticipo, tolerancia y condiciones para los clientes."
      />

      <div className="space-y-6 max-w-lg">
        <Campo label={`Anticipo requerido: ${form.porcentaje_anticipo}%`}>
          <input
            type="range"
            min="0"
            max="100"
            value={form.porcentaje_anticipo}
            onChange={(e) => setForm({ ...form, porcentaje_anticipo: e.target.value })}
            className="w-full accent-primary"
          />
        </Campo>

        <Campo label="Minutos de tolerancia" hint="Pasado este tiempo sin confirmar, la reserva se cancela automáticamente.">
          <input
            type="number"
            min="0"
            className={inputClase}
            value={form.minutos_tolerancia}
            onChange={(e) => setForm({ ...form, minutos_tolerancia: e.target.value })}
          />
        </Campo>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.reembolso_inasistencia}
            onChange={(e) => setForm({ ...form, reembolso_inasistencia: e.target.checked })}
          />
          Ofrezco reembolso en caso de inasistencia
        </label>

        <Campo label="Texto libre (condiciones, aclaraciones)">
          <textarea
            rows={4}
            className={`${inputClase} resize-none`}
            value={form.texto_libre}
            onChange={(e) => setForm({ ...form, texto_libre: e.target.value })}
            placeholder="Ej: Llegá 5 minutos antes. El anticipo no es reembolsable."
          />
        </Campo>

        <div className="flex items-center gap-4">
          <BotonPrimario onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar políticas'}
          </BotonPrimario>
          {ok && <Alerta tipo="ok">Políticas guardadas.</Alerta>}
          {error && <Alerta tipo="error">{error}</Alerta>}
        </div>
      </div>
    </Card>
  )
}
