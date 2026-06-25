// رندرة كباشن عربية شفافة + بطاقة CTA للريل (1080×1920) عبر Playwright/Chromium.
import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = process.argv[2] || '.'
const W = 1080, H = 1920
const C = { bg:'#07080F', primary:'#F97316', success:'#22C55E', accent:'#EF4444', text:'#F8FAFC', textDim:'#CBD5E1' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const glow = (color,x,y,s=700)=>`<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(25px)"></div>`
const base = (inner, opaque=false)=>`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque?`background:${C.bg}`:'background:transparent'};font-family:'Noto Sans Arabic';color:${C.text};position:relative}
.kufi{font-family:'Noto Kufi Arabic'} .sh{text-shadow:0 4px 24px rgba(0,0,0,.85),0 2px 8px rgba(0,0,0,.9)}
</style></head><body>${inner}</body></html>`

// كابشن الألم — أعلى (فوق المساحة الغامقة)، رقم أحمر بارز
const capPain = base(`
<div style="position:absolute;inset-inline:0;top:150px;display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 70px;text-align:center">
  <div class="kufi sh" style="font-weight:900;font-size:84px;line-height:1.16;letter-spacing:-0.03em">كل شهر بتخسر</div>
  <div class="kufi sh" style="font-weight:900;font-size:150px;line-height:1;color:${C.accent};text-shadow:0 0 50px rgba(239,68,68,.55)">₪3000</div>
  <div class="kufi sh" style="font-weight:800;font-size:62px;line-height:1.2;letter-spacing:-0.02em">وما بتدري وين راحت</div>
</div>`)

// كابشن الحل — أسفل (فوق منطقة أزرار تيك توك الآمنة ~480px)
const capSol = base(`
<div style="position:absolute;inset-inline:0;bottom:520px;display:flex;flex-direction:column;align-items:center;gap:16px;padding:0 70px;text-align:center">
  <div style="display:flex;align-items:center;gap:18px">
    <div style="width:70px;height:70px;border-radius:50%;background:${C.success}26;border:3px solid ${C.success};display:flex;align-items:center;justify-content:center;flex:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="${C.success}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="width:38px;height:38px"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <div class="kufi sh" style="font-weight:900;font-size:80px;line-height:1.1;letter-spacing:-0.03em">شوف كل قرش وين راح</div>
  </div>
  <div class="sh" style="font-size:50px;color:${C.text};font-weight:700">بثانية — من تلفونك 📱</div>
</div>`)

// بطاقة CTA كاملة (معتمة)
const cta = base(`
${glow('rgba(249,115,22,.32)','top:50%','inset-inline-start:50%;transform:translate(-50%,-50%)',860)}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;z-index:2;padding:0 80px;text-align:center">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:110px;height:110px;border-radius:28px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center">${HARDHAT}</div>
    <div class="kufi" style="font-weight:900;font-size:64px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div>
  </div>
  <div class="kufi" style="font-weight:800;font-size:58px;line-height:1.25">نظّم مصلحتك<br>ونام مرتاح</div>
  <div class="kufi" style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:58px;padding:36px 90px;border-radius:30px;box-shadow:0 18px 50px rgba(249,115,22,.55)">جرّبه مجّاناً</div>
  <div style="font-size:46px;color:${C.textDim};font-weight:700">الرابط بالبايو ⬆️</div>
</div>`, true)

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXE, args:['--no-sandbox'] }).catch(()=>chromium.launch())
const page = await browser.newPage({ viewport:{ width:W, height:H }, deviceScaleFactor:1 })
const shots = { 'cap-pain':capPain, 'cap-sol':capSol, 'cta':cta }
for (const [name, html] of Object.entries(shots)) {
  await page.setContent(html, { waitUntil:'networkidle' })
  await page.waitForTimeout(250)
  await page.screenshot({ path:`${OUT}/${name}.png`, omitBackground: name!=='cta' })
  console.log('rendered', name)
}
await browser.close()
