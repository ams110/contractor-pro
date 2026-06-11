// ═══════════════════════════════════════════════════════════════════════════
//  demo-shots.mjs — لقطات شاشة دعائية من داخل التطبيق (مسار /demoshot)
//  ببيانات وهمية متماسكة، بمقاس هاتف حقيقي ودقّة عالية.
//
//  الإعدادات المحفوظة (نفس اللي طلعت الصور النهائية):
//    • المقاس      : 412×915  (نسبة هاتف ~20:9 — لقطة شاشة وحدة، مش سكرول طويل)
//    • الدقّة       : deviceScaleFactor = 4   (1648×3660 بكسل فعلي)  ← أقصى جودة
//    • الصيغة      : png بدون ضغط (lossless)  |  أو jpeg جودة 95 لحجم أصغر
//    • الجهاز      : isMobile + hasTouch  (تخطيط الموبايل)
//    • الانتظار     : networkidle + 3s للأنميشن، ثم scrollTo(0) قبل اللقطة
//
//  الاستعمال:
//    npm run dev                      # في تيرمنال (لازم السيرفر شغّال على :3000)
//    node scripts/demo-shots.mjs      # بالإعدادات الافتراضية (أقصى جودة)
//
//  تخصيص عبر متغيّرات البيئة:
//    SCREENS=dashboard,expenses,workers,projects,workdays   # الشاشات المطلوبة
//    DPR=4            # الدقّة (2 / 3 / 4)
//    FORMAT=png       # png | jpeg
//    QUALITY=95       # جودة jpeg فقط
//    WIDTH=412 HEIGHT=915
//    BASE=http://localhost:3000
//    OUT=shots        # مجلّد الإخراج
//
//  مثال (نسخة خفيفة للمشاركة):
//    FORMAT=jpeg QUALITY=92 DPR=3 node scripts/demo-shots.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const env = (k, d) => process.env[k] ?? d

const SCREENS = env('SCREENS', 'dashboard,expenses,workers,projects,workdays')
  .split(',').map(s => s.trim()).filter(Boolean)
const DPR     = Number(env('DPR', 4))
const FORMAT  = env('FORMAT', 'png').toLowerCase()        // png | jpeg
const QUALITY = Number(env('QUALITY', 95))
const WIDTH   = Number(env('WIDTH', 412))
const HEIGHT  = Number(env('HEIGHT', 915))
const BASE    = env('BASE', 'http://localhost:3000')
const OUT     = resolve(process.cwd(), env('OUT', 'shots'))

// شاشات /demoshot المدعومة (انظر src/pages/DemoShot.jsx)
const VALID = ['dashboard', 'workers', 'workdays', 'finance', 'projects', 'expenses', 'payments', 'materials']
// ملاحظة: finance يعرض "تحميل..." بوضع الديمو (تبويب المحاسبة يطلب بيانات غير متوفّرة) — تجنّبها.

async function main() {
  const bad = SCREENS.filter(s => !VALID.includes(s))
  if (bad.length) console.warn(`⚠️  شاشات غير معروفة: ${bad.join(', ')} (المتاح: ${VALID.join(', ')})`)

  await mkdir(OUT, { recursive: true })

  // يفضّل Chrome النظام (channel) أو مسار مخصّص؛ ويرجع لـ chromium المجمّع عند الحاجة.
  // تخصيص: CHANNEL=chrome  أو  EXECUTABLE_PATH=/usr/bin/google-chrome-stable
  const channel = env('CHANNEL', 'chrome')
  const execPath = process.env.EXECUTABLE_PATH
  let browser
  try {
    browser = await chromium.launch(execPath ? { executablePath: execPath } : { channel })
  } catch {
    console.warn('⚠️  تعذّر تشغيل Chrome النظام — أحاول chromium المجمّع (قد يحتاج: npx playwright install chromium)')
    browser = await chromium.launch()
  }
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()

  let n = 0
  for (const screen of SCREENS) {
    n++
    const url = `${BASE}/demoshot?screen=${screen}`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)                 // استقرار حركات Framer Motion
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)

    const ext = FORMAT === 'jpeg' ? 'jpg' : 'png'
    const path = resolve(OUT, `shot-${n}-${screen}.${ext}`)
    await page.screenshot({
      path,
      type: FORMAT === 'jpeg' ? 'jpeg' : 'png',
      ...(FORMAT === 'jpeg' ? { quality: QUALITY } : {}),
      scale: 'device',                               // يحترم deviceScaleFactor
    })
    console.log(`✅ ${screen.padEnd(10)} → ${path}  (${WIDTH * DPR}×${HEIGHT * DPR})`)
  }

  await ctx.close()
  await browser.close()
  console.log(`\n🎉 ${n} لقطة في: ${OUT}`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
