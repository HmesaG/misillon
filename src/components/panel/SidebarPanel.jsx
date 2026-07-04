import { useState } from 'react'
import { Menu, X } from 'lucide-react'

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
 * Layout de panel con navegación lateral en desktop y menú tipo drawer
 * (hamburguesa) en móvil. La primera sección visible en móvil es la lista
 * de reservas (o agenda) del rol activo — el resto queda a un toque de
 * distancia en el drawer.
 * @param {{ secciones: Array<{ id: string, label: string, Icon: any, render: () => React.ReactNode }>, accionExtra?: React.ReactNode, prioridadMobile?: string[] }} props
 */
export default function SidebarPanel({ secciones, accionExtra, prioridadMobile = PRIORIDAD_MOBILE_DEFECTO }) {
  const [activa, setActiva] = useState(() => idInicial(secciones, prioridadMobile))
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const seccion = secciones.find((s) => s.id === activa) || secciones[0]
  const SeccionIcon = seccion?.Icon

  function elegir(id) {
    setActiva(id)
    setDrawerAbierto(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-6">
      {/* Nav lateral fija — solo desktop */}
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

      {/* Barra superior móvil: sección activa + botón de menú */}
      <div className="lg:hidden sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface/95 backdrop-blur-sm border-b border-line flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {SeccionIcon && (
            <SeccionIcon size={20} strokeWidth={1.75} className="text-primary flex-shrink-0" />
          )}
          <span className="font-bold text-ink truncate">{seccion?.label}</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerAbierto(true)}
          aria-label="Abrir menú de secciones"
          aria-expanded={drawerAbierto}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-line text-ink-muted hover:text-primary hover:border-primary transition-colors flex-shrink-0"
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
      </div>

      {/* Drawer móvil con el resto de las secciones */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ${
          drawerAbierto ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerAbierto(false)}
        aria-hidden={!drawerAbierto}
      >
        <div
          className={`absolute top-0 left-0 h-full w-[82%] max-w-xs bg-white shadow-xl flex flex-col transition-transform duration-200 ease-out ${
            drawerAbierto ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de secciones del panel"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
            <span className="font-black text-ink tracking-tight">Menú</span>
            <button
              type="button"
              onClick={() => setDrawerAbierto(false)}
              aria-label="Cerrar menú"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-ink-muted transition-colors"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {secciones.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => elegir(id)}
                aria-current={activa === id ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                  activa === id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-ink-muted hover:bg-muted hover:text-ink'
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </nav>
          {accionExtra && (
            <div className="p-3 border-t border-line flex-shrink-0">{accionExtra}</div>
          )}
        </div>
      </div>

      <section>{seccion?.render()}</section>
    </div>
  )
}
