import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Detecta el rol del usuario autenticado.
 * Roles: 'super_admin' | 'dueno' | 'peluquero' | 'independiente' | null
 *
 * - independiente: barbería tipo_negocio='independiente' donde el user es dueño
 *   y hay exactamente 1 peluquero con es_dueno_mismo=true y el mismo user_id.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [rol, setRol] = useState(null)
  const [barberia, setBarberia] = useState(null)
  const [peluquero, setPeluquero] = useState(null)
  const [desactivado, setDesactivado] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true

    async function resolverRol(sesion) {
      if (!sesion) {
        if (activo) {
          setRol(null)
          setBarberia(null)
          setPeluquero(null)
          setDesactivado(false)
          setCargando(false)
        }
        return
      }

      if (activo) setDesactivado(false)

      const uid = sesion.user.id

      // 1. ¿Super admin?
      const { data: sa } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle()

      if (sa) {
        if (activo) {
          setRol('super_admin')
          setCargando(false)
        }
        return
      }

      // 2. ¿Dueño de alguna barbería?
      const { data: barberiaDueno } = await supabase
        .from('barberias')
        .select('*')
        .eq('dueno_id', uid)
        .maybeSingle()

      // 3. ¿Es peluquero (tiene fila en peluqueros)?
      // limit(1) blinda contra el caso de un user_id vinculado a >1 peluquero
      // (que rompería maybeSingle con "multiple rows"). El error se maneja
      // explícitamente en vez de ignorarse: si ocurre, se loguea y se continúa
      // sin perder la detección del resto de roles.
      const { data: pelu, error: errPelu } = await supabase
        .from('peluqueros')
        .select('*')
        .eq('user_id', uid)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (errPelu) {
        console.error('useAuth: no se pudo resolver el peluquero del usuario', errPelu)
      }

      if (!activo) return

      if (barberiaDueno) {
        setBarberia(barberiaDueno)
        setPeluquero(pelu || null)

        // Detección de modo independiente
        if (barberiaDueno.tipo_negocio === 'independiente') {
          const { count } = await supabase
            .from('peluqueros')
            .select('id', { count: 'exact', head: true })
            .eq('barberia_id', barberiaDueno.id)

          if (
            count === 1 &&
            pelu &&
            pelu.es_dueno_mismo &&
            pelu.user_id === uid
          ) {
            if (activo) {
              setRol('independiente')
              setCargando(false)
            }
            return
          }
        }

        if (activo) {
          setRol('dueno')
          setCargando(false)
        }
        return
      }

      if (pelu) {
        setPeluquero(pelu)
        // Peluquero de equipo desactivado por el dueño: puede leer su propia
        // fila (política peluqueros_select_self, migración 042) pero no tiene
        // un panel al que entrar. Marcamos el estado para avisarle en vez de
        // dejarlo en loop de login. (BUG 37A)
        if (!pelu.activo) {
          if (activo) {
            setDesactivado(true)
            setRol(null)
            setCargando(false)
          }
          return
        }
        if (activo) {
          setRol('peluquero')
          setCargando(false)
        }
        return
      }

      // Autenticado pero sin rol asignado (p.ej. barbería pendiente sin dueno_id)
      if (activo) {
        setRol(null)
        setCargando(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session)
      resolverRol(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sesion) => {
      setSession(sesion)
      setCargando(true)
      resolverRol(sesion)
    })

    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, rol, barberia, peluquero, desactivado, cargando }
}

/** Devuelve la ruta del panel según el rol. */
export function rutaPanel(rol) {
  switch (rol) {
    case 'super_admin':
      return '/admin'
    case 'dueno':
      return '/panel/dueno'
    case 'peluquero':
      return '/panel/peluquero'
    case 'independiente':
      return '/panel/independiente'
    default:
      return '/login'
  }
}
