import { useState } from 'react'
import { Loader2, Upload, Scissors, Trash2, User, CalendarClock, FileText, Landmark } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { slugify, slugValido } from '../../utils/slug'
import { generateQR } from '../../utils/qr'
import { Modal, ConfirmDialog, Campo, BotonPrimario, Alerta, inputClase } from './ui'
import Servicios from './sections/Servicios'
import Disponibilidad from './sections/Disponibilidad'
import Politicas from './sections/Politicas'
import CuentasBancarias from './sections/CuentasBancarias'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/**
 * Modal de edición de un peluquero desde /admin (Super Admin).
 * En modo edición muestra pestañas para perfil, servicios, disponibilidad,
 * políticas y cuentas (reusa los componentes de sección existentes).
 * En modo creación solo muestra el perfil (las sub-entidades requieren un id).
 * @param {{ barberia: object, peluquero?: object, onCerrar: () => void, onCambio: () => void }} props
 */
export default function AdminPeluqueroModal({ barberia, peluquero, onCerrar, onCambio }) {
  const creando = !peluquero
  const [tab, setTab] = useState('perfil')

  const TABS = [
    { id: 'perfil', label: 'Perfil', Icon: User },
    { id: 'servicios', label: 'Servicios', Icon: Scissors },
    { id: 'disponibilidad', label: 'Disponibilidad', Icon: CalendarClock },
    { id: 'politicas', label: 'Políticas', Icon: FileText },
    { id: 'cuentas', label: 'Cuentas', Icon: Landmark },
  ]
  const tabs = creando ? TABS.filter((t) => t.id === 'perfil') : TABS

  return (
    <Modal
      titulo={creando ? 'Nuevo peluquero' : peluquero.nombre}
      descripcion={barberia.nombre}
      onCerrar={onCerrar}
      ancho="max-w-3xl"
    >
      <div className="flex gap-1 border-b border-line -mt-1 mb-5 overflow-x-auto">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <PerfilPeluquero
          barberia={barberia}
          peluquero={peluquero}
          onGuardado={onCambio}
          onBorrado={() => { onCambio?.(); onCerrar() }}
          onCreado={onCerrar}
        />
      )}
      {tab === 'servicios' && <div className="-mx-6 -my-5"><Servicios peluqueroId={peluquero.id} /></div>}
      {tab === 'disponibilidad' && <div className="-mx-6 -my-5"><Disponibilidad peluqueroId={peluquero.id} /></div>}
      {tab === 'politicas' && <div className="-mx-6 -my-5"><Politicas peluqueroId={peluquero.id} /></div>}
      {tab === 'cuentas' && <div className="-mx-6 -my-5"><CuentasBancarias peluqueroId={peluquero.id} /></div>}
    </Modal>
  )
}

function PerfilPeluquero({ barberia, peluquero, onGuardado, onBorrado, onCreado }) {
  const editando = !!peluquero
  const [nombre, setNombre] = useState(peluquero?.nombre || '')
  const [slug, setSlug] = useState(peluquero?.slug || '')
  const [slugTocado, setSlugTocado] = useState(editando)
  const [whatsapp, setWhatsapp] = useState(peluquero?.whatsapp || '')
  const [email, setEmail] = useState(peluquero?.email || '')
  const [fotoUrl, setFotoUrl] = useState(peluquero?.foto_url || '')
  const [activo, setActivo] = useState(peluquero?.activo ?? true)

  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const slugFinal = slugTocado ? slugify(slug) : slugify(nombre)

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${barberia.id}/${slugFinal || Date.now()}-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('fotos').upload(ruta, file, { upsert: true })
      if (errUp) { setError(mensajeError(errUp, 'No pudimos subir la foto.')); return }
      const { data } = supabase.storage.from('fotos').getPublicUrl(ruta)
      setFotoUrl(data.publicUrl)
    } finally {
      setSubiendo(false)
    }
  }

  async function guardar() {
    if (!nombre.trim()) return setError('Ingresá el nombre.')
    if (!slugValido(slugFinal)) return setError('El enlace solo admite minúsculas, números y guiones.')
    setGuardando(true)
    setError(null)
    setOk(false)

    const payload = {
      nombre: nombre.trim(),
      slug: slugFinal,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      foto_url: fotoUrl || null,
      activo,
    }

    if (editando) {
      const { error: err } = await supabase.from('peluqueros').update(payload).eq('id', peluquero.id)
      if (err) { setGuardando(false); setError(mensajeError(err, 'No pudimos guardar los cambios.')); return }
      if (slugFinal !== peluquero.slug) {
        const { png } = await generateQR(`${APP_URL}/${barberia.slug}/${slugFinal}`)
        await supabase.from('peluqueros').update({ qr_url: png }).eq('id', peluquero.id)
      }
      setGuardando(false)
      setOk(true)
      onGuardado?.()
    } else {
      const { error: err } = await supabase.from('peluqueros').insert({
        barberia_id: barberia.id,
        es_dueno_mismo: false,
        ...payload,
      })
      if (err) { setGuardando(false); setError(mensajeError(err, 'No pudimos crear el peluquero.')); return }
      const { png } = await generateQR(`${APP_URL}/${barberia.slug}/${slugFinal}`)
      await supabase.from('peluqueros').update({ qr_url: png }).eq('barberia_id', barberia.id).eq('slug', slugFinal)
      setGuardando(false)
      onCreado?.()
    }
  }

  async function borrar() {
    setBorrando(true)
    const { error: err } = await supabase.from('peluqueros').delete().eq('id', peluquero.id)
    setBorrando(false)
    if (err) { setConfirmarBorrar(false); setError(mensajeError(err, 'No pudimos borrar el peluquero.')); return }
    onBorrado?.()
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nombre">
          <input className={inputClase} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Carlos Gómez" />
        </Campo>
        <Campo label="Enlace" hint={`/${barberia.slug}/${slugFinal || 'enlace'}`}>
          <input
            className={inputClase}
            value={slugFinal}
            onChange={(e) => { setSlugTocado(true); setSlug(e.target.value) }}
            placeholder="carlos-gomez"
          />
        </Campo>
        <Campo label="WhatsApp">
          <input className={inputClase} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="8095551234" />
        </Campo>
        <Campo label="Email del peluquero" hint="Al registrarse con este email quedará vinculado automáticamente.">
          <input className={inputClase} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="peluquero@email.com" />
        </Campo>
        <Campo label="Foto">
          <div className="flex items-center gap-3">
            {fotoUrl && <img src={fotoUrl} alt="foto" className="w-10 h-10 rounded-xl object-cover border border-line" />}
            <label className="inline-flex items-center gap-2 border border-line bg-white text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary cursor-pointer transition-colors">
              {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {fotoUrl ? 'Cambiar' : 'Subir foto'}
              <input type="file" accept="image/*" className="hidden" onChange={subirFoto} disabled={subiendo} />
            </label>
          </div>
        </Campo>
      </div>

      <label className="flex items-center gap-2 mt-4 text-sm text-ink">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Peluquero activo (visible para clientes)
      </label>

      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      {ok && <div className="mt-4"><Alerta tipo="ok">Cambios guardados.</Alerta></div>}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-line">
        <BotonPrimario onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : editando ? 'Guardar cambios' : 'Crear peluquero'}
        </BotonPrimario>
        {editando && (
          <button
            type="button"
            onClick={() => setConfirmarBorrar(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
          >
            <Trash2 size={16} strokeWidth={2} />
            Borrar peluquero
          </button>
        )}
      </div>

      {confirmarBorrar && (
        <ConfirmDialog
          titulo="Borrar peluquero"
          mensaje={
            <>
              Vas a borrar <span className="font-semibold text-ink">{peluquero.nombre}</span> de forma permanente,
              junto con sus servicios, disponibilidad, políticas, cuentas y reservas. No se puede deshacer.
            </>
          }
          confirmarLabel="Borrar todo"
          procesando={borrando}
          onConfirmar={borrar}
          onCancelar={() => setConfirmarBorrar(false)}
        />
      )}
    </div>
  )
}
