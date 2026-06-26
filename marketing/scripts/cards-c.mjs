// بطاقات الريل الإعلاني — زاوية C «مين مدين لك» (1080×1920) — تشكيل عربي سليم عبر المتصفّح
// كباشن محروقة + هوك + CTA. تصدير نظيف (شعارنا فقط، بلا أي علامة منصّة).
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'marketing/promo-frames/c')
const W = 1080, H = 1920

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', secondary: '#7C3AED', gold: '#D97706',
  cyan: '#06B6D4', success: '#22C55E', accent: '#EF4444',
  text: '#F8FAFC', textDim: '#94A3B8',
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
  <div style="font-weight:900;font-size:${size*0.43}px;letter-spacing:-0.03em;color:${C.text}">Contractor<span style="color:${C.primary}"> Pro</span></div>
</div>`

const glow = (color, x, y, s = 600) => `
<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;
  background:radial-gradient(circle, ${color}, transparent 70%);filter:blur(20px);pointer-events:none"></div>`

const base = (inner, opaque = true) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{${opaque ? `background:${C.bg}` : 'background:transparent'};
  font-family:'Noto Sans Arabic',sans-serif;color:${C.text};
  position:relative;display:flex;flex-direction:column}
</style></head><body>${inner}</body></html>`

const cards = {}

// ── هوك علوي محروق (فوق كليب الحاج) — منطقة آمنة: أعلى>130 ، تحت كتير عن التفاعل
cards.hook = base(`
<div style="position:absolute;inset-inline:0;top:170px;display:flex;flex-direction:column;align-items:center;gap:26px;padding:0 70px;text-align:center;z-index:3">
  <div style="background:${C.accent};color:#fff;font-weight:900;font-size:40px;padding:16px 40px;border-radius:18px;letter-spacing:-0.01em;box-shadow:0 14px 40px rgba(239,68,68,.45)">وجع كل مقاول 👇</div>
  <div style="font-weight:900;font-size:92px;line-height:1.14;letter-spacing:-0.04em;text-shadow:0 6px 30px rgba(0,0,0,.85)">
    زبونك مأخّر <span style="color:${C.gold}">٨٠ يوم</span><br>ومش عارف <span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">مين مدين لك؟</span>
  </div>
</div>`, false)

// ── عناوين سفلية (فوق الشاشة الحقيقية) — مرفوعة فوق شريط تيك توك السفلي (~520px)
const lower = (line, sub, color = C.primary) => base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:740px;
  background:linear-gradient(to top, rgba(7,8,15,.98) 28%, rgba(7,8,15,.82) 58%, transparent);
  display:flex;flex-direction:column;justify-content:flex-end;gap:24px;padding:0 80px 540px;z-index:2">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="width:14px;height:64px;border-radius:8px;background:${color}"></div>
    <div style="font-weight:900;font-size:78px;line-height:1.1;letter-spacing:-0.03em">${line}</div>
  </div>
  <div style="font-size:44px;color:${C.textDim};font-weight:600;padding-inline-start:34px;letter-spacing:-0.01em">${sub}</div>
</div>`, false)

cards.cap_collect = lower('مين مدين لك — بالظبط', 'كل زبون · كل مشروع · الإيراد والربح لحظياً', C.success)
cards.cap_pulse   = lower('كل مصلحتك بمكان واحد', 'سيولة · ربح · تحصيل — محسوبة بثانية', C.cyan)

// ── CTA ختامي (شاشة كاملة مبرندة)
cards.outro = base(`
${glow('rgba(249,115,22,.34)', 'top:-100px', 'inset-inline-start:-140px', 760)}
${glow('rgba(124,58,237,.24)', 'bottom:-180px', 'inset-inline-end:-160px', 720)}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:64px;padding:0 80px;text-align:center;position:relative;z-index:2">
  ${logo(150)}
  <div style="font-weight:900;font-size:104px;line-height:1.14;letter-spacing:-0.04em">
    بطّل تضيّع حقك<br><span style="background:${GRAD_BRAND};-webkit-background-clip:text;background-clip:text;color:transparent">شغلك بإيدك</span>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:32px">
    <div style="background:${GRAD_BRAND};color:#fff;font-weight:900;font-size:58px;padding:38px 90px;border-radius:30px;
      box-shadow:0 20px 60px rgba(249,115,22,.5);letter-spacing:-0.02em">جرّبه مجّاناً الآن</div>
    <div style="font-size:40px;color:${C.textDim};font-weight:600">أوّل تطبيق مقاولات عربي · بدون بطاقة</div>
  </div>
</div>`)

const browser = await chromium.launch({ channel: 'chromium' }).catch(() => chromium.launch())
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const transparent = name === 'hook' || name.startsWith('cap_')
  await page.screenshot({ path: resolve(OUT, `card-${name}.png`), omitBackground: transparent })
  console.log(`✅ card-${name}.png`)
}
await browser.close()
