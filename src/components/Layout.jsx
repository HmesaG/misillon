import { Outlet, useNavigate } from 'react-router-dom'
import { Scissors, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BotonSoporte from './panel/BotonSoporte'

/**
 * Chrome de los paneles autenticados: nav superior + outlet.
 * @param {{ titulo?: string, soporte?: boolean }} props
 */
export default function Layout({ titulo, soporte = false }) {
  const navigate = useNavigate()

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Scissors size={16} strokeWidth={2.25} color="white" />
            </div>
            <span className="text-lg font-black text-primary tracking-tight">
              MiSillón
            </span>
            {titulo && (
              <span className="hidden sm:inline text-sm text-ink-muted ml-2 pl-3 border-l border-line">
                {titulo}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-4 py-2 rounded-xl hover:border-primary hover:text-primary transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 py-8 ${soporte ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      {soporte && <BotonSoporte contexto={titulo} />}
    </div>
  )
}
