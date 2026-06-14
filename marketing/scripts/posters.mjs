// كاروسيل 5 شرائح 1080×1350 (4:5) للفيسبوك/إنستغرام — مع شاشات حقيقية
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
const OUT = resolve(process.cwd(), 'promo-frames')
const W = 1080, H = 1350
const C = { bg:'#07080F', primary:'#F97316', secondary:'#7C3AED', cyan:'#06B6D4', success:'#22C55E', text:'#F8FAFC', textDim:'#94A3B8' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const b64 = f => 'data:image/png;base64,' + readFileSync(resolve(OUT, f)).toString('base64')
const logo = (s=58) => `<div style="display:flex;align-items:center;gap:14px">
  <div style="width:${s}px;height:${s}px;border-radius:${s*0.26}px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center">${HARDHAT}</div>
  <div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:${s*0.5}px;letter-spacing:-0.03em;color:${C.text}">Contractor<span style="color:${C.primary}"> Pro</span></div></div>`
const glow=(c,x,y,s=600)=>`<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,${c},transparent 70%);filter:blur(25px)"></div>`
const phone = (img, accent) => `<div style="width:430px;height:660px;border-radius:42px;overflow:hidden;border:6px solid ${accent}55;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 60px ${accent}33;flex:none">
  <img src="${img}" style="width:100%;height:auto;display:block"></div>`
const base = inner => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:${C.bg};font-family:'Noto Sans Arabic';color:${C.text};position:relative}
.kufi{font-family:'Noto Kufi Arabic'}</style></head><body>${inner}</body></html>`

// شريحة محتوى (عنوان + هاتف)
const slide = (accent, tag, title, sub, img) => base(`
${glow(accent+'33','top:-120px','inset-inline-end:-140px',640)}
${glow('rgba(124,58,237,.18)','bottom:-160px','inset-inline-start:-160px',620)}
<div style="position:absolute;top:54px;inset-inline-start:60px;z-index:2">${logo(52)}</div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:140px 70px 70px;z-index:2">
  <div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
    <div style="background:${accent}1f;border:1.5px solid ${accent}55;color:${accent};font-weight:800;font-size:26px;padding:8px 22px;border-radius:30px" class="kufi">${tag}</div>
    <div class="kufi" style="font-weight:900;font-size:64px;line-height:1.12;letter-spacing:-0.03em">${title}</div>
    <div style="font-size:30px;color:${C.textDim};font-weight:600;max-width:760px">${sub}</div>
  </div>
  ${phone(img, accent)}
</div>`)

// غلاف
const cover = base(`
${glow('rgba(249,115,22,.30)','top:-100px','inset-inline-end:-120px',700)}
${glow('rgba(124,58,237,.22)','bottom:-160px','inset-inline-start:-160px',680)}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px;padding:0 80px;text-align:center;z-index:2">
  ${logo(120)}
  <div class="kufi" style="font-weight:900;font-size:92px;line-height:1.12;letter-spacing:-0.04em">إدارة مقاولاتك<br><span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">من جيبك</span></div>
  <div style="font-size:36px;color:${C.textDim};font-weight:600">مشاريع · عمّال · مالية · ضرائب — بمكان واحد</div>
  <div style="display:flex;align-items:center;gap:12px;color:${C.primary};font-weight:800;font-size:30px" class="kufi">اسحب لتشوف ←</div>
</div>`)

// CTA
const ctaSlide = base(`
${glow('rgba(249,115,22,.32)','top:50%','inset-inline-start:50%;transform:translate(-50%,-50%)',820)}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;padding:0 80px;text-align:center;z-index:2">
  ${logo(110)}
  <div class="kufi" style="font-weight:900;font-size:84px;line-height:1.14;letter-spacing:-0.03em">جرّبه مجّاناً<br>١٤ يوم</div>
  <div style="display:flex;flex-direction:column;gap:18px;font-size:32px;color:${C.text};font-weight:600">
    <div>✓ بدون بطاقة ائتمان</div><div>✓ عربي بالكامل</div><div>✓ يشتغل من الموبايل</div></div>
  <div style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:46px;padding:30px 70px;border-radius:24px;box-shadow:0 18px 50px rgba(249,115,22,.5)" class="kufi">حمّلو الآن</div>
</div>`)

const slides = {
  'p1-cover': cover,
  'p2-projects': slide(C.primary, 'المشاريع', 'كل مشاريعك وأرباحها', 'إيراد · تكلفة · هامش ربح لكل مشروع', b64('shot-2-projects.png')),
  'p3-workers': slide(C.secondary, 'العمّال', 'عمّالك ورواتبهم', 'أيام عمل · مستحقّات · سلف · لوحة شرف', b64('shot-3-workers.png')),
  'p4-finance': slide(C.cyan, 'المالية والضرائب', 'الضرايب بتتحسب لحالها', 'מע"מ · ضريبة دخل · ביטוח לאומي', b64('shot-5-expenses.png')),
  'p5-cta': ctaSlide,
}
const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:2 })
const page = await ctx.newPage()
for (const [n,h] of Object.entries(slides)) {
  await page.setContent(h,{waitUntil:'networkidle'}); await page.waitForTimeout(250)
  await page.screenshot({ path: resolve(OUT,`poster-${n}.png`) }); console.log('✅ poster-'+n)
}
await browser.close()
