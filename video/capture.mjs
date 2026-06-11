// التقاط إطارات حتمي من إعلان الـHTML: نوقف كل الأنميشن ونزحلق الساعة لكل لحظة.
// النتيجة: 450 إطار (15ث × 30fps) بدقّة 1080×1920 (عنصر .stage 360×640 @ DSR3).
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2] || '../docs/ad/cp_15s_ad.html'
const FILE = 'file://' + path.resolve(__dir, SRC)
const FPS = 30, DUR = 15, OUT = path.resolve(__dir, process.argv[3] || 'frames')

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
  // تحكّم محكم: نضبط currentTime لكل أنميشن مباشرةً ونجمّده (بلا اعتماد على animation-delay).
  await page.evaluate((ms) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms }
  }, t * 1000)
  await stage.screenshot({ path: path.join(OUT, `f${String(i).padStart(4, '0')}.png`) })
  if (i % 60 === 0) process.stdout.write(`  frame ${i}/${N}\n`)
}
await browser.close()
console.log(`done: ${N} frames -> ${OUT}`)
