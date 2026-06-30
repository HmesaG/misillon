import { useState } from 'react'
import { Loader2, Upload, UserCircle } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, Alerta, inputClase } from '../ui'

export default function MiPerfil({ peluquero: peluqueroInicial }) {
  const [nombre, setNombre] = useState(peluqueroInicial.nombre || '')
  const [whatsapp, setWhatsapp] = useState(peluqueroInicial.whatsapp || '')
  const [fotoUrl, setFotoUrl] = useState(peluqueroInicial.foto_url || '')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${peluqueroInicial.id}/foto-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('fotos-peluqueros').upload(ruta, file, {
        upsert: true,
      })
      if (errUp) {
        setError(mensajeError(errUp, 'No pudimos subir la foto.'))
        return
      }
      const { data } = supabase.storage.from('fotos-peluqueros').getPublicUrl(ruta)
      setFotoUrl(data.publicUrl)
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    if (!nombre.trim()) {
      setError('Tu nombre no puede quedar vacío.')
      return
    }
    setGuardando(true)
    setError(null)
    setOk(false)
    const { error: err } = await supabase
      .from('peluqueros')
      .update({ nombre: nombre.trim(), whatsapp: whatsapp.trim() || null, foto_url: fotoUrl || null })
      .eq('id', peluqueroInicial.id)
    setGuardando(false)
    if (err) {
      setError(mensajeError(err, 'No pudimos guardar los cambios.'))
      return
    }
    setOk(true)
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Mi perfil"
        descripcion="Tu nombre y foto aparecen en tu página pública."
      />

      <div className="space-y-5 max-w-sm">
        <Campo label="Tu nombre">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Martín García"
            className={inputClase}
          />
        </Campo>

        <Campo label="Tu WhatsApp">
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="809-000-0000"
            className={inputClase}
          />
        </Campo>

        <Campo label="Foto de perfil">
          <div className="flex items-center gap-4">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Foto" className="w-16 h-16 rounded-full object-cover border border-line" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                <UserCircle size={32} strokeWidth={1.5} className="text-primary" />
              </div>
            )}
            <label className="inline-flex items-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary cursor-pointer transition-colors">
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Subir foto
              <input type="file" accept="image/*" className="hidden" onChange={subirFoto} disabled={subiendo} />
            </label>
          </div>
        </Campo>
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
