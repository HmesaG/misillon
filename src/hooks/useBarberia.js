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

      const { data: barb, error: errBarb } = await supabase
        .from('barberias')
        .select('*')
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
        setError('Esta barbería no existe o el enlace es incorrecto.')
        setErrorTipo('no_encontrada')
        setCargando(false)
        return
      }

      const { data: pelus } = await supabase
        .from('peluqueros')
        .select('id, slug, nombre, foto_url, whatsapp')
        .eq('barberia_id', barb.id)
        .order('nombre')

      if (!activo) return

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
