// بطاقات دفعة 4 فيديوهات (#2 محاسب · #3 بوّابة العامل · #4 بلا نت · #5 מע"מ) — تشكيل عربي سليم
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'marketing/promo-frames/batch')
const W = 1080, H = 1920
const C = { bg:'#07080F', surface:'#0D0F1C', card:'#12152A', primary:'#F97316', secondary:'#7C3AED',
  gold:'#D97706', cyan:'#06B6D4', success:'#22C55E', accent:'#EF4444', text:'#F8FAFC', textDim:'#94A3B8' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const HEB_VAT = 'מע"מ' // מע"מ بحروف عبرية نقية

const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:58%;height:58%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/>
<path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const logo = (s=120) => `<div style="display:flex;align-items:center;gap:18px;justify-content:center">
  <div style="width:${s}px;height:${s}px;border-radius:${s*0.26}px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 40px rgba(249,115,22,.45)">${HARDHAT}</div>
  <div style="font-weight:900;font-size:${s*0.42}px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div></div>`
const glow = (color,x,y,s=600)=>`<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(20px)"></div>`
const base = (inner,opaque=true)=>`<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque?`background:${C.bg}`:'background:transparent'};font-family:'Noto Sans Arabic',sans-serif;color:${C.text};position:relative}
</style></head><body>${inner}</body></html>`

// هوك علوي شفّاف (فوق فيديو/صورة)
const topHook = (badge, badgeColor, lines) => base(`
<div style="position:absolute;inset-inline:0;top:170px;display:flex;flex-direction:column;align-items:center;gap:24px;padding:0 70px;text-align:center;z-index:3">
  <div style="background:${badgeColor};color:#fff;font-weight:900;font-size:40px;padding:16px 42px;border-radius:18px;box-shadow:0 14px 40px ${badgeColor}73">${badge}</div>
  <div style="font-weight:900;font-size:90px;line-height:1.14;letter-spacing:-0.04em;text-shadow:0 6px 30px rgba(0,0,0,.85)">${lines}</div>
</div>`, false)

// عنوان سفلي شفّاف مرفوع فوق شريط تيك توك
const lower = (line, sub, color=C.primary) => base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:760px;background:linear-gradient(to top, rgba(7,8,15,.98) 30%, rgba(7,8,15,.82) 60%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:22px;padding:0 80px 540px;z-index:2">
  <div style="display:flex;align-items:center;gap:20px"><div style="width:14px;height:64px;border-radius:8px;background:${color}"></div>
  <div style="font-weight:900;font-size:78px;line-height:1.1;letter-spacing:-0.03em">${line}</div></div>
  <div style="font-size:44px;color:${C.textDim};font-weight:600;padding-inline-start:34px">${sub}</div></div>`, false)

const cards = {}

// ── #2 بطاقة المقارنة (هوك كامل) ──
cards.compare = base(`
${glow('rgba(124,58,237,.22)','top:-100px','inset-inline-end:-140px',680)}
<div style="flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px;padding:0 80px;position:relative;z-index:2">
  <div style="font-weight:900;font-size:74px;letter-spacing:-0.03em;text-align:center">وفّر على المحاسب</div>
  <div style="width:100%;display:flex;flex-direction:column;gap:26px">
    <div style="background:rgba(239,68,68,.12);border:2px solid ${C.accent}55;border-radius:24px;padding:34px 38px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:40px;color:${C.textDim};font-weight:700">محاسب עוסק פטור</div>
      <div style="font-weight:900;font-size:62px;color:${C.accent}">₪1,800<span style="font-size:34px;color:${C.textDim}">/سنة</span></div>
    </div>
    <div style="background:rgba(34,197,94,.12);border:2px solid ${C.success}66;border-radius:24px;padding:34px 38px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 16px 44px rgba(34,197,94,.18)">
      <div style="font-size:40px;color:${C.text};font-weight:800">Contractor Pro</div>
      <div style="font-weight:900;font-size:62px;color:${C.success}">₪990<span style="font-size:34px;color:${C.textDim}">/سنة</span></div>
    </div>
  </div>
  <div style="font-size:42px;color:${C.cyan};font-weight:800;text-align:center">وبيشتغل معك ٢٤ ساعة 🤝</div>
</div>`)

// ── #5 بطاقة الضريبة (هوك كامل) ──
cards.vat = base(`
${glow('rgba(124,58,237,.28)','top:-80px','inset-inline-start:-120px',720)}
<div style="flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;padding:0 80px;position:relative;z-index:2;text-align:center">
  <div style="font-weight:900;font-size:64px;color:${C.textDim};letter-spacing:-0.02em">${HEB_VAT} صار</div>
  <div style="font-weight:900;font-size:300px;line-height:0.9;background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">18%</div>
  <div style="font-weight:900;font-size:62px;line-height:1.16;letter-spacing:-0.03em">التطبيق بيحسبها<br><span style="color:${C.cyan}">لحالها بثانية</span></div>
</div>`)

// ── هوكات علوية شفّافة ──
cards.ovhook3 = topHook('بصوت العامل 👷', C.cyan, `أنا عامل عند مقاول<br><span style="color:${C.cyan}">وبشوف حسابي بنفسي</span>`)
cards.ovhook4 = topHook('بلا إنترنت 📵', C.primary, `بالورشة ما في إشارة؟<br><span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">ما بيوقفك</span>`)

// ── عناوين سفلية ──
cards.cap2a = lower('بيعمل شغل المحاسب', 'مصاريف · رواتب · ضرايب — تلقائياً', C.success)
cards.cap2b = lower('وبتعرف ربحك الحقيقي', 'صافي ربح كل مشروع بضغطة', C.cyan)
cards.cap3a = lower('أيامي وسلفي ومستحقّي', 'كل شي قدّامي من موبايلي', C.cyan)
cards.cap3b = lower('بطلب سلفتي بضغطة', 'بلا ما أحرج المعلّم ولا أتأخّر', C.secondary)
cards.cap4  = lower('سجّل وانت أوفلاين', 'بيزامن لحاله أول ما يرجع النت', C.cyan)
cards.cap5  = lower('الضريبة محسوبة لحالها', 'كم تدفع وكم بترجعلك — بلا أخطاء', C.success)

const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil:'networkidle' })
  await page.waitForTimeout(450)
  const transparent = name.startsWith('ovhook') || name.startsWith('cap')
  await page.screenshot({ path: resolve(OUT, `c-${name}.png`), omitBackground: transparent })
  console.log(`✅ c-${name}.png`)
}
await browser.close()
