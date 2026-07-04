import QRCode from 'qrcode'

const OPTS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 512,
  color: {
    dark: '#2c1a0e',
    light: '#ffffff',
  },
}

/**
 * Genera un QR para una URL en formato PNG (dataURL) y SVG (string).
 * @param {string} url
 * @returns {Promise<{ png: string, svg: string }>}
 */
export async function generateQR(url) {
  if (!url) throw new Error('URL requerida para generar el QR')
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(url, OPTS),
    QRCode.toString(url, { ...OPTS, type: 'svg' }),
  ])
  return { png, svg }
}

/**
 * Dispara la descarga de un dataURL/string como archivo.
 * @param {string} contenido  dataURL (png) o string (svg)
 * @param {string} nombreArchivo
 * @param {'png'|'svg'} formato
 */
export function descargarQR(contenido, nombreArchivo, formato) {
  let href = contenido
  if (formato === 'svg') {
    const blob = new Blob([contenido], { type: 'image/svg+xml' })
    href = URL.createObjectURL(blob)
  }
  const a = document.createElement('a')
  a.href = href
  a.download = `${nombreArchivo}.${formato}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (formato === 'svg') URL.revokeObjectURL(href)
}

/**
 * Convierte un dataURL PNG en un File, para pasarlo a navigator.share().
 * @param {string} dataUrl
 * @param {string} nombreArchivo  sin extensión
 * @returns {Promise<File>}
 */
export async function pngDataUrlToFile(dataUrl, nombreArchivo) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], `${nombreArchivo}.png`, { type: 'image/png' })
}
