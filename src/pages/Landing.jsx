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
  MessageSquare,
  ShieldCheck,
  Home,
  Heart,
  User,
} from 'lucide-react'

const HERO_STATS = [
  { Icon: CalendarCheck, label: 'Sin turnos dobles' },
  { Icon: Phone, label: 'Confirmación por WhatsApp' },
  { Icon: QrCode, label: 'QR listo para compartir' },
]

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
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      id="main-nav"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface/95 backdrop-blur-sm shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="MiSillón — inicio">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              scrolled
                ? 'bg-primary group-hover:bg-primary-light'
                : 'bg-white/15 group-hover:bg-white/25'
            }`}
          >
            <Scissors size={16} strokeWidth={2.25} color="white" />
          </div>
          <span
            className={`text-xl font-black tracking-tight transition-colors ${
              scrolled ? 'text-primary' : 'text-white'
            }`}
          >
            MiSillón
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={`inline-flex items-center gap-1.5 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors ${
              scrolled ? 'text-ink-muted hover:text-primary hover:bg-muted' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 bg-accent text-primary-dark font-semibold text-sm px-5 py-2.5 rounded-full shadow-sm hover:bg-accent-dark transition-colors"
          >
            Registrarme
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  )
}

function PhoneMockup() {
  return (
    <div
      className="phone-frame w-[210px] sm:w-[248px]"
      style={{ background: '#141414', borderColor: '#2a2a2a', boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      <div className="phone-notch" style={{ background: '#141414' }} />
      <div className="phone-screen" style={{ background: '#1a1a1a' }}>
        {/* App header */}
        <div style={{ background: 'linear-gradient(160deg, #2c1a0e 0%, #1a0f07 100%)', padding: '14px 14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'rgba(196,92,42,0.25)',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors size={15} strokeWidth={2.2} color="#e07844" />
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                Barbería El Maestro
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Elegí tu servicio</div>
            </div>
          </div>
        </div>
        {/* App body */}
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
              border: '1.5px solid #2c1a0e',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: '#faf5f0',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scissors size={14} strokeWidth={1.75} color="#2c1a0e" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1c1714' }}>Corte de cabello</div>
              <div style={{ fontSize: 9.5, color: '#6b5548' }}>30 min · RD$350</div>
            </div>
            <CheckCircle size={14} strokeWidth={2} color="#2c1a0e" />
          </div>
          <div style={{ marginBottom: 10, marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#1c1714', marginBottom: 6 }}>
              Horarios — hoy
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <div style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid #f0e6d9', fontSize: 10, fontWeight: 600, color: '#2c1a0e', background: 'white' }}>09:00</div>
              <div style={{ padding: '5px 9px', borderRadius: 7, background: '#2c1a0e', fontSize: 10, fontWeight: 700, color: 'white' }}>10:30</div>
              <div style={{ padding: '5px 9px', borderRadius: 7, border: '1.5px solid #f0e6d9', fontSize: 10, fontWeight: 600, color: '#2c1a0e', background: 'white' }}>14:00</div>
            </div>
          </div>
          <div style={{ background: '#c45c2a', color: '#1a0f07', fontWeight: 700, fontSize: 12.5, borderRadius: 11, padding: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(196,92,42,0.35)' }}>
            Confirmar reserva
          </div>
        </div>
        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '11px 8px', background: 'white', borderTop: '1px solid #f0e6d9' }}>
          <Home size={16} strokeWidth={2} color="#c45c2a" />
          <Heart size={16} strokeWidth={1.75} color="#9ca3a0" />
          <CalendarCheck size={16} strokeWidth={1.75} color="#9ca3a0" />
          <User size={16} strokeWidth={1.75} color="#9ca3a0" />
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
        <section
          className="relative min-h-screen pt-16 flex items-center overflow-hidden"
          style={{ background: 'linear-gradient(140deg, #2c1a0e 0%, #1a0f07 100%)' }}
        >
          {/* Decorative glows */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(196,92,42,0.12) 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(74,46,26,0.20) 0%, transparent 70%)' }}
            />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 font-semibold text-xs px-4 py-1.5 rounded-full mb-7"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.80)' }}
              >
                <Scissors size={16} strokeWidth={2} color="rgba(196,92,42,0.9)" />
                Plataforma de reservas para barberías
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-black leading-[1.06] tracking-tight mb-6" style={{ color: 'white' }}>
                Tus clientes<br />
                <span style={{ color: '#c45c2a' }}>reservan solos.</span>
                <br />
                Vos no perdés más una cita.
              </h1>
              <p
                className="text-lg sm:text-xl leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
                style={{ color: 'rgba(255,255,255,0.60)' }}
              >
                Creá tu página de reservas en minutos. Compartí el link o el QR, tus clientes
                eligen el horario y vos confirmás con un clic.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/registro"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-4 bg-accent text-primary-dark font-bold text-base pl-8 pr-2 py-2 rounded-full hover:bg-accent-dark transition-all"
                  style={{ boxShadow: '0 8px 28px rgba(196,92,42,0.38)' }}
                >
                  Registrar mi negocio
                  <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(26,15,7,0.85)' }}>
                    <ArrowRight size={18} strokeWidth={2} color="#e07844" />
                  </span>
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold text-base px-8 py-4 rounded-full border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all"
                  style={{ color: 'rgba(255,255,255,0.80)' }}
                >
                  Ya tengo cuenta
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                {HERO_STATS.map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)' }}
                  >
                    <Icon size={14} strokeWidth={2} color="#e07844" />
                    {label}
                  </div>
                ))}
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
              {PROBLEMAS.map(({ Icon, titulo, desc }, idx) => (
                <div key={titulo} className="relative bg-surface rounded-3xl p-7 pt-9 border border-line shadow-sm hover:shadow-md transition-shadow">
                  <div
                    className="absolute -top-3 left-7 inline-flex items-center px-3 py-1 rounded-full font-black text-[11px] tracking-wide text-white"
                    style={{ background: '#c45c2a', boxShadow: '0 4px 12px rgba(196,92,42,0.35)' }}
                  >
                    0{idx + 1}
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#fdf2ec' }}>
                    <Icon size={28} strokeWidth={1.5} color="#9e4420" />
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
                  {/* Single element: icon container with number badge overlay */}
                  <div className="relative mb-5 z-10">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        accent ? 'bg-accent' : 'bg-primary'
                      }`}
                      style={{
                        boxShadow: accent
                          ? '0 8px 24px rgba(196,92,42,0.30)'
                          : '0 8px 24px rgba(44,26,14,0.28)',
                      }}
                    >
                      <Icon size={22} strokeWidth={1.75} color={accent ? '#1a0f07' : 'white'} />
                    </div>
                    <div
                      className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] bg-white shadow-sm ${
                        accent ? 'text-accent-dark' : 'text-primary'
                      }`}
                      style={{ border: `2px solid ${accent ? '#c45c2a' : '#2c1a0e'}` }}
                    >
                      {n}
                    </div>
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
                  className="bg-surface rounded-2xl p-6 border border-line flex gap-4 items-start shadow-sm hover:shadow-md hover:border-primary-100 transition-all duration-200 cursor-default"
                >
                  <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={20} strokeWidth={1.75} color="#2c1a0e" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

              {/* A: Reserva del cliente — phone mockup */}
              <div className="flex flex-col items-center gap-4">
                <PhoneMockup />
                <span className="inline-flex items-center bg-muted border border-line text-ink-muted font-semibold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                  Vista cliente · Móvil
                </span>
              </div>

              {/* B: Panel del barbero */}
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl overflow-hidden border border-line shadow-md" style={{ height: 194 }}>
                  <div style={{ display: 'flex', height: '100%' }}>
                    {/* Sidebar */}
                    <div style={{ width: 64, background: '#2c1a0e', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, background: 'rgba(196,92,42,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                        <Scissors size={15} strokeWidth={2.1} color="#e07844" />
                      </div>
                      {[
                        { SideIcon: CalendarCheck, label: 'Agenda', active: true },
                        { SideIcon: Scissors, label: 'Servicios', active: false },
                        { SideIcon: Users, label: 'Clientes', active: false },
                      ].map(({ SideIcon, label, active }) => (
                        <div
                          key={label}
                          style={{
                            width: 44, borderRadius: 10, padding: '6px 0',
                            background: active ? 'rgba(196,92,42,0.18)' : 'transparent',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          }}
                        >
                          <SideIcon size={14} strokeWidth={1.75} color={active ? '#c45c2a' : 'rgba(255,255,255,0.40)'} />
                          <span style={{ fontSize: 6.5, fontWeight: 600, color: active ? '#c45c2a' : 'rgba(255,255,255,0.30)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Main area */}
                    <div style={{ flex: 1, background: '#faf8f5', padding: '10px 12px', overflowY: 'hidden' }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1c1714', marginBottom: 8 }}>Agenda — hoy, lunes</div>
                      {[
                        { hora: '09:00', cliente: 'Martín R.', servicio: 'Corte', ocupado: true },
                        { hora: '10:30', cliente: 'Carlos G.', servicio: 'Barba', ocupado: true },
                        { hora: '12:00', cliente: 'Libre', servicio: '', ocupado: false },
                        { hora: '14:00', cliente: 'Diego F.', servicio: 'Corte + Barba', ocupado: true },
                      ].map(({ hora, cliente, servicio, ocupado }) => (
                        <div
                          key={hora}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            background: ocupado ? '#faf5f0' : '#f2ede8',
                            borderRadius: 7, padding: '4px 7px', marginBottom: 4,
                            borderLeft: `3px solid ${ocupado ? '#2c1a0e' : '#e5ddd6'}`,
                          }}
                        >
                          <span style={{ fontSize: 8.5, fontWeight: 700, color: '#6b5548', width: 32, flexShrink: 0 }}>{hora}</span>
                          <div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: ocupado ? '#1c1714' : '#9ca3a0' }}>{cliente}</div>
                            {servicio && <div style={{ fontSize: 7, color: '#6b5548' }}>{servicio}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="self-center inline-flex items-center bg-muted border border-line text-ink-muted font-semibold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                  Panel del barbero · Tablet / Desktop
                </span>
              </div>

              {/* C: QR único */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="bg-white rounded-3xl border border-line shadow-md p-6 flex flex-col items-center gap-4"
                  style={{ maxWidth: 220, width: '100%' }}
                >
                  {/* Simulated QR pattern */}
                  <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    {/* Corner: top-left */}
                    <rect x="8" y="8" width="36" height="36" rx="5" fill="#2c1a0e"/>
                    <rect x="14" y="14" width="24" height="24" rx="3" fill="white"/>
                    <rect x="20" y="20" width="12" height="12" rx="2" fill="#2c1a0e"/>
                    {/* Corner: top-right */}
                    <rect x="96" y="8" width="36" height="36" rx="5" fill="#2c1a0e"/>
                    <rect x="102" y="14" width="24" height="24" rx="3" fill="white"/>
                    <rect x="108" y="20" width="12" height="12" rx="2" fill="#2c1a0e"/>
                    {/* Corner: bottom-left */}
                    <rect x="8" y="96" width="36" height="36" rx="5" fill="#2c1a0e"/>
                    <rect x="14" y="102" width="24" height="24" rx="3" fill="white"/>
                    <rect x="20" y="108" width="12" height="12" rx="2" fill="#2c1a0e"/>
                    {/* Data dots — top */}
                    <rect x="52" y="8" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="64" y="8" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="76" y="8" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="52" y="20" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="76" y="24" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="64" y="32" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    {/* Data dots — middle */}
                    <rect x="8" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="20" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="32" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="52" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="64" y="56" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="76" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="96" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="112" y="56" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="124" y="52" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="8" y="64" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="32" y="68" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="52" y="64" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="76" y="64" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="100" y="64" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="124" y="68" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="20" y="76" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="32" y="76" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="52" y="80" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="64" y="76" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="96" y="76" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="112" y="76" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="124" y="80" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    {/* Data dots — bottom */}
                    <rect x="52" y="96" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="68" y="100" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="80" y="96" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="56" y="112" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="76" y="108" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="64" y="124" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                    <rect x="80" y="120" width="8" height="8" rx="1.5" fill="#2c1a0e"/>
                  </svg>
                  <p className="text-[10px] font-semibold text-ink-muted text-center leading-snug">
                    misillon.app/barberia-el-maestro
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="w-full text-center text-[11px] font-semibold py-2 rounded-xl bg-primary text-white">
                      Descargar PNG
                    </div>
                    <div className="w-full text-center text-[11px] font-semibold py-2 rounded-xl border border-line text-ink-muted">
                      Descargar PDF
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center bg-muted border border-line text-ink-muted font-semibold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                  Código QR · Para imprimir
                </span>
              </div>

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
                style={{ background: '#e5ddd6' }}
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
          style={{ background: 'linear-gradient(140deg, #2c1a0e 0%, #1a0f07 100%)' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="absolute -top-24 -right-24 w-[560px] h-[560px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(196,92,42,0.10) 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-32 -left-32 w-[460px] h-[460px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(74,46,26,0.25) 0%, transparent 70%)' }}
            />
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
              className="inline-flex items-center gap-4 bg-accent text-primary-dark font-bold text-base pl-10 pr-2 py-2 rounded-full hover:bg-accent-light transition-all"
              style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.30)' }}
            >
              Registrar mi negocio
              <span className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(26,15,7,0.85)' }}>
                <ArrowRight size={20} strokeWidth={1.75} color="#e07844" />
              </span>
            </Link>
            <p
              className="mt-6 text-sm flex items-center justify-center gap-2"
              style={{ color: 'rgba(240,230,217,0.5)' }}
            >
              <ShieldCheck size={16} strokeWidth={2} color="rgba(240,230,217,0.4)" />
              Sin tarjeta de crédito · Cancelá cuando quieras
            </p>
          </div>
        </section>
      </main>

      <footer style={{ background: '#1a0f07' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary-light rounded-lg flex items-center justify-center">
                  <Scissors size={16} strokeWidth={2.25} color="white" />
                </div>
                <span className="text-lg font-black text-white tracking-tight">MiSillón</span>
              </div>
              <span className="text-sm" style={{ color: 'rgba(240,230,217,0.45)' }}>
                Tu barbería, sin citas perdidas.
              </span>
            </div>
            <nav className="flex items-center gap-6" aria-label="Footer">
              <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(240,230,217,0.55)' }}>
                Términos de uso
              </a>
              <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(240,230,217,0.55)' }}>
                Privacidad
              </a>
            </nav>
          </div>
          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(74,46,26,0.4)' }}>
            <p className="text-xs" style={{ color: 'rgba(240,230,217,0.35)' }}>
              © 2026 MiSillón. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

