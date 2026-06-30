import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Suscribe en realtime a los INSERT de reservas y dispara onNueva(reserva).
 *
 * Filtra por peluquero (panel de peluquero/independiente) o por barbería
 * (panel del dueño, que ve todas las reservas de su negocio). Requiere el
 * cliente autenticado, no el público.
 *
 * @param {object} params
 * @param {string|null} [params.peluqueroId]  filtra por peluquero_id
 * @param {string|null} [params.barberiaId]   filtra por barberia_id
 * @param {(reserva: object) => void} params.onNueva  callback al recibir INSERT
 */
export function useRealtimeReservas({ peluqueroId, barberiaId, onNueva }) {
  // Ref para que cambiar onNueva no fuerce re-suscripción del canal.
  const onNuevaRef = useRef(onNueva)
  onNuevaRef.current = onNueva

  useEffect(() => {
    if (!peluqueroId && !barberiaId) return

    const filter = peluqueroId
      ? `peluquero_id=eq.${peluqueroId}`
      : `barberia_id=eq.${barberiaId}`

    const canal = supabase
      .channel(`reservas-${peluqueroId || barberiaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservas', filter },
        (payload) => onNuevaRef.current?.(payload.new),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [peluqueroId, barberiaId])
}
