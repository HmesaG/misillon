import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { generateQR, descargarQR } from '../utils/qr'

/**
 * Muestra un QR a partir de una URL y ofrece descarga en PNG y SVG.
 * @param {{ url: string, nombreArchivo?: string, titulo?: string }} props
 */
export default function QRDownload({ url, nombreArchivo = 'qr-misillon', titulo }) {
  const [qr, setQr] = useState(null)
  const [error, setError] = useState(null)

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
      )}
    </div>
  )
}
