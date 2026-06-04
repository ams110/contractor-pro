import { test, expect } from '@playwright/test'

// ─── صفحة الهبوط (Landing) ────────────────────────────────────────────────────
test.describe('صفحة الهبوط', () => {
  test('تفتح وتعرض العنوان الرئيسي والأزرار', async ({ page }) => {
    await page.goto('/')

    // العنوان الرئيسي في الـ Hero
    await expect(page.getByRole('heading', { level: 1 })).toContainText('محفوظ. مش في دماغك.')

    // أزرار navbar للزائر غير المسجّل
    await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ابدأ مجاناً' }).first()).toBeVisible()

    // CTA الرئيسي
    await expect(page.getByRole('button', { name: /جرّب مجاناً 14 يوم/ })).toBeVisible()
  })

  test('شريط الإحصائيات يعرض الأرقام', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('+200', { exact: true })).toBeVisible()
    await expect(page.getByText('مقاول نشط')).toBeVisible()
  })

  test('زر "شاهد كيف يعمل" ينزل لقسم المميزات', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'شاهد كيف يعمل' }).click()
    // قسم المميزات يصير ظاهر بعد الـ scroll
    await expect(page.getByRole('heading', { name: /في شاشة واحدة/ })).toBeInViewport()
  })
})
