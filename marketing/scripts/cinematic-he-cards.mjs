// بطاقات أوفرلاي شفافة (1080×1920) للإعلان السينمائي العبري — تُحرق فوق فوتيج Higgsfield بـffmpeg
// עברית מדוברת · مناطق تيك توك الآمنة (أعلى 130 / أسفل 480 / يمين 140) · هوية التطبيق (C/GRAD)
// الاستعمال: node marketing/scripts/cinematic-he-cards.mjs   → promo-frames/he-cine-*.png
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'promo-frames')
const W = 1080, H = 1920

const C = {
  primary: '#F97316', success: '#22C55E', text: '#F8FAFC', textDim: '#CBD5E1',
}
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const GRAD_SUCCESS = 'linear-gradient(135deg, #22C55E, #06B6D4)'

const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:58%;height:58%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/>
<path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`

// قماش شفاف — النص بظلّ قوي + سكريم ناعم خلفه ليقرأ فوق أي فوتيج
const base = (inner) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@600;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
body{font-family:'Noto Sans Hebrew',sans-serif;color:${C.text};position:relative}
.shadow{text-shadow:0 4px 28px rgba(0,0,0,.85), 0 2px 8px rgba(0,0,0,.9)}
.scrim{position:absolute;inset-inline:0;background:radial-gradient(60% 100% at 50% 50%, rgba(0,0,0,.42), transparent 75%)}
</style></head><body>${inner}</body></html>`

const cards = {}

// 1) الهوك (0–3.2ث): بني بناية كاملة.
cards['he-cine-hook'] = base(`
<div class="scrim" style="top:270px;height:560px"></div>
<div style="position:absolute;top:340px;inset-inline:100px;text-align:center">
  <div class="shadow" style="font-weight:900;font-size:118px;line-height:1.14;letter-spacing:-0.03em">בנית<br>בניין שלם.</div>
</div>`)

// 2) الانعطافة (3.2–6.6ث): ليش المصلحة لسا على ورق؟
cards['he-cine-turn'] = base(`
<div class="scrim" style="top:250px;height:640px"></div>
<div style="position:absolute;top:330px;inset-inline:90px;text-align:center">
  <div class="shadow" style="font-weight:900;font-size:96px;line-height:1.2;letter-spacing:-0.03em">
    אז למה העסק שלך<br>עדיין מתנהל
    <span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none">על נייר?</span>
  </div>
</div>`)

// 3) الـCTA (6.4–10ث): كبلان + جرّب مجاناً — فوق منطقة الأمان السفلية (480px)
cards['he-cine-cta'] = base(`
<div class="scrim" style="top:220px;height:700px"></div>
<div style="position:absolute;top:300px;inset-inline:90px;display:flex;flex-direction:column;align-items:center;gap:44px;text-align:center">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:110px;height:110px;border-radius:30px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center;box-shadow:0 16px 44px rgba(249,115,22,.55)">${HARDHAT}</div>
    <div style="text-align:right">
      <div class="shadow" style="font-weight:900;font-size:64px;letter-spacing:-0.02em">כבלאן</div>
      <div class="shadow" style="font-weight:600;font-size:30px;color:${C.textDim}">ניהול קבלנות מהנייד</div>
    </div>
  </div>
  <div class="shadow" style="font-weight:900;font-size:72px;line-height:1.22;letter-spacing:-0.02em">עובדים · שכר · מע"מ<br>הכול במקום אחד</div>
  <div style="display:inline-flex;align-items:center;gap:16px;padding:28px 54px;border-radius:26px;background:${GRAD_SUCCESS};box-shadow:0 18px 48px rgba(34,197,94,.45)">
    <span style="font-weight:900;font-size:44px;color:#062b14">נסה 14 יום חינם ←</span>
  </div>
  <div class="shadow" style="font-weight:800;font-size:36px;color:${C.text}">✦ הקישור בביו</div>
</div>`)

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.EXECUTABLE_PATH || undefined, channel: process.env.EXECUTABLE_PATH ? undefined : 'chrome' }).catch(() => chromium.launch())
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage()
  for (const [name, html] of Object.entries(cards)) {
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    await page.screenshot({ path: resolve(OUT, `${name}.png`), omitBackground: true })
    console.log('✅', name)
  }
  await browser.close()
}
main().catch(e => { console.error('❌', e); process.exit(1) })
