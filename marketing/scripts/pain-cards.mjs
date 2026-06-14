// بطاقات "وجع←حل": 3 هوكات + 3 حلول سفلية + CTA مصغّر
import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')
const W = 1080, H = 1920
const C = { bg:'#07080F', card:'#12152A', primary:'#F97316', success:'#22C55E', accent:'#EF4444', text:'#F8FAFC', textDim:'#94A3B8' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const glow = (color,x,y,s=700)=>`<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(25px)"></div>`
const base = (inner, opaque=true)=>`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque?`background:${C.bg}`:'background:transparent'};font-family:'Noto Sans Arabic';color:${C.text};position:relative;display:flex;flex-direction:column}
.kufi{font-family:'Noto Kufi Arabic'}</style></head><body>${inner}</body></html>`

// هوك: سؤال وجع كبير + توهّج أحمر
const hook = (line1, line2) => base(`
${glow('rgba(239,68,68,.28)','top:-140px','inset-inline-end:-160px',760)}
${glow('rgba(249,115,22,.20)','bottom:-180px','inset-inline-start:-180px',720)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;padding:0 90px;text-align:center;position:relative;z-index:2">
  <div style="width:130px;height:130px;border-radius:50%;border:4px solid ${C.accent};display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:900;color:${C.accent};box-shadow:0 0 60px rgba(239,68,68,.4)" class="kufi">؟</div>
  <div class="kufi" style="font-weight:900;font-size:118px;line-height:1.14;letter-spacing:-0.04em">${line1}<br><span style="color:${C.accent}">${line2}</span></div>
</div>`)

// حل سفلي (أخضر success + ✓)
const sol = (line, sub) => base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:600px;
  background:linear-gradient(to top, rgba(7,8,15,.97) 18%, rgba(7,8,15,.85) 52%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:24px;padding:0 80px 150px;z-index:2">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:64px;height:64px;border-radius:50%;background:${C.success}22;border:2px solid ${C.success};display:flex;align-items:center;justify-content:center;flex:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="${C.success}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:34px;height:34px"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="kufi" style="font-weight:900;font-size:72px;line-height:1.1;letter-spacing:-0.03em">${line}</div>
  </div>
  <div style="font-size:42px;color:${C.textDim};font-weight:600;padding-inline-start:84px">${sub}</div>
</div>`, false)

// CTA مصغّر
const cta = base(`
${glow('rgba(249,115,22,.30)','top:50%','inset-inline-start:50%;transform:translate(-50%,-50%)',800)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;position:relative;z-index:2">
  <div style="display:flex;align-items:center;gap:18px">
    <div style="width:96px;height:96px;border-radius:25px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center">${HARDHAT}</div>
    <div class="kufi" style="font-weight:900;font-size:54px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div>
  </div>
  <div style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:52px;padding:34px 78px;border-radius:26px;box-shadow:0 18px 50px rgba(249,115,22,.5)" class="kufi">جرّبه مجّاناً</div>
</div>`)

const cards = {
  hook_advance: hook('نسيت مين', 'أخد سلفة؟'),
  hook_profit:  hook('ربحت ولا', 'خسرت هالشهر؟'),
  hook_vat:     hook('الضرايب', 'بتوجع راسك؟'),
  sol_advance: sol('كل سلفة محفوظة', 'مين أخد · كم · إيمتى — لكل عامل'),
  sol_profit:  sol('ربح كل مشروع لحظياً', 'نبض مصلحتك: إيراد · تكلفة · هامش'),
  sol_vat:     sol('الضريبة بتتحسب لحالها', 'מע"מ · ضريبة دخل · ביטוח לאומي'),
  cta_mini: cta,
}
const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil:'networkidle' }); await page.waitForTimeout(250)
  await page.screenshot({ path: resolve(OUT, `pc-${name}.png`), omitBackground: name.startsWith('sol_') })
  console.log(`✅ pc-${name}.png`)
}
await browser.close()
