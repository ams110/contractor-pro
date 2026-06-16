// بطاقات إعلان "وجع الرواتب ← حل": هوك (overlay على فيديو) + حل سفلي + CTA
// تُرندَر بالمتصفّح (تشكيل عربي سليم) وتُخرَج إلى marketing/promo-frames/
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const OUT = resolve(process.cwd(), 'marketing/promo-frames')
mkdirSync(OUT, { recursive: true })

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

// هوك شفّاف فوق الفيديو: سكرين علوي غامق + نص محروق كبير بالنص الأعلى (منطقة آمنة)
const hook = base(`
${glow('rgba(239,68,68,.30)','top:-120px','inset-inline-end:-160px',780)}
<div style="position:absolute;inset-inline:0;top:0;height:1020px;
  background:linear-gradient(to bottom, rgba(7,8,15,.92) 8%, rgba(7,8,15,.55) 48%, transparent);z-index:1"></div>
<div style="position:absolute;inset-inline:0;top:210px;display:flex;flex-direction:column;align-items:center;gap:42px;padding:0 80px;text-align:center;z-index:2">
  <div style="width:118px;height:118px;border-radius:50%;border:4px solid ${C.accent};display:flex;align-items:center;justify-content:center;font-size:74px;font-weight:900;color:${C.accent};box-shadow:0 0 60px rgba(239,68,68,.5)" class="kufi">؟</div>
  <div class="kufi" style="font-weight:900;font-size:112px;line-height:1.16;letter-spacing:-0.04em;text-shadow:0 6px 30px rgba(0,0,0,.85)">كل شهر تتلخبط<br><span style="color:${C.accent}">بحساب الرواتب؟</span></div>
</div>`, false)

// حل سفلي شفّاف (أخضر + ✓)
const sol = base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:680px;
  background:linear-gradient(to top, rgba(7,8,15,.98) 20%, rgba(7,8,15,.85) 54%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:26px;padding:0 80px 250px;z-index:2">
  <div style="display:flex;align-items:center;gap:22px">
    <div style="width:70px;height:70px;border-radius:50%;background:${C.success}22;border:2px solid ${C.success};display:flex;align-items:center;justify-content:center;flex:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="${C.success}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:38px;height:38px"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="kufi" style="font-weight:900;font-size:76px;line-height:1.1;letter-spacing:-0.03em">راتب كل عامل لحالو</div>
  </div>
  <div style="font-size:44px;color:${C.textDim};font-weight:600;padding-inline-start:92px">ساعات · سلف · خصومات — بدون غلطة</div>
</div>`, false)

// CTA: جرّب بدون تسجيل (متوافق مع قمع الديمو)
const cta = base(`
${glow('rgba(249,115,22,.32)','top:50%','inset-inline-start:50%;transform:translate(-50%,-50%)',840)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px;position:relative;z-index:2">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:100px;height:100px;border-radius:26px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center">${HARDHAT}</div>
    <div class="kufi" style="font-weight:900;font-size:56px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div>
  </div>
  <div style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:54px;padding:36px 80px;border-radius:28px;box-shadow:0 18px 50px rgba(249,115,22,.5)" class="kufi">جرّب بدون تسجيل</div>
  <div style="font-size:38px;color:${C.textDim};font-weight:600">الرابط بالبايو 👆</div>
</div>`)

const cards = { 'sal-hook': hook, 'sal-sol': sol, 'sal-cta': cta }

const browser = await chromium.launch({ channel:'chromium' })
  .catch(()=>chromium.launch({ channel:'chrome' }))
  .catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil:'networkidle' }); await page.waitForTimeout(300)
  await page.screenshot({ path: resolve(OUT, `${name}.png`), omitBackground: name !== 'sal-cta' })
  console.log(`✅ ${name}.png`)
}
await browser.close()
