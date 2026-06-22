// كروت/overlays عربية للفيديو الإعلاني «الدفتر» (1080×1920) — تشكيل عربي سليم عبر المتصفّح
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'promo-daftar/out')
const W = 1080, H = 1920

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', secondary: '#7C3AED', gold: '#D97706',
  cyan: '#06B6D4', success: '#22C55E', text: '#F8FAFC', textDim: '#94A3B8',
}
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'

const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/>
<path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`

const logo = (size = 132) => `
<div style="display:flex;align-items:center;gap:22px;justify-content:center">
  <div style="width:${size}px;height:${size}px;border-radius:${size*0.26}px;background:${GRAD_BRAND};
       display:flex;align-items:center;justify-content:center;box-shadow:0 18px 50px rgba(249,115,22,.45)">${HARDHAT}</div>
  <div style="font-weight:900;font-size:${size*0.42}px;letter-spacing:-0.03em;color:${C.text};font-family:'Noto Kufi Arabic'">Contractor<span style="color:${C.primary}"> Pro</span></div>
</div>`

const glow = (color, x, y, s = 600) => `
<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;
  background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(20px);pointer-events:none"></div>`

const base = (inner, opaque = true) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque ? `background:${C.bg}` : 'background:transparent'};
  font-family:'Noto Kufi Arabic','Noto Sans Arabic',sans-serif;color:${C.text};
  position:relative;display:flex;flex-direction:column}
.kufi{font-family:'Noto Kufi Arabic'}
.shadow{text-shadow:0 4px 24px rgba(0,0,0,.95), 0 2px 8px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.8)}
</style></head><body>${inner}</body></html>`

const cards = {}

// ── 1) هوك افتتاحي (overlay شفّاف فوق فيديو الفوضى) — نص أعلى-وسط، منطقة آمنة ──
cards.hook = base(`
<div style="position:absolute;inset-inline:0;top:0;height:1040px;
  background:linear-gradient(to bottom, rgba(7,8,15,.86) 12%, rgba(7,8,15,.45) 55%, transparent);
  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:40px;padding:230px 70px 0;text-align:center;z-index:2">
  <div class="kufi shadow" style="font-weight:900;font-size:104px;line-height:1.14;letter-spacing:-0.03em">
    لسا بتسجّل عمّالك<br>ع <span style="color:${C.primary}">الدفتر</span>؟
  </div>
  <div class="kufi shadow" style="display:inline-block;font-weight:800;font-size:54px;color:#fff;
    background:${GRAD_BRAND};padding:20px 44px;border-radius:22px;box-shadow:0 14px 44px rgba(220,38,38,.55);letter-spacing:-0.01em">
    عم تخسر مصاري كل شهر
  </div>
</div>`, false)

// ── 2) لحظة التحوّل (overlay وسط) ──
cards.turn = base(`
${glow('rgba(249,115,22,.40)', 'top:40%', 'inset-inline-start:50%', 900)}
<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 80px;text-align:center;z-index:2">
  <div class="kufi shadow" style="font-weight:900;font-size:120px;line-height:1.1;letter-spacing:-0.04em">
    خلص.<br>صار كله <span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">بجيبك</span>
  </div>
</div>`, false)

// ── كابشن علوي (pill) فوق الشاشة الحقيقية — منطقة آمنة أعلى ──
const topCap = (line, color) => base(`
<div style="position:absolute;inset-inline:0;top:150px;display:flex;justify-content:center;padding:0 50px;z-index:3">
  <div style="display:flex;align-items:center;gap:22px;background:rgba(7,8,15,.82);backdrop-filter:blur(8px);
    border:2px solid ${color}66;border-radius:26px;padding:26px 46px;box-shadow:0 16px 50px rgba(0,0,0,.6)">
    <div style="width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 22px ${color}"></div>
    <div class="kufi" style="font-weight:900;font-size:62px;letter-spacing:-0.02em;white-space:nowrap">${line}</div>
  </div>
</div>`, false)

cards.cap_dash    = topCap('نقدك ومصاريفك بضغطة', C.success)
cards.cap_workers = topCap('راتب كل عامل محسوب', C.secondary)
cards.cap_tax     = topCap('מע"מ وضريبة تلقائي', C.cyan)

// ── خلفية مبرندة للمشاهد ──
cards.bg = base(`
${glow('rgba(249,115,22,.20)', 'top:-160px', 'inset-inline-end:-160px', 760)}
${glow('rgba(124,58,237,.16)', 'bottom:-200px', 'inset-inline-start:-180px', 760)}
<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%, #12152A 0%, #07080F 60%)"></div>`)

// ── CTA ختامي (opaque) ──
cards.outro = base(`
${glow('rgba(249,115,22,.34)', 'top:-100px', 'inset-inline-start:-140px', 800)}
${glow('rgba(124,58,237,.24)', 'bottom:-180px', 'inset-inline-end:-160px', 760)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:64px;padding:0 80px 120px;text-align:center;position:relative;z-index:2">
  ${logo(150)}
  <div class="kufi" style="font-weight:900;font-size:118px;line-height:1.1;letter-spacing:-0.04em">
    جرّبه <span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">مجّاناً</span>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:30px">
    <div class="kufi" style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:62px;padding:36px 86px;border-radius:30px;
      box-shadow:0 20px 60px rgba(249,115,22,.5);letter-spacing:-0.02em">بلا تسجيل · بلا بطاقة</div>
    <div class="kufi" style="font-size:46px;color:${C.textDim};font-weight:700">اضغط الرابط وابدأ ⤴</div>
  </div>
</div>`)

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chromium' }))
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(250)
  const transparent = !(name === 'bg' || name === 'outro')
  await page.screenshot({ path: resolve(OUT, `${name}.png`), omitBackground: transparent })
  console.log(`✅ ${name}.png`)
}
await browser.close()
