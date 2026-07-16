import { Navigate } from 'react-router-dom'
import { useAuth, rutaPanel } from '../hooks/useAuth'
import Spinner from './Spinner'
import { CuentaSuspendida } from './panel/ui'

/**
 * Protege una ruta verificando sesión y rol.
 * @param {{ rol: string|string[], children: React.ReactNode }} props
 *   rol: rol(es) permitido(s) para esta ruta.
 */
export default function ProtectedRoute({ rol, children }) {
  const { session, rol: rolUsuario, barberia, desactivado, cargando } = useAuth()

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

  // Peluquero desactivado: lo mandamos a /login, que muestra el aviso. (BUG 37A)
  if (desactivado) {
    return <Navigate to="/login" replace />
  }

  // Sesión válida pero sin rol resuelto (OAuth nuevo, peluquero desvinculado):
  // completar el registro en vez de rebotar a /login en loop. (BUG 38A)
  if (!rolUsuario) {
    return <Navigate to="/completar-registro" replace />
  }

  const permitidos = Array.isArray(rol) ? rol : [rol]
  if (!permitidos.includes(rolUsuario)) {
    // Autenticado pero rol no coincide: lo mandamos a su panel correcto.
    return <Navigate to={rutaPanel(rolUsuario)} replace />
  }

  // Negocio suspendido por facturación (migración 048): bloqueamos el panel del
  // dueño/independiente con la pantalla de aviso. Distinto de 'pendiente'
  // (aprobación) — ese lo maneja cada panel con BarberiaPendiente.
  if (barberia?.estado_facturacion === 'suspendida') {
    return <CuentaSuspendida barberia={barberia} email={session.user?.email} />
  }

  return children
}
