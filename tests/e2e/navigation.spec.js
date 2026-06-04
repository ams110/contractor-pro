import { test, expect } from '@playwright/test'

// ─── التنقّل بين الصفحات (client-side routing) ─────────────────────────────────
test.describe('التنقّل بين الصفحات', () => {
  test('"تسجيل الدخول" يفتح شاشة الدخول', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

    await expect(page).toHaveURL(/\/login$/)
    // شاشة الدخول تعرض الشعار وتبويبات صاحب الحساب / عضو فريق
    await expect(page.getByRole('button', { name: 'صاحب الحساب' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'عضو فريق' })).toBeVisible()
  })

  test('"ابدأ مجاناً" يفتح شاشة إنشاء الحساب', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'ابدأ مجاناً' }).first().click()

    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByText('إنشاء حساب جديد')).toBeVisible()
    await expect(page.getByPlaceholder('اسمك الكامل')).toBeVisible()
  })

  test('"الأسعار" يفتح صفحة الأسعار', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'الأسعار', exact: true }).click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('فتح /login مباشرة يعرض الشاشة الصحيحة', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Contractor Pro')).toBeVisible()
  })
})
