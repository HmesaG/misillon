import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Scissors, MessageCircle } from 'lucide-react'
import { useBarberia } from '../../hooks/useBarberia'
import ReservaWizard from '../../components/ReservaWizard'
import ErrorPublico from '../../components/ErrorPublico'
import BrandHeader from '../../components/BrandHeader'

function SkeletonBarberia() {
  return (
    <div className="min-h-screen bg-surface animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white border-b border-line px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-muted rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded-lg w-40" />
            <div className="h-3 bg-muted rounded-lg w-24" />
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="h-4 bg-muted rounded-lg w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-line p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BarberiaPub() {
  const { slug } = useParams()
  const { barberia, peluqueros, cargando, error, errorTipo, errorDetalle, recargar } = useBarberia(slug)

  useEffect(() => {
    if (barberia?.nombre) {
      document.title = `${barberia.nombre} — Reservar turno | MiSillón`
    }
    return () => { document.title = 'MiSillón — Tu barbería sin citas perdidas' }
  }, [barberia?.nombre])

  if (cargando) return <SkeletonBarberia />

  if (error || !barberia) {
    return <ErrorPublico mensaje={error} tipo={errorTipo} detalle={errorDetalle} onReintentar={recargar} />
  }

  const estiloMarca = {
    '--brand-primary': barberia.color_primario || '#2c1a0e',
    '--brand-secondary': barberia.color_secundario || '#c45c2a',
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface" style={estiloMarca}>
      <BrandHeader barberia={barberia} />
      <main className="flex-1 flex flex-col w-full sm:max-w-2xl sm:mx-auto sm:px-6 sm:py-8">
        {peluqueros.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white border-y sm:border border-line sm:rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Scissors size={32} strokeWidth={1.5} className="text-primary" />
            </div>
            <h2 className="text-xl font-black text-ink tracking-tight mb-2">
              Próximamente
            </h2>
            <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto mb-5">
              La agenda de {barberia.nombre} estará disponible muy pronto. Volvé en unos días para reservar tu turno.
            </p>
            {barberia.contacto && (
              <a
                href={`https://wa.me/${barberia.contacto.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-light transition-colors"
              >
                <MessageCircle size={16} strokeWidth={2} />
                Consultá por WhatsApp
              </a>
            )}
          </div>
        ) : (
          <ReservaWizard
            barberia={barberia}
            peluqueros={peluqueros}
            peluqueroInicial={peluqueros.length === 1 ? peluqueros[0].id : undefined}
          />
        )}
      </main>
    </div>
  )
}
