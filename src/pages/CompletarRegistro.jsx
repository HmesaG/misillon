import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Users, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { slugify, slugValido } from '../utils/slug'

export default function CompletarRegistro() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState('tipo')
  const [tipo, setTipo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState(null)

  const slug = slugify(nombre)

  async function onSubmit(e) {
    e.preventDefault()
    if (!slug || !slugValido(slug)) {
      setError('El nombre no generó un slug válido. Usá letras y números.')
      return
    }
    setError(null)
    setCreando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Tu sesión expiró. Volvé a iniciar sesión.'); return }

      const { error: err } = await supabase.rpc('registrar_negocio', {
        p_nombre:       nombre,
        p_slug:         slug,
        p_contacto:     contacto || null,
        p_tipo_negocio: tipo,
        p_dueno_id:     session.user.id,
      })

      if (err) { setError(mensajeError(err, 'No pudimos crear tu espacio. Intentá con otro nombre.')); return }

      navigate(tipo === 'independiente' ? '/panel/independiente' : '/panel/dueno', { replace: true })
    } catch (e) {
      setError(mensajeError(e, 'Error inesperado. Intentá de nuevo.'))
    } finally {
      setCreando(false)
    }
  }

  const heroContent = {
    tipo: {
      titulo: '¿Cómo usarás MiSillón?',
      subtitulo: 'Elegí el tipo de cuenta que mejor te describe',
    },
    datos: {
      titulo: 'Datos de tu negocio',
      subtitulo: 'Configurá tu espacio en menos de un minuto',
    },
  }

  const { titulo, subtitulo } = heroContent[paso]

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
          {titulo}
        </h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {subtitulo}
        </p>
      </div>

      <div className="flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-sm -mt-6 bg-white rounded-3xl shadow-lg border border-line px-6 pb-6 pt-3">
          {paso === 'tipo' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setTipo('independiente')}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors cursor-pointer ${
                  tipo === 'independiente'
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-white hover:border-ink-muted'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    tipo === 'independiente' ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <Scissors
                    size={20}
                    strokeWidth={1.75}
                    color={tipo === 'independiente' ? 'white' : '#526860'}
                  />
                </div>
                <div>
                  <p className="font-bold text-ink leading-tight">Trabajo solo</p>
                  <p className="text-sm text-ink-muted mt-0.5">Soy peluquero independiente</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('equipo')}
                className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors cursor-pointer ${
                  tipo === 'equipo'
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-white hover:border-ink-muted'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    tipo === 'equipo' ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <Users
                    size={20}
                    strokeWidth={1.75}
                    color={tipo === 'equipo' ? 'white' : '#526860'}
                  />
                </div>
                <div>
                  <p className="font-bold text-ink leading-tight">Tengo un equipo</p>
                  <p className="text-sm text-ink-muted mt-0.5">Soy dueño y tengo peluqueros</p>
                </div>
              </button>

              <button
                type="button"
                disabled={!tipo}
                onClick={() => setPaso('datos')}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                Continuar
                <ArrowRight size={18} strokeWidth={2} />
              </button>
            </div>
          )}

          {paso === 'datos' && (
            <form onSubmit={onSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setPaso('tipo')}
                className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors -mt-1 mb-1"
              >
                <ArrowLeft size={16} strokeWidth={2} />
                Volver
              </button>

              <div>
                <label
                  htmlFor="nombre"
                  className="block text-xs font-semibold text-ink-muted mb-1.5"
                >
                  Nombre del negocio
                </label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                  placeholder="Mi Barbería"
                />
                {slug && (
                  <p className="text-xs text-ink-muted mt-1.5 truncate">
                    misillon.com/
                    <span className="font-medium">{slug}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contacto"
                  className="block text-xs font-semibold text-ink-muted mb-1.5"
                >
                  WhatsApp / Contacto
                </label>
                <input
                  id="contacto"
                  type="tel"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-ink focus:border-primary outline-none"
                  placeholder="809-000-0000"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
              )}

              <button
                type="submit"
                disabled={creando}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold px-6 py-3 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60"
              >
                {creando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Crear mi espacio
                    <ArrowRight size={18} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
