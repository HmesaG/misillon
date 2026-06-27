/**
 * Convierte un texto a slug válido: minúsculas, sin acentos,
 * solo letras, números y guiones.
 * @param {string} texto
 * @returns {string}
 */
export function slugify(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // quitar caracteres inválidos
    .replace(/\s+/g, '-') // espacios -> guiones
    .replace(/-+/g, '-') // colapsar guiones
    .replace(/^-+|-+$/g, '') // recortar guiones de los bordes
}

/** Valida que un slug tenga el formato correcto. */
export function slugValido(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
