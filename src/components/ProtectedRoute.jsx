import { Navigate } from 'react-router-dom'
import { useAuth, rutaPanel } from '../hooks/useAuth'
import Spinner from './Spinner'

/**
 * Protege una ruta verificando sesión y rol.
 * @param {{ rol: string|string[], children: React.ReactNode }} props
 *   rol: rol(es) permitido(s) para esta ruta.
 */
export default function ProtectedRoute({ rol, children }) {
  const { session, rol: rolUsuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner texto="Verificando sesión..." />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const permitidos = Array.isArray(rol) ? rol : [rol]
  if (!permitidos.includes(rolUsuario)) {
    // Autenticado pero rol no coincide: lo mandamos a su panel correcto.
    return <Navigate to={rutaPanel(rolUsuario)} replace />
  }

  return children
}
