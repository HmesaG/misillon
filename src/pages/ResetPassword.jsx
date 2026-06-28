import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Loader2, AlertCircle } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function establecerSesion() {
      // PKCE flow: ?code= en query string
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code)
        if (err) {
          setError('No pudimos verificar el link. Puede haber expirado.')
          return
        }
        setListo(true)
        return
      }

      // Implicit flow: #access_token= en el hash (SDK lo procesa automáticamente)
      const { data: { session }, error: err } = await supabase.auth.getSession()
      if (err || !session) {
        setError('Link inválido o expirado. Solicitá uno nuevo.')
        return
      }
      setListo(true)
    }
    establecerSesion()
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(mensajeError(err, 'No pudimos actualizar la contraseña.'))
        return
      }
      navigate('/login', { replace: true })
    } catch (e) {
      setError(mensajeError(e, 'Error inesperado. Intentá de nuevo.'))
    } finally {
      setEnviando(false)
    }
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
        {!listo ? (
          <div className="flex flex-col items-center gap-4 py-4">
            {error ? (
              <>
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={32} strokeWidth={1.75} color="#dc2626" />
                </div>
                <p className="text-sm text-ink-muted text-center">{error}</p>
                <Link to="/recuperar-password" className="text-sm font-semibold text-primary hover:underline">
                  Solicitar nuevo link
                </Link>
              </>
            ) : (
              <Loader2 size={28} className="animate-spin text-primary" strokeWidth={1.75} />
            )}
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-ink tracking-tight mb-1">Nueva contraseña</h1>
            <p className="text-ink-muted text-sm mb-6">Elegí una contraseña segura para tu cuenta.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label htmlFor="confirmacion" className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmacion"
                  type="password"
                  required
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                  placeholder="Repetí la contraseña"
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
                {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
