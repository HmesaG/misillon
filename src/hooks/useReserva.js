import { useState } from 'react'
import { supabasePublic as supabase, mensajeError } from '../lib/supabase'
import { drTodayISO } from '../utils/tz'

/**
 * Encapsula la creación de una reserva pública con verificación de
 * doble-booking (chequeo en app + constraint UNIQUE en BD como respaldo).
 */
export function useReserva() {
  const [creando, setCreando] = useState(false)

  /**
   * Devuelve las reservas activas (no canceladas) de un peluquero como
   * `{ fecha_hora, duracion_minutos }` para bloquear slots por solapamiento
   * real (no solo por inicio exacto). La duración vive en el servicio, así que
   * se trae con un join a `servicios`.
   */
  async function fetchOcupados(peluqueroId) {
    // Medianoche DR de hoy, con offset explícito (-04:00) para que la
    // comparación contra la columna timestamptz sea exacta y no dependa
    // de la timezone del servidor de Postgres.
    const desde = `${drTodayISO()}T00:00:00-04:00`
    const { data, error } = await supabase
      .from('reservas')
      .select('fecha_hora, estado, servicios(duracion_minutos)')
      .eq('peluquero_id', peluqueroId)
      .neq('estado', 'cancelada')
      .gte('fecha_hora', desde)
    if (error) throw error
    return (data || []).map((r) => ({
      fecha_hora: r.fecha_hora,
      duracion_minutos: r.servicios?.duracion_minutos ?? 0,
    }))
  }

  /**
   * Crea una reserva. Retorna { ok, reserva, error }.
   * @param {object} payload
   */
  async function crearReserva(payload) {
    setCreando(true)
    try {
      const { data, error } = await supabase.rpc('crear_reserva_publica', {
        p_barberia_id:       payload.barberia_id,
        p_peluquero_id:      payload.peluquero_id,
        p_servicio_id:       payload.servicio_id,
        p_cliente_nombre:    payload.cliente_nombre,
        p_cliente_telefono:  payload.cliente_telefono,
        p_cliente_email:     payload.cliente_email,
        p_cliente_direccion: payload.cliente_direccion ?? null,
        p_es_domicilio:      payload.es_domicilio ?? false,
        p_fecha_hora:        payload.fecha_hora,
      })

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
