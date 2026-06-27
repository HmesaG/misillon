import { useParams } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { useBarberia } from '../../hooks/useBarberia'
import ReservaWizard from '../../components/ReservaWizard'
import Spinner from '../../components/Spinner'
import ErrorPublico from '../../components/ErrorPublico'
import BrandHeader from '../../components/BrandHeader'

export default function BarberiaPub() {
  const { slug } = useParams()
  const { barberia, peluqueros, cargando, error } = useBarberia(slug)

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner texto="Cargando barbería..." />
      </div>
    )
  }

  if (error || !barberia) {
    return <ErrorPublico mensaje={error} />
  }

  const estiloMarca = {
    '--brand-primary': barberia.color_primario || '#1a3a2e',
    '--brand-secondary': barberia.color_secundario || '#c9943a',
  }

  return (
    <div className="min-h-screen bg-surface" style={estiloMarca}>
      <BrandHeader barberia={barberia} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {peluqueros.length === 0 ? (
          <div className="bg-white rounded-3xl border border-line p-8 text-center">
            <Scissors size={28} strokeWidth={1.5} className="mx-auto text-ink-muted mb-3" />
            <p className="text-ink-muted">
              Esta barbería todavía no tiene peluqueros disponibles para reservar.
            </p>
          </div>
        ) : (
          <ReservaWizard barberia={barberia} peluqueros={peluqueros} />
        )}
      </main>
    </div>
  )
}
