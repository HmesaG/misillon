import { test, expect } from '@playwright/test'

/**
 * Smoke: página pública de reserva de una barbería (/:slug).
 *
 * El slug se toma de E2E_DEMO_SLUG (default 'el-rincon', el slug del seed demo).
 * Como al 2026-07-04 no hay garantía de que exista una barbería `aprobada` en
 * producción (el seed demo se movió a seeds-peligrosos), este smoke NO asume
 * que la barbería exista: verifica que la ruta pública monte SIN romper —
 * o bien renderiza la barbería (BrandHeader + wizard), o bien el estado de
 * error controlado (ErrorPublico). Lo que nunca debe pasar es una pantalla en
 * blanco / excepción de React no capturada / 500.
 */
const SLUG = process.env.E2E_DEMO_SLUG || 'el-rincon'

test.describe('Reserva pública', () => {
  test(`/:slug (${SLUG}) monta sin crash`, async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(String(e)))

    const resp = await page.goto(`/${SLUG}`)

    // La SPA de Vercel siempre sirve index.html con 200; un 5xx sería la app rota.
    expect(resp?.status(), 'La ruta pública no debe devolver 5xx').toBeLessThan(500)

    // Esperamos a que resuelva el estado de carga: o la barbería (BrandHeader,
    // que renderiza un <h1> con el nombre) o el estado de error controlado.
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })

    const errorControlado = page.getByRole('heading', {
      name: /Página no encontrada|Problema técnico|Algo no salió bien/,
    })
    const wizardOEmpty = page.getByText(/Elegí tu peluquero|Elegí tu servicio|Próximamente/i)

    // Debe verse UNO de los dos caminos válidos.
    const okBarberia = await wizardOEmpty
      .first()
      .isVisible()
      .catch(() => false)
    const okError = await errorControlado
      .first()
      .isVisible()
      .catch(() => false)

    expect(
      okBarberia || okError,
      'Ni el wizard/barbería ni el error controlado se renderizaron: posible crash.',
    ).toBeTruthy()

    // Sin excepciones no capturadas de React.
    expect(errores, `Errores de página en /${SLUG}:\n${errores.join('\n')}`).toHaveLength(0)
  })

  /**
   * Camino feliz completo (elegir peluquero + servicio, ver primer bloque del
   * wizard). Solo corre si E2E_DEMO_SLUG apunta a una barbería aprobada real
   * con al menos un peluquero activo. Se salta si no está seteado, para no
   * fallar cuando no hay data demo en producción.
   */
  test('el wizard permite elegir peluquero cuando la barbería tiene equipo', async ({ page }) => {
    test.skip(
      !process.env.E2E_DEMO_SLUG,
      'Sin E2E_DEMO_SLUG apuntando a una barbería aprobada real: no hay data demo garantizada.',
    )

    await page.goto(`/${SLUG}`)

    // BrandHeader visible.
    await expect(page.locator('header h1').first()).toBeVisible({ timeout: 15_000 })

    // Primer bloque del wizard: selección de peluquero o de servicio.
    const primerBloque = page.getByText(/Elegí tu peluquero|Elegí tu servicio/i)
    await expect(primerBloque.first()).toBeVisible()

    // NO completamos ni enviamos la reserva: evitamos crear datos en producción.
  })
})
