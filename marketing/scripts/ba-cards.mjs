import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')
const C = { accent:'#EF4444', success:'#22C55E', text:'#F8FAFC', textDim:'#CBD5E1' }
const badge = (label, color, sign) => `
<div style="position:absolute;top:90px;inset-inline-start:0;inset-inline-end:0;display:flex;justify-content:center;z-index:3">
  <div style="display:flex;align-items:center;gap:16px;background:${color}1f;border:3px solid ${color};
    padding:18px 44px;border-radius:60px;backdrop-filter:blur(6px)">
    <div style="width:52px;height:52px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#07080F;font-weight:900;font-size:34px">${sign}</div>
    <div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:60px;color:${color};letter-spacing:-0.02em">${label}</div>
  </div>
</div>`
const lower = (line, color) => `
<div style="position:absolute;inset-inline:0;bottom:0;height:520px;
  background:linear-gradient(to top, rgba(7,8,15,.96) 16%, rgba(7,8,15,.7) 52%, transparent);
  display:flex;align-items:flex-end;justify-content:center;padding:0 80px 160px;z-index:3">
  <div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:62px;line-height:1.25;text-align:center;letter-spacing:-0.02em;color:${C.text}">${line}</div>
</div>`
const make = (inner) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
body{font-family:'Noto Sans Arabic';position:relative}</style></head><body>${inner}</body></html>`

const cards = {
  ba_before: make(badge('قبل', C.accent, '✕') + lower('ورق، دفاتر، ونسيان…<br>وجع راس كل يوم', C.accent)),
  ba_after:  make(badge('بعد', C.success, '✓') + lower('كل عامل ومصروف وربح<br>منظّم بالموبايل', C.success)),
}
const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{width:1080,height:1920}, deviceScaleFactor:1 })
const page = await ctx.newPage()
for (const [n,h] of Object.entries(cards)) {
  await page.setContent(h,{waitUntil:'networkidle'}); await page.waitForTimeout(200)
  await page.screenshot({ path: resolve(OUT,`${n}.png`), omitBackground:true }); console.log('✅',n)
}
await browser.close()
