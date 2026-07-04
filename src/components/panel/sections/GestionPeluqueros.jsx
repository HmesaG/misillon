import { useEffect, useState } from 'react'
import {
  Loader2, Plus, Upload, UserCheck, UserX, Scissors,
  Pencil, Share2, Link2, Link2Off, X, Users, CalendarCheck, CalendarX, Clock,
  CheckCircle, MessageCircle,
} from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { slugify, slugValido } from '../../../utils/slug'
import { generateQR } from '../../../utils/qr'
import {
  Card, SeccionTitulo, Campo, BotonPrimario, BotonSecundario, Alerta, inputClase,
} from '../ui'
import ModalCompartirQR from '../../ModalCompartirQR'
import { estadoColor } from '../../../utils/estadoColor'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

function StatMini({ Icon, label, valor, color = 'text-primary' }) {
  return (
    <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-3 flex-1 min-w-0">
      <Icon size={18} strokeWidth={1.75} className={color} />
      <div className="min-w-0">
        <p className={`text-xl font-black leading-none ${color}`}>{valor ?? '—'}</p>
        <p className="text-xs text-ink-muted mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function GestionPeluqueros({ barberia }) {
  const [peluqueros, setPeluqueros] = useState([])
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [modalQR, setModalQR] = useState(null)

  async function cargar() {
    setCargando(true)
    const [{ data, error: errPelu }, { data: statsData }] = await Promise.all([
      supabase
        .from('peluqueros')
        .select('*')
        .eq('barberia_id', barberia.id)
        .order('nombre'),
      supabase.rpc('get_stats_barberia', { p_barberia_id: barberia.id }),
    ])
    if (errPelu) setError(mensajeError(errPelu, 'No pudimos cargar los peluqueros.'))
    setPeluqueros(data || [])
    setStats(statsData)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [barberia.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarActivo(p) {
    const activando = !p.activo
    const { error: err } = await supabase.from('peluqueros').update({ activo: activando }).eq('id', p.id)
    if (err) { setError(mensajeError(err)); return }
    if (activando) {
      const url = `${APP_URL}/${barberia.slug}/${p.slug}`
      const { png } = await generateQR(url)
      await supabase.from('peluqueros').update({ qr_url: png }).eq('id', p.id)
    }
    cargar()
  }

  // ¿El dueño ya está vinculado a algún peluquero de esta barbería?
  const duenoYaVinculado = peluqueros.some((p) => p.user_id === barberia.dueno_id)

  async function vincularCuenta(p) {
    const esMio = p.user_id === barberia.dueno_id
    // Vincular (no desvincular) solo si el dueño no está ya vinculado a otro peluquero.
    if (!esMio && duenoYaVinculado) {
      setError('Ya vinculaste tu cuenta a otro peluquero. Desvinculala primero.')
      return
    }
    const { error: err } = await supabase
      .from('peluqueros')
      .update({ user_id: esMio ? null : barberia.dueno_id })
      .eq('id', p.id)
    if (err) { setError(mensajeError(err, 'No se pudo vincular la cuenta.')); return }
    cargar()
  }

  const qrUrlDe = (p) => `${APP_URL}/${barberia.slug}/${p.slug}`

  return (
    <Card>
      <SeccionTitulo
        titulo="Peluqueros"
        descripcion="Gestioná tu equipo. Cada peluquero administra su propia agenda."
        accion={
          <BotonPrimario onClick={() => { setFormAbierto((v) => !v); setEditando(null) }}>
            <Plus size={18} strokeWidth={2} />
            Nuevo
          </BotonPrimario>
        }
      />

      {/* Stats mini */}
      {stats && (
        <div className="flex flex-wrap gap-2 mb-5">
          <StatMini Icon={Users} label="Peluqueros" valor={stats.peluqueros} color="text-primary" />
          <StatMini Icon={CalendarCheck} label="Confirmadas" valor={stats.confirmadas} color={estadoColor('confirmada').texto} />
          <StatMini Icon={Clock} label="Pendientes" valor={stats.pendientes} color="text-accent" />
          <StatMini Icon={CalendarX} label="Canceladas" valor={stats.canceladas} color={estadoColor('cancelada').texto} />
        </div>
      )}

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {formAbierto && (
        <FormPeluquero
          barberia={barberia}
          onCreado={() => { setFormAbierto(false); cargar() }}
          onCancelar={() => setFormAbierto(false)}
          onRecargar={cargar}
        />
      )}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : peluqueros.length === 0 ? (
        <p className="text-ink-muted text-sm">Todavía no agregaste peluqueros.</p>
      ) : (
        <div className="space-y-3 mt-2">
          {peluqueros.map((p) => (
            <div key={p.id} className="border border-line rounded-2xl overflow-hidden">
              {/* Fila principal */}
              <div className="flex items-center gap-3 p-4">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nombre} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Scissors size={18} color="#2c1a0e" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink text-sm">{p.nombre}</p>
                    {p.user_id === barberia.dueno_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-dark">
                        Tu perfil
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.activo ? 'bg-primary-50 text-primary' : 'bg-muted text-ink-muted'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted truncate">/{barberia.slug}/{p.slug}</p>
                  {p.email && !p.user_id && (
                    <p className="text-[11px] text-accent-dark truncate">{p.email} · pendiente de registro</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    title="Compartir QR"
                    onClick={() => setModalQR(p)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-primary hover:bg-muted transition-colors"
                  >
                    <Share2 size={15} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    title={
                      p.user_id === barberia.dueno_id
                        ? 'Desvincular mi cuenta'
                        : p.user_id
                        ? 'Cuenta vinculada'
                        : duenoYaVinculado
                        ? 'Ya vinculaste tu cuenta a otro peluquero'
                        : 'Vincular mi cuenta'
                    }
                    onClick={() => vincularCuenta(p)}
                    disabled={
                      (!!p.user_id && p.user_id !== barberia.dueno_id) ||
                      (duenoYaVinculado && p.user_id !== barberia.dueno_id)
                    }
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      p.user_id === barberia.dueno_id
                        ? 'text-accent hover:bg-accent/10'
                        : p.user_id || duenoYaVinculado
                        ? 'text-ink-muted opacity-40 cursor-not-allowed'
                        : 'text-ink-muted hover:text-primary hover:bg-muted'
                    }`}
                  >
                    {p.user_id === barberia.dueno_id ? <Link2Off size={15} strokeWidth={2} /> : <Link2 size={15} strokeWidth={2} />}
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => setEditando(editando?.id === p.id ? null : p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${editando?.id === p.id ? 'bg-primary text-white' : 'text-ink-muted hover:text-primary hover:bg-muted'}`}
                  >
                    {editando?.id === p.id ? <X size={15} strokeWidth={2} /> : <Pencil size={15} strokeWidth={2} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarActivo(p)}
                    title={p.activo ? 'Desactivar' : 'Activar'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${p.activo ? 'text-ink-muted hover:text-red-600 hover:bg-red-50' : 'text-ink-muted hover:text-primary hover:bg-primary-50'}`}
                  >
                    {p.activo ? <UserX size={15} strokeWidth={2} /> : <UserCheck size={15} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {/* Form editar inline */}
              {editando?.id === p.id && (
                <div className="border-t border-line bg-surface/60 px-4 pb-4 pt-3">
                  <FormPeluquero
                    barberia={barberia}
                    peluquero={p}
                    onCreado={() => { setEditando(null); cargar() }}
                    onCancelar={() => setEditando(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-ink-muted mt-4 space-y-1">
        <p>
          <Link2 size={11} className="inline mr-1" strokeWidth={2} />
          Registrá el email del peluquero al crearlo. Cuando se registre en MiSillón con ese mismo email, quedará vinculado automáticamente.
        </p>
        <p>Usá el botón de cadena para vincular tu propia cuenta a un peluquero y gestionar su agenda desde este panel.</p>
      </div>

      {modalQR && (
        <ModalCompartirQR
          url={qrUrlDe(modalQR)}
          nombreArchivo={`qr-${modalQR.slug}`}
          onCerrar={() => setModalQR(null)}
        />
      )}
    </Card>
  )
}

function generarInvitacionWA(nombre, whatsappPeluquero, nombreBarberia) {
  const texto = `Hola ${nombre}, te agregué como peluquero en ${nombreBarberia} en MiSillón. Podés entrar con Google o con tu email acá: ${APP_URL}/login`
  const numero = whatsappPeluquero?.replace(/\D/g, '') || ''
  if (numero) return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}

function FormPeluquero({ barberia, peluquero, onCreado, onCancelar, onRecargar }) {
  const editando = !!peluquero
  const [nombre, setNombre] = useState(peluquero?.nombre || '')
  const [slug, setSlug] = useState(peluquero?.slug || '')
  const [slugTocado, setSlugTocado] = useState(editando)
  const [whatsapp, setWhatsapp] = useState(peluquero?.whatsapp || '')
  const [email, setEmail] = useState(peluquero?.email || '')
  const [fotoUrl, setFotoUrl] = useState(peluquero?.foto_url || '')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [peluqueroCreado, setPeluqueroCreado] = useState(null)

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

    const payload = {
      nombre: nombre.trim(),
      slug: slugFinal,
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      foto_url: fotoUrl || null,
    }

    if (editando) {
      const { error: err } = await supabase.from('peluqueros').update(payload).eq('id', peluquero.id)
      if (err) { setGuardando(false); setError(mensajeError(err, 'No pudimos guardar los cambios.')); return }
      // Regenerar QR si cambió el slug
      if (slugFinal !== peluquero.slug) {
        const url = `${APP_URL}/${barberia.slug}/${slugFinal}`
        const { png } = await generateQR(url)
        await supabase.from('peluqueros').update({ qr_url: png }).eq('id', peluquero.id)
      }
    } else {
      const { error: err } = await supabase.from('peluqueros').insert({
        barberia_id: barberia.id,
        activo: true,
        es_dueno_mismo: false,
        ...payload,
      })
      if (err) { setGuardando(false); setError(mensajeError(err, 'No pudimos crear el peluquero.')); return }
      const url = `${APP_URL}/${barberia.slug}/${slugFinal}`
      const { png } = await generateQR(url)
      await supabase.from('peluqueros').update({ qr_url: png }).eq('barberia_id', barberia.id).eq('slug', slugFinal)
      onRecargar?.()
      setGuardando(false)
      setPeluqueroCreado({ nombre, whatsapp: whatsapp.trim() || null })
      return
    }

    setGuardando(false)
    onCreado()
  }

  return (
    <div className={editando ? '' : 'border border-line rounded-2xl p-5 mb-5 bg-surface'}>
      {peluqueroCreado ? (
        <div className="flex flex-col items-center gap-4 text-center py-2">
          <CheckCircle size={36} strokeWidth={1.5} className="text-primary" />
          <div>
            <p className="font-bold text-ink">Peluquero creado</p>
            <p className="text-sm text-ink-muted mt-0.5">{peluqueroCreado.nombre} ya está en tu equipo.</p>
          </div>
          <a
            href={generarInvitacionWA(peluqueroCreado.nombre, peluqueroCreado.whatsapp, barberia.nombre || 'tu barbería')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold text-white text-sm px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle size={18} strokeWidth={1.75} />
            Enviar invitación por WhatsApp
          </a>
          <button
            type="button"
            className="text-xs text-ink-muted hover:text-primary underline"
            onClick={() => {
              setNombre('')
              setSlug('')
              setSlugTocado(false)
              setWhatsapp('')
              setEmail('')
              setFotoUrl('')
              setError(null)
              setPeluqueroCreado(null)
            }}
          >
            Crear otro peluquero
          </button>
        </div>
      ) : (
        <>
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
      {error && <div className="mt-4"><Alerta tipo="error">{error}</Alerta></div>}
      <div className="flex gap-3 mt-4">
        <BotonPrimario onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={18} className="animate-spin" /> : editando ? 'Guardar cambios' : 'Crear peluquero'}
        </BotonPrimario>
        <BotonSecundario onClick={onCancelar}>Cancelar</BotonSecundario>
      </div>
        </>
      )}
    </div>
  )
}
