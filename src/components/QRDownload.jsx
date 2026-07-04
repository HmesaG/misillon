import { useEffect, useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { generateQR, descargarQR, pngDataUrlToFile } from '../utils/qr'

/**
 * Muestra un QR a partir de una URL y ofrece descarga en PNG y SVG.
 * En navegadores móviles con soporte de Web Share API, ofrece además
 * "Compartir" para enviar el QR directo por WhatsApp/Mensajes/etc.
 * @param {{ url: string, nombreArchivo?: string, titulo?: string }} props
 */
export default function QRDownload({ url, nombreArchivo = 'qr-misillon', titulo }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)
  const [compartiendo, setCompartiendo] = useState(false)
  const puedeCompartir = typeof navigator !== 'undefined' && !!navigator.share

  useEffect(() => {
    let activo = true
    if (!url) return
    setQr(null)
    setError(null)
    generateQR(url)
      .then((res) => activo && setQr(res))
      .catch(() => activo && setError('No pudimos generar el QR.'))
    return () => {
      activo = false
    }
  }, [url])

  async function compartir() {
    if (!qr) return
    setCompartiendo(true)
    try {
      const file = await pngDataUrlToFile(qr.png, nombreArchivo)
      const datos = { files: [file], title: titulo || 'Mi QR — MiSillón', text: url }
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share(datos)
      } else {
        await navigator.share({ title: datos.title, text: url, url })
      }
    } catch {
      // El usuario canceló el share o el navegador lo rechazó: no es un error a mostrar.
    } finally {
      setCompartiendo(false)
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {titulo && <p className="text-sm font-semibold text-ink">{titulo}</p>}
      <div className="w-48 h-48 bg-white rounded-2xl border border-line flex items-center justify-center p-3">
        {qr ? (
          <img src={qr.png} alt={`Código QR: ${url}`} className="w-full h-full" />
        ) : (
          <Loader2 className="animate-spin text-primary" size={24} />
        )}
      </div>
      <p className="text-xs text-ink-muted break-all text-center max-w-xs">{url}</p>
      {qr && (
        <div className="flex flex-col items-center gap-3 w-full">
          {puedeCompartir && (
            <button
              type="button"
              onClick={compartir}
              disabled={compartiendo}
              className="inline-flex items-center justify-center gap-2 bg-accent text-primary-dark font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-accent-dark transition-colors disabled:opacity-60 w-full"
            >
              {compartiendo ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Share2 size={16} strokeWidth={2} />
              )}
              Enviar a un cliente
            </button>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => descargarQR(qr.png, nombreArchivo, 'png')}
              className="inline-flex items-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-5 py-2.5 rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              <Download size={16} strokeWidth={2} />
              PNG
            </button>
            <button
              type="button"
              onClick={() => descargarQR(qr.svg, nombreArchivo, 'svg')}
              className="inline-flex items-center gap-2 border border-line bg-surface text-ink font-semibold text-sm px-5 py-2.5 rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              <Download size={16} strokeWidth={2} />
              SVG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
