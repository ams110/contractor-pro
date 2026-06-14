// مولّد بطاقات نصية للريل الإعلاني (1080×1920) — تشكيل عربي سليم عبر المتصفّح
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'promo-frames')
const W = 1080, H = 1920

// هوية التطبيق
const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', secondary: '#7C3AED', gold: '#D97706',
  cyan: '#06B6D4', success: '#22C55E', text: '#F8FAFC', textDim: '#94A3B8',
}
const GRAD_BRAND = 'linear-gradient(135deg, #F97316, #DC2626)'

// شعار: خوذة HardHat بيضاء على تدرّج برتقالي→أحمر بزوايا مدوّرة (نفس اللوغو)
const HARDHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%">
<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
<path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
<path d="M4 15v-3a6 6 0 0 1 6-6"/>
<path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`

const logo = (size = 132) => `
<div style="display:flex;align-items:center;gap:22px;justify-content:center">
  <div style="width:${size}px;height:${size}px;border-radius:${size*0.26}px;background:${GRAD_BRAND};
       display:flex;align-items:center;justify-content:center;box-shadow:0 18px 50px rgba(249,115,22,.45)">${HARDHAT}</div>
  <div style="font-weight:900;font-size:${size*0.43}px;letter-spacing:-0.03em;color:${C.text};font-family:'Noto Kufi Arabic'">Contractor<span style="color:${C.primary}"> Pro</span></div>
</div>`

const glow = (color, x, y, s = 600) => `
<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;
  background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(20px);pointer-events:none"></div>`

const base = (inner, opaque = true) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque ? `background:${C.bg}` : 'background:transparent'};
  font-family:'Noto Sans Arabic','Noto Kufi Arabic',sans-serif;color:${C.text};
  position:relative;display:flex;flex-direction:column}
.kufi{font-family:'Noto Kufi Arabic'}
</style></head><body>${inner}</body></html>`

// ── البطاقات ──────────────────────────────────────────────
const cards = {}

// 1) هوك افتتاحي
cards.intro = base(`
${glow('rgba(249,115,22,.30)', 'top:-120px', 'inset-inline-end:-160px', 720)}
${glow('rgba(124,58,237,.22)', 'bottom:-160px', 'inset-inline-start:-160px', 680)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:60px;padding:0 90px;text-align:center;position:relative;z-index:2">
  ${logo(140)}
  <div class="kufi" style="font-weight:900;font-size:128px;line-height:1.12;letter-spacing:-0.04em">
    كل مقاولاتك<br><span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">بجيبك</span>
  </div>
  <div style="font-size:46px;color:${C.textDim};font-weight:600;letter-spacing:-0.01em">مشاريع · عمّال · مالية · ضرائب</div>
</div>`)

// 7) CTA ختامي
cards.outro = base(`
${glow('rgba(249,115,22,.34)', 'top:-100px', 'inset-inline-start:-140px', 760)}
${glow('rgba(124,58,237,.24)', 'bottom:-180px', 'inset-inline-end:-160px', 720)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:70px;padding:0 80px;text-align:center;position:relative;z-index:2">
  ${logo(150)}
  <div class="kufi" style="font-weight:900;font-size:104px;line-height:1.14;letter-spacing:-0.04em">
    ابدأ تدير شغلك<br>زي المحترفين
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:34px">
    <div style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:58px;padding:38px 90px;border-radius:30px;
      box-shadow:0 20px 60px rgba(249,115,22,.5);letter-spacing:-0.02em" class="kufi">جرّبه مجّاناً الآن</div>
    <div style="font-size:40px;color:${C.textDim};font-weight:600">بدون بطاقة ائتمان</div>
  </div>
</div>`)

// عناوين سفلية (شريط شفّاف بأسفل الشاشة فوق الشاشة الحقيقية)
const lower = (line, sub, color = C.primary) => base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:560px;
  background:linear-gradient(to top, rgba(7,8,15,.97) 18%, rgba(7,8,15,.85) 50%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:26px;padding:0 80px 150px;z-index:2">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:14px;height:62px;border-radius:8px;background:${color}"></div>
    <div class="kufi" style="font-weight:900;font-size:74px;line-height:1.1;letter-spacing:-0.03em">${line}</div>
  </div>
  <div style="font-size:42px;color:${C.textDim};font-weight:600;padding-inline-start:34px;letter-spacing:-0.01em">${sub}</div>
</div>`, false)

cards.cap_dashboard = lower('نبض مصلحتك المالية', 'مؤشّر صحّة 0–100 + توقّع ذكي للسيولة', C.success)
cards.cap_projects  = lower('كل مشاريعك وأرباحها', 'إيرادات · تكاليف · هامش ربح لكل مشروع', C.primary)
cards.cap_workers   = lower('العمّال والرواتب', 'لوحة شرف · ساعات · مستحقّات · سلف', C.secondary)
cards.cap_workdays  = lower('وافِق على أيام العمل', 'تسجيل وموافقة الشِفتات بضغطة زر', C.gold)
cards.cap_expenses  = lower('مصاريف وضرائب تلقائياً', 'מע"מ · ضريبة دخل · ביטוח לאומי محسوبة', C.cyan)

// ── الرندر ────────────────────────────────────────────────
const browser = await chromium.launch({ channel: 'chromium' }).catch(() => chromium.launch())
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const transparent = name.startsWith('cap_')
  await page.screenshot({ path: resolve(OUT, `card-${name}.png`), omitBackground: transparent })
  console.log(`✅ card-${name}.png`)
}
await browser.close()
