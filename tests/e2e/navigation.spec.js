import { test, expect } from '@playwright/test'

// زر الـnavbar: على الموبايل (≤640px) الأزرار داخل قائمة برغر — نفتحها أولاً،
// وننقر النسخة المرئية فقط (نسخة الديسكتوب تبقى بالـDOM مخفيّة بـCSS).
async function clickNav(page, label) {
  const burger = page.getByRole('button', { name: 'القائمة' })
  if (await burger.isVisible()) await burger.click()
  await page.locator('button:visible', { hasText: new RegExp(`^${label}$`) }).first().click()
}

// ─── التنقّل بين الصفحات (client-side routing) ─────────────────────────────────
test.describe('التنقّل بين الصفحات', () => {
  test('"تسجيل الدخول" يفتح شاشة الدخول', async ({ page }) => {
    await page.goto('/')
    await clickNav(page, 'تسجيل الدخول')

    await expect(page).toHaveURL(/\/login$/)
    // شاشة الدخول تعرض الشعار وتبويبات صاحب الحساب / عضو فريق
    await expect(page.getByRole('button', { name: 'صاحب الحساب' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'عضو فريق' })).toBeVisible()
  })

  test('"ابدأ مجاناً" يفتح شاشة إنشاء الحساب', async ({ page }) => {
    await page.goto('/')
    await clickNav(page, 'ابدأ مجاناً')

    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByText('إنشاء حساب جديد')).toBeVisible()
    await expect(page.getByPlaceholder('اسمك الكامل')).toBeVisible()
  })

  test('"الأسعار" يفتح صفحة الأسعار', async ({ page }) => {
    await page.goto('/')
    await clickNav(page, 'الأسعار')
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('فتح /login مباشرة يعرض الشاشة الصحيحة', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('كبلان')).toBeVisible()
  })
})
