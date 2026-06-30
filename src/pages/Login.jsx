import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Loader2, ArrowRight } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth, rutaPanel } from '../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { session, rol, cargando: cargandoAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cargandoAuth && session && rol) {
      navigate(rutaPanel(rol), { replace: true })
    }
  }, [cargandoAuth, session, rol, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email, password })
    setEnviando(false)
    if (errLogin) {
      setError(mensajeError(errLogin, 'No pudimos iniciar sesión.'))
      return
    }
  }

  async function onGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(mensajeError(error, 'No pudimos conectar con Google.'))
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div
        className="relative overflow-hidden flex flex-col items-center justify-end text-center px-6 pb-14 min-h-[220px]"
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
          ¡Bienvenido de vuelta!
        </h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Iniciá sesión para gestionar tus reservas
        </p>
      </div>

      <div className="flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-sm -mt-6 bg-white rounded-3xl shadow-lg border border-line px-6 pb-6 pt-3">
          <button
            type="button"
            onClick={onGoogle}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-2xl border border-line bg-white hover:bg-muted transition-colors text-sm font-semibold text-ink mb-5"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-px bg-line" />
            <span className="text-xs text-ink-muted">o</span>
            <span className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-ink-muted mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-ink-muted mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {enviando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={18} strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-5">
            <Link
              to="/verificar-otp"
              className="text-xs text-ink-muted hover:text-primary underline underline-offset-2 transition-colors"
            >
              Entrar con código de 6 dígitos
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2 mt-4">
            <Link
              to="/recuperar-password"
              className="text-sm text-ink-muted hover:text-primary hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <p className="text-sm text-ink-muted">
              ¿No tenés cuenta?{' '}
              <Link to="/registro" className="font-semibold text-primary hover:underline">
                Registrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
