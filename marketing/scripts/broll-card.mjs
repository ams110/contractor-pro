import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'
const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
body{font-family:'Noto Sans Arabic';color:#F8FAFC}
</style></head><body>
<div style="position:absolute;top:70px;inset-inline-start:70px;display:flex;align-items:center;gap:18px">
  <div style="width:96px;height:96px;border-radius:25px;background:${GRAD_BRAND};display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(249,115,22,.5)">${HARDHAT}</div>
  <div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:46px;letter-spacing:-0.03em">Contractor<span style="color:#F97316"> Pro</span></div>
</div>
<div style="position:absolute;inset-inline:0;bottom:0;height:760px;background:linear-gradient(to top,rgba(7,8,15,.96) 16%,rgba(7,8,15,.6) 48%,transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:24px;padding:0 80px 230px">
  <div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:96px;line-height:1.12;letter-spacing:-0.04em">بتشتغل<br>بالمقاولات؟</div>
  <div style="font-size:48px;color:#CBD5E1;font-weight:700">إدارة شغلك كلّه… صارت بجيبك</div>
</div></body></html>`
const browser = await chromium.launch({ channel: 'chromium' }).catch(() => chromium.launch())
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.setContent(html, { waitUntil: 'networkidle' }); await page.waitForTimeout(250)
await page.screenshot({ path: resolve(OUT, 'broll-overlay.png'), omitBackground: true })
console.log('✅ broll-overlay.png'); await browser.close()
