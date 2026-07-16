import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { supabase, mensajeError } from '../lib/supabase'
import { slugify, slugValido } from '../utils/slug'
import { Campo, BotonPrimario, BotonSecundario, Alerta, inputClase, Modal } from './panel/ui'
import BotonCopiar from './BotonCopiar'

/**
 * Modal para crear o editar una barbería desde el panel admin.
 * @param {object} props
 * @param {'crear'|'editar'} props.modo
 * @param {object|null} [props.barberia]  datos actuales (modo editar)
 * @param {() => void} props.onCerrar
 * @param {() => void} props.onGuardado   refresca la lista en el padre
 */
export default function ModalBarberia({ modo, barberia, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: barberia?.nombre || '',
    slug: barberia?.slug || '',
    tipo_negocio: barberia?.tipo_negocio || 'equipo',
    contacto: barberia?.contacto || '',
    descripcion: barberia?.descripcion || '',
    direccion: barberia?.direccion || '',
    dueno_email: '',
    estado: barberia?.estado || 'pendiente',
  })
  // En edición el slug ya está definido por el usuario; no lo autogeneramos.
  const [slugTocado, setSlugTocado] = useState(modo === 'editar')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null) // { qr_url }

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  function onNombre(v) {
    set('nombre', v)
    if (!slugTocado) set('slug', slugify(v))
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.slug.trim()) {
      setError('Nombre y enlace (slug) son obligatorios.')
      return
    }
    const slug = form.slug.trim()
    if (!slugValido(slug)) {
      setError('El enlace (slug) solo admite minúsculas, números y guiones, sin acentos ni espacios.')
      return
    }
    setError(null)
    setGuardando(true)
    // Flags para permitir vaciar descripción/dirección desde el modal (BUG 35A):
    // si el campo quedó vacío, se lo limpia en la BD en vez de dejarlo intacto.
    const descripcionVacia = !form.descripcion.trim()
    const direccionVacia = !form.direccion.trim()
    try {
      if (modo === 'crear') {
        const { data, error: err } = await supabase.rpc('admin_crear_barberia', {
          nombre: form.nombre.trim(),
          slug,
          tipo_negocio: form.tipo_negocio,
          contacto: form.contacto.trim(),
          descripcion: descripcionVacia ? null : form.descripcion.trim(),
          direccion: direccionVacia ? null : form.direccion.trim(),
          dueno_email: form.dueno_email.trim() || null,
        })
        if (err) throw err
        onGuardado()
        setExito({ qr_url: data?.qr_url })
      } else {
        const { error: err } = await supabase.rpc('admin_editar_barberia', {
          barberia_id: barberia.id,
          nombre: form.nombre.trim(),
          slug,
          contacto: form.contacto.trim(),
          descripcion: descripcionVacia ? null : form.descripcion.trim(),
          direccion: direccionVacia ? null : form.direccion.trim(),
          estado: form.estado,
          limpiar_descripcion: descripcionVacia,
          limpiar_direccion: direccionVacia,
        })
        if (err) throw err
        onGuardado()
        onCerrar()
      }
    } catch (err) {
      setError(mensajeError(err, 'No pudimos guardar el negocio.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={modo === 'crear' ? 'Nuevo negocio' : 'Editar negocio'}
      onCerrar={onCerrar}
      ancho="max-w-lg"
    >
      {exito ? (
        <div className="text-center">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} strokeWidth={1.75} className="text-primary" />
          </div>
          <p className="font-bold text-ink mb-1">Negocio creado</p>
          <p className="text-sm text-ink-muted mb-4">El QR ya está disponible.</p>
          {exito.qr_url && (
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-4">
              <span className="text-xs text-ink-muted truncate flex-1 text-left">{exito.qr_url}</span>
              <BotonCopiar
                texto={exito.qr_url}
                soloIcono
                compacto
                ariaLabel="Copiar enlace del QR"
                className="hover:bg-white"
              />
            </div>
          )}
          <BotonPrimario onClick={onCerrar} className="w-full">
            Listo
          </BotonPrimario>
        </div>
      ) : (
        <form onSubmit={guardar} className="space-y-4">
            <Campo label="Nombre">
              <input
                type="text"
                className={inputClase}
                value={form.nombre}
                onChange={(e) => onNombre(e.target.value)}
                required
              />
            </Campo>

            <Campo label="Enlace (slug)" hint="Aparece en la URL pública: misillon.com/tu-slug">
              <input
                type="text"
                className={inputClase}
                value={form.slug}
                onChange={(e) => {
                  setSlugTocado(true)
                  set('slug', e.target.value)
                }}
                required
              />
            </Campo>

            {modo === 'crear' && (
              <Campo label="Tipo de negocio">
                <select
                  className={inputClase}
                  value={form.tipo_negocio}
                  onChange={(e) => set('tipo_negocio', e.target.value)}
                >
                  <option value="equipo">Equipo (dueño + profesionales)</option>
                  <option value="independiente">Independiente</option>
                </select>
              </Campo>
            )}

            <Campo label="Contacto WhatsApp">
              <input
                type="tel"
                className={inputClase}
                value={form.contacto}
                onChange={(e) => set('contacto', e.target.value)}
                placeholder="8095551234"
              />
            </Campo>

            <Campo label="Descripción (opcional)">
              <textarea
                className={`${inputClase} min-h-[80px]`}
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
              />
            </Campo>

            <Campo label="Dirección (opcional)">
              <input
                type="text"
                className={inputClase}
                value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
              />
            </Campo>

            {modo === 'crear' ? (
              <Campo label="Email del dueño (opcional)" hint="Vincula el negocio a un usuario existente.">
                <input
                  type="email"
                  className={inputClase}
                  value={form.dueno_email}
                  onChange={(e) => set('dueno_email', e.target.value)}
                />
              </Campo>
            ) : (
              <Campo label="Estado">
                <select
                  className={inputClase}
                  value={form.estado}
                  onChange={(e) => set('estado', e.target.value)}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </Campo>
            )}

            {error && <Alerta tipo="error">{error}</Alerta>}

            <div className="flex gap-2 pt-2">
              <BotonSecundario type="button" onClick={onCerrar}>
                Cancelar
              </BotonSecundario>
              <BotonPrimario type="submit" disabled={guardando} className="flex-1">
                {guardando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : modo === 'crear' ? (
                  'Crear'
                ) : (
                  'Guardar'
                )}
              </BotonPrimario>
            </div>
          </form>
      )}
    </Modal>
  )
}
