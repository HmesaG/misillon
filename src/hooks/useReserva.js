import { useState } from 'react'
import { supabase, mensajeError } from '../lib/supabase'

/**
 * Encapsula la creación de una reserva pública con verificación de
 * doble-booking (chequeo en app + constraint UNIQUE en BD como respaldo).
 */
export function useReserva() {
  const [creando, setCreando] = useState(false)

  /**
   * Devuelve los ISO de las reservas activas (no canceladas) de un peluquero
   * para poder bloquear slots en el wizard.
   */
  async function fetchOcupados(peluqueroId) {
    const { data } = await supabase
      .from('reservas')
      .select('fecha_hora, estado')
      .eq('peluquero_id', peluqueroId)
      .neq('estado', 'cancelada')
    return (data || []).map((r) => r.fecha_hora)
  }

  /**
   * Crea una reserva. Retorna { ok, reserva, error }.
   * @param {object} payload
   */
  async function crearReserva(payload) {
    setCreando(true)
    try {
      // Verificación previa de doble-booking (UX); la BD lo refuerza con UNIQUE.
      const { data: existente } = await supabase
        .from('reservas')
        .select('id, estado')
        .eq('peluquero_id', payload.peluquero_id)
        .eq('fecha_hora', payload.fecha_hora)
        .neq('estado', 'cancelada')
        .maybeSingle()

      if (existente) {
        return {
          ok: false,
          error: 'Ese horario acaba de ser reservado. Elegí otro, por favor.',
        }
      }

      const { data, error } = await supabase
        .from('reservas')
        .insert(payload)
        .select('id, token')
        .single()

      if (error) {
        return { ok: false, error: mensajeError(error, 'No pudimos crear la reserva.') }
      }

      return { ok: true, reserva: data }
    } finally {
      setCreando(false)
    }
  }

  return { creando, crearReserva, fetchOcupados }
}
