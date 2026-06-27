import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Carga el detalle público de un peluquero para la reserva:
 * servicios activos, disponibilidad y política.
 * @param {string|null} peluqueroId
 */
export function usePeluquero(peluqueroId) {
  const [servicios, setServicios] = useState([])
  const [disponibilidad, setDisponibilidad] = useState([])
  const [politica, setPolitica] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    if (!peluqueroId) {
      setServicios([])
      setDisponibilidad([])
      setPolitica(null)
      return
    }

    async function cargar() {
      setCargando(true)
      setError(null)

      const [resServ, resDisp, resPol] = await Promise.all([
        supabase
          .from('servicios')
          .select('*')
          .eq('peluquero_id', peluqueroId)
          .order('nombre'),
        supabase
          .from('disponibilidad')
          .select('*')
          .eq('peluquero_id', peluqueroId),
        supabase
          .from('politicas_peluquero')
          .select('*')
          .eq('peluquero_id', peluqueroId)
          .maybeSingle(),
      ])

      if (!activo) return

      if (resServ.error) {
        setError('No pudimos cargar los servicios.')
        setCargando(false)
        return
      }

      setServicios(resServ.data || [])
      setDisponibilidad(resDisp.data || [])
      setPolitica(resPol.data || null)
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [peluqueroId])

  return { servicios, disponibilidad, politica, cargando, error }
}
