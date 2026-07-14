import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { leerTipoPendiente, limpiarTipoPendiente } from '../utils/registroPendiente'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function completar() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const tipoParam = params.get('tipo')

      // El tipo elegido en el paso 1 llega por (en orden de preferencia):
      // query param del redirect de Google → fallback en localStorage → user_metadata
      // del signUp con email/password. Se lee y consume ACÁ, antes de cualquier return
      // temprano por fallo de sesión: la lectura no depende de que la sesión sea válida,
      // y dejar el localStorage sin limpiar arrastraría un tipo stale a un reintento por
      // el camino email/password (que no reescribe el localStorage). El fallback en
      // metadata se resuelve más abajo, ya con la sesión disponible.
      const tipoPendiente = tipoParam || leerTipoPendiente()
      limpiarTipoPendiente()

      let session, errSesion

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        session = data?.session
        errSesion = error
      } else {
        const { data, error } = await supabase.auth.getSession()
        session = data?.session
        errSesion = error
      }

      if (errSesion || !session) {
        setError('No pudimos verificar tu cuenta. El link puede haber expirado.')
        return
      }

      const meta = session.user.user_metadata || {}
      const uid = session.user.id

      const tipoResuelto = tipoPendiente || meta.tipo || null

      // ¿Ya tiene negocio? → directo al panel.
      const { data: barbExistente } = await supabase
        .from('barberias')
        .select('tipo_negocio')
        .eq('dueno_id', uid)
        .maybeSingle()

      if (barbExistente) {
        navigate(
          barbExistente.tipo_negocio === 'independiente' ? '/panel/independiente' : '/panel/dueno',
          { replace: true }
        )
        return
      }

      const { data: peluExistente } = await supabase
        .from('peluqueros')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()

      if (peluExistente) {
        navigate('/panel/peluquero', { replace: true })
        return
      }

      // Peluquero de equipo: intento de auto-vínculo por email (además del trigger de BD).
      const { data: vinculado } = await supabase.rpc('vincular_peluquero_por_email', {
        p_user_id: uid,
        p_email:   session.user.email,
      })
      if (vinculado) {
        navigate('/panel/peluquero', { replace: true })
        return
      }

      // Sin negocio todavía: SIEMPRE al paso unificado de completar datos.
      // Ese paso decide qué mostrar según el tipo (datos de negocio, ayuda de
      // peluquero no encontrado, o selector de tipo si el tipo se perdió).
      navigate('/completar-registro', { replace: true, state: { tipo: tipoResuelto } })
    }

    completar()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white rounded-3xl border border-line shadow-sm p-10">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} strokeWidth={1.75} color="#dc2626" />
          </div>
          <h1 className="text-xl font-black text-ink mb-3">Error al confirmar</h1>
          <p className="text-ink-muted text-sm leading-relaxed mb-6">{error}</p>
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors"
          >
            Volver al registro
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-ink-muted">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Activando tu cuenta...</p>
      </div>
    </div>
  )
}
