import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, LayoutGrid, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Modal } from './ui'

/**
 * Orden de preferencia para decidir qué sección se muestra primero en
 * móvil: la lista de reservas del rol (si existe) o, en su defecto, la
 * agenda. Si ninguna existe, se usa la primera sección declarada.
 */
const PRIORIDAD_MOBILE_DEFECTO = ['reservas', 'agenda']

function idInicial(secciones, prioridad) {
  for (const id of prioridad) {
    if (secciones.some((s) => s.id === id)) return id
  }
  return secciones[0]?.id
}

/**
 * Layout de panel. En desktop (`lg`+) mantiene la navegación lateral fija
 * de siempre. En móvil (`<lg`) usa un "app shell" nativo: header compacto
 * sticky, tab bar inferior fija con las secciones principales, y un bottom
 * sheet "Más" con el resto de las secciones + acciones + cerrar sesión.
 *
 * @param {{
 *   secciones: Array<{ id: string, label: string, Icon: any, render: () => React.ReactNode }>,
 *   accionExtra?: React.ReactNode,
 *   prioridadMobile?: string[],
 *   principales?: string[],
 * }} props
 * `principales` son los IDs de las secciones que van en la tab bar inferior
 * en móvil (máximo 4). El resto cae al bottom sheet "Más".
 */
export default function SidebarPanel({
  secciones,
  accionExtra,
  prioridadMobile = PRIORIDAD_MOBILE_DEFECTO,
  principales = [],
}) {
  const navigate = useNavigate()
  const [activa, setActiva] = useState(() => idInicial(secciones, prioridadMobile))
  const [sheetAbierto, setSheetAbierto] = useState(false)
  const seccion = secciones.find((s) => s.id === activa) || secciones[0]
  const SeccionIcon = seccion?.Icon

  // Tab bar: hasta 4 secciones principales (en el orden declarado), el resto
  // al sheet "Más". Si no se declara `principales`, caen todas al sheet.
  const tabs = principales
    .map((id) => secciones.find((s) => s.id === id))
    .filter(Boolean)
    .slice(0, 4)
  const idsEnTab = new Set(tabs.map((s) => s.id))
  const restantes = secciones.filter((s) => !idsEnTab.has(s.id))
  const masActiva = !idsEnTab.has(activa)

  function elegir(id) {
    setActiva(id)
    setSheetAbierto(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-6">
        {/* Nav lateral fija — solo desktop (sin cambios) */}
        <div className="hidden lg:flex lg:flex-col gap-2">
          <nav className="flex flex-col gap-1 bg-white border border-line rounded-2xl p-2 shadow-sm">
            {secciones.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiva(id)}
                aria-current={activa === id ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  activa === id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-ink-muted hover:bg-muted hover:text-ink'
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </nav>
          {accionExtra && <div className="mt-2">{accionExtra}</div>}
        </div>

        {/* Header compacto móvil: isotipo + sección activa. Sin logout ni menú. */}
        <header
          className="lg:hidden sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-surface/95 backdrop-blur-sm shadow-sm"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="h-[52px] flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Scissors size={16} strokeWidth={2.25} color="white" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {SeccionIcon && (
                <SeccionIcon size={20} strokeWidth={1.75} className="text-primary flex-shrink-0" />
              )}
              <span className="font-bold text-ink truncate">{seccion?.label}</span>
            </div>
          </div>
        </header>

        {/* Contenido con transición sutil al cambiar de sección */}
        <section>
          <div key={activa} className="seccion-anim">
            {seccion?.render()}
          </div>
        </section>
      </div>

      {/* Tab bar inferior fija — solo móvil */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-surface/95 backdrop-blur-md"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(28, 23, 20, 0.08)',
        }}
        aria-label="Navegación del panel"
      >
        {tabs.map(({ id, label, Icon }) => {
          const activo = activa === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => elegir(id)}
              aria-current={activo ? 'page' : undefined}
              className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                activo ? 'text-accent' : 'text-ink-muted'
              }`}
            >
              <Icon size={22} strokeWidth={activo ? 2 : 1.75} />
              <span className="text-[11px] font-semibold leading-none truncate max-w-full">{label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setSheetAbierto(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetAbierto}
          className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
            masActiva ? 'text-accent' : 'text-ink-muted'
          }`}
        >
          <LayoutGrid size={22} strokeWidth={masActiva ? 2 : 1.75} />
          <span className="text-[11px] font-semibold leading-none">Más</span>
        </button>
      </nav>

      {/* Bottom sheet "Más" — reusa el Modal (sheet desde abajo en móvil) */}
      {sheetAbierto && (
        <Modal titulo="Más" ancho="max-w-lg" onCerrar={() => setSheetAbierto(false)}>
          {restantes.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {restantes.map(({ id, label, Icon }) => {
                const activo = activa === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => elegir(id)}
                    aria-current={activo ? 'page' : undefined}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center min-h-[88px] transition-colors ${
                      activo
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-ink border-line hover:border-primary'
                    }`}
                  >
                    <Icon size={22} strokeWidth={1.75} className={activo ? 'text-white' : 'text-primary'} />
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </button>
                )
              })}
            </div>
          )}
          {accionExtra && (
            <div className="mt-5 pt-5 border-t border-line">{accionExtra}</div>
          )}
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-4 w-full flex items-center justify-center gap-2 min-h-11 rounded-xl text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} strokeWidth={2} />
            Cerrar sesión
          </button>
        </Modal>
      )}
    </>
  )
}
