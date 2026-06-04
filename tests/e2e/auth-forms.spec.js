import { test, expect } from '@playwright/test'

// ─── فورمات تسجيل الدخول وإنشاء الحساب ─────────────────────────────────────────
// هاي الاختبارات client-side بس (تحقق + تنقّل) — ما بتلمس الباكند.
test.describe('فورم تسجيل الدخول', () => {
  test('يعرض حقول البريد وكلمة المرور لصاحب الحساب', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible()
  })

  test('زر إظهار/إخفاء كلمة المرور يبدّل نوع الحقل', async ({ page }) => {
    await page.goto('/login')
    const pass = page.getByPlaceholder('••••••••')
    await pass.fill('mysecret')
    await expect(pass).toHaveAttribute('type', 'password')
    // زر العين بجانب الحقل
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last().click()
    await expect(pass).toHaveAttribute('type', 'text')
  })

  test('"نسيت كلمة المرور؟" يفتح نافذة الاسترداد', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'نسيت كلمة المرور؟' }).click()
    await expect(page.getByText('استرداد كلمة المرور')).toBeVisible()
  })

  test('التبديل لعضو فريق يعرض حقل كود العضو', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'عضو فريق' }).click()
    await expect(page.getByPlaceholder('TEAM-XXXX')).toBeVisible()
  })

  test('مبدّل اللغة يحوّل الواجهة للإنجليزية', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Account Owner' })).toBeVisible()
  })
})

test.describe('فورم إنشاء الحساب', () => {
  test('كلمة مرور أقل من 8 أحرف تُظهر خطأ', async ({ page }) => {
    await page.goto('/register')
    await page.getByPlaceholder('اسمك الكامل').fill('أحمد المقاول')
    await page.getByPlaceholder('example@email.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('123')
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click()

    await expect(page.getByText('كلمة المرور 8 أحرف على الأقل')).toBeVisible()
  })

  test('"تسجيل الدخول" من شاشة التسجيل يرجّع لفورم الدخول', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await expect(page.getByRole('button', { name: 'صاحب الحساب' })).toBeVisible()
  })
})
