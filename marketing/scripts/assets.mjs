// خلفية مبرندة + قناع زوايا مدوّرة للموبايل
import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')

const SW = 720, SH = 1600, RAD = 52   // مقاس عرض الشاشة داخل الإطار + نصف قطر الزوايا

const bg = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden}
body{background:#07080F;position:relative}
.g{position:absolute;border-radius:50%;filter:blur(30px)}
</style></head><body>
<div class="g" style="top:-160px;inset-inline-end:-200px;width:820px;height:820px;background:radial-gradient(circle,rgba(249,115,22,.28),transparent 70%)"></div>
<div class="g" style="bottom:-200px;inset-inline-start:-220px;width:860px;height:860px;background:radial-gradient(circle,rgba(124,58,237,.22),transparent 70%)"></div>
<div class="g" style="top:40%;inset-inline-start:-260px;width:520px;height:520px;background:radial-gradient(circle,rgba(6,182,212,.12),transparent 70%)"></div>
</body></html>`

const mask = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0}html,body{width:${SW}px;height:${SH}px;overflow:hidden;background:transparent}
.r{width:${SW}px;height:${SH}px;background:#fff;border-radius:${RAD}px}
</style></head><body><div class="r"></div></body></html>`

const browser = await chromium.launch({ channel: 'chromium' }).catch(() => chromium.launch())
let ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
let page = await ctx.newPage()
await page.setContent(bg, { waitUntil: 'networkidle' }); await page.waitForTimeout(200)
await page.screenshot({ path: resolve(OUT, 'bg.png') })
console.log('✅ bg.png')
await ctx.close()

ctx = await browser.newContext({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 })
page = await ctx.newPage()
await page.setContent(mask, { waitUntil: 'networkidle' }); await page.waitForTimeout(200)
await page.screenshot({ path: resolve(OUT, 'screen-mask.png'), omitBackground: true })
console.log('✅ screen-mask.png')
await browser.close()
