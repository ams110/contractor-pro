---
name: landing-shots
description: التقاط سكرينشوتات وفيديوهات عالية الجودة لصفحة الهبوط (أو أي صفحة) بمتصفح حقيقي عبر Playwright MCP — ديسكتوب + موبايل + مشاهد السكرول المثبّتة + تسجيل فيديو سكرول سينمائي — وإرسالها للمحادثة. استعمله عند طلب "صوّرلي الصفحة/الموقع"، "خذ سكرينشوتات"، "سجّللي فيديو"، "شوفني كيف صارت"، أو للتحقق البصري قبل الدفع.
---

# Landing Shots — وصفة التصوير المعتمدة (صور + فيديو)

سكرينشوتات حقيقية من متصفح يشغّل الموقع فعلياً (مش رندرات). نفس الوصفة
المستعملة بكل لقطات تطوير صفحة الهبوط.

## 1) المتطلبات (مرة لكل جلسة)

- **بيئة العرض**: هوك بداية الجلسة ينشئ `.env.local` تلقائياً (قيم Supabase
  وهمية — بدونها الصفحة سوداء لأن `supabase.js` يرمي خطأ). إن لم يوجد:
  ```bash
  printf 'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=dummy-key-for-sandbox-preview\n' > .env.local
  ```
- **dev server** (تحقّق أولاً إن كان شغّالاً):
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ \
    || { (npm run dev > /tmp/dev.log 2>&1 &) ; sleep 5; }
  ```
- **متصفح Playwright MCP**: إذا فشل أول استدعاء بـ"Chromium distribution
  'chrome' is not found":
  ```bash
  npx playwright install chrome
  ```
  وإذا ظهر "Browser is already in use": احذف ملفات القفل
  `rm -f /root/.cache/ms-playwright-mcp/*/Singleton*` ثم أعد المحاولة.

## 2) القياسات والجودة المعتمدة

| الهدف | viewport |
|-------|----------|
| ديسكتوب | **1380×820** (أو 860) |
| موبايل | **412×915** (قياس Pixel 7 — نفس اختبارات E2E) |

- PNG (الافتراضي) — لا JPEG.
- الحفظ في `/tmp/shots/<اسم-واضح>.png` ثم الإرسال للمحادثة بأداة إرسال الملفات مع caption يشرح اللقطات.

## 3) التوقيت (أهم نقطة للجودة)

- بعد `goto`: انتظر **3.5–5 ثوانٍ** — شاشة الإقلاع BootIntro (~1.5s) +
  العدّادات (`useCountUp` ~1.3s) + نموّ المخططات لازم تخلص.
- وافق على لافتة الكوكيز أول مرة حتى ما تظهر باللقطات:
  ```js
  const btn = page.getByRole('button', { name: 'موافق' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
  ```
- بعد كل سكرول لمشهد: انتظر **~2–2.5 ثانية** (الـsprings تهدأ).

## 4) المشاهد المثبّتة (pinned scroll-story)

لتصوير مشهد معيّن من قسم مثبّت ارتفاعه N×100vh: احسب موضع السكرول كنسبة
من مدى القسم (مش من الصفحة):

```js
const sec = await page.evaluate(() => {
  const el = [...document.querySelectorAll('section')]
    .find(s => s.querySelector('#features'))   // أو أي مميِّز للقسم
  return { top: el.offsetTop, h: el.offsetHeight }
})
// f = 0 بداية المشهد، 0.5 منتصفه، 0.97 نهايته
await page.evaluate(({top,h,f,vh}) => window.scrollTo(0, top + (h - vh) * f),
  { ...sec, f: 0.5, vh: 820 })
```

## 5) قالب جاهز (batch بـ browser_run_code_unsafe)

```js
async (page) => {
  await page.setViewportSize({ width: 1380, height: 820 })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const btn = page.getByRole('button', { name: 'موافق' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
  await page.screenshot({ path: '/tmp/shots/hero.png' })
  // أقسام أخرى: scrollIntoView على عنوانها ثم انتظار ثم لقطة
  await page.evaluate(() => [...document.querySelectorAll('h2')]
    .find(h => h.textContent.includes('الأسعار'))?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(2200)
  await page.screenshot({ path: '/tmp/shots/pricing.png' })
  // موبايل
  await page.setViewportSize({ width: 412, height: 915 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/shots/hero-mobile.png' })
  return 'ok'
}
```

## 6) تسجيل فيديو (سكرول سينمائي مسجَّل)

اللقطات الثابتة ما بتنقل الانميشن — لعرض حركات السكرول سجّل فيديو حقيقي.
Playwright يسجّل عبر context جديد بـ`recordVideo` (الملف يُكتب عند إغلاق
الـcontext):

```js
async (page) => {
  const browser = page.context().browser()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/vid', size: { width: 1280, height: 800 } },
  })
  const p = await ctx.newPage()
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4500)                       // الإقلاع + العدّادات
  const btn = p.getByRole('button', { name: 'موافق' })
  if (await btn.isVisible().catch(() => false)) await btn.click()
  // سكرول ناعم عبر كامل الصفحة (~12 ثانية، easeInOut)
  await p.evaluate(() => new Promise(res => {
    const total = document.body.scrollHeight - innerHeight
    const t0 = performance.now(), dur = 12000
    ;(function tick(t){
      const k = Math.min(1, (t - t0) / dur)
      const e = k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2
      scrollTo(0, total * e)
      k < 1 ? requestAnimationFrame(tick) : res()
    })(performance.now())
  }))
  await p.waitForTimeout(800)
  await ctx.close()                                  // يكتب ملف الـwebm
  return 'recorded'
}
```

- **للموبايل**: نفس القالب بـ`viewport/size` = 412×915.
- **التحويل لـmp4** (أنسب للواتساب والمعاينة — يحتاج ffmpeg، انظر سكيل media):
  ```bash
  f=$(ls -t /tmp/vid/*.webm | head -1)
  ffmpeg -y -v error -i "$f" -c:v libx264 -pix_fmt yuv420p -movflags +faststart /tmp/vid/landing.mp4
  ```
- أرسل الملف بأداة إرسال الملفات مع caption، ثم نظّف `/tmp/vid`.
- ⚠️ الساندبوكس يرندر برمجياً (SwiftShader بلا GPU) — سلاسة الفيديو
  المسجَّل أقل من الواقع؛ اذكر هالملاحظة عند الإرسال.

## 7) ملاحظات

- أخطاء الكونسول التالية **بيئية ومتوقّعة** بالساندبوكس — تجاهلها:
  `fonts.googleapis.com … ERR_CERT_AUTHORITY_INVALID` وأي تحذير Supabase.
- صفحات أخرى بنفس الوصفة: `/pricing`، `/welcome`، `/login`،
  `/?portal` (بوّابة العامل).
- للتحقق البصري قبل أي push: صوّر ديسكتوب + موبايل على الأقل للهيرو
  وللقسم المتغيّر.
- **وسائط مرفوعة من المستخدم** (ريلز/تصاميم مرجعية)؟ هذا اختصاص سكيل
  `media` (قراءة الصور + استخراج كادرات الفيديو بـffmpeg).
- سجلّ نسخ صفحة الهبوط المحفوظة بتاريخ الفرع `claude/landing-page-3d-animation-kfar8n`:
  المدينة الحيّة `b8a0ab7` · الفوضى→النظام `7986143` · المخطط الهندسي
  `6f9006e` · الهجينة `09ab2df` · التطبيق نفسه حيّاً `e2908d3`.
