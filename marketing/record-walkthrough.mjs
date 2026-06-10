// ─────────────────────────────────────────────────────────────────────────────
// record-walkthrough.mjs — يسجّل جولة بشرية واقعية داخل التطبيق الحقيقي:
//   تسجيل دخول تجريبي → لوحة التحكم → مشاريع → تفاصيل مشروع → عمّال → عامل → مالية.
//   مع مؤشّر متحرّك + نقرات + سكرول ناعم + خط IBM Plex Sans Arabic.
//
// المتطلّبات: dev server شغّال على :3000 وموصول بـ Supabase الحقيقي (.env.local).
// التشغيل:  node marketing/record-walkthrough.mjs
// المخرج:   marketing/out/contractor-pro-walkthrough.webm  (1080×1920، ~38s)
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, renameSync, existsSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'out');
mkdirSync(outDir, { recursive: true });

const SUPA = 'rvhjrzbhugvytvktdhor';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aGpyemJodWd2eXR2a3RkaG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjU1OTMsImV4cCI6MjA5MTg0MTU5M30.LxAACOi1papCp197qsQIdWkm9hIJNY0o-Hc9YiMHPWE';

// 1) جلسة المستخدم التجريبي
const tok = await fetch(`https://${SUPA}.supabase.co/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo.reel@contractorpro.app', password: 'DemoReel2026!' }),
});
const sess = await tok.json(); delete sess.weak_password;

// 2) سكربت يُحقن قبل تحميل الصفحة: مؤشّر + سكرول ناعم + خط جديد
const initScript = `(() => {
  if (window.__reel) return; window.__reel = true;
  // الخط الجديد
  const inj = () => {
    const head = document.head || document.documentElement;
    const l = document.createElement('link'); l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
    const st = document.createElement('style');
    st.textContent="*{font-family:'IBM Plex Sans Arabic',sans-serif !important}";
    head.appendChild(l); head.appendChild(st);
  };
  if (document.head) inj(); else document.addEventListener('DOMContentLoaded', inj);
  // المؤشّر
  const mk = () => {
    if (!document.body) return requestAnimationFrame(mk);
    const c = document.createElement('div'); c.id='__cur';
    c.style.cssText='position:fixed;z-index:2147483647;left:0;top:0;transform:translate(270px,480px);pointer-events:none;transition:transform .6s cubic-bezier(.45,0,.25,1);will-change:transform;filter:drop-shadow(0 3px 6px rgba(0,0,0,.5))';
    c.innerHTML='<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" stroke="#0b1020" stroke-width="1.3"><path d="M4 2l15.5 9.2-6.9 1.4-3.7 7.1z"/></svg>';
    document.body.appendChild(c);
    window.__cur = c;
  };
  mk();
  window.__moveCursor = (x,y) => { if(window.__cur) window.__cur.style.transform='translate('+(x-3)+'px,'+(y-2)+'px)'; };
  window.__pulse = () => {
    const m = window.__cur.getBoundingClientRect();
    const r = document.createElement('div');
    r.style.cssText='position:fixed;z-index:2147483646;left:'+m.left+'px;top:'+m.top+'px;width:16px;height:16px;border-radius:50%;background:rgba(249,115,22,.45);border:2px solid #F97316;pointer-events:none;transform:translate(-50%,-50%) scale(1);transition:all .45s ease;opacity:1';
    document.body.appendChild(r);
    requestAnimationFrame(()=>{ r.style.transform='translate(-50%,-50%) scale(3.4)'; r.style.opacity='0'; });
    setTimeout(()=>r.remove(),460);
  };
  const scroller = () => {
    let best=document.scrollingElement||document.documentElement, max=best.scrollHeight-best.clientHeight;
    document.querySelectorAll('*').forEach(el=>{ const d=el.scrollHeight-el.clientHeight; const oy=getComputedStyle(el).overflowY; if(d>max&&(oy==='auto'||oy==='scroll')){max=d;best=el;} });
    return best;
  };
  window.__scrollBy = (px,dur) => new Promise(res=>{
    const el=scroller(), s=el.scrollTop, t=performance.now();
    (function step(n){ const k=Math.min(1,(n-t)/dur); const e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; el.scrollTop=s+px*e; if(k<1) requestAnimationFrame(step); else res(); })(t);
  });
})();`;

const exe = execSync('ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell').toString().trim().split('\n')[0];
const browser = await chromium.launch({ executablePath: exe, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true,
  recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
});
await ctx.addInitScript(([k,v]) => {
  localStorage.setItem(k, v);
  // تعطيل النوافذ المنبثقة (كوكيز/ترحيب/إشعارات) لتسجيل نظيف
  localStorage.setItem('cp_cookie_consent', new Date().toISOString());
  localStorage.setItem('cp_onboarded', '1');
  localStorage.setItem('cpro_notif_dismissed', '1');
}, [`sb-${SUPA}-auth-token`, JSON.stringify(sess)]);
await ctx.addInitScript(initScript);
const page = await ctx.newPage();

const wait = (ms) => page.waitForTimeout(ms);
const scroll = (px, dur=1500) => page.evaluate(([p,d]) => window.__scrollBy(p,d), [px,dur]).then(()=>{});
async function cursorTo(x, y) { await page.evaluate(([x,y]) => window.__moveCursor(x,y), [x,y]); await wait(650); }
async function tapXY(x, y) { await cursorTo(x,y); await page.evaluate(() => window.__pulse()); await wait(160); await page.mouse.click(x,y); }
async function tapText(t) {
  const el = page.getByText(t, { exact: false }).first();
  const box = await el.boundingBox().catch(()=>null);
  if (!box) { console.log('  (skip, not found:', t, ')'); return false; }
  const x = box.x + box.width/2, y = box.y + box.height/2;
  await cursorTo(x,y); await page.evaluate(() => window.__pulse()); await wait(160);
  await el.click({ timeout: 4000 }).catch(()=>{});
  return true;
}
// مواقع شريط التنقّل السفلي (CSS px في viewport 540×960)
const NAV = { home:[430,913], projects:[350,913], workers:[270,913], finance:[190,913], settings:[110,913] };

console.log('⏺  بدء التسجيل…');
await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle', timeout: 45000 });
await wait(4500);
// (النوافذ المنبثقة معطّلة مسبقاً عبر localStorage)
await wait(1300);

// ── لوحة التحكم: تصفّح هادئ من فوق لتحت ──
await scroll(420, 1700); await wait(1500);
await scroll(500, 1700); await wait(1500);
await scroll(480, 1700); await wait(1500);
await scroll(-1000, 1500); await wait(900);

// ── مشاريع ──
await tapXY(...NAV.projects); await wait(2000);
await scroll(360, 1500); await wait(1300);
await tapText('فيلا الياسمين'); await wait(2300);
await scroll(340, 1400); await wait(1500);
await page.keyboard.press('Escape').catch(()=>{}); await wait(900);

// ── عمّال ──
await tapXY(...NAV.workers); await wait(2000);
await scroll(340, 1400); await wait(1300);
await tapText('أحمد سعيد'); await wait(2300);
await scroll(320, 1400); await wait(1500);
await page.keyboard.press('Escape').catch(()=>{}); await wait(900);

// ── المالية ──
await tapXY(...NAV.finance); await wait(2200);
await scroll(360, 1400); await wait(1500);

// ── العودة للوحة التحكم ──
await tapXY(...NAV.home); await wait(1800);

console.log('⏹  انتهى.');
const video = page.video();
await ctx.close();
await browser.close();

const finalPath = join(outDir, 'contractor-pro-walkthrough.webm');
if (video) { const p = await video.path(); if (existsSync(p) && p!==finalPath) renameSync(p, finalPath); }
else { const w = readdirSync(outDir).filter(f=>f.endsWith('.webm')).sort(); if (w.length) renameSync(join(outDir,w[w.length-1]), finalPath); }
console.log('✅', finalPath);
