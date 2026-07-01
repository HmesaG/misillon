import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, MessageCircle, Clock } from 'lucide-react'
import { supabase, mensajeError } from '../../../lib/supabase'
import { Card, SeccionTitulo, BotonSecundario, Alerta } from '../ui'

/** Recordatorios de las reservas de mañana. @param {{ peluqueroId: string }} props */
export default function RecordatoriosWA({ peluqueroId }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('get_recordatorios_manana', {
      p_peluquero_id: peluqueroId,
    })
    if (err) setError(mensajeError(err, 'No pudimos cargar los recordatorios.'))
    setItems(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [peluqueroId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <SeccionTitulo
        titulo="Recordatorios de mañana"
        descripcion="Enviá un recordatorio por WhatsApp a tus clientes de mañana."
        accion={
          <BotonSecundario onClick={cargar} disabled={cargando}>
            <RefreshCw size={16} strokeWidth={2} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </BotonSecundario>
        }
      />

      {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

      {cargando ? (
        <Loader2 className="animate-spin text-primary" />
      ) : items.length === 0 ? (
        <p className="text-ink-muted text-sm">No tenés reservas para mañana.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.reserva_id}
              className="flex items-center justify-between gap-3 border border-line rounded-2xl p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{r.cliente_nombre}</p>
                <p className="text-sm text-ink-muted flex items-center gap-1.5">
                  <Clock size={14} strokeWidth={2} />
                  {r.hora_inicio} · {r.servicio_nombre}
                </p>
              </div>
              {r.wa_link && (
                <a
                  href={r.wa_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-accent text-primary-dark text-sm font-bold px-4 py-2 rounded-xl hover:bg-accent-dark transition-colors flex-shrink-0"
                >
                  <MessageCircle size={16} strokeWidth={2} />
                  Enviar WA
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
