// ═══════════════════════════════════════════════════════════════════════════
//  reel-shots.mjs — توليد فيديوهات ريلز ٩:١٦ (MP4) من محرّك AdReel (/adreel)
//  كل ريل = هوك متحرّك + موبايل بشاشة حقيقية + CTA، بكابشن محروق للمشاهدة بلا صوت.
//
//  الآلية: Playwright يسجّل الصفحة (WebM) ثم ffmpeg يحوّلها MP4 (H.264, 30fps).
//
//  الاستعمال:
//    npm run dev                      # السيرفر شغّال على :3000
//    node scripts/reel-shots.mjs      # أفضل الأفكار → MP4
//
//  تخصيص عبر متغيّرات البيئة:
//    IDEAS=4,34,3,31,30,1,37   # أرقام الأفكار (0..N) — انظر IDEAS في AdStudio.jsx
//    DUR=11000                 # مدّة كل ريل بالملّي ثانية
//    FPS=30                    # إطارات/ثانية للإخراج
//    CRF=19                    # جودة H.264 (أقل=أجود، 18–23 معقول)
//    TAIL=10.8                 # يأخذ آخر N ثانية من التسجيل (= طول التايملاين الفعلي)
//    BASE=http://localhost:3000
//    OUT=reels                 # مجلّد الإخراج
//    CHANNEL=chrome  أو  EXECUTABLE_PATH=/path/to/chrome
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdir, rm, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const env = (k, d) => process.env[k] ?? d

const W = 1080, H = 1920
const IDEAS = env('IDEAS', '4,34,3,31,30,1,37').split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
const DUR   = Number(env('DUR', 11000))
const FPS   = Number(env('FPS', 30))
const CRF   = Number(env('CRF', 19))
const TAIL  = Number(env('TAIL', DUR / 1000 - 0.2))   // آخر N ثانية = التايملاين الفعلي
const BASE  = env('BASE', 'http://localhost:3000')
const OUT   = resolve(process.cwd(), env('OUT', 'reels'))
const TMP   = resolve(process.cwd(), '.reel-tmp')

// مسار ffmpeg: ffmpeg-static إن وُجد، وإلا ffmpeg النظام
let FFMPEG = 'ffmpeg'
try { FFMPEG = require('ffmpeg-static') || 'ffmpeg' } catch { /* النظام */ }

function ffmpeg(args) {
  return new Promise((res, rej) => {
    const p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', d => { err += d })
    p.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg ' + code + '\n' + err.slice(-800))))
  })
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await rm(TMP, { recursive: true, force: true })
  await mkdir(TMP, { recursive: true })

  const channel = env('CHANNEL', 'chrome')
  const execPath = process.env.EXECUTABLE_PATH
  let browser
  try {
    browser = await chromium.launch(execPath ? { executablePath: execPath } : { channel })
  } catch {
    console.warn('⚠️  تعذّر Chrome النظام — أحاول chromium المجمّع (قد يحتاج: npx playwright install chromium)')
    browser = await chromium.launch()
  }

  let count = 0
  for (const id of IDEAS) {
    const vdir = join(TMP, 'v' + id)
    await mkdir(vdir, { recursive: true })
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: 1,
      recordVideo: { dir: vdir, size: { width: W, height: H } },
    })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/adreel?idea=${id}&dur=${DUR}`, { waitUntil: 'domcontentloaded' })
    // انتظر انتهاء التايملاين (window.__reelDone) + هامش
    try {
      await page.waitForFunction(() => window.__reelDone === true, { timeout: DUR + 10000 })
    } catch {
      console.warn(`⚠️  لم يصل إشارة الانتهاء للفكرة ${id} — أكمل على أي حال`)
    }
    await page.waitForTimeout(400)
    const video = page.video()
    await ctx.close()                       // يفلش ملف الـ webm
    const webm = video ? await video.path() : null
    if (!webm) { console.warn(`⚠️  لا فيديو للفكرة ${id}`); continue }

    const out = resolve(OUT, `reel-${String(id).padStart(2, '0')}.mp4`)
    await ffmpeg([
      '-y', '-sseof', String(-TAIL), '-i', webm,
      '-vf', `scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF),
      '-movflags', '+faststart', '-an', out,
    ])
    count++
    console.log(`✅ idea ${String(id).padStart(2, '0')} → ${out}`)
  }

  await browser.close()
  await rm(TMP, { recursive: true, force: true })
  console.log(`\n🎬 ${count} ريل في: ${OUT}`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
