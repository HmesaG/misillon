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

  // Si ya hay sesión con rol resuelto, redirigir al panel.
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
    // El efecto de arriba redirige cuando useAuth resuelva el rol.
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <Link to="/" className="flex items-center gap-2.5 mb-8" aria-label="MiSillón — inicio">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Scissors size={18} strokeWidth={2.25} color="white" />
        </div>
        <span className="text-2xl font-black text-primary tracking-tight">MiSillón</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl border border-line shadow-sm p-8">
        <h1 className="text-2xl font-black text-ink tracking-tight mb-1">Iniciar sesión</h1>
        <p className="text-ink-muted text-sm mb-6">Accedé a tu panel de MiSillón.</p>

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

        <div className="flex flex-col items-center gap-2 mt-6">
          <Link to="/recuperar-password" className="text-sm text-ink-muted hover:text-primary hover:underline">
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
  )
}
