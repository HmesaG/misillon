import { useEffect, useState, useCallback } from 'react'
import { supabasePublic as supabase } from '../lib/supabase'

export function useBarberia(slug) {
  const [barberia, setBarberia] = useState(null)
  const [peluqueros, setPeluqueros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [errorTipo, setErrorTipo] = useState(null) // 'no_encontrada' | 'error_red'
  const [errorDetalle, setErrorDetalle] = useState(null) // raw Supabase error
  const [intento, setIntento] = useState(0)

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    let activo = true
    if (!slug) return

    async function cargar() {
      setCargando(true)
      setError(null)
      setErrorTipo(null)
      setErrorDetalle(null)

      // Columnas explícitas (migración 048): `anon` ya no tiene SELECT de
      // tabla completa sobre `barberias` (column-level GRANT, mismo patrón
      // que BUG 31A con `peluqueros`). Ampliar esta lista si se agrega un
      // campo público nuevo Y su GRANT correspondiente en la migración.
      const { data: barb, error: errBarb } = await supabase
        .from('barberias')
        .select('id, nombre, slug, descripcion, direccion, contacto, logo_url, color_primario, color_secundario, rubro_principal_id, rubro_secundario_id')
        .eq('slug', slug)
        .maybeSingle()

      if (!activo) return

      if (errBarb) {
        setError('Tuvimos un problema técnico. Intentá de nuevo en unos minutos.')
        setErrorTipo('error_red')
        setErrorDetalle(`${errBarb.code ?? ''} ${errBarb.message ?? ''} (status: ${errBarb.status ?? '?'})`.trim())
        setCargando(false)
        return
      }

      if (!barb) {
        setError('Este negocio no existe o el enlace es incorrecto.')
        setErrorTipo('no_encontrada')
        setCargando(false)
        return
      }

      const { data: pelus, error: errPelu } = await supabase
        .from('peluqueros')
        .select('id, slug, nombre, foto_url, whatsapp')
        .eq('barberia_id', barb.id)
        .order('nombre')

      if (!activo) return

      if (errPelu) {
        setError('No pudimos cargar los profesionales de este negocio. Intentá de nuevo.')
        setErrorTipo('error_red')
        setErrorDetalle(`${errPelu.code ?? ''} ${errPelu.message ?? ''} (status: ${errPelu.status ?? '?'})`.trim())
        setCargando(false)
        return
      }

      setBarberia(barb)
      setPeluqueros(pelus || [])
      setCargando(false)
    }

    cargar()
    return () => {
      activo = false
    }
  }, [slug, intento])

  return { barberia, peluqueros, cargando, error, errorTipo, errorDetalle, recargar }
}
