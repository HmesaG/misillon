import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Loader2, ArrowLeft, Mail, KeyRound } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { useAuth, rutaPanel } from '../hooks/useAuth'

export default function VerificarOTP() {
  const navigate = useNavigate()
  const { session, rol, cargando: cargandoAuth } = useAuth()

  const [paso, setPaso] = useState('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cargandoAuth && session && rol) {
      navigate(rutaPanel(rol), { replace: true })
    }
  }, [cargandoAuth, session, rol, navigate])

  async function onEnviarCodigo(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresá tu email.'); return }
    setError(null)
    setEnviando(true)
    const { error: errOtp } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setEnviando(false)
    if (errOtp) {
      setError(mensajeError(errOtp, 'No pudimos enviar el código. Verificá que el email esté registrado.'))
      return
    }
    setPaso('codigo')
  }

  async function onVerificar(e) {
    e.preventDefault()
    if (codigo.length !== 6) { setError('Ingresá el código de 6 dígitos.'); return }
    setError(null)
    setEnviando(true)
    const { error: errVerify } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })
    setEnviando(false)
    if (errVerify) {
      setError(mensajeError(errVerify, 'Código incorrecto o expirado. Intentá de nuevo.'))
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div
        className="relative overflow-hidden flex flex-col items-center justify-end text-center px-6 pb-16 min-h-[220px] rounded-b-[2.5rem]"
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
          {paso === 'email' ? 'Entrar con código' : 'Verificar código'}
        </h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {paso === 'email'
            ? 'Te enviamos un código de 6 dígitos a tu email'
            : `Código enviado a ${email}`}
        </p>
      </div>

      <div className="flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-sm -mt-8 bg-white rounded-3xl shadow-xl border border-line px-6 pb-6 pt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary mb-5"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Volver al login
          </Link>

          {paso === 'email' ? (
            <form onSubmit={onEnviarCodigo} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                    placeholder="tu@email.com"
                  />
                </div>
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
                    Enviar código
                    <Mail size={18} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerificar} className="space-y-4">
              <div>
                <label htmlFor="codigo" className="block text-xs font-semibold text-ink-muted mb-1.5">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <KeyRound size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    id="codigo"
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    autoFocus
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none text-center tracking-[0.4em] text-lg font-bold"
                    placeholder="000000"
                  />
                </div>
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
                    Verificar
                    <KeyRound size={18} strokeWidth={2} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setPaso('email'); setCodigo(''); setError(null) }}
                className="w-full text-sm text-ink-muted hover:text-primary underline underline-offset-2 transition-colors"
              >
                Cambiar email o reenviar código
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
