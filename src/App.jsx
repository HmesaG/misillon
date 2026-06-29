import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Registro from './pages/Registro'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import CompletarRegistro from './pages/CompletarRegistro'
import RecuperarPassword from './pages/RecuperarPassword'
import ResetPassword from './pages/ResetPassword'
import VerificarOTP from './pages/VerificarOTP'
import NotFound from './pages/NotFound'

import BarberiaPub from './pages/public/BarberiaPub'
import PeluqueroPub from './pages/public/PeluqueroPub'
import GestionCita from './pages/public/GestionCita'

import SuperAdmin from './pages/panel/SuperAdmin'
import Dueno from './pages/panel/Dueno'
import Peluquero from './pages/panel/Peluquero'
import Independiente from './pages/panel/Independiente'

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/completar-registro" element={<CompletarRegistro />} />
      <Route path="/recuperar-password" element={<RecuperarPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verificar-otp" element={<VerificarOTP />} />

      {/* Gestión de cita por token */}
      <Route path="/cita/:token" element={<GestionCita />} />

      {/* Paneles autenticados */}
      <Route
        element={
          <ProtectedRoute rol="super_admin">
            <Layout titulo="Administración" />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<SuperAdmin />} />
      </Route>

      <Route
        element={
          <ProtectedRoute rol="dueno">
            <Layout titulo="Panel del dueño" />
          </ProtectedRoute>
        }
      >
        <Route path="/panel/dueno" element={<Dueno />} />
      </Route>

      <Route
        element={
          <ProtectedRoute rol="peluquero">
            <Layout titulo="Panel del peluquero" />
          </ProtectedRoute>
        }
      >
        <Route path="/panel/peluquero" element={<Peluquero />} />
      </Route>

      <Route
        element={
          <ProtectedRoute rol="independiente">
            <Layout titulo="Mi panel" />
          </ProtectedRoute>
        }
      >
        <Route path="/panel/independiente" element={<Independiente />} />
      </Route>

      {/* Públicas por slug (después de las rutas fijas) */}
      <Route path="/:slug" element={<BarberiaPub />} />
      <Route path="/:slug/:peluquero_slug" element={<PeluqueroPub />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
