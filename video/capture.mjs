// التقاط إطارات حتمي من إعلان الـHTML: نوقف كل الأنميشن ونزحلق الساعة لكل لحظة.
// النتيجة: 450 إطار (15ث × 30fps) بدقّة 1080×1920 (عنصر .stage 360×640 @ DSR3).
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const FILE = 'file://' + path.resolve(__dir, '../docs/ad/cp_15s_ad.html')
const FPS = 30, DUR = 15, OUT = path.resolve(__dir, 'frames')

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 820, height: 720 } })
await page.goto(FILE, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(400)

// إخفاء الشرح + إلغاء استدارة الإطار (مستطيل كامل للفيديو)
await page.addStyleTag({ content: `.hint{display:none!important} .stage{border-radius:0!important}` })

const stage = await page.$('.stage')
const N = FPS * DUR
for (let i = 0; i < N; i++) {
  const t = i / FPS
  // زحلقة كل الأنميشن للحظة t وتجميدها (animation-delay سالب + paused)
  await page.evaluate((tt) => {
    let s = document.getElementById('seek')
    if (!s) { s = document.createElement('style'); s.id = 'seek'; document.head.appendChild(s) }
    s.textContent = `*{animation-play-state:paused!important;animation-delay:-${tt}s!important}`
  }, t)
  await stage.screenshot({ path: path.join(OUT, `f${String(i).padStart(4, '0')}.png`) })
  if (i % 60 === 0) process.stdout.write(`  frame ${i}/${N}\n`)
}
await browser.close()
console.log(`done: ${N} frames -> ${OUT}`)
