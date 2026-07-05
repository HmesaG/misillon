import { defineConfig, devices } from '@playwright/test'

/**
 * Config de smoke tests E2E de MiSillón.
 *
 * baseURL se toma de PLAYWRIGHT_BASE_URL. Por defecto apunta a producción
 * (https://misillon.vercel.app) para poder correr un smoke sin levantar nada.
 * Para correr contra local: PLAYWRIGHT_BASE_URL=http://localhost:5173 (con
 * `npm run dev` en otra terminal).
 *
 * Credenciales de tests (opcionales) — solo se usan si están seteadas, si no
 * los tests que las requieren se saltan (test.skip). NUNCA hardcodear
 * credenciales reales acá; van en un `.env.test` fuera de git o en el entorno.
 * Ver `.env.test.example`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://misillon.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
