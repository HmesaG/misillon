import { useEffect, useState } from 'react'
import { supabasePublic as supabase } from '../lib/supabase'
import { drTodayISO } from '../utils/tz'

/** Suma días a una fecha 'YYYY-MM-DD' y devuelve el ISO resultante. */
function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Carga el detalle público de un peluquero para la reserva:
 * servicios activos, disponibilidad, política y días bloqueados.
 * @param {string|null} peluqueroId
 */
export function usePeluquero(peluqueroId) {
  const [servicios, setServicios] = useState([])
  const [disponibilidad, setDisponibilidad] = useState([])
  const [politica, setPolitica] = useState(null)
  const [diasBloqueados, setDiasBloqueados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    if (!peluqueroId) {
      setServicios([])
      setDisponibilidad([])
      setPolitica(null)
      setDiasBloqueados([])
      return
    }

    async function cargar() {
      setCargando(true)
      setError(null)

      const desde = drTodayISO()
      const hasta = sumarDias(desde, 60)

      const [resServ, resDisp, resPol, resBloq] = await Promise.all([
        supabase
          .from('servicios')
          .select('*')
          .eq('peluquero_id', peluqueroId)
          .eq('activo', true)
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
        supabase.rpc('get_dias_bloqueados', {
          p_peluquero_id: peluqueroId,
          p_desde: desde,
          p_hasta: hasta,
        }),
      ])

      if (!activo) return

      if (resServ.error) {
        setError('No pudimos cargar los servicios.')
        setCargando(false)
        return
      }
      if (resDisp.error) {
        setError('No pudimos cargar la disponibilidad horaria.')
        setCargando(false)
        return
      }
      if (resPol.error) {
        setError('No pudimos cargar la información del peluquero.')
        setCargando(false)
        return
      }

      setServicios(resServ.data || [])
      setDisponibilidad(resDisp.data || [])
      setPolitica(resPol.data || null)
      // Los días bloqueados no son críticos: si fallan, no rompemos la reserva.
      setDiasBloqueados((resBloq.data || []).map((d) => d.fecha))
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [peluqueroId])

  return { servicios, disponibilidad, politica, diasBloqueados, cargando, error }
}
