// توليد صورة المشاركة الاجتماعية (Open Graph) 1200×630 → public/og-image.png
// بانر على هوية التطبيق (amber/dark + خوذة HardHat). يُشغّل يدوياً عند تغيير
// العلامة:  node scripts/generate-og.mjs
// يستعمل chromium عبر playwright (مثبّت أصلاً للـE2E) لرسم HTML ثم لقطه.
// نلتقط عنصر .canvas بقياس ثابت (لا الـviewport) لتفادي قصّ overflow في RTL.

import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/og-image.png')

// خوذة HardHat من Lucide (نفس شكل لوغو التطبيق) — مسار SVG ثابت
const HARDHAT = `<svg width="116" height="116" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@500;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; }
  .canvas { width:1200px; height:630px; overflow:hidden; position:relative;
    font-family:'Noto Sans Arabic', system-ui, sans-serif;
    background:#07080F; color:#F8FAFC; direction:rtl;
    display:flex; flex-direction:column; justify-content:center; padding:0 80px; }
  .orb1 { position:absolute; width:560px; height:560px; border-radius:50%;
    background:radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%);
    top:-180px; right:-160px; }
  .orb2 { position:absolute; width:480px; height:480px; border-radius:50%;
    background:radial-gradient(circle, rgba(124,58,237,0.14), transparent 70%);
    bottom:-170px; left:-130px; }
  .row { display:flex; align-items:center; gap:22px; margin-bottom:34px; position:relative; }
  .logo { width:100px; height:100px; border-radius:28px; flex:none;
    background:linear-gradient(135deg, #F97316, #DC2626);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 20px 60px rgba(249,115,22,0.45); }
  .brand { font-size:44px; font-weight:900; letter-spacing:-0.02em; }
  .brand small { display:block; font-size:20px; font-weight:700; color:#94A3B8; margin-top:4px; }
  h1 { font-size:54px; font-weight:900; line-height:1.22; letter-spacing:-0.02em; position:relative; }
  .grad { background:linear-gradient(135deg,#F97316,#DC2626);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  p { font-size:24px; color:#94A3B8; margin-top:24px; font-weight:500; position:relative; }
  .chips { display:flex; gap:14px; margin-top:36px; position:relative; }
  .chip { background:rgba(249,115,22,0.12); border:1px solid rgba(249,115,22,0.32);
    color:#FB923C; font-size:21px; font-weight:700; padding:11px 22px; border-radius:14px; flex:none; }
</style></head>
<body>
  <div class="canvas">
    <div class="orb1"></div><div class="orb2"></div>
    <div class="row">
      <div class="logo">${HARDHAT}</div>
      <div class="brand">Contractor Pro<small>إدارة المقاولات</small></div>
    </div>
    <h1>كل مشاريعك وعمّالك ورواتبك<br><span class="grad">في تطبيق واحد</span></h1>
    <p>للمقاول العربي في إسرائيل — مشاريع · عمّال · رواتب · ضرائب (מע"מ)</p>
    <div class="chips"><div class="chip">حساب الرواتب</div><div class="chip">أيام العمل</div><div class="chip">الضرائب تلقائياً</div></div>
  </div>
</body></html>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1240, height: 700 }, deviceScaleFactor: 2 })
await page.setContent(html, { waitUntil: 'networkidle' })
try { await page.evaluate(() => document.fonts.ready) } catch { /* الخط الافتراضي */ }
await page.waitForTimeout(400)
await page.locator('.canvas').screenshot({ path: OUT, type: 'png' })
await browser.close()
console.log('✓ og-image.png →', OUT)
