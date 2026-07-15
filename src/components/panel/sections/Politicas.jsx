import { useEffect, useState } from 'react'
import { Loader2, ToggleLeft, ToggleRight, Lock } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, Alerta, ConfirmDialog, inputClase } from '../ui'

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

  // Auto-aprobación de reservas (migración 046)
  const [autoAprobar, setAutoAprobar] = useState(false)
  const [tieneCuentaActiva, setTieneCuentaActiva] = useState(false)
  const [cargandoAuto, setCargandoAuto] = useState(true)
  const [confirmando, setConfirmando] = useState(null) // valor pendiente (bool) o null
  const [guardandoAuto, setGuardandoAuto] = useState(false)
  const [errorAuto, setErrorAuto] = useState(null)

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

  useEffect(() => {
    let activo = true
    async function cargarAuto() {
      setCargandoAuto(true)
      setErrorAuto(null)
      const [peluqueroResp, cuentasResp] = await Promise.all([
        supabase.from('peluqueros').select('auto_aprobar_reservas').eq('id', peluqueroId).maybeSingle(),
        supabase
          .from('cuentas_bancarias_peluquero')
          .select('id')
          .eq('peluquero_id', peluqueroId)
          .eq('activa', true)
          .limit(1),
      ])
      if (!activo) return
      if (peluqueroResp.error) setErrorAuto(mensajeError(peluqueroResp.error, 'No pudimos cargar la configuración de aprobación.'))
      else if (cuentasResp.error) setErrorAuto(mensajeError(cuentasResp.error, 'No pudimos cargar la configuración de aprobación.'))
      setAutoAprobar(peluqueroResp.data?.auto_aprobar_reservas ?? false)
      setTieneCuentaActiva((cuentasResp.data?.length ?? 0) > 0)
      setCargandoAuto(false)
    }
    cargarAuto()
    return () => {
      activo = false
    }
  }, [peluqueroId])

  async function aplicarAutoAprobar(nuevoValor) {
    setConfirmando(null)
    setGuardandoAuto(true)
    setErrorAuto(null)
    const { data, error: err } = await supabase
      .from('peluqueros')
      .update({ auto_aprobar_reservas: nuevoValor })
      .eq('id', peluqueroId)
      .select('auto_aprobar_reservas')
      .maybeSingle()
    setGuardandoAuto(false)
    if (err) {
      setErrorAuto(mensajeError(err, 'No pudimos actualizar la configuración de aprobación.'))
      return
    }
    // El trigger puede forzar false silenciosamente si hay cuenta activa:
    // reflejar el valor REAL devuelto, no el que intentamos guardar.
    const real = data?.auto_aprobar_reservas ?? false
    setAutoAprobar(real)
    if (nuevoValor === true && real === false) {
      setTieneCuentaActiva(true)
      setErrorAuto(
        'No se pudo activar la aprobación automática porque tenés cuentas bancarias activas. Desactivalas primero.',
      )
    }
  }

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

      <div className="border border-line rounded-2xl p-5 mb-8 max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-bold text-ink">Aprobación automática de reservas</h3>
            <p className="text-sm text-ink-muted mt-1">
              Con esto activado, las reservas de tus clientes quedan confirmadas al instante sin que
              tengas que aprobarlas una por una.
            </p>
          </div>
          {cargandoAuto ? (
            <Loader2 size={20} className="animate-spin text-primary flex-shrink-0 mt-1" />
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(!autoAprobar)}
              disabled={tieneCuentaActiva || guardandoAuto}
              aria-pressed={autoAprobar}
              aria-label={autoAprobar ? 'Desactivar aprobación automática' : 'Activar aprobación automática'}
              className="inline-flex items-center gap-1.5 min-h-11 px-2 text-sm font-semibold text-ink-muted hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {guardandoAuto ? (
                <Loader2 size={20} className="animate-spin" />
              ) : autoAprobar ? (
                <ToggleRight size={22} className="text-primary" />
              ) : (
                <ToggleLeft size={22} />
              )}
              {autoAprobar ? 'Activada' : 'Desactivada'}
            </button>
          )}
        </div>

        {!cargandoAuto && tieneCuentaActiva && (
          <p className="flex items-start gap-2 text-sm rounded-xl px-4 py-2.5 mt-4 bg-accent-50 text-accent-dark">
            <Lock size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
            <span>
              Tenés cuentas bancarias activas para cobrar anticipo — las reservas siempre requieren tu
              confirmación manual. Desactivá tus cuentas si querés habilitar la aprobación automática.
            </span>
          </p>
        )}

        {errorAuto && <div className="mt-4"><Alerta tipo="error">{errorAuto}</Alerta></div>}
      </div>

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

      {confirmando !== null && (
        <ConfirmDialog
          titulo={confirmando ? 'Activar aprobación automática' : 'Desactivar aprobación automática'}
          mensaje={
            confirmando
              ? 'A partir de ahora, las reservas de tus clientes se confirmarán automáticamente sin que tengas que aprobarlas una por una.'
              : 'A partir de ahora, vas a tener que confirmar cada reserva manualmente antes de que quede en firme.'
          }
          confirmarLabel={confirmando ? 'Activar' : 'Desactivar'}
          procesando={guardandoAuto}
          onConfirmar={() => aplicarAutoAprobar(confirmando)}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </Card>
  )
}
