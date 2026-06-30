import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function completar() {
      const code = new URLSearchParams(window.location.search).get('code')
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

      const { data: vinculado } = await supabase.rpc('vincular_peluquero_por_email', {
        p_user_id: uid,
        p_email:   session.user.email,
      })
      if (vinculado) {
        navigate('/panel/peluquero', { replace: true })
        return
      }

      if (meta.tipo === 'peluquero') {
        setError('No encontramos tu perfil de peluquero. Asegurate de que el dueño haya registrado tu email.')
        return
      }

      if (meta.nombre && meta.slug) {
        const { error: errNegocio } = await supabase.rpc('registrar_negocio', {
          p_nombre:       meta.nombre,
          p_slug:         meta.slug,
          p_contacto:     meta.contacto || null,
          p_tipo_negocio: meta.esIndependiente ? 'independiente' : 'equipo',
          p_dueno_id:     uid,
        })
        if (errNegocio) {
          setError(mensajeError(errNegocio, 'No pudimos registrar tu negocio. Contactanos.'))
          return
        }
        sessionStorage.removeItem('registro_pendiente')
        navigate(meta.esIndependiente ? '/panel/independiente' : '/panel/dueno', { replace: true })
        return
      }

      navigate('/completar-registro', { replace: true })
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
