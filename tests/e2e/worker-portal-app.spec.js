import { test, expect } from '@playwright/test'

// ─── بوّابة العامل = تطبيق منفصل ────────────────────────────────────────────────
// العامل ينزّل «بوّابة العامل» كتطبيق مستقل: وثيقة `worker.html` على المسار
// `/worker`، بـmanifest وأيقونة وscope خاصّين. الاختبار يثبّت العزل: ما في أي
// رابط manifest لتطبيق المالك بوثيقة العامل، والروابط القديمة (`?portal`/
// `?worker`) تُحوَّل للمسار الجديد بدل ما تهبط على تطبيق المالك.

const portalLogin = (page) => page.getByRole('button', { name: 'دخول' })

test.describe('تطبيق بوّابة العامل المنفصل', () => {
  test('/worker يفتح البوّابة بوثيقتها وmanifest خاصّها', async ({ page }) => {
    await page.goto('/worker')

    await expect(page).toHaveTitle(/بوّابة العامل/)
    await expect(portalLogin(page)).toBeVisible()

    // manifest واحد فقط — وهو manifest البوّابة (لا manifest المالك)
    const manifests = await page.locator('link[rel="manifest"]').evaluateAll(
      els => els.map(e => e.getAttribute('href'))
    )
    expect(manifests).toEqual(['/worker.webmanifest'])

    // أيقونة iOS خاصة بالبوّابة (كي لا تتشابه مع تطبيق المالك على الشاشة الرئيسية)
    await expect(page.locator('link[rel="apple-touch-icon"]').first())
      .toHaveAttribute('href', /worker-apple-touch-icon\.png/)
  })

  test('manifest البوّابة معزول بـstart_url وscope خاصّين', async ({ page }) => {
    await page.goto('/worker')
    const m = await page.evaluate(async () => (await fetch('/worker.webmanifest')).json())

    expect(m.start_url).toBe('/worker')
    expect(m.scope).toBe('/worker')          // لا يشمل تطبيق المالك
    expect(m.name).toContain('بوّابة العامل')
    // أيقونات البوّابة فقط — أي `pwa-*.png` هنا يعني تسرّب أيقونة المالك
    for (const icon of m.icons) expect(icon.src).toMatch(/^\/worker-/)
    // maskable لازم تكون من عائلة البوّابة كذلك
    expect(m.icons.some(i => i.purpose === 'maskable')).toBe(true)
  })

  test('الروابط القديمة ?portal / ?worker تُحوَّل إلى /worker', async ({ page }) => {
    for (const legacy of ['/?portal', '/?worker']) {
      await page.goto(legacy)
      await expect(page).toHaveURL(/\/worker$/)
      await expect(page).toHaveTitle(/بوّابة العامل/)
      await expect(portalLogin(page)).toBeVisible()
    }
  })

  test('الرابط القديم يحافظ على باقي الـquery (مثل ?lang=he)', async ({ page }) => {
    await page.goto('/?portal&lang=he')
    await expect(page).toHaveURL(/\/worker\?lang=he$/)
  })

  // ملاحظة: رابط manifest المالك يُحقن **وقت البناء** (vite-plugin-pwa)، فما بيكون
  // موجوداً على خادم التطوير. لذلك نثبّت هنا الشرط الصالح بالحالتين: وثيقة المالك
  // ما بتحمل أبداً manifest البوّابة ولا محتواها.
  test('وثيقة المالك ما فيها manifest البوّابة', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"][href*="worker"]')).toHaveCount(0)
    await expect(page).not.toHaveTitle(/بوّابة العامل/)
  })
})
