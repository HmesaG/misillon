import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Scissors,
  Users,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { slugify, slugValido } from '../utils/slug'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function Registro() {
  // paso: 'tipo' | 'form' | 'ok'
  const [paso, setPaso] = useState('tipo')
  const [tipo, setTipo] = useState(null) // 'equipo' | 'independiente'

  function elegir(t) {
    setTipo(t)
    setPaso('form')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4">
      <Link to="/" className="flex items-center gap-2.5 mb-8" aria-label="MiSillón — inicio">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Scissors size={18} strokeWidth={2.25} color="white" />
        </div>
        <span className="text-2xl font-black text-primary tracking-tight">MiSillón</span>
      </Link>

      {paso === 'tipo' && <PasoTipo onElegir={elegir} />}
      {paso === 'form' && (
        <FormRegistro tipo={tipo} onVolver={() => setPaso('tipo')} onListo={(modo) => setPaso(modo === 'confirmar' ? 'confirmar' : 'ok')} />
      )}
      {paso === 'confirmar' && <ConfirmarEmail />}
      {paso === 'ok' && <Confirmacion />}
    </div>
  )
}

function PasoTipo({ onElegir }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-ink tracking-tight mb-2">
          ¿Cómo vas a usar MiSillón?
        </h1>
        <p className="text-ink-muted">Elegí la opción que mejor describe tu negocio.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <button
          type="button"
          onClick={() => onElegir('equipo')}
          className="text-left bg-white rounded-3xl border border-line shadow-sm p-7 hover:border-primary transition-colors"
        >
          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-5">
            <Users size={28} strokeWidth={1.5} color="#2c1a0e" />
          </div>
          <h2 className="font-bold text-ink text-lg mb-2">
            Tengo una barbería con uno o más peluqueros
          </h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Gestioná la marca y tu equipo. Cada peluquero administra su propia agenda.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onElegir('independiente')}
          className="text-left bg-white rounded-3xl border border-line shadow-sm p-7 hover:border-primary transition-colors"
        >
          <div className="w-12 h-12 bg-accent-50 rounded-2xl flex items-center justify-center mb-5">
            <User size={28} strokeWidth={1.5} color="#9e4420" />
          </div>
          <h2 className="font-bold text-ink text-lg mb-2">Soy un peluquero independiente</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Tu marca y tu agenda en un solo lugar. Todo desde un panel unificado.
          </p>
        </button>
      </div>
      <p className="text-sm text-ink-muted text-center mt-8">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  )
}

function Campo({ id, label, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-muted mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </div>
  )
}

const inputClase =
  'w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none'

function FormRegistro({ tipo, onVolver, onListo }) {
  const esIndependiente = tipo === 'independiente'

  const [nombre, setNombre] = useState('') // nombre barbería o del peluquero
  const [slugManual, setSlugManual] = useState('')
  const [slugTocado, setSlugTocado] = useState(false)
  const [contacto, setContacto] = useState('') // whatsapp/contacto
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const slug = useMemo(
    () => (slugTocado ? slugify(slugManual) : slugify(nombre)),
    [slugTocado, slugManual, nombre],
  )

  function validar() {
    if (!nombre.trim()) return 'Ingresá el nombre.'
    if (!slug) return 'El enlace (slug) no puede quedar vacío.'
    if (!slugValido(slug))
      return 'El enlace solo puede tener minúsculas, números y guiones.'
    if (!contacto.trim())
      return esIndependiente ? 'Ingresá tu WhatsApp.' : 'Ingresá un contacto.'
    if (!email.trim()) return 'Ingresá tu email.'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    return null
  }

  async function onSubmit(e) {
    e.preventDefault()
    const v = validar()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setEnviando(true)

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: errAuth } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (errAuth) {
        setError(mensajeError(errAuth, 'No pudimos crear la cuenta.'))
        return
      }

      const user = authData.user
      if (!authData.session) {
        // Email confirmation activo: guardamos los datos y pedimos que confirmen.
        sessionStorage.setItem(
          'registro_pendiente',
          JSON.stringify({
            nombre: nombre.trim(),
            slug,
            tipo,
            contacto: contacto.trim(),
            esIndependiente,
            userId: user.id,
          }),
        )
        onListo('confirmar')
        return
      }

      // 2. Insertar barbería (pendiente)
      const { data: barberia, error: errBarb } = await supabase
        .from('barberias')
        .insert({
          nombre: nombre.trim(),
          slug,
          estado: 'pendiente',
          tipo_negocio: esIndependiente ? 'independiente' : 'equipo',
          contacto: contacto.trim(),
          dueno_id: user.id,
        })
        .select('id')
        .single()

      if (errBarb) {
        setError(mensajeError(errBarb, 'No pudimos registrar el negocio.'))
        return
      }

      // 3. Si es independiente, crear el peluquero ligado al mismo user
      if (esIndependiente) {
        const { error: errPel } = await supabase.from('peluqueros').insert({
          barberia_id: barberia.id,
          user_id: user.id,
          slug,
          nombre: nombre.trim(),
          whatsapp: contacto.trim(),
          activo: true,
          es_dueno_mismo: true,
        })
        if (errPel) {
          setError(mensajeError(errPel, 'No pudimos crear tu perfil de peluquero.'))
          return
        }
      }

      onListo()
    } catch (e) {
      setError(mensajeError(e, 'Error inesperado. Intentá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onVolver}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary mb-4"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Cambiar tipo de negocio
      </button>

      <div className="bg-white rounded-3xl border border-line shadow-sm p-8">
        <h1 className="text-2xl font-black text-ink tracking-tight mb-1">
          {esIndependiente ? 'Registrate como peluquero' : 'Registrá tu barbería'}
        </h1>
        <p className="text-ink-muted text-sm mb-6">
          Completá tus datos. Revisaremos tu solicitud antes de activarla.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Campo id="nombre" label={esIndependiente ? 'Tu nombre' : 'Nombre de la barbería'}>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClase}
              placeholder={esIndependiente ? 'Ej: Juan Pérez' : 'Ej: Barbería El Maestro'}
            />
          </Campo>

          <Campo
            id="slug"
            label="Tu enlace"
            hint={`Tu página: ${APP_URL}/${slug || 'tu-enlace'}`}
          >
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTocado(true)
                setSlugManual(e.target.value)
              }}
              className={inputClase}
              placeholder="mi-barberia"
            />
          </Campo>

          <Campo id="contacto" label={esIndependiente ? 'WhatsApp' : 'Contacto'}>
            <input
              id="contacto"
              type="tel"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              className={inputClase}
              placeholder="Ej: 8095551234"
            />
          </Campo>

          <Campo id="email" label="Email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClase}
              placeholder="tu@email.com"
            />
          </Campo>

          <Campo id="password" label="Contraseña" hint="Mínimo 6 caracteres.">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClase}
              placeholder="••••••••"
            />
          </Campo>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Enviar solicitud
                <ArrowRight size={18} strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function ConfirmarEmail() {
  return (
    <div className="w-full max-w-md text-center bg-white rounded-3xl border border-line shadow-sm p-10">
      <div className="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} strokeWidth={1.75} color="#9e4420" />
      </div>
      <h1 className="text-2xl font-black text-ink tracking-tight mb-3">Revisá tu email</h1>
      <p className="text-ink-muted leading-relaxed">
        Te enviamos un link de confirmación. Hacé clic en él para activar tu cuenta y completar el
        registro de tu negocio.
      </p>
    </div>
  )
}

function Confirmacion() {
  return (
    <div className="w-full max-w-md text-center bg-white rounded-3xl border border-line shadow-sm p-10">
      <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} strokeWidth={1.75} color="#2c1a0e" />
      </div>
      <h1 className="text-2xl font-black text-ink tracking-tight mb-3">
        Tu solicitud fue enviada
      </h1>
      <p className="text-ink-muted leading-relaxed mb-8">
        Te avisaremos cuando sea aprobada. Una vez activada, vas a poder configurar tu página y
        empezar a recibir reservas.
      </p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 bg-accent text-primary-dark font-bold px-8 py-3 rounded-xl hover:bg-accent-dark transition-colors"
      >
        Ir a iniciar sesión
        <ArrowRight size={18} strokeWidth={2} />
      </Link>
    </div>
  )
}
