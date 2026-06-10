// ─────────────────────────────────────────────────────────────────────────────
// record-ad.mjs — إعلان قصير (~18s) من داخل التطبيق الحقيقي:
//   إنترو → لقطات حقيقية (لوحة/مشاريع/مالية) مع نصوص جذّابة على الشاشة → CTA.
//   مصمّم ليشتغل صامتاً (نصوص). خط IBM Plex Sans Arabic.
//
// التشغيل:  node marketing/record-ad.mjs
// المخرج:   marketing/out/contractor-pro-ad.webm  (1080×1920، ~18s)
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

const tok = await fetch(`https://${SUPA}.supabase.co/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo.reel@contractorpro.app', password: 'DemoReel2026!' }),
});
const sess = await tok.json(); delete sess.weak_password;

// حقن: خط + مؤشّر بسيط + سكرول ناعم + شريط نصوص + بطاقات إنترو/CTA
const initScript = `(() => {
  if (window.__ad) return; window.__ad = true;
  const inj = () => {
    const head = document.head || document.documentElement;
    const l = document.createElement('link'); l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap';
    const st = document.createElement('style');
    st.textContent="*{font-family:'IBM Plex Sans Arabic',sans-serif !important}";
    head.appendChild(l); head.appendChild(st);
  };
  if (document.head) inj(); else document.addEventListener('DOMContentLoaded', inj);
  const ready = (fn) => { if (document.body) fn(); else requestAnimationFrame(()=>ready(fn)); };
  // سكرول ناعم
  const scroller = () => { let b=document.scrollingElement||document.documentElement,m=b.scrollHeight-b.clientHeight; document.querySelectorAll('*').forEach(e=>{const d=e.scrollHeight-e.clientHeight,o=getComputedStyle(e).overflowY; if(d>m&&(o==='auto'||o==='scroll')){m=d;b=e;}}); return b; };
  window.__scrollBy = (px,dur) => new Promise(res=>{ const el=scroller(),s=el.scrollTop,t=performance.now(); (function st(n){const k=Math.min(1,(n-t)/dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; el.scrollTop=s+px*e; if(k<1)requestAnimationFrame(st); else res();})(t); });
  // شريط النصوص (caption)
  window.__cap = (text) => ready(()=>{ let el=document.getElementById('__cap');
    if(!el){ el=document.createElement('div'); el.id='__cap';
      el.style.cssText='position:fixed;left:26px;right:26px;bottom:150px;z-index:2147483640;text-align:center;font-weight:800;font-size:31px;line-height:1.35;color:#fff;background:linear-gradient(135deg,rgba(249,115,22,.96),rgba(220,38,38,.94));padding:18px 22px;border-radius:20px;box-shadow:0 16px 46px rgba(0,0,0,.55);pointer-events:none;opacity:0;transition:opacity .4s,transform .4s;transform:translateY(22px)';
      document.body.appendChild(el); }
    el.innerHTML=text; requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateY(0)'; }); });
  window.__capHide = () => { const el=document.getElementById('__cap'); if(el){ el.style.opacity='0'; el.style.transform='translateY(22px)'; } };
  // بطاقة كاملة (إنترو/CTA)
  window.__card = (html) => ready(()=>{ let c=document.getElementById('__card');
    if(!c){ c=document.createElement('div'); c.id='__card';
      c.style.cssText='position:fixed;inset:0;z-index:2147483641;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;text-align:center;background:radial-gradient(120% 80% at 50% 0%,#15101f,#07080F 62%);color:#fff;padding:70px 56px;opacity:0;transition:opacity .5s;pointer-events:none';
      document.body.appendChild(c); }
    c.innerHTML=html; requestAnimationFrame(()=>c.style.opacity='1'); });
  window.__cardHide = () => { const c=document.getElementById('__card'); if(c) c.style.opacity='0'; };
})();`;

const HAT = '<svg viewBox="0 0 24 24" width="62" height="62" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>';
const MARK = (sz) => `<div style="width:${sz}px;height:${sz}px;border-radius:${sz*0.28}px;background:linear-gradient(135deg,#F97316,#DC2626);display:flex;align-items:center;justify-content:center;box-shadow:0 24px 70px rgba(249,115,22,.55)">${HAT}</div>`;

const exe = execSync('ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell').toString().trim().split('\n')[0];
const browser = await chromium.launch({ executablePath: exe, args: ['--ignore-certificate-errors'] });
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true,
  recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
});
await ctx.addInitScript(([k,v]) => {
  localStorage.setItem(k, v);
  localStorage.setItem('cp_cookie_consent', new Date().toISOString());
  localStorage.setItem('cp_onboarded', '1');
  localStorage.setItem('cpro_notif_dismissed', '1');
}, [`sb-${SUPA}-auth-token`, JSON.stringify(sess)]);
await ctx.addInitScript(initScript);
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
const scroll = (px, dur=1300) => page.evaluate(([p,d]) => window.__scrollBy(p,d), [px,dur]).then(()=>{});
const cap = (t) => page.evaluate(t => window.__cap(t), t);
const capHide = () => page.evaluate(() => window.__capHide());
const card = (h) => page.evaluate(h => window.__card(h), h);
const cardHide = () => page.evaluate(() => window.__cardHide());

console.log('⏺  تسجيل الإعلان…');
await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle', timeout: 45000 });
// إنترو يغطّي التحميل
await card(`${MARK(150)}
  <div style="font-size:54px;font-weight:800;line-height:1.15">مقاول؟ كل شغلك<br><span style="color:#F97316">بشاشة وحدة</span></div>
  <div style="font-size:30px;color:#94a3b8">عمّال · رواتب · ضريبة — بالعربي</div>`);
await wait(3000);
await cardHide(); await wait(700);

// لوحة التحكّم
await cap('نبض مصلحتك ومالك — لحظة بلحظة'); await wait(600);
await scroll(420, 1400); await wait(1700);

// مشاريع
await page.mouse.click(350, 913); await wait(1500);
await cap('ربح كل مشروع وهامشه قدامك'); await scroll(300, 1200); await wait(2100);

// مالية
await page.mouse.click(190, 913); await wait(1600);
await cap('ضريبتك (מע"מ) محسوبة لحالها'); await wait(2400);

// CTA
await capHide();
await card(`${MARK(150)}
  <div style="font-size:60px;font-weight:800;color:#F97316">Contractor Pro</div>
  <div style="font-size:46px;font-weight:800;line-height:1.2">جرّبه <span style="color:#F97316">مجاناً</span> اليوم</div>
  <div style="margin-top:6px;font-size:30px;font-weight:700;background:linear-gradient(135deg,#F97316,#DC2626);padding:18px 40px;border-radius:18px;box-shadow:0 18px 50px rgba(249,115,22,.5)">ابدأ التجربة المجانية ←</div>
  <div style="font-size:26px;color:#94a3b8;margin-top:4px">١٤ يوم مجاناً · بدون بطاقة · بالعربي</div>`);
await wait(3200);

console.log('⏹  انتهى.');
const video = page.video();
await ctx.close();
await browser.close();
const finalPath = join(outDir, 'contractor-pro-ad.webm');
if (video) { const p = await video.path(); if (existsSync(p) && p !== finalPath) renameSync(p, finalPath); }
else { const w = readdirSync(outDir).filter(f=>f.endsWith('.webm') && f.startsWith('page')).sort(); if (w.length) renameSync(join(outDir, w[w.length-1]), finalPath); }
console.log('✅', finalPath);
