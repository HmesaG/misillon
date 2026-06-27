import { Card, SeccionTitulo } from '../ui'
import QRDownload from '../../QRDownload'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/**
 * QR individual del peluquero (URL /:slug/:peluquero_slug).
 * @param {{ barberiaSlug: string, peluqueroSlug: string }} props
 */
export default function MiQR({ barberiaSlug, peluqueroSlug }) {
  const url = `${APP_URL}/${barberiaSlug}/${peluqueroSlug}`
  return (
    <Card>
      <SeccionTitulo
        titulo="Mi QR"
        descripcion="Compartilo con tus clientes. Lleva directo a tu página de reservas."
      />
      <QRDownload url={url} nombreArchivo={`qr-${peluqueroSlug}`} />
    </Card>
  )
}
