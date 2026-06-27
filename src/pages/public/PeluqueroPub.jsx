import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useBarberia } from '../../hooks/useBarberia'
import ReservaWizard from '../../components/ReservaWizard'
import Spinner from '../../components/Spinner'
import ErrorPublico from '../../components/ErrorPublico'
import BrandHeader from '../../components/BrandHeader'

export default function PeluqueroPub() {
  const { slug, peluquero_slug } = useParams()
  const { barberia, peluqueros, cargando, error } = useBarberia(slug)

  const peluquero = peluqueros.find((p) => p.slug === peluquero_slug)

  useEffect(() => {
    if (barberia?.nombre && peluquero?.nombre) {
      document.title = `${peluquero.nombre} en ${barberia.nombre} — Reservar | MiSillón`
    } else if (barberia?.nombre) {
      document.title = `${barberia.nombre} — Reservar turno | MiSillón`
    }
    return () => { document.title = 'MiSillón — Tu barbería sin citas perdidas' }
  }, [barberia?.nombre, peluquero?.nombre])

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

  if (!peluquero) {
    return <ErrorPublico mensaje="No encontramos a este peluquero o no está disponible." />
  }

  const estiloMarca = {
    '--brand-primary': barberia.color_primario || '#1a3a2e',
    '--brand-secondary': barberia.color_secundario || '#c9943a',
  }

  return (
    <div className="min-h-screen bg-surface" style={estiloMarca}>
      <BrandHeader barberia={barberia} peluquero={peluquero} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <ReservaWizard
          barberia={barberia}
          peluqueros={peluqueros}
          peluqueroInicial={peluquero.id}
        />
      </main>
    </div>
  )
}
