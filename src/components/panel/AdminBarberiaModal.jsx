import { useState } from 'react'
import { Loader2, Upload, Scissors, MapPin, Trash2 } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { Modal, ConfirmDialog, Campo, BotonPrimario, Alerta, inputClase } from './ui'

/**
 * Modal de edición de una barbería desde el panel /admin (Super Admin).
 * Edita TODOS los campos administrables y permite borrar la barbería completa.
 * @param {{ barberia: object, onCerrar: () => void, onGuardado: () => void, onBorrado: () => void }} props
 */
export default function AdminBarberiaModal({ barberia, onCerrar, onGuardado, onBorrado }) {
  const [nombre, setNombre] = useState(barberia.nombre || '')
  const [slug, setSlug] = useState(barberia.slug || '')
  const [estado, setEstado] = useState(barberia.estado || 'pendiente')
  const [tipoNegocio, setTipoNegocio] = useState(barberia.tipo_negocio || 'equipo')
  const [contacto, setContacto] = useState(barberia.contacto || '')
  const [descripcion, setDescripcion] = useState(barberia.descripcion || '')
  const [direccion, setDireccion] = useState(barberia.direccion || '')
  const [primario, setPrimario] = useState(barberia.color_primario || '#2c1a0e')
  const [secundario, setSecundario] = useState(barberia.color_secundario || '#c45c2a')
  const [logoUrl, setLogoUrl] = useState(barberia.logo_url || '')

  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)

  async function subirLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${barberia.id}/logo-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('logos').upload(ruta, file, { upsert: true })
      if (errUp) { setError(mensajeError(errUp, 'No pudimos subir el logo.')); return }
      const { data } = supabase.storage.from('logos').getPublicUrl(ruta)
      setLogoUrl(data.publicUrl)
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    if (!nombre.trim()) return setError('El nombre no puede quedar vacío.')
    if (!/^[a-z0-9-]+$/.test(slug.trim())) return setError('El enlace solo admite minúsculas, números y guiones.')
    setGuardando(true)
    setError(null)
    setOk(false)
    const { error: err } = await supabase
      .from('barberias')
      .update({
        nombre: nombre.trim(),
        slug: slug.trim(),
        estado,
        tipo_negocio: tipoNegocio,
        contacto: contacto.trim() || null,
        descripcion: descripcion.trim() || null,
        direccion: direccion.trim() || null,
        color_primario: primario,
        color_secundario: secundario,
        logo_url: logoUrl || null,
      })
      .eq('id', barberia.id)
    setGuardando(false)
    if (err) { setError(mensajeError(err, 'No pudimos guardar los cambios.')); return }
    setOk(true)
    onGuardado?.()
  }

  async function borrar() {
    setBorrando(true)
    const { error: err } = await supabase.from('barberias').delete().eq('id', barberia.id)
    setBorrando(false)
    if (err) { setConfirmarBorrar(false); setError(mensajeError(err, 'No pudimos borrar la barbería.')); return }
    onBorrado?.()
    onCerrar()
  }

  return (
    <Modal titulo="Editar barbería" descripcion={`/${barberia.slug}`} onCerrar={onCerrar}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nombre">
          <input className={inputClase} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo label="Enlace (slug)" hint={`/${slug || 'enlace'}`}>
          <input className={inputClase} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Campo>
        <Campo label="Estado">
          <select className={inputClase} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </Campo>
        <Campo label="Tipo de negocio">
          <select className={inputClase} value={tipoNegocio} onChange={(e) => setTipoNegocio(e.target.value)}>
            <option value="equipo">Equipo</option>
            <option value="independiente">Independiente</option>
          </select>
        </Campo>
        <Campo label="WhatsApp del negocio">
          <input className={inputClase} value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="809-000-0000" />
        </Campo>
        <Campo label="Dirección">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input className={`${inputClase} pl-9`} value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
        </Campo>
      </div>

      <div className="mt-4">
        <Campo label="Descripción">
          <textarea
            rows={3}
            maxLength={200}
            className={`${inputClase} resize-none`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
        <Campo label="Logo">
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover border border-line" />}
            <label className="inline-flex items-center gap-2 border border-line bg-white text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary cursor-pointer transition-colors">
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {logoUrl ? 'Cambiar' : 'Subir logo'}
              <input type="file" accept="image/*" className="hidden" onChange={subirLogo} disabled={subiendo} />
            </label>
          </div>
        </Campo>
      </div>

      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      {ok && <div className="mt-4"><Alerta tipo="ok">Cambios guardados.</Alerta></div>}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-line">
        <BotonPrimario onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar cambios'}
        </BotonPrimario>
        <button
          type="button"
          onClick={() => setConfirmarBorrar(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
        >
          <Trash2 size={16} strokeWidth={2} />
          Borrar barbería
        </button>
      </div>

      {confirmarBorrar && (
        <ConfirmDialog
          titulo="Borrar barbería"
          mensaje={
            <>
              Vas a borrar <span className="font-semibold text-ink">{barberia.nombre}</span> de forma permanente.
              Esto elimina en cascada sus peluqueros, servicios, disponibilidad, políticas, cuentas y reservas. No se puede deshacer.
            </>
          }
          confirmarLabel="Borrar todo"
          procesando={borrando}
          onConfirmar={borrar}
          onCancelar={() => setConfirmarBorrar(false)}
        />
      )}
    </Modal>
  )
}
