import { test, expect } from '@playwright/test'

// ─── صفحة الهبوط (Landing) ────────────────────────────────────────────────────
// ملاحظة: شاشة الإقلاع (BootIntro) تظهر ~1.5 ثانية أول زيارة بالجلسة —
// انتظارات Playwright التلقائية تتكفّل بها (الأزرار غير قابلة للنقر تحتها).
test.describe('صفحة الهبوط', () => {
  test('تفتح وتعرض العنوان الرئيسي والأزرار', async ({ page }) => {
    await page.goto('/')

    // العنوان الرئيسي في الـ Hero
    await expect(page.getByRole('heading', { level: 1 })).toContainText('محفوظ. مش في دماغك.')

    // أزرار navbar للزائر غير المسجّل — على الموبايل داخل قائمة البرغر
    const burger = page.getByRole('button', { name: 'القائمة' })
    if (await burger.isVisible()) await burger.click()
    await expect(page.locator('button:visible', { hasText: /^تسجيل الدخول$/ }).first()).toBeVisible()
    await expect(page.locator('button:visible', { hasText: /^ابدأ مجاناً$/ }).first()).toBeVisible()
    if (await burger.isVisible()) await burger.click()   // سكّر القائمة

    // CTA الرئيسي
    await expect(page.getByRole('button', { name: /جرّب مجاناً 14 يوم/ })).toBeVisible()
  })

  test('شريط الإحصائيات يعرض البطاقات', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('3 لغات', { exact: true })).toBeVisible()
    await expect(page.getByText('عربي · عبري · إنجليزي')).toBeVisible()
    await expect(page.getByText('تجربة مجانية بلا بطاقة')).toBeVisible()
  })

  test('زر "شاهد كيف يعمل" ينزل لقسم المميزات', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'شاهد كيف يعمل' }).click()
    // المشهد المثبّت يصير ظاهراً بعد الـ scroll (عنوان المشاهد)
    await expect(page.getByRole('heading', { name: /في شاشة واحدة/ })).toBeInViewport()
  })
})
