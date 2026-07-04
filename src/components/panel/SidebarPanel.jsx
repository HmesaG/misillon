import { useState } from 'react'

/**
 * Layout de panel con navegación lateral.
 * @param {{ secciones: Array<{ id: string, label: string, Icon: any, render: () => React.ReactNode }>, accionExtra?: React.ReactNode }} props
 */
export default function SidebarPanel({ secciones, accionExtra }) {
  const [activa, setActiva] = useState(secciones[0]?.id)
  const seccion = secciones.find((s) => s.id === activa) || secciones[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-6">
      <div className="flex flex-col gap-2">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:bg-white lg:border lg:border-line lg:rounded-2xl lg:p-2 lg:shadow-sm">
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
        {accionExtra && (
          <div className="lg:mt-2">{accionExtra}</div>
        )}
      </div>
      <section>{seccion?.render()}</section>
    </div>
  )
}
