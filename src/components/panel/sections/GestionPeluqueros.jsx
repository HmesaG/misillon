import { useEffect, useState } from 'react'
import { Loader2, Plus, Upload, UserCheck, UserX, Scissors } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { slugify, slugValido } from '../../../utils/slug'
import { generateQR } from '../../../utils/qr'
import { Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, Alerta, inputClase } from '../ui'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/**
 * Gestión de peluqueros del equipo (solo Dueño). Crear, activar/desactivar.
 * NO muestra reservas ni cuentas bancarias.
 * @param {{ barberia: object }} props
 */
export default function GestionPeluqueros({ barberia }) {
  const [peluqueros, setPeluqueros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('peluqueros')
      .select('*')
      .eq('barberia_id', barberia.id)
      .order('nombre')
    setPeluqueros(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [barberia.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarActivo(p) {
    const activando = !p.activo
    const { error: err } = await supabase
      .from('peluqueros')
      .update({ activo: activando })
      .eq('id', p.id)
    if (err) {
      setError(mensajeError(err))
      return
    }
    if (activando) {
      const url = `${APP_URL}/${barberia.slug}/${p.slug}`
      const { png } = await generateQR(url)
      await supabase.from('peluqueros').update({ qr_url: png }).eq('id', p.id)
    }
    cargar()
  }

  return (
    <Card>
      <SeccionTitulo
        titulo="Peluqueros"
        descripcion="Gestioná tu equipo. Cada peluquero administra su propia agenda."
        accion={
          <BotonPrimario onClick={() => setFormAbierto((v) => !v)}>
            <Plus size={18} strokeWidth={2} />
            Nuevo
          </BotonPrimario>
        }
      />

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {formAbierto && (
        <FormPeluquero
          barberia={barberia}
          onCreado={() => {
            setFormAbierto(false)
            cargar()
          }}
          onCancelar={() => setFormAbierto(false)}
        />
      )}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : peluqueros.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no agregaste peluqueros.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {peluqueros.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border border-line rounded-2xl p-4">
              {p.foto_url ? (
                <img src={p.foto_url} alt={p.nombre} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Scissors size={20} color="#2c1a0e" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-ink">{p.nombre}</p>
                <p className="text-sm text-ink-muted">
                  /{barberia.slug}/{p.slug}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.activo ? 'bg-primary-50 text-primary' : 'bg-muted text-ink-muted'
                }`}
              >
                {p.activo ? 'Activo' : 'Inactivo'}
              </span>
              <BotonSecundario onClick={() => alternarActivo(p)}>
                {p.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                {p.activo ? 'Desactivar' : 'Activar'}
              </BotonSecundario>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function FormPeluquero({ barberia, onCreado, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTocado, setSlugTocado] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const slugFinal = slugTocado ? slugify(slug) : slugify(nombre)

  async function subirFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop()
      const ruta = `${barberia.id}/${slugFinal || Date.now()}-${Date.now()}.${ext}`
      const { error: errUp } = await supabase.storage.from('fotos').upload(ruta, file, {
        upsert: true,
      })
      if (errUp) {
        setError(mensajeError(errUp, 'No pudimos subir la foto.'))
        return
      }
      const { data } = supabase.storage.from('fotos').getPublicUrl(ruta)
      setFotoUrl(data.publicUrl)
    } finally {
      setSubiendo(false)
    }
  }

  async function crear() {
    if (!nombre.trim()) return setError('Ingresá el nombre.')
    if (!slugValido(slugFinal)) return setError('El enlace solo admite minúsculas, números y guiones.')
    setGuardando(true)
    setError(null)
    const { error: err } = await supabase.from('peluqueros').insert({
      barberia_id: barberia.id,
      nombre: nombre.trim(),
      slug: slugFinal,
      whatsapp: whatsapp.trim() || null,
      foto_url: fotoUrl || null,
      activo: true,
      es_dueno_mismo: false,
    })
    if (err) {
      setGuardando(false)
      setError(mensajeError(err, 'No pudimos crear el peluquero.'))
      return
    }
    const url = `${APP_URL}/${barberia.slug}/${slugFinal}`
    const { png } = await generateQR(url)
    await supabase
      .from('peluqueros')
      .update({ qr_url: png })
      .eq('barberia_id', barberia.id)
      .eq('slug', slugFinal)
    setGuardando(false)
    onCreado()
  }

  return (
    <div className="border border-line rounded-2xl p-5 mb-5 bg-surface">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nombre">
          <input className={inputClase} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Carlos Gómez" />
        </Campo>
        <Campo label="Enlace" hint={`/${barberia.slug}/${slugFinal || 'enlace'}`}>
          <input
            className={inputClase}
            value={slugFinal}
            onChange={(e) => {
              setSlugTocado(true)
              setSlug(e.target.value)
            }}
            placeholder="carlos-gomez"
          />
        </Campo>
        <Campo label="WhatsApp">
          <input className={inputClase} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="8095551234" />
        </Campo>
        <Campo label="Foto">
          <label className="inline-flex items-center gap-2 border border-line bg-white text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary cursor-pointer transition-colors">
            {subiendo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="hidden" onChange={subirFoto} disabled={subiendo} />
          </label>
        </Campo>
      </div>
      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="flex gap-3 mt-4">
        <BotonPrimario onClick={crear} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : 'Crear peluquero'}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
      </div>
    </div>
  )
}
