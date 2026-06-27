import { useState } from 'react'

/**
 * Layout de panel con navegación lateral.
 * @param {{ secciones: Array<{ id: string, label: string, Icon: any, render: () => React.ReactNode }> }} props
 */
export default function SidebarPanel({ secciones }) {
  const [activa, setActiva] = useState(secciones[0]?.id)
  const seccion = secciones.find((s) => s.id === activa) || secciones[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {secciones.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiva(id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              activa === id
                ? 'bg-primary text-white'
                : 'text-ink-muted hover:bg-muted hover:text-ink'
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </nav>
      <section>{seccion?.render()}</section>
    </div>
  )
}
