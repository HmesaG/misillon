import { useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { generateQR } from '../../../utils/qr'
import { Card, SeccionTitulo } from '../ui'
import QRDownload from '../../QRDownload'

const APP_URL = import.meta.env.VITE_APP_URL || 'https://misillon.com'

/**
 * QR general de la barbería (URL /:slug). Persiste el PNG en barberias.qr_url
 * cuando el slug cambió respecto al último guardado.
 * @param {{ barberia: object }} props
 */
export default function QRGeneral({ barberia }) {
  const url = `${APP_URL}/${barberia.slug}`

  // Si todavía no hay qr_url guardado, lo generamos y persistimos una vez.
  useEffect(() => {
    let activo = true
    if (barberia.qr_url) return
    generateQR(url).then(async ({ png }) => {
      if (!activo) return
      await supabase.from('barberias').update({ qr_url: png }).eq('id', barberia.id)
    })
    return () => {
      activo = false
    }
  }, [url, barberia.id, barberia.qr_url])

  return (
    <Card>
      <SeccionTitulo
        titulo="QR general"
        descripcion="Imprimilo y pegalo en tu local. Lleva a la página de reservas de tu barbería."
      />
      <QRDownload url={url} nombreArchivo={`qr-${barberia.slug}`} />
    </Card>
  )
}
