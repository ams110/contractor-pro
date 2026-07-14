// ═══════════════════════════════════════════════════════════════════════════
//  board-shots.mjs — التقاط سلايدات كاروسيل «لوحة البراند» من /adboard
//  كل سلايد 1080×1920 (TikTok Photo Mode). + وضع overlay: هوك شفّاف PNG
//  للتركيب فوق فيديو سينمائي بـffmpeg.
//
//  الاستعمال:
//    npm run dev                        # السيرفر شغّال على :3000
//    node scripts/board-shots.mjs       # كل السلايدات → ads-board/slide-0N.png
//    OVERLAY=1 node scripts/board-shots.mjs   # هوك شفّاف → ads-board/hook-overlay.png
//
//  تخصيص: SLIDES=0,1,2  DPR=2  BASE=http://localhost:3000  OUT=ads-board
//          CHANNEL=chrome  أو  EXECUTABLE_PATH=/path/to/chrome
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const env = (k, d) => process.env[k] ?? d
const W = 1080, H = 1920

const SLIDES  = env('SLIDES', '0,1,2,3,4,5').split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
const DPR     = Number(env('DPR', 2))
const BASE    = env('BASE', 'http://localhost:3000')
const OUT     = resolve(process.cwd(), env('OUT', 'ads-board'))
const OVERLAY = !!process.env.OVERLAY

async function launch() {
  const channel = env('CHANNEL', 'chrome')
  const execPath = process.env.EXECUTABLE_PATH
  try {
    return await chromium.launch(execPath ? { executablePath: execPath } : { channel })
  } catch {
    console.warn('⚠️  تعذّر Chrome النظام — أحاول chromium المجمّع')
    return await chromium.launch()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await launch()
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  const page = await ctx.newPage()

  if (OVERLAY) {
    await page.goto(`${BASE}/adboard?overlay=1`, { waitUntil: 'networkidle' })
    await page.evaluate(() => { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent' })
    await page.waitForTimeout(1500)
    const path = resolve(OUT, 'hook-overlay.png')
    await page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } })
    console.log(`✅ overlay → ${path}  (${W * DPR}×${H * DPR}, شفّاف)`)
  } else {
    for (const i of SLIDES) {
      await page.goto(`${BASE}/adboard?slide=${i}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(4500) // صور + iframe الشاشة الحقيقية
      const path = resolve(OUT, `slide-${String(i + 1).padStart(2, '0')}.png`)
      await page.screenshot({ path, clip: { x: 0, y: 0, width: W, height: H } })
      console.log(`✅ slide ${i + 1} → ${path}  (${W * DPR}×${H * DPR})`)
    }
  }

  await browser.close()
}

main().catch(err => { console.error('❌', err); process.exit(1) })
