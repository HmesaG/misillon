import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Scissors,
  ArrowRight,
  CheckCircle,
  BookOpen,
  MessageCircle,
  CalendarX,
  Building2,
  Share2,
  CalendarCheck,
  Palette,
  Phone,
  Users,
  Smartphone,
  QrCode,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'

const PROBLEMAS = [
  {
    Icon: BookOpen,
    titulo: 'El cuaderno físico',
    desc: 'Búsquedas a mano, tachones y páginas arrugadas. Si se pierde el cuaderno, perdés toda la agenda.',
  },
  {
    Icon: MessageCircle,
    titulo: 'WhatsApp sin control',
    desc: 'Mensajes perdidos, clientes que no confirman y vos coordinando horarios en medio del trabajo.',
  },
  {
    Icon: CalendarX,
    titulo: 'Citas dobles y perdidas',
    desc: 'Dos clientes para el mismo horario, o un turno que nadie anotó. El caos que se paga con clientes que no vuelven.',
  },
]

const PASOS = [
  {
    n: 1,
    Icon: Building2,
    titulo: 'Registrá tu negocio',
    desc: 'Completá tu perfil, cargá tus servicios, precios y horarios disponibles. Tarda menos de 10 minutos.',
    accent: false,
  },
  {
    n: 2,
    Icon: Share2,
    titulo: 'Compartí tu QR o link',
    desc: 'Imprimí el QR y pegalo en el local, o enviá el link por WhatsApp. Tus clientes ya pueden reservar.',
    accent: false,
  },
  {
    n: 3,
    Icon: CalendarCheck,
    titulo: 'Tus clientes reservan, vos confirmás',
    desc: 'Recibís una notificación por cada nueva cita. Confirmás con un clic. El cliente recibe los detalles por WhatsApp.',
    accent: true,
  },
]

const BENEFICIOS = [
  {
    Icon: CalendarCheck,
    titulo: 'Sin turnos dobles, nunca',
    desc: 'El sistema bloquea automáticamente los horarios ocupados. No podés tener dos clientes a la misma hora.',
  },
  {
    Icon: Palette,
    titulo: 'Tu página, tu marca',
    desc: 'Personalizá con tu logo, colores y nombre. Tus clientes ven la identidad de tu negocio, no la nuestra.',
  },
  {
    Icon: Phone,
    titulo: 'Notificaciones por WhatsApp',
    desc: 'Tus clientes reciben confirmación directo al WhatsApp. Nadie se olvida del turno.',
  },
  {
    Icon: Users,
    titulo: 'Para uno o para todo un equipo',
    desc: '¿Trabajás solo? Perfecto. ¿Tenés varios barberos? Cada uno gestiona su agenda desde el mismo panel.',
  },
  {
    Icon: Smartphone,
    titulo: 'Sin instalación',
    desc: 'Todo funciona desde el navegador del teléfono. Ni vos ni tus clientes tienen que descargar nada.',
  },
  {
    Icon: QrCode,
    titulo: 'QR listo para imprimir',
    desc: 'Descargá tu QR y ponelo en la puerta del local, en el espejo o en tu tarjeta de presentación.',
  },
]

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      id="main-nav"
      className={`fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-sm transition-all duration-200 ${
        scrolled ? 'is-scrolled' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="MiSillón — inicio">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center group-hover:bg-primary-light transition-colors">
            <Scissors size={16} strokeWidth={2.25} color="white" />
          </div>
          <span className="text-xl font-black text-primary tracking-tight">MiSillón</span>
        </Link>
        <Link
          to="/registro"
          className="inline-flex items-center gap-2 bg-accent text-primary-dark font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm hover:bg-accent-dark transition-colors"
        >
          Registrar mi negocio
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
      </div>
    </header>
  )
}

function PhoneMockup() {
  return (
    <div className="phone-frame w-[210px] sm:w-[248px]">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div style={{ background: '#1a3a2e', padding: '14px 14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'rgba(201,148,58,0.22)',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors size={15} strokeWidth={2.2} color="#e4b862" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                Barbería El Maestro
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Elegí tu servicio</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 12, background: '#f5f5f3' }}>
          <div
            style={{
              background: 'white',
              borderRadius: 11,
              padding: '10px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              border: '1.5px solid #1a3a2e',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: '#f0f7f4',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors size={14} strokeWidth={1.75} color="#1a3a2e" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1a1f1e' }}>Corte de cabello</div>
              <div style={{ fontSize: 9.5, color: '#526860' }}>30 min · RD$350</div>
            </div>
            <CheckCircle size={14} strokeWidth={2} color="#1a3a2e" />
          </div>
          <div style={{ marginBottom: 10, marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#1a1f1e', marginBottom: 6 }}>
              Horarios — hoy
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <div style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid #d9ece5', fontSize: 10, fontWeight: 600, color: '#1a3a2e', background: 'white' }}>09:00</div>
              <div style={{ padding: '5px 9px', borderRadius: 7, background: '#1a3a2e', fontSize: 10, fontWeight: 700, color: 'white' }}>10:30</div>
              <div style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid #d9ece5', fontSize: 10, fontWeight: 600, color: '#1a3a2e', background: 'white' }}>14:00</div>
            </div>
          </div>
          <div style={{ background: '#c9943a', color: '#0f2318', fontWeight: 700, fontSize: 12.5, borderRadius: 11, padding: 12, textAlign: 'center' }}>
            Confirmar reserva
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="font-sans">
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative min-h-screen pt-16 flex items-center bg-surface overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-32 w-[560px] h-[560px] bg-primary rounded-full opacity-[0.04]" />
            <div className="absolute -bottom-40 -left-32 w-[420px] h-[420px] bg-accent rounded-full opacity-[0.05]" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary font-semibold text-xs px-4 py-1.5 rounded-full mb-7">
                <Scissors size={16} strokeWidth={2} color="#1a3a2e" />
                Plataforma de reservas para barberías
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-black text-ink leading-[1.06] tracking-tight mb-6">
                Tus clientes<br />
                <span className="text-primary">reservan solos.</span>
                <br />
                Vos no perdés más una cita.
              </h1>
              <p className="text-lg sm:text-xl text-ink-muted leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Creá tu página de reservas en minutos. Compartí el link o el QR, tus clientes
                eligen el horario y vos confirmás con un clic.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/registro"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-accent text-primary-dark font-bold text-base px-8 py-4 rounded-2xl hover:bg-accent-dark transition-all"
                  style={{ boxShadow: '0 8px 24px rgba(201,148,58,0.30)' }}
                >
                  Registrar mi negocio
                  <ArrowRight size={20} strokeWidth={1.75} />
                </Link>
                <span className="text-sm text-ink-muted flex items-center gap-1.5">
                  <CheckCircle size={16} strokeWidth={2} color="#2d5c47" />
                  Sin tarjeta de crédito
                </span>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* Problema */}
        <section id="problema" className="py-20 bg-muted">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-4">
                ¿Todavía gestionás las citas así?
              </h2>
              <p className="text-ink-muted text-lg max-w-xl mx-auto">
                Lo entendemos. Así arranca todo el mundo. Y así se pierden clientes todos los días.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {PROBLEMAS.map(({ Icon, titulo, desc }) => (
                <div key={titulo} className="bg-surface rounded-3xl p-7 border border-line shadow-sm">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-5">
                    <Icon size={28} strokeWidth={1.5} color="#526860" />
                  </div>
                  <h3 className="font-bold text-ink text-lg mb-2">{titulo}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="py-20 bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-4">
                En 3 pasos, tus clientes reservan solos
              </h2>
              <p className="text-ink-muted text-lg max-w-sm mx-auto">
                Sin complicaciones. Sin descargar nada.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {PASOS.map(({ n, Icon, titulo, desc, accent }) => (
                <div key={n} className="relative flex flex-col items-center text-center">
                  {n < 3 && <div className="step-connector" aria-hidden="true" />}
                  <div
                    className={`w-12 h-12 rounded-full font-black text-xl flex items-center justify-center mb-5 relative z-10 ${
                      accent ? 'bg-accent text-primary-dark' : 'bg-primary text-white'
                    }`}
                    style={{
                      boxShadow: accent
                        ? '0 8px 24px rgba(201,148,58,0.30)'
                        : '0 8px 24px rgba(26,58,46,0.28)',
                    }}
                  >
                    {n}
                  </div>
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                      accent ? 'bg-accent-50' : 'bg-primary-50'
                    }`}
                  >
                    <Icon size={28} strokeWidth={1.5} color={accent ? '#a67828' : '#1a3a2e'} />
                  </div>
                  <h3 className="font-bold text-ink text-lg mb-2">{titulo}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="py-20 bg-muted">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-4">
                Todo lo que ganás con MiSillón
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {BENEFICIOS.map(({ Icon, titulo, desc }) => (
                <div
                  key={titulo}
                  className="bg-surface rounded-2xl p-6 border border-line flex gap-4 items-start shadow-sm"
                >
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={20} strokeWidth={1.75} color="#1a3a2e" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink mb-1.5">{titulo}</h3>
                    <p className="text-ink-muted text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Producto */}
        <section id="producto" className="py-20 bg-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-4">
                Así se ve MiSillón
              </h2>
              <p className="text-ink-muted text-lg max-w-md mx-auto">
                Simple para vos. Simple para tus clientes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <ProductoMockup
                Icon={Smartphone}
                titulo="Reserva del cliente"
                desc="Selección de servicio, horario y confirmación en 3 toques"
                caption="Vista cliente · Móvil"
                style={{ aspectRatio: '9/18', maxWidth: 220, margin: '0 auto' }}
              />
              <ProductoMockup
                Icon={LayoutDashboard}
                titulo="Panel del barbero"
                desc="Agenda diaria, gestión de citas y configuración de servicios"
                caption="Panel de gestión · Tablet / Desktop"
                style={{ aspectRatio: '16/10' }}
              />
              <ProductoMockup
                Icon={QrCode}
                titulo="Tu QR único"
                desc="Listo para imprimir y pegar en tu local"
                caption="Código QR · Para imprimir"
                style={{ aspectRatio: '1', maxWidth: 220, margin: '0 auto' }}
              />
            </div>
          </div>
        </section>

        {/* Testimonios */}
        <section id="testimonios" className="py-20 bg-muted">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight mb-4">
              Barberías que ya usan MiSillón
            </h2>
            <div className="testi-empty px-6 py-16 mt-10">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: '#e0dfdc' }}
              >
                <MessageSquare size={28} strokeWidth={1.5} color="#9ca3a0" />
              </div>
              <p className="font-semibold text-ink-muted text-lg mb-2">Próximamente</p>
              <p className="text-ink-muted text-sm max-w-sm mx-auto leading-relaxed">
                Estamos recopilando casos reales de barberías que ya gestionan sus citas con
                MiSillón. Volvé pronto.
              </p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section
          id="cta"
          className="py-24 relative overflow-hidden"
          style={{ background: 'linear-gradient(140deg, #1a3a2e 0%, #0f2318 100%)' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-accent rounded-full opacity-[0.05]" />
            <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] bg-primary-light rounded-full opacity-[0.1]" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-5">
              ¿Listo para llenar tu agenda?
            </h2>
            <p className="text-primary-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Registrá tu barbería hoy. En minutos tenés tu página de reservas funcionando y tus
              clientes pueden empezar a reservar.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2.5 bg-accent text-primary-dark font-bold text-base px-10 py-4 rounded-2xl hover:bg-accent-light transition-all"
              style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.30)' }}
            >
              Registrar mi negocio
              <ArrowRight size={20} strokeWidth={1.75} />
            </Link>
            <p
              className="mt-6 text-sm flex items-center justify-center gap-2"
              style={{ color: 'rgba(217,236,229,0.5)' }}
            >
              <ShieldCheck size={16} strokeWidth={2} color="rgba(217,236,229,0.4)" />
              Sin tarjeta de crédito · Cancelá cuando quieras
            </p>
          </div>
        </section>
      </main>

      <footer style={{ background: '#0f2318' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary-light rounded-lg flex items-center justify-center">
                  <Scissors size={16} strokeWidth={2.25} color="white" />
                </div>
                <span className="text-lg font-black text-white tracking-tight">MiSillón</span>
              </div>
              <span className="text-sm" style={{ color: 'rgba(217,236,229,0.45)' }}>
                Tu barbería, sin citas perdidas.
              </span>
            </div>
            <nav className="flex items-center gap-6" aria-label="Footer">
              <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(217,236,229,0.55)' }}>
                Términos de uso
              </a>
              <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(217,236,229,0.55)' }}>
                Privacidad
              </a>
            </nav>
          </div>
          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(45,92,71,0.4)' }}>
            <p className="text-xs" style={{ color: 'rgba(217,236,229,0.35)' }}>
              © 2026 MiSillón. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProductoMockup({ Icon, titulo, desc, caption, style }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="mockup-ph rounded-3xl w-full flex flex-col items-center justify-center gap-4 p-8"
        style={style}
      >
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Icon size={28} strokeWidth={1.5} color="#1a3a2e" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-primary mb-1.5">{titulo}</p>
          <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
        </div>
      </div>
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider text-center">
        {caption}
      </p>
    </div>
  )
}
