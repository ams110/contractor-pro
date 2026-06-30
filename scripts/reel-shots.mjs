// ═══════════════════════════════════════════════════════════════════════════
//  reel-shots.mjs — توليد فيديوهات ريلز ٩:١٦ (MP4) من محرّك AdReel (/adreel)
//  كل ريل = هوك متحرّك + موبايل بشاشة حقيقية + CTA، بكابشن محروق للمشاهدة بلا صوت.
//
//  وضعان:
//   • seek (افتراضي، الأنعم): يضبط زمن التايملاين لكل إطار (window.__seekTo) ويلتقط
//     لقطة لكل إطار، ثم ffmpeg يجمّعها بمعدّل إطارات ثابت → حركة ناعمة تماماً بلا تقطيع.
//   • record (MODE=record): يسجّل الصفحة حيّاً عبر Playwright (أسرع لكن قد يتقطّع).
//
//  الاستعمال:
//    npm run dev                      # السيرفر شغّال على :3000
//    node scripts/reel-shots.mjs      # أفضل الأفكار → MP4 (وضع seek)
//
//  تخصيص عبر متغيّرات البيئة:
//    IDEAS=4,34,3,31,30,1,37   # أرقام الأفكار — انظر IDEAS في AdStudio.jsx
//    DUR=11000   FPS=30   CRF=18   SETTLE=4500   MODE=seek|record
//    BASE=http://localhost:3000   OUT=reels
//    CHANNEL=chrome  أو  EXECUTABLE_PATH=/path/to/chrome
// ═══════════════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdir, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const env = (k, d) => process.env[k] ?? d

const W = 1080, H = 1920
const IDEAS  = env('IDEAS', '4,34,3,31,30,1,37').split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
const DUR    = Number(env('DUR', 11000))
const FPS    = Number(env('FPS', 30))
const CRF    = Number(env('CRF', 18))
const SETTLE = Number(env('SETTLE', 4500))     // مهلة استقرار الشاشة داخل الموبايل
const MODE   = env('MODE', 'seek')
const BASE   = env('BASE', 'http://localhost:3000')
const LANG   = env('LANG', '')            // '' = عربي (افتراضي) · he = ريل عبري (IDEAS_HE + شاشة עברية)
const OUT    = resolve(process.cwd(), env('OUT', LANG ? `reels-${LANG}` : 'reels'))
const TMP    = resolve(process.cwd(), '.reel-tmp')

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

async function launch() {
  const channel = env('CHANNEL', 'chrome')
  const execPath = process.env.EXECUTABLE_PATH
  try {
    return await chromium.launch(execPath ? { executablePath: execPath } : { channel })
  } catch {
    console.warn('⚠️  تعذّر Chrome النظام — أحاول chromium المجمّع (قد يحتاج: npx playwright install chromium)')
    return await chromium.launch()
  }
}

// ─── وضع seek: التقاط فريم-بفريم (الأنعم) ─────────────────────────────────────
async function captureSeek(browser, id) {
  const frames = Math.round(FPS * DUR / 1000)
  const fdir = join(TMP, 'f' + id)
  await mkdir(fdir, { recursive: true })

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  if (LANG) await ctx.addInitScript((l) => { try { localStorage.setItem('cp_lang', l) } catch (e) {} }, LANG)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/adreel?idea=${id}&dur=${DUR}&seek=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'networkidle' })
  // ننتظر وجود الدالة نفسها (لا مجرّد __seekReady) — StrictMode/HMR قد يمسحها لحظياً
  // بعد ضبط العَلَم، فالاعتماد على العَلَم وحده يسبّب "window.__seekTo is not a function".
  const seekReady = () => page.waitForFunction(() => typeof window.__seekTo === 'function', { timeout: 20000 })
  await seekReady()
  await page.waitForTimeout(SETTLE)   // دع شاشة الموبايل (عدّادات/مخططات/سكرول) تستقرّ
  await seekReady()                    // تأكّد ثانية بعد الاستقرار (قد يكون أُعيد التحميل)

  for (let f = 0; f < frames; f++) {
    const ms = (f / FPS) * 1000
    // حارس: لو غابت الدالة لإطار (إعادة تحميل عابرة) لا نرمي — نعيد الانتظار ونكمل
    const ok = await page.evaluate(t => { if (typeof window.__seekTo === 'function') { window.__seekTo(t); return true } return false }, ms)
    if (!ok) { await seekReady(); await page.evaluate(t => window.__seekTo(t), ms) }
    // انتظر تثبيت React + رسمة الإطار (rAF مزدوج)
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.screenshot({ path: join(fdir, String(f).padStart(5, '0') + '.png'), clip: { x: 0, y: 0, width: W, height: H } })
  }
  await ctx.close()

  const out = resolve(OUT, `reel-${String(id).padStart(2, '0')}.mp4`)
  await ffmpeg([
    '-y', '-framerate', String(FPS), '-i', join(fdir, '%05d.png'),
    '-vf', 'format=yuv420p', '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF),
    '-movflags', '+faststart', '-an', out,
  ])
  await rm(fdir, { recursive: true, force: true })
  return out
}

// ─── وضع record: تسجيل حيّ (احتياطي) ─────────────────────────────────────────
async function captureRecord(browser, id) {
  const vdir = join(TMP, 'v' + id)
  await mkdir(vdir, { recursive: true })
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1,
    recordVideo: { dir: vdir, size: { width: W, height: H } },
  })
  if (LANG) await ctx.addInitScript((l) => { try { localStorage.setItem('cp_lang', l) } catch (e) {} }, LANG)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/adreel?idea=${id}&dur=${DUR}${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded' })
  try { await page.waitForFunction(() => window.__reelDone === true, { timeout: DUR + 10000 }) } catch {}
  await page.waitForTimeout(400)
  const video = page.video()
  await ctx.close()
  const webm = video ? await video.path() : null
  if (!webm) throw new Error('no video for idea ' + id)

  const tail = DUR / 1000 - 0.2
  const out = resolve(OUT, `reel-${String(id).padStart(2, '0')}.mp4`)
  await ffmpeg([
    '-y', '-sseof', String(-tail), '-i', webm,
    '-vf', `scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(CRF),
    '-movflags', '+faststart', '-an', out,
  ])
  return out
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await rm(TMP, { recursive: true, force: true })
  await mkdir(TMP, { recursive: true })

  const browser = await launch()
  let count = 0
  for (const id of IDEAS) {
    const out = MODE === 'record' ? await captureRecord(browser, id) : await captureSeek(browser, id)
    count++
    console.log(`✅ idea ${String(id).padStart(2, '0')} → ${out}`)
  }
  await browser.close()
  await rm(TMP, { recursive: true, force: true })
  console.log(`\n🎬 ${count} ريل في: ${OUT}  (${MODE}, ${FPS}fps)`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
