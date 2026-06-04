import { defineConfig, devices } from '@playwright/test'

// ─── Playwright E2E config ────────────────────────────────────────────────────
// التطبيق موبايل-فيرست RTL، فالاختبارات تعمل افتراضياً على viewport موبايل.
// الـ webServer يشغّل Vite dev server تلقائياً قبل الاختبارات (port 3000).
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  // كل ملف اختبار يعمل بالتوازي
  fullyParallel: true,
  // امنع .only المنسي في الـ CI
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'ar',
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // شغّل dev server تلقائياً — إلا إذا كان E2E_BASE_URL مضبوط على سيرفر خارجي
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
