import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useBarberia } from '../../hooks/useBarberia'
import ReservaWizard from '../../components/ReservaWizard'
import ErrorPublico from '../../components/ErrorPublico'
import BrandHeader from '../../components/BrandHeader'

function SkeletonPeluquero() {
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
      {/* Wizard skeleton */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-3">
        <div className="h-4 bg-muted rounded-lg w-28" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-line p-4">
            <div className="h-4 bg-muted rounded w-32 mb-2" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PeluqueroPub() {
  const { slug, peluquero_slug } = useParams()
  const { barberia, peluqueros, cargando, error, errorTipo, errorDetalle, recargar } = useBarberia(slug)

  const peluquero = peluqueros.find((p) => p.slug === peluquero_slug)

  useEffect(() => {
    if (barberia?.nombre && peluquero?.nombre) {
      document.title = `${peluquero.nombre} en ${barberia.nombre} — Reservar | MiSillón`
    } else if (barberia?.nombre) {
      document.title = `${barberia.nombre} — Reservar turno | MiSillón`
    }
    return () => { document.title = 'MiSillón — Tu negocio sin citas perdidas' }
  }, [barberia?.nombre, peluquero?.nombre])

  if (cargando) return <SkeletonPeluquero />

  if (error || !barberia) {
    return <ErrorPublico mensaje={error} tipo={errorTipo} detalle={errorDetalle} onReintentar={recargar} />
  }

  if (!peluquero) {
    return (
      <ErrorPublico
        tipo="no_encontrada"
        mensaje="Este profesional no existe o ya no está disponible en este negocio."
      />
    )
  }

  const estiloMarca = {
    '--brand-primary': barberia.color_primario || '#2c1a0e',
    '--brand-secondary': barberia.color_secundario || '#c45c2a',
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface" style={estiloMarca}>
      <BrandHeader barberia={barberia} peluquero={peluquero} />
      <main className="flex-1 flex flex-col w-full sm:max-w-2xl sm:mx-auto sm:px-6 sm:py-8">
        <ReservaWizard
          barberia={barberia}
          peluqueros={peluqueros}
          peluqueroInicial={peluquero.id}
        />
      </main>
    </div>
  )
}
