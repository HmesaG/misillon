import { useState } from 'react'
import { Loader2, Upload, Scissors, MapPin, UserCircle } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, Campo, BotonPrimario, Alerta, inputClase } from '../ui'

/**
 * Sección fusionada "Mi Negocio": identidad de marca (tabla `barberias`) +,
 * si el dueño también atiende (es su propio peluquero), su perfil personal
 * (tabla `peluqueros`). Se presenta como un único formulario con un solo
 * botón "Guardar cambios" que ejecuta ambos UPDATE en secuencia.
 *
 * @param {object} props
 * @param {object} props.barberia
 * @param {object} [props.peluquero] presente solo si el dueño está vinculado a un peluquero
 * @param {(barberia: object) => void} [props.onActualizarBarberia]
 */
export default function MiNegocio({ barberia, peluquero, onActualizarBarberia }) {
  // --- Datos del negocio ---
  const [nombreNegocio, setNombreNegocio] = useState(barberia.nombre || '')
  const [contacto, setContacto] = useState(barberia.contacto || '')
  const [logoUrl, setLogoUrl] = useState(barberia.logo_url || '')
  const [primario, setPrimario] = useState(barberia.color_primario || '#2c1a0e')
  const [secundario, setSecundario] = useState(barberia.color_secundario || '#c45c2a')
  const [descripcion, setDescripcion] = useState(barberia.descripcion || '')
  const [direccion, setDireccion] = useState(barberia.direccion || '')
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  // --- Datos personales (solo si el dueño es también peluquero) ---
  const [nombrePersonal, setNombrePersonal] = useState(peluquero?.nombre || '')
  const [whatsappPersonal, setWhatsappPersonal] = useState(peluquero?.whatsapp || '')
  const [fotoUrl, setFotoUrl] = useState(peluquero?.foto_url || '')
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  async function subirLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${barberia.id}/logo-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('logos').upload(ruta, file, { upsert: true })
      if (errUp) {
        setError(mensajeError(errUp, 'No pudimos subir el logo.'))
        return
      }
      const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
      setLogoUrl(data.publicUrl)
    } finally {
      setSubiendoLogo(false)
    }
  }

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file || !peluquero) return
    setSubiendoFoto(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${peluquero.id}/foto-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('fotos-peluqueros').upload(ruta, file, { upsert: true })
      if (errUp) {
        setError(mensajeError(errUp, 'No pudimos subir la foto.'))
        return
      }
      const { data } = supabase.storage.from('fotos-peluqueros').getPublicUrl(ruta)
      setFotoUrl(data.publicUrl)
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function guardar() {
    if (!nombreNegocio.trim()) {
      setError('El nombre del negocio no puede quedar vacío.')
      return
    }
    if (peluquero && !nombrePersonal.trim()) {
      setError('Tu nombre no puede quedar vacío.')
      return
    }

    setGuardando(true)
    setError(null)
    setOk(false)

    // 1) Datos del negocio -> tabla `barberias`
    const { data: barberiaActualizada, error: errNegocio } = await supabase
      .from('barberias')
      .update({
        nombre: nombreNegocio.trim(),
        contacto: contacto.trim() || null,
        logo_url: logoUrl || null,
        color_primario: primario,
        color_secundario: secundario,
        descripcion: descripcion.trim() || null,
        direccion: direccion.trim() || null,
      })
      .eq('id', barberia.id)
      .select('*')
      .single()

    if (errNegocio) {
      setGuardando(false)
      setError(mensajeError(errNegocio, 'No pudimos guardar los datos del negocio.'))
      return
    }

    // 2) Datos personales (solo si el dueño está vinculado a un peluquero) -> tabla `peluqueros`
    if (peluquero) {
      const { data: peluqueroActualizado, error: errPersonal } = await supabase
        .from('peluqueros')
        .update({
          nombre: nombrePersonal.trim(),
          whatsapp: whatsappPersonal.trim() || null,
          foto_url: fotoUrl || null,
        })
        .eq('id', peluquero.id)
        .select('id')

      if (errPersonal) {
        setGuardando(false)
        setError(mensajeError(errPersonal, 'Guardamos los datos del negocio, pero no pudimos guardar tu perfil personal.'))
        onActualizarBarberia?.(barberiaActualizada)
        return
      }
      // Sin .select() no hay forma de distinguir "0 filas afectadas por RLS" de éxito.
      if (!peluqueroActualizado || peluqueroActualizado.length === 0) {
        setGuardando(false)
        setError('Guardamos los datos del negocio, pero no tenés permiso para editar tu perfil personal.')
        onActualizarBarberia?.(barberiaActualizada)
        return
      }
    }

    setGuardando(false)
    setOk(true)
    onActualizarBarberia?.(barberiaActualizada)
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Mi Negocio"
        descripcion={
          peluquero
            ? 'Tu marca y tu perfil personal: lo que ven tus clientes en tu página pública.'
            : 'Tu logo, colores y datos aparecen en tu página pública de reservas.'
        }
      />

      {/* Bloque: datos del negocio */}
      <h3 className="text-xs font-black text-ink-muted uppercase tracking-wide mb-4">
        Datos del negocio
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-5">
          <Campo label="Nombre del negocio">
            <input
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej: Estudio Bella"
              className={inputClase}
            />
          </Campo>

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
                {subiendoLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Subir logo
                <input type="file" accept="image/*" className="hidden" onChange={subirLogo} disabled={subiendoLogo} />
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

          <Campo label="Descripción" hint="Aparece en tu página pública bajo el nombre.">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Atención personalizada con más de 10 años de experiencia."
              maxLength={200}
              rows={3}
              className={`${inputClase} resize-none`}
            />
          </Campo>

          <Campo label="Dirección" hint="Dirección física de tu local (opcional).">
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234, CABA"
                className={`${inputClase} pl-9`}
              />
            </div>
          </Campo>

          <Campo label="WhatsApp del negocio" hint="Número que ven tus clientes">
            <input
              type="tel"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="809-000-0000"
              className={inputClase}
            />
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
              <span className="font-black">{nombreNegocio || barberia.nombre}</span>
            </div>
            <div className="p-5 bg-surface">
              <button type="button" style={{ background: secundario }} className="px-5 py-2.5 rounded-xl font-bold text-primary-dark text-sm">
                Confirmar reserva
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bloque: datos personales del dueño-peluquero (solo si aplica) */}
      {peluquero && (
        <>
          <div className="my-8 border-t border-line" />
          <h3 className="text-xs font-black text-ink-muted uppercase tracking-wide mb-4">
            Tu perfil (como profesional)
          </h3>
          <div className="space-y-5 max-w-sm">
            <Campo label="Tu nombre">
              <input
                type="text"
                value={nombrePersonal}
                onChange={(e) => setNombrePersonal(e.target.value)}
                placeholder="Ej: Martín García"
                className={inputClase}
              />
            </Campo>

            <Campo label="Tu WhatsApp">
              <input
                type="tel"
                value={whatsappPersonal}
                onChange={(e) => setWhatsappPersonal(e.target.value)}
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
                  {subiendoFoto ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Subir foto
                  <input type="file" accept="image/*" className="hidden" onChange={subirFoto} disabled={subiendoFoto} />
                </label>
              </div>
            </Campo>
          </div>
        </>
      )}

      <div className="mt-8 flex items-center gap-4">
        <BotonPrimario onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar cambios'}
        </BotonPrimario>
        {ok && <Alerta tipo="ok">Cambios guardados.</Alerta>}
        {error && <Alerta tipo="error">{error}</Alerta>}
      </div>
    </Card>
  )
}
