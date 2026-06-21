// ═══════════════════════════════════════════════════════════════════════════
//  b3dreel-record.mjs — يسجّل /b3dreel (مجسّم العمارة 3D الحقيقي) فيديو ٩:١٦ MP4
//  نظيف بلا أي علامة مائية. التايملاين زمني (setTimeout) فنسجّل حيّاً ثم نعيد
//  الترميز H.264 بمعدّل إطارات ثابت. الاستعمال: node scripts/b3dreel-record.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdir, rm, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const W = 1080, H = 1920
const DUR = Number(process.env.DUR || 16200)     // طول التايملاين الكامل + كشف
const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = resolve(process.cwd(), process.env.OUT || 'reels')
const TMP = resolve(process.cwd(), '.b3d-tmp')

let FFMPEG = 'ffmpeg'
try { FFMPEG = require('ffmpeg-static') || 'ffmpeg' } catch { /* نظام */ }

const ff = (args) => new Promise((res, rej) => {
  const p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''; p.stderr.on('data', d => err += d)
  p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c + '\n' + err.slice(-700))))
})

async function main() {
  await rm(TMP, { recursive: true, force: true })
  await mkdir(TMP, { recursive: true }); await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: W, height: H } },
  })
  const page = await ctx.newPage()
  console.log('▶ تسجيل /b3dreel ...')
  await page.goto(`${BASE}/b3dreel`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(DUR)
  await ctx.close()              // يُغلق ويحفظ الـwebm
  await browser.close()

  const webm = (await readdir(TMP)).find(f => f.endsWith('.webm'))
  if (!webm) throw new Error('ما انحفظ فيديو')
  const src = join(TMP, webm)
  const out = join(OUT, 'b3dreel.mp4')
  console.log('▶ إعادة ترميز H.264 ...')
  await ff(['-y', '-i', src,
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-movflags', '+faststart', '-an', out])
  await rm(TMP, { recursive: true, force: true })
  console.log('✓ تمّ:', out)
}
main().catch(e => { console.error('✗', e); process.exit(1) })
