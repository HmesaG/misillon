import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import {
  Scissors,
  Users,
  User,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { guardarTipoPendiente } from '../utils/registroPendiente'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

/**
 * Verifica server-side el token del captcha contra la Edge Function
 * verify-turnstile (que lo valida con la Secret Key en Cloudflare).
 * Lanza un Error con mensaje claro si el captcha no pasó — el caller lo
 * captura, muestra el error y resetea el widget.
 * @param {string} token
 */
async function verificarCaptcha(token) {
  if (!token) throw new Error('Resolvé el captcha para continuar.')
  const { data, error } = await supabase.functions.invoke('verify-turnstile', {
    body: { token },
  })
  if (error) throw new Error('No pudimos verificar el captcha. Intentá de nuevo.')
  if (!data?.success) throw new Error(data?.error || 'La verificación del captcha falló. Resolvelo de nuevo.')
}

function GoogleSVG() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function Registro() {
  // Variante C — "tipo siempre primero":
  //  1. tipo      → elegir tipo de negocio (sin Google acá)
  //  2. identidad → Google o email+password+captcha (sin datos del negocio)
  //  3. datos     → post-auth, lo maneja CompletarRegistro (vía AuthCallback)
  const [paso, setPaso] = useState('tipo')
  const [tipo, setTipo] = useState(null)

  function elegir(t) {
    setTipo(t)
    setPaso('identidad')
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div
        className="relative overflow-hidden flex flex-col items-center justify-end text-center px-6 pb-16 min-h-[200px] rounded-b-[2.5rem]"
        style={{ background: 'linear-gradient(160deg, #2c1a0e 0%, #4a2e1a 60%, #c45c2a 100%)' }}
      >
        <div
          className="absolute -top-14 -right-14 w-52 h-52 rounded-full pointer-events-none"
          style={{ background: 'rgba(196,92,42,0.25)' }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <Link
          to="/"
          className="relative z-10 flex items-center gap-2 mb-4"
          aria-label="MiSillón — inicio"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <Scissors size={18} strokeWidth={2.25} color="white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">MiSillón</span>
        </Link>
        <h1 className="relative z-10 text-2xl font-black text-white tracking-tight mb-1.5">
          Registrá tu barbería
        </h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Empezá a recibir reservas hoy
        </p>
      </div>

      <div className="flex flex-col items-center px-4 pb-10 mt-8">
        {paso === 'tipo' && <PasoTipo onElegir={elegir} />}
        {paso === 'identidad' && (
          <PasoIdentidad
            tipo={tipo}
            onVolver={() => setPaso('tipo')}
            onConfirmarEmail={() => setPaso('confirmar')}
          />
        )}
        {paso === 'confirmar' && <ConfirmarEmail tipo={tipo} />}
      </div>
    </div>
  )
}

function PasoTipo({ onElegir }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-ink tracking-tight mb-1">
          ¿Cómo vas a usar MiSillón?
        </h2>
        <p className="text-ink-muted text-sm">Elegí la opción que mejor describe tu situación.</p>
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
          <h3 className="font-bold text-ink text-lg mb-2">
            Tengo una barbería con peluqueros
          </h3>
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
          <h3 className="font-bold text-ink text-lg mb-2">Soy peluquero independiente</h3>
          <p className="text-ink-muted text-sm leading-relaxed">
            Tu marca y tu agenda en un solo lugar. Todo desde un panel unificado.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onElegir('peluquero')}
          className="text-left bg-white rounded-3xl border border-line shadow-sm p-7 hover:border-primary transition-colors sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-5"
        >
          <div className="w-12 h-12 shrink-0 bg-muted rounded-2xl flex items-center justify-center">
            <UserCheck size={28} strokeWidth={1.5} color="#526860" />
          </div>
          <div>
            <h3 className="font-bold text-ink text-lg mb-2 sm:mb-1">Trabajo en una barbería</h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              El dueño ya creó tu perfil. Activá tu cuenta con el email que registró para vos y empezá a gestionar tus reservas.
            </p>
          </div>
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

const TIPO_LABEL = {
  equipo: 'Barbería con equipo',
  independiente: 'Peluquero independiente',
  peluquero: 'Trabajo en una barbería',
}

/**
 * Paso 2 — Identidad. Solo autenticación: Google OAuth O email+password+captcha.
 * NO pide nombre/slug/contacto — esos datos se completan post-auth en
 * CompletarRegistro (unificado para todos los caminos). El tipo elegido en el
 * paso 1 viaja:
 *  - Google: en el query param `?tipo=` del redirectTo + fallback en localStorage.
 *  - Email/password: en `user_metadata` del signUp (viaja en la sesión).
 */
function PasoIdentidad({ tipo, onVolver, onConfirmarEmail }) {
  const navigate = useNavigate()
  const esPeluquero = tipo === 'peluquero'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conectandoGoogle, setConectandoGoogle] = useState(false)
  const [error, setError] = useState(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)

  function resetCaptcha() {
    setCaptchaToken('')
    captchaRef.current?.reset()
  }

  async function onGoogle() {
    if (conectandoGoogle) return
    setError(null)
    setConectandoGoogle(true)
    // Fallback por si el query param se pierde en el redirect de algún navegador.
    guardarTipoPendiente(tipo)
    // Primario: el tipo viaja en el query string del callback. Supabase matchea el
    // Redirect URL por patrón de base (`${origin}/auth/callback`), ignorando el query
    // string — verificar en el Dashboard que `${origin}/auth/callback` esté en el allowlist.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?tipo=${encodeURIComponent(tipo)}`,
      },
    })
    // Si hubo error, no hay redirect: reseteamos para permitir reintento.
    if (error) {
      setError(mensajeError(error, 'No pudimos conectar con Google.'))
      setConectandoGoogle(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Ingresá tu email.')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (TURNSTILE_SITE_KEY && !captchaToken) return setError('Resolvé el captcha para continuar.')
    setError(null)
    setEnviando(true)
    try {
      // Verificación server-side del captcha ANTES de crear la cuenta (si está activo).
      if (TURNSTILE_SITE_KEY) await verificarCaptcha(captchaToken)

      const { data, error: errAuth } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { tipo },
        },
      })
      if (errAuth) { setError(mensajeError(errAuth, 'No pudimos crear la cuenta.')); resetCaptcha(); return }

      // Si el email quedó auto-confirmado (sesión inmediata), pasamos por el callback
      // para resolver rol/redirección con la misma lógica unificada (vínculo de
      // peluquero o paso de completar datos). El negocio NUNCA se crea acá.
      if (data.session) {
        navigate('/auth/callback', { replace: true })
        return
      }

      onConfirmarEmail()
    } catch (e) {
      setError(mensajeError(e, 'Error inesperado. Intentá de nuevo.'))
      resetCaptcha()
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
        Cambiar tipo
      </button>

      <div className="bg-white rounded-3xl border border-line shadow-sm p-8">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-50 rounded-full px-3 py-1 mb-4">
          {TIPO_LABEL[tipo]}
        </p>
        <h2 className="text-2xl font-black text-ink tracking-tight mb-1">
          {esPeluquero ? 'Activá tu cuenta' : 'Creá tu cuenta'}
        </h2>
        <p className="text-ink-muted text-sm mb-6">
          {esPeluquero
            ? 'Usá el mismo email que el dueño registró para vos. Al confirmar, quedás vinculado automáticamente a tu perfil.'
            : 'Elegí cómo querés entrar. Después completás los datos de tu negocio.'}
        </p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={conectandoGoogle}
          className="w-full h-11 flex items-center justify-center gap-3 rounded-2xl border border-line bg-white hover:bg-muted transition-colors text-sm font-semibold text-ink mb-5 disabled:opacity-60"
        >
          {conectandoGoogle ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <GoogleSVG />
              Continuar con Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 mb-5">
          <span className="flex-1 h-px bg-line" />
          <span className="text-xs text-ink-muted">o con tu email</span>
          <span className="flex-1 h-px bg-line" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Campo id="email" label="Email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClase}
              placeholder="tu@email.com"
              autoFocus
            />
          </Campo>

          <Campo id="password" label="Contraseña" hint="Mínimo 8 caracteres. Podés cambiarla después.">
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

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={captchaRef}
              siteKey={TURNSTILE_SITE_KEY}
              options={{ theme: 'light' }}
              onSuccess={setCaptchaToken}
              onExpire={resetCaptcha}
              onError={resetCaptcha}
            />
          )}

          <button
            type="submit"
            disabled={enviando || (TURNSTILE_SITE_KEY && !captchaToken)}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {esPeluquero ? 'Activar cuenta' : 'Crear cuenta'}
                <ArrowRight size={18} strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function ConfirmarEmail({ tipo }) {
  const esPeluquero = tipo === 'peluquero'
  return (
    <div className="w-full max-w-md text-center bg-white rounded-3xl border border-line shadow-sm p-10">
      <div className="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} strokeWidth={1.75} color="#9e4420" />
      </div>
      <h2 className="text-2xl font-black text-ink tracking-tight mb-3">Revisá tu email</h2>
      <p className="text-ink-muted leading-relaxed">
        {esPeluquero
          ? 'Te enviamos un link de confirmación. Al hacer clic quedás vinculado a tu perfil y podés empezar a gestionar tus reservas.'
          : 'Te enviamos un link de confirmación. Hacé clic en él para activar tu cuenta y completar los datos de tu negocio.'}
      </p>
    </div>
  )
}
