import { LifeBuoy } from 'lucide-react'
import { buildSoporteWALink } from '../../utils/whatsapp'

/**
 * Botón flotante y discreto para contactar a soporte de MiSillón por WhatsApp.
 * Se monta en los paneles autenticados (dueño/peluquero/independiente), no en /admin.
 * @param {{ contexto: string }} props
 */
export default function BotonSoporte({ contexto }) {
  return (
    <a
      href={buildSoporteWALink({ contexto })}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar a soporte por WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-11 h-11 flex items-center justify-center rounded-full bg-accent text-primary-dark shadow-md opacity-80 hover:opacity-100 hover:bg-accent-dark active:scale-[0.98] transition-all"
    >
      <LifeBuoy size={18} strokeWidth={1.75} />
    </a>
  )
}
