import { test, expect } from '@playwright/test'

/**
 * Smoke: pantalla de login.
 *
 * Objetivo: que /login monte sin crash y exponga los puntos de entrada de auth
 * (Google OAuth, contraseña, OTP). No prueba un login real salvo que existan
 * credenciales demo seteadas por entorno.
 */
test.describe('Login', () => {
  test('la pantalla de login renderiza sus elementos clave', async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(String(e)))

    await page.goto('/login')

    // Encabezado del hero
    await expect(page.getByRole('heading', { name: '¡Bienvenido de vuelta!' })).toBeVisible()

    // Botón de Google OAuth
    await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible()

    // Campos de credenciales
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Entrar/ })).toBeVisible()

    // Link a login por código OTP
    await expect(page.getByRole('link', { name: /código de 6 dígitos/i })).toBeVisible()

    // No debe haber excepciones no capturadas de React
    expect(errores, `Errores de página en /login:\n${errores.join('\n')}`).toHaveLength(0)
  })

  /**
   * Login real con credenciales demo. Solo corre si están seteadas
   * E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD (ver .env.test.example).
   *
   * NOTA: al 2026-07-04 las cuentas demo históricas (dueno@elrincon.com /
   * martin@elrincon.com) fueron borradas de auth.users (BUG 6A cerrado) y el
   * seed demo se movió a supabase/seeds-peligrosos sin re-aplicar. No hay una
   * cuenta demo confiable en producción, así que este test queda en skip
   * hasta que se provisione una cuenta de prueba dedicada.
   */
  test('login real con credenciales demo', async ({ page }) => {
    const email = process.env.E2E_DEMO_EMAIL
    const password = process.env.E2E_DEMO_PASSWORD
    test.skip(
      !email || !password,
      'Sin E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD: falta provisionar una cuenta demo en producción.',
    )

    await page.goto('/login')
    await page.locator('#email').fill(email!)
    await page.locator('#password').fill(password!)
    await page.getByRole('button', { name: /^Entrar/ }).click()

    // Tras login correcto, useAuth redirige a algún /panel/* o /admin.
    await page.waitForURL(/\/(panel\/|admin)/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(panel\/|admin)/)
  })
})
