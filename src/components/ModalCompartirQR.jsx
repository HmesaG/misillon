import { X } from 'lucide-react'
import QRDownload from './QRDownload'

export default function ModalCompartirQR({ url, nombreArchivo, onCerrar }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-ink">Compartir QR</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-ink-muted transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <QRDownload url={url} nombreArchivo={nombreArchivo} />
      </div>
    </div>
  )
}
