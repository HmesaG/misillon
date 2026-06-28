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

      const { nombre, slug, contacto, esIndependiente } = session.user.user_metadata || {}
      if (!nombre || !slug) {
        navigate('/', { replace: true })
        return
      }

      // Insertar barbería
      const { data: barberia, error: errBarb } = await supabase
        .from('barberias')
        .insert({
          nombre,
          slug,
          estado: 'pendiente',
          tipo_negocio: esIndependiente ? 'independiente' : 'equipo',
          contacto,
          dueno_id: session.user.id,
        })
        .select('id')
        .single()

      if (errBarb) {
        setError(mensajeError(errBarb, 'No pudimos registrar tu negocio. Contactanos.'))
        return
      }

      // Si es independiente, crear el peluquero
      if (esIndependiente) {
        const { error: errPel } = await supabase.from('peluqueros').insert({
          barberia_id: barberia.id,
          user_id: session.user.id,
          slug,
          nombre,
          whatsapp: contacto,
          activo: true,
          es_dueno_mismo: true,
        })
        if (errPel) {
          setError(mensajeError(errPel, 'No pudimos crear tu perfil de peluquero.'))
          return
        }
      }

      sessionStorage.removeItem('registro_pendiente')
      navigate(esIndependiente ? '/panel/independiente' : '/panel/dueno', { replace: true })
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
