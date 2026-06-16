// Google Play Feature Graphic (1024×500) — مبرند، تشكيل عربي سليم عبر المتصفّح
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'marketing/promo-frames/play')
const W = 1024, H = 500
const C = { bg:'#07080F', surface:'#0D0F1C', primary:'#F97316', text:'#F8FAFC', textDim:'#94A3B8', cyan:'#06B6D4' }
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'

const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:58%;height:58%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/>
<path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`

const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:radial-gradient(circle at 78% 30%, rgba(249,115,22,.20), transparent 55%), radial-gradient(circle at 15% 90%, rgba(124,58,237,.16), transparent 55%), ${C.bg};
  font-family:'Noto Sans Arabic',sans-serif;color:${C.text};position:relative;display:flex;align-items:center}
</style></head><body>
<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(249,115,22,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,.05) 1px,transparent 1px);background-size:46px 46px;opacity:.5"></div>
<div style="display:flex;flex-direction:column;gap:26px;padding:0 70px;position:relative;z-index:2;width:100%">
  <div style="display:flex;align-items:center;gap:22px">
    <div style="width:96px;height:96px;border-radius:25px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center;box-shadow:0 16px 44px rgba(249,115,22,.5)">${HARDHAT}</div>
    <div style="font-weight:900;font-size:62px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div>
  </div>
  <div style="font-weight:900;font-size:54px;line-height:1.18;letter-spacing:-0.03em">
    أوّل تطبيق <span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">مقاولات عربي</span>
  </div>
  <div style="font-size:33px;color:${C.textDim};font-weight:600;letter-spacing:-0.01em">مشاريع · عمّال · رواتب · مالية · ضرائب إسرائيلية — بجيبك</div>
</div>
</body></html>`

const browser = await chromium.launch({ channel:'chromium' }).catch(()=>chromium.launch())
const ctx = await browser.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1 })
const page = await ctx.newPage()
await page.setContent(html, { waitUntil:'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: resolve(OUT, 'feature-graphic-1024x500.png') })
await browser.close()
console.log('✅ feature-graphic-1024x500.png')
