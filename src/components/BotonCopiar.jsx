import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * Botón de "click para copiar" con feedback visual (ícono + texto cambian a
 * Check/"Copiado" por 2s). Nunca usa alert()/confirm() — el feedback es 100%
 * visual, según las reglas del proyecto.
 *
 * @param {object} props
 * @param {string} props.texto        Texto a copiar al portapapeles.
 * @param {string} [props.label]      Texto del botón en reposo. Default "Copiar".
 * @param {string} [props.ariaLabel]  aria-label descriptivo. Default se arma con `label`.
 * @param {boolean} [props.soloIcono] Si true, oculta el texto y deja solo el ícono
 *                                    (para espacios angostos, ej. filas con URL truncada).
 * @param {boolean} [props.compacto] Si true, reduce el área táctil a 32×32 (por debajo
 *                                    del mínimo de 44px recomendado). Reservado para
 *                                    contextos ya densos con precedente propio (ej. fila
 *                                    de URL truncada dentro de un modal angosto) donde
 *                                    44px rompería el layout — no usar por default.
 * @param {string} [props.className]  Clases extra para ajustar estilo por consumidor.
 */
export default function BotonCopiar({
  texto,
  label = 'Copiar',
  ariaLabel,
  soloIcono = false,
  compacto = false,
  className = '',
}) {
  const [copiado, setCopiado] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function copiar() {
    if (!texto) return
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopiado(false), 2000)
    })
  }

  const textoBoton = copiado ? 'Copiado' : label

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={ariaLabel || `${textoBoton} ${texto || ''}`.trim()}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
        compacto ? 'h-8 w-8' : soloIcono ? 'min-h-11 w-11' : 'min-h-11 px-3'
      } ${
        copiado
          ? 'text-primary'
          : 'text-ink-muted hover:text-primary hover:bg-muted'
      } ${className}`}
    >
      {copiado ? (
        <Check size={compacto ? 15 : 17} strokeWidth={compacto ? 2 : 1.75} />
      ) : (
        <Copy size={compacto ? 15 : 17} strokeWidth={compacto ? 2 : 1.75} />
      )}
      {!soloIcono && <span>{textoBoton}</span>}
    </button>
  )
}
