import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Carga una barbería pública por slug junto con sus peluqueros activos.
 * RLS solo devuelve barberías 'aprobada' y peluqueros activos.
 */
export function useBarberia(slug) {
  const [barberia, setBarberia] = useState(null)
  const [peluqueros, setPeluqueros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    if (!slug) return

    async function cargar() {
      setCargando(true)
      setError(null)

      const { data: barb, error: errBarb } = await supabase
        .from('barberias')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (!activo) return

      if (errBarb || !barb) {
        setError('No encontramos esta barbería o todavía no está disponible.')
        setCargando(false)
        return
      }

      const { data: pelus } = await supabase
        .from('peluqueros')
        .select('id, slug, nombre, foto_url, whatsapp')
        .eq('barberia_id', barb.id)
        .order('nombre')

      if (!activo) return

      setBarberia(barb)
      setPeluqueros(pelus || [])
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [slug])

  return { barberia, peluqueros, cargando, error }
}
