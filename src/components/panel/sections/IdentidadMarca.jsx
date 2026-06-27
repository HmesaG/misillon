import { useState } from 'react'
import { Loader2, Upload, Scissors } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, Alerta, inputClase } from '../ui'

/**
 * Identidad de marca: logo (Storage bucket 'logos'), colores primario/secundario.
 * @param {{ barberia: object, onActualizar?: (b:object)=>void }} props
 */
export default function IdentidadMarca({ barberia, onActualizar }) {
  const [logoUrl, setLogoUrl] = useState(barberia.logo_url || '')
  const [primario, setPrimario] = useState(barberia.color_primario || '#2c1a0e')
  const [secundario, setSecundario] = useState(barberia.color_secundario || '#c45c2a')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  async function subirLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${barberia.id}/logo-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('logos').upload(ruta, file, {
        upsert: true,
      })
      if (errUp) {
        setError(mensajeError(errUp, 'No pudimos subir el logo.'))
        return
      }
      const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
      setLogoUrl(data.publicUrl)
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    setOk(false)
    const { data, error: err } = await supabase
      .from('barberias')
      .update({
        logo_url: logoUrl || null,
        color_primario: primario,
        color_secundario: secundario,
      })
      .eq('id', barberia.id)
      .select('*')
      .single()
    setGuardando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos guardar los cambios.'))
      return
    }
    setOk(true)
    onActualizar?.(data)
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Identidad de marca"
        descripcion="Tu logo y colores aparecen en tu página pública de reservas."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-5">
          <Campo label="Logo">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-line" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <Scissors size={24} strokeWidth={1.5} color="#2c1a0e" />
                </div>
              )}
              <label className="inline-flex items-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary cursor-pointer transition-colors">
                {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Subir logo
                <input type="file" accept="image/*" className="hidden" onChange={subirLogo} disabled={subiendo} />
              </label>
            </div>
          </Campo>

          <Campo label="Color primario">
            <div className="flex items-center gap-3">
              <input type="color" value={primario} onChange={(e) => setPrimario(e.target.value)} className="w-12 h-10 rounded-lg border border-line" />
              <input type="text" value={primario} onChange={(e) => setPrimario(e.target.value)} className={inputClase} />
            </div>
          </Campo>

          <Campo label="Color secundario">
            <div className="flex items-center gap-3">
              <input type="color" value={secundario} onChange={(e) => setSecundario(e.target.value)} className="w-12 h-10 rounded-lg border border-line" />
              <input type="text" value={secundario} onChange={(e) => setSecundario(e.target.value)} className={inputClase} />
            </div>
          </Campo>
        </div>

        {/* Preview */}
        <div>
          <span className="block text-xs font-semibold text-ink-muted mb-1.5">Vista previa</span>
          <div className="rounded-2xl overflow-hidden border border-line">
            <div style={{ background: primario }} className="p-5 flex items-center gap-3 text-white">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Scissors size={20} color="white" />
                </div>
              )}
              <span className="font-black">{barberia.nombre}</span>
            </div>
            <div className="p-5 bg-surface">
              <button style={{ background: secundario }} className="px-5 py-2.5 rounded-xl font-bold text-primary-dark text-sm">
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <BotonPrimario onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar cambios'}
        </BotonPrimario>
        {ok && <Alerta tipo="ok">Cambios guardados.</Alerta>}
        {error && <Alerta tipo="error">{error}</Alerta>}
      </div>
    </Card>
  )
}
