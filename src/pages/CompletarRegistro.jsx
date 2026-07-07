import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Scissors, Users, User, UserCheck, ArrowLeft, ArrowRight, Loader2, HelpCircle } from 'lucide-react'
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

  function elegir(t) {
    if (t === 'peluquero') {
      setTipo('peluquero')
      return
    }
    setTipo(t)
    setPaso('datos')
  }

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
      titulo: '¿Cómo vas a usar MiSillón?',
      subtitulo: 'Elegí la opción que mejor describe tu situación.',
    },
    datos: {
      titulo: 'Datos de tu negocio',
      subtitulo: 'Configurá tu espacio en menos de un minuto',
    },
  }

  const heroActual = paso === 'tipo' && tipo === 'peluquero' ? 'peluquero' : paso
  const { titulo, subtitulo } =
    heroActual === 'peluquero'
      ? { titulo: 'No encontramos tu perfil', subtitulo: 'Puede que falte un paso de tu dueño' }
      : heroContent[paso]

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
          {titulo}
        </h1>
        <p className="relative z-10 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {subtitulo}
        </p>
      </div>

      <div className="flex flex-col items-center px-4 pb-10">
        <div className="w-full max-w-sm mt-8 bg-white rounded-3xl shadow-xl border border-line px-6 pb-6 pt-6">
          {paso === 'tipo' && tipo !== 'peluquero' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => elegir('equipo')}
                className="w-full flex items-center gap-4 rounded-2xl border border-line p-4 text-left hover:border-primary transition-colors"
              >
                <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users size={22} strokeWidth={1.5} color="#2c1a0e" />
                </div>
                <div>
                  <p className="font-bold text-ink leading-tight">Tengo una barbería con peluqueros</p>
                  <p className="text-sm text-ink-muted mt-0.5">
                    Gestioná la marca y tu equipo.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => elegir('independiente')}
                className="w-full flex items-center gap-4 rounded-2xl border border-line p-4 text-left hover:border-primary transition-colors"
              >
                <div className="w-11 h-11 bg-accent-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User size={22} strokeWidth={1.5} color="#9e4420" />
                </div>
                <div>
                  <p className="font-bold text-ink leading-tight">Soy peluquero independiente</p>
                  <p className="text-sm text-ink-muted mt-0.5">
                    Tu marca y tu agenda en un solo lugar.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => elegir('peluquero')}
                className="w-full flex items-center gap-4 rounded-2xl border border-line p-4 text-left hover:border-primary transition-colors"
              >
                <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserCheck size={22} strokeWidth={1.5} color="#526860" />
                </div>
                <div>
                  <p className="font-bold text-ink leading-tight">Trabajo en una barbería</p>
                  <p className="text-sm text-ink-muted mt-0.5">
                    El dueño ya creó mi perfil.
                  </p>
                </div>
              </button>
            </div>
          )}

          {paso === 'tipo' && tipo === 'peluquero' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto">
                <HelpCircle size={28} strokeWidth={1.5} color="#526860" />
              </div>
              <p className="text-sm text-ink-muted leading-relaxed">
                No encontramos un perfil de peluquero con el email de tu cuenta de Google. Pedile
                al dueño de tu barbería que verifique que te haya registrado con este mismo email,
                o iniciá sesión con el email que él usó para vos.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setTipo(null)}
                  className="w-full inline-flex items-center justify-center gap-2 border border-line text-ink font-semibold text-sm px-6 py-2.5 rounded-xl hover:border-primary hover:text-primary transition-colors"
                >
                  <ArrowLeft size={16} strokeWidth={2} />
                  Elegir otra opción
                </button>
                <Link
                  to="/login"
                  className="text-sm text-ink-muted hover:text-primary underline underline-offset-2 transition-colors"
                >
                  Iniciar sesión con otra cuenta
                </Link>
              </div>
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
