import { test, expect } from '@playwright/test'

/**
 * Smoke: panel autenticado (dueño / peluquero / independiente).
 *
 * Requiere credenciales demo (E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD). Como al
 * 2026-07-04 NO existe una cuenta demo confiable en producción (las históricas
 * dueno@elrincon.com / martin@elrincon.com fueron borradas — BUG 6A — y el seed
 * demo se movió a seeds-peligrosos sin re-aplicar), este test queda en skip
 * hasta que se provisione una cuenta de prueba dedicada y sus credenciales se
 * seteen por entorno.
 *
 * Para habilitarlo:
 *   1. Crear una cuenta de barbería/peluquero de prueba en producción (o en un
 *      entorno de staging apuntado por PLAYWRIGHT_BASE_URL).
 *   2. Setear E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD (ver .env.test.example).
 */
test.describe('Panel autenticado', () => {
  test('el panel carga tras login demo (sidebar/drawer + sección de reservas)', async ({ page }) => {
    const email = process.env.E2E_DEMO_EMAIL
    const password = process.env.E2E_DEMO_PASSWORD
    test.skip(
      !email || !password,
      'Sin E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD: falta provisionar una cuenta demo en producción.',
    )

    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(String(e)))

    await page.goto('/login')
    await page.locator('#email').fill(email!)
    await page.locator('#password').fill(password!)
    await page.getByRole('button', { name: /^Entrar/ }).click()

    // useAuth redirige al panel según rol.
    await page.waitForURL(/\/(panel\/|admin)/, { timeout: 15_000 })

    // El shell del panel (Layout) debe montar: nav de navegación visible.
    await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 10_000 })

    // Alguna referencia a reservas/agenda en la navegación del panel.
    await expect(
      page.getByText(/Reservas|Agenda|Mis reservas/i).first(),
    ).toBeVisible({ timeout: 10_000 })

    expect(errores, `Errores de página en el panel:\n${errores.join('\n')}`).toHaveLength(0)
  })
})
