// بطاقات ريل «يوم بحياة الحاج» (1080×1920) — هوك علوي + عناوين سفلية محروقة. تشكيل عربي سليم.
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'marketing/promo-frames/day')
const W = 1080, H = 1920
const C = { bg:'#07080F', surface:'#0D0F1C', card:'#12152A', primary:'#F97316', secondary:'#7C3AED',
  gold:'#D97706', cyan:'#06B6D4', success:'#22C55E', accent:'#EF4444', text:'#F8FAFC', textDim:'#94A3B8' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'

const base = (inner, opaque=true) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque?`background:${C.bg}`:'background:transparent'};font-family:'Noto Sans Arabic',sans-serif;color:${C.text};position:relative}
</style></head><body>${inner}</body></html>`

const cards = {}

// هوك علوي (فوق مشهد الصبح)
cards.hook = base(`
<div style="position:absolute;inset-inline:0;top:175px;display:flex;flex-direction:column;align-items:center;gap:24px;padding:0 70px;text-align:center;z-index:3">
  <div style="background:${C.primary};color:#fff;font-weight:900;font-size:40px;padding:16px 42px;border-radius:18px;box-shadow:0 14px 40px rgba(249,115,22,.5)">يوم بحياة مقاول 🏗️</div>
  <div style="font-weight:900;font-size:96px;line-height:1.12;letter-spacing:-0.04em;text-shadow:0 6px 30px rgba(0,0,0,.85)">
    من الصبح للمسا<br><span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">كل شي بإيدك</span>
  </div>
</div>`, false)

// عناوين سفلية مرفوعة فوق شريط تيك توك (~520px)
const lower = (line, sub, color=C.primary) => base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:760px;
  background:linear-gradient(to top, rgba(7,8,15,.98) 30%, rgba(7,8,15,.82) 60%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:22px;padding:0 80px 540px;z-index:2">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:14px;height:64px;border-radius:8px;background:${color}"></div>
    <div style="font-weight:900;font-size:80px;line-height:1.1;letter-spacing:-0.03em">${line}</div>
  </div>
  <div style="font-size:44px;color:${C.textDim};font-weight:600;padding-inline-start:34px;letter-spacing:-0.01em">${sub}</div>
</div>`, false)

cards.cap_advance = lower('وافِق السلفة من موبايلك', 'بوّابة العامل · كل سلفة مسجّلة عليه', C.secondary)
cards.cap_expense = lower('صوّر الفاتورة وخلص', 'المصروف والضريبة محسوبة لحالها', C.cyan)
cards.cap_collect = lower('مين مدين لك؟ كل مشروع قدّامك', 'إيراد · تكلفة · ربح لكل مشروع', C.primary)
cards.cap_profit  = lower('اعرف ربحك بثانية', 'نبض مصلحتك المالية — 0 إلى 100', C.success)

const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil:'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(OUT, `card-${name}.png`), omitBackground: true })
  console.log(`✅ card-${name}.png`)
}
await browser.close()
