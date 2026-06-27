import { useEffect, useState } from 'react'
import {
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { generateQR } from '../../utils/qr'
import { Card, SeccionTitulo, BotonPrimario, BotonSecundario, Alerta } from '../../components/panel/ui'
import QRDownload from '../../components/QRDownload'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

export default function SuperAdmin() {
  const [barberias, setBarberias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(null)
  const [error, setError] = useState(null)
  const [qrAprobada, setQrAprobada] = useState(null) // { slug, url }

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('barberias')
      .select('*')
      .order('created_at', { ascending: false })
    setBarberias(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function aprobar(b) {
    setProcesando(b.id)
    setError(null)
    try {
      const url = `${APP_URL}/${b.slug}`
      const { png } = await generateQR(url)
      const { error: err } = await supabase
        .from('barberias')
        .update({ estado: 'aprobada', qr_url: png })
        .eq('id', b.id)
      if (err) {
        setError(mensajeError(err, 'No pudimos aprobar la barbería.'))
        return
      }
      setQrAprobada({ slug: b.slug, url })
      cargar()
    } finally {
      setProcesando(null)
    }
  }

  async function rechazar(b) {
    setProcesando(b.id)
    setError(null)
    const { error: err } = await supabase
      .from('barberias')
      .update({ estado: 'rechazada' })
      .eq('id', b.id)
    setProcesando(null)
    if (err) {
      setError(mensajeError(err, 'No pudimos rechazar la barbería.'))
      return
    }
    cargar()
  }

  const pendientes = barberias.filter((b) => b.estado === 'pendiente')
  const aprobadas = barberias.filter((b) => b.estado === 'aprobada')
  const rechazadas = barberias.filter((b) => b.estado === 'rechazada')

  if (cargando) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <SeccionTitulo
          titulo="Solicitudes pendientes"
          descripcion="Revisá y aprobá las barberías que se registraron."
        />
        {error && <div className="mb-4"><Alerta tipo="error">{error}</Alerta></div>}

        {qrAprobada && (
          <div className="border border-primary-100 bg-primary-50/50 rounded-2xl p-5 mb-5">
            <p className="font-semibold text-primary mb-3">
              Barbería aprobada. Su QR general:
            </p>
            <QRDownload url={qrAprobada.url} nombreArchivo={`qr-${qrAprobada.slug}`} />
            <div className="text-center mt-3">
              <BotonSecundario onClick={() => setQrAprobada(null)}>Cerrar</BotonSecundario>
            </div>
          </div>
        )}

        {pendientes.length === 0 ? (
          <p className="text-ink-muted text-sm">No hay solicitudes pendientes.</p>
        ) : (
          <div className="space-y-3">
            {pendientes.map((b) => (
              <div key={b.id} className="border border-line rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} color="#2c1a0e" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-ink">{b.nombre}</p>
                  <p className="text-sm text-ink-muted">
                    /{b.slug} · {b.contacto || 'sin contacto'} ·{' '}
                    {b.tipo_negocio === 'independiente' ? 'Independiente' : 'Equipo'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Registrada el {new Date(b.created_at).toLocaleDateString('es-DO')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <BotonPrimario onClick={() => aprobar(b)} disabled={procesando === b.id}>
                    {procesando === b.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.5} />}
                    Aprobar
                  </BotonPrimario>
                  <button
                    type="button"
                    onClick={() => rechazar(b)}
                    disabled={procesando === b.id}
                    className="inline-flex items-center gap-1.5 border border-red-200 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    <X size={18} strokeWidth={2.5} />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Colapsable titulo={`Aprobadas (${aprobadas.length})`}>
        {aprobadas.map((b) => (
          <ItemSimple key={b.id} barberia={b} />
        ))}
      </Colapsable>

      <Colapsable titulo={`Rechazadas (${rechazadas.length})`}>
        {rechazadas.map((b) => (
          <ItemSimple key={b.id} barberia={b} />
        ))}
      </Colapsable>
    </div>
  )
}

function Colapsable({ titulo, children }) {
  const [abierto, setAbierto] = useState(false)
  const vacio = !children || (Array.isArray(children) && children.length === 0)
  return (
    <Card>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        {abierto ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <span className="font-bold text-ink">{titulo}</span>
      </button>
      {abierto && (
        <div className="mt-4 space-y-2">
          {vacio ? <p className="text-ink-muted text-sm">Nada por aquí.</p> : children}
        </div>
      )}
    </Card>
  )
}

function ItemSimple({ barberia }) {
  return (
    <div className="border border-line rounded-2xl px-4 py-3 flex items-center gap-3">
      <Building2 size={18} className="text-ink-muted" />
      <div>
        <p className="font-semibold text-ink text-sm">{barberia.nombre}</p>
        <p className="text-xs text-ink-muted">/{barberia.slug}</p>
      </div>
    </div>
  )
}
