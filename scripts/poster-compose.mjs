// ═══════════════════════════════════════════════════════════════════════════
//  poster-compose.mjs — يركّب لقطات الشاشات الحقيقية (live/) داخل بوستر إعلاني
//  بهوية Contractor Pro: موك‑أب آيفون (جوّاه الشاشة الحقيقية) + عنوان + CTA.
//
//  يتطلّب: لقطات حقيقية في live/ (من scripts/live-shots.mjs).
//  الاستعمال: node scripts/poster-compose.mjs            (Story لكل الأفكار)
//  تخصيص:    SIZES=story,square  DPR=2  OUT=ads  node scripts/poster-compose.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const env = (k, d) => process.env[k] ?? d
const SIZES = env('SIZES', 'story').split(',').map(s => s.trim())
const DPR   = Number(env('DPR', 2))
const OUT   = resolve(process.cwd(), env('OUT', 'ads'))
const LIVE  = resolve(process.cwd(), env('LIVE', 'live'))

const DIMS = { square: { w: 1080, h: 1080 }, portrait: { w: 1080, h: 1350 }, story: { w: 1080, h: 1920 } }

// هوية بصرية (من src/constants)
const C = { bg: '#07080F', surface: '#0D0F1C', card: '#12152A', text: '#F8FAFC', textDim: '#64748B', primary: '#F97316' }
const TONES = {
  cyan:    { c: '#06B6D4', grad: 'linear-gradient(135deg,#06B6D4,#0EA5E9)', glow: 'rgba(6,182,212,0.45)' },
  premium: { c: '#7C3AED', grad: 'linear-gradient(135deg,#7C3AED,#4F46E5)', glow: 'rgba(124,58,237,0.45)' },
  success: { c: '#22C55E', grad: 'linear-gradient(135deg,#22C55E,#06B6D4)', glow: 'rgba(34,197,94,0.45)' },
  gold:    { c: '#D97706', grad: 'linear-gradient(135deg,#D97706,#F59E0B)', glow: 'rgba(217,119,6,0.45)' },
}

// أي لقطة → عنوان + نبرة
const SPECS = [
  { file: '04-workerdna.png',   tone: 'cyan',    tag: 'بصمة العامل',       kw: 'اعرف عمّالك',     head: 'مثل ما لازم',     sub: 'تحليل ذكي لكل عامل: حضور، أداء، رادار، وخطّ زمني كامل.' },
  { file: '02-networth.png',    tone: 'premium', tag: 'الذمّة الصافية',    kw: 'كم تساوي',        head: 'مصلحتك فعلاً',    sub: 'شلال ميزانية كامل: نقد + ذمم − التزامات = صافي ثروتك الحقيقي.' },
  { file: '06-tax-summary.png', tone: 'gold',    tag: 'ملخّص الضرائب',     kw: 'كل ضرائبك',       head: 'محسوبة تلقائياً', sub: 'מע"מ + ضريبة دخل + ביטוח לאומي بدقّة — وفّر آلاف الشواكل بلا محاسب.' },
  { file: '01-dashboard.png',   tone: 'success', tag: 'لوحة التحكم الذكية', kw: 'كل أرقام مصلحتك', head: 'أمامك بثانية',    sub: 'نبض المصلحة، التوقّع الذكي للسيولة، وصافي الربح — محسوبة لك.' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function html({ w, h, size, tone, tag, kw, head, sub, imgData }) {
  const t = TONES[tone] || TONES.cyan
  // مقاس الموك‑أب حسب المساحة
  const phoneW = size === 'story' ? 560 : size === 'portrait' ? 520 : 430
  const pad    = size === 'story' ? '96px 80px 76px' : size === 'square' ? '52px 70px' : '76px 72px 64px'
  const headSz = size === 'square' ? 50 : size === 'story' ? 66 : 60
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box;font-family:'Noto Sans Arabic','Noto Kufi Arabic','Arial',sans-serif}
    .poster{width:${w}px;height:${h}px;position:relative;overflow:hidden;color:${C.text};
      background:radial-gradient(120% 80% at 80% -10%, ${t.c}24, transparent 55%),
                 radial-gradient(100% 70% at -10% 110%, ${t.glow.replace('0.45','0.18')}, transparent 50%), ${C.bg};
      display:flex;flex-direction:column;align-items:center;padding:${pad}}
    .grid{position:absolute;inset:0;opacity:.5;
      background-image:linear-gradient(rgba(249,115,22,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.08) 1px,transparent 1px);
      background-size:54px 54px;-webkit-mask-image:radial-gradient(circle at 50% 35%,#000 30%,transparent 75%)}
    .glow{position:absolute;top:32%;left:0;right:0;margin:auto;width:560px;height:560px;border-radius:50%;
      background:radial-gradient(circle, ${t.glow} 0%, transparent 68%);opacity:.5;filter:blur(8px)}
    .badge{position:relative;display:inline-flex;align-items:center;gap:9px;padding:9px 20px;border-radius:99px;
      background:${t.c}1a;border:1px solid ${t.c}44;margin-bottom:24;font-size:18px;font-weight:800;color:${t.c}}
    .badge .dot{width:12px;height:12px;border-radius:50%;background:${t.c};box-shadow:0 0 10px ${t.c}}
    h1{position:relative;text-align:center;font-size:${headSz}px;font-weight:900;line-height:1.12;letter-spacing:-0.03em;max-width:880px;margin:0}
    h1 .g{background:${t.grad};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    p.sub{position:relative;text-align:center;font-size:21px;line-height:1.6;color:${C.textDim};font-weight:500;margin:22px 0 0;max-width:760px}
    .phoneWrap{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;margin-top:${size==='square'?24:40}px;width:100%}
    .phone{width:${phoneW}px;border-radius:${phoneW*0.13}px;padding:${phoneW*0.03}px;
      background:linear-gradient(160deg,#23262f,#0a0b12);border:1px solid rgba(255,255,255,0.08);
      filter:drop-shadow(0 40px 80px rgba(0,0,0,0.6))}
    .screen{border-radius:${phoneW*0.1}px;overflow:hidden;background:${C.bg};display:block;width:100%}
    .screen img{display:block;width:100%;height:auto}
    .footer{position:relative;width:100%;display:flex;align-items:center;justify-content:space-between;margin-top:26px}
    .cta{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;border-radius:16px;
      background:linear-gradient(135deg,#22C55E,#06B6D4);box-shadow:0 12px 30px rgba(34,197,94,0.4);
      font-size:19px;font-weight:900;color:#062b14}
    .brand{display:flex;align-items:center;gap:12px;text-align:left}
    .brand .name{font-size:23px;font-weight:900;letter-spacing:-0.02em}
    .brand .name b{color:${C.primary}}
    .brand .tag{font-size:13px;color:${C.textDim};font-weight:600}
    .logo{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,#F97316,#EF4444);
      display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(249,115,22,0.5)}
  </style></head><body>
  <div class="poster" data-poster>
    <div class="grid"></div><div class="glow"></div>
    <div class="badge"><span class="dot"></span>${esc(tag)}</div>
    <h1>${esc(kw)} <span class="g">${esc(head)}</span></h1>
    <p class="sub">${esc(sub)}</p>
    <div class="phoneWrap"><div class="phone"><div class="screen"><img src="${imgData}"></div></div></div>
    <div class="footer">
      <div class="cta"><span>جرّب 14 يوم مجاناً</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#062b14" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></div>
      <div class="brand">
        <div><div class="name">Contractor <b>Pro</b></div><div class="tag">إدارة مقاولاتك من جيبك</div></div>
        <div class="logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20M4 18a8 8 0 0 1 16 0M10 6.34V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3.34M6.5 10.5l1-2.5M17.5 10.5l-1-2.5"/></svg></div>
      </div>
    </div>
  </div></body></html>`
}

async function main() {
  await mkdir(OUT, { recursive: true })
  let browser
  try { browser = await chromium.launch({ channel: env('CHANNEL', 'chrome') }) }
  catch { browser = await chromium.launch() }

  let count = 0
  for (const size of SIZES) {
    const { w, h } = DIMS[size] || DIMS.story
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR })
    const page = await ctx.newPage()
    for (const spec of SPECS) {
      const buf = await readFile(resolve(LIVE, spec.file))
      const imgData = `data:image/png;base64,${buf.toString('base64')}`
      await page.setContent(html({ w, h, size, ...spec, imgData }), { waitUntil: 'load' })
      await page.waitForTimeout(400)
      const name = spec.file.replace(/\.png$/, '')
      const path = resolve(OUT, `poster-${name}-${size}.png`)
      await page.locator('[data-poster]').screenshot({ path, type: 'png' })
      console.log(`✅ ${spec.tag} (${size}) → ${path}`)
      count++
    }
    await ctx.close()
  }
  await browser.close()
  console.log(`\n🎉 ${count} بوستر في: ${OUT}`)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
