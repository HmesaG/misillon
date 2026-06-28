import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scissors, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'

export default function RecuperarPassword() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) {
        setError(mensajeError(err, 'No pudimos enviar el email. Intentá de nuevo.'))
        return
      }
      setEnviado(true)
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
        {enviado ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} strokeWidth={1.75} className="text-primary" />
            </div>
            <h1 className="text-xl font-black text-ink tracking-tight mb-3">Revisá tu email</h1>
            <p className="text-ink-muted text-sm leading-relaxed mb-6">
              Si existe una cuenta con ese email, te enviamos un link para restablecer tu contraseña.
            </p>
            <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary mb-5"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Volver al login
            </Link>
            <h1 className="text-2xl font-black text-ink tracking-tight mb-1">
              Recuperar contraseña
            </h1>
            <p className="text-ink-muted text-sm mb-6">
              Ingresá tu email y te enviamos un link para crear una nueva contraseña.
            </p>
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
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : 'Enviar link de recuperación'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
