// Generates 20 ad-creative PNGs via headless Chromium (HTML/CSS -> screenshot).
// node gen.mjs   (NODE_PATH=/tmp/node_modules)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const A = '/home/user/contractor-pro/marketing/video-ad/assets'; // shared fonts + app shots
mkdirSync(DIR, { recursive: true });

const C = { bg:'#07080F', surface:'#0D0F1C', card:'#12152A', primary:'#F97316', accent:'#EF4444',
  secondary:'#7C3AED', success:'#22C55E', gold:'#D97706', cyan:'#06B6D4', text:'#F8FAFC', dim:'#64748B' };

const baseCSS = `
@font-face{font-family:'Cairo';font-weight:700;src:url('file://${A}/cairo-arabic-700-normal.woff2'),url('file://${A}/cairo-latin-700-normal.woff2');}
@font-face{font-family:'Cairo';font-weight:900;src:url('file://${A}/cairo-arabic-900-normal.woff2'),url('file://${A}/cairo-latin-900-normal.woff2');}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
body{font-family:'Cairo',sans-serif;color:${C.text};overflow:hidden;}
.stage{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 32%, #14101a 0%, ${C.bg} 72%);}
.glow{position:absolute;border-radius:50%;filter:blur(10px);pointer-events:none;}
.brand{display:flex;align-items:center;gap:16px;justify-content:center;}
.brand .ic{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,${C.primary},${C.accent});display:flex;align-items:center;justify-content:center;box-shadow:0 0 36px rgba(249,115,22,.45);}
.brand .ic svg{width:38px;height:38px;color:#fff;}
.brand .nm{font-weight:900;font-size:40px;letter-spacing:-0.02em;}
.cta{display:inline-block;background:linear-gradient(135deg,${C.primary},${C.accent});color:#fff;font-weight:900;border-radius:22px;box-shadow:0 0 56px rgba(249,115,22,.5);}
.grad{background:linear-gradient(135deg,${C.primary},${C.accent});-webkit-background-clip:text;background-clip:text;color:transparent;}
.gradP{background:linear-gradient(135deg,${C.secondary},#2563EB);-webkit-background-clip:text;background-clip:text;color:transparent;}
.tnum{font-variant-numeric:tabular-nums;}
.phone{border-radius:46px;border:10px solid #1b1f33;background:#0b0d18;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);}
.phone img{width:100%;display:block;}
.chk{display:flex;align-items:center;gap:22px;background:${C.card};border:1px solid rgba(249,115,22,.18);border-radius:18px;padding:24px 30px;}
.chk svg{width:46px;height:46px;flex:none;color:${C.success};}
.chk span{font-weight:700;font-size:40px;}
`;
const HARD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`;
const CHK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const brand = (sz=1) => `<div class="brand" style="transform:scale(${sz})"><div class="ic">${HARD}</div><div class="nm">Contractor Pro</div></div>`;
const wrap = (w,h,body,extra='') => `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>${baseCSS}${extra}</style></head><body><div class="stage" style="width:${w}px;height:${h}px">${body}</div></body></html>`;

// ---------- TEMPLATES ----------
// T1 mega number
const T1=(w,h,o)=>wrap(w,h,`
 <div class="glow" style="width:${w*0.8}px;height:${w*0.8}px;left:50%;top:30%;transform:translate(-50%,-50%);background:radial-gradient(circle, ${o.glow||'rgba(249,115,22,.22)'}, transparent 60%)"></div>
 <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px">
   <div style="font-weight:700;font-size:46px;color:${C.dim};margin-bottom:18px">${o.label}</div>
   <div class="${o.gp?'gradP':'grad'} tnum" style="font-weight:900;font-size:${o.fs||300}px;line-height:.95;letter-spacing:-0.04em">${o.num}</div>
   <div style="font-weight:900;font-size:62px;margin-top:30px;line-height:1.25">${o.sub}</div>
 </div>
 <div style="position:absolute;left:0;right:0;bottom:90px;display:flex;flex-direction:column;align-items:center;gap:34px">
   <div class="cta" style="font-size:50px;padding:28px 64px">${o.cta||'جرّب مجاناً 14 يوم'}</div>
   ${brand(0.85)}
 </div>`);

// T2 phone showcase
const T2=(w,h,o)=>wrap(w,h,`
 <div class="glow" style="width:${w}px;height:${w}px;left:50%;top:46%;transform:translate(-50%,-50%);background:radial-gradient(circle, rgba(249,115,22,.16), transparent 62%)"></div>
 <div style="position:absolute;left:0;right:0;top:70px;text-align:center;padding:0 70px;font-weight:900;font-size:64px;line-height:1.25">${o.headline}</div>
 <div style="position:absolute;left:50%;top:${o.phoneTop||540}px;transform:translateX(-50%)" >
   <div class="phone" style="width:${o.pw||560}px;height:${o.ph||720}px"><img src="file://${A}/${o.shot}"></div>
 </div>
 <div style="position:absolute;left:0;right:0;bottom:80px;display:flex;flex-direction:column;align-items:center;gap:30px">
   <div class="cta" style="font-size:48px;padding:26px 60px">${o.cta||'جرّب مجاناً · 990₪/سنة'}</div>
   ${brand(0.8)}
 </div>`);

// T3 comparison
const T3=(w,h,o)=>wrap(w,h,`
 <div style="position:absolute;left:0;right:0;top:70px;text-align:center;font-weight:900;font-size:60px">${o.headline}</div>
 <div style="position:absolute;left:60px;right:60px;top:230px;bottom:230px;display:flex;gap:36px">
   <div style="flex:1;border-radius:28px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 26px">
     <div style="font-weight:700;font-size:44px;color:${C.dim}">${o.lTitle}</div>
     <div style="font-weight:900;font-size:120px;color:${C.accent};margin:18px 0" class="tnum">${o.lBig}</div>
     <div style="font-weight:700;font-size:40px;color:#94a3b8;line-height:1.3">${o.lSub}</div>
   </div>
   <div style="flex:1;border-radius:28px;background:linear-gradient(160deg,rgba(249,115,22,.14),${C.surface});border:1px solid rgba(249,115,22,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 26px">
     <div style="font-weight:900;font-size:44px" class="grad">${o.rTitle}</div>
     <div style="font-weight:900;font-size:120px;margin:18px 0" class="grad tnum">${o.rBig}</div>
     <div style="font-weight:700;font-size:40px;color:${C.text};line-height:1.3">${o.rSub}</div>
   </div>
 </div>
 <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:108px;height:108px;border-radius:50%;background:${C.bg};border:2px solid rgba(249,115,22,.5);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:44px;color:${C.dim}">VS</div>
 <div style="position:absolute;left:0;right:0;bottom:80px;display:flex;justify-content:center">${brand(0.85)}</div>`);

// T4 quote / peer
const T4=(w,h,o)=>wrap(w,h,`
 <div class="glow" style="width:${w*0.9}px;height:${w*0.9}px;left:50%;top:42%;transform:translate(-50%,-50%);background:radial-gradient(circle, rgba(124,58,237,.16), transparent 62%)"></div>
 <div style="position:absolute;left:90px;top:120px;font-weight:900;font-size:200px;color:rgba(249,115,22,.35);line-height:1">”</div>
 <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px">
   <div style="font-weight:900;font-size:76px;line-height:1.4">${o.quote}</div>
   <div style="font-weight:700;font-size:42px;color:${C.dim};margin-top:46px">— ${o.author}</div>
 </div>
 <div style="position:absolute;left:0;right:0;bottom:90px;display:flex;justify-content:center">${brand(0.85)}</div>`);

// T5 hook (story)
const T5=(w,h,o)=>wrap(w,h,`
 <div class="glow" style="width:780px;height:780px;left:50%;top:40%;transform:translate(-50%,-50%);background:radial-gradient(circle, ${o.glow||'rgba(239,68,68,.22)'}, transparent 62%)"></div>
 ${(o.bubbles||[]).map(b=>`<div style="position:absolute;${b.pos};background:${C.card};border:1px solid rgba(249,115,22,.14);border-radius:18px;padding:20px 34px;font-weight:700;font-size:42px;color:#94a3b8">${b.t}</div>`).join('')}
 <div style="position:absolute;left:0;right:0;top:54%;transform:translateY(-50%);text-align:center;padding:0 80px;font-weight:900;font-size:118px;line-height:1.18">${o.hook}</div>
 <div style="position:absolute;left:0;right:0;bottom:140px;display:flex;flex-direction:column;align-items:center;gap:34px">
   <div class="cta" style="font-size:52px;padding:30px 70px">${o.cta||'جرّب مجاناً'}</div>
   ${brand(0.9)}
 </div>`);

// T6 checklist
const T6=(w,h,o)=>wrap(w,h,`
 <div style="position:absolute;left:0;right:0;top:90px;text-align:center;font-weight:900;font-size:66px;padding:0 60px">${o.headline}</div>
 <div style="position:absolute;left:80px;right:80px;top:280px;display:flex;flex-direction:column;gap:26px">
   ${o.items.map(it=>`<div class="chk"><div style="color:${it.c||C.success}">${CHK}</div><span>${it.t}</span></div>`).join('')}
 </div>
 <div style="position:absolute;left:0;right:0;bottom:80px;display:flex;flex-direction:column;align-items:center;gap:30px">
   <div class="cta" style="font-size:48px;padding:26px 60px">${o.cta||'جرّب مجاناً 14 يوم'}</div>
   ${brand(0.8)}
 </div>`);

// ---------- 20 CONFIGS ----------
const F=[1080,1350], SQ=[1080,1080], ST=[1080,1920];
const ads=[
 ['01',...F,T1,{label:'سنة كاملة من Contractor Pro',num:'₪990',sub:'أرخص من نص سنة محاسب',cta:'جرّب مجاناً 14 يوم'}],
 ['02',...F,T1,{label:'מע"מ صار 18% — وأنت لسّا بتحسبه بإيدك؟',num:'18%',sub:'محسوب تلقائي. بلا غلطات.',gp:true,glow:'rgba(124,58,237,.2)',cta:'خلّي التطبيق يحسبها'}],
 ['03',...F,T1,{label:'الزبون بيدفعك بعد…',num:'70 يوم',sub:'بس الـמע"מ والرواتب ما بستنّوا',fs:260,cta:'شوف سيولتك قبل ما تتورّط'}],
 ['04',...F,T1,{label:'سقف עוסק פטור السنوي',num:'₪120,000',sub:'التطبيق بنبّهك قبل ما تتجاوزه',fs:170,cta:'جرّب مجاناً'}],
 ['05',...SQ,T1,{label:'بدون بطاقة · بتلغي بأي وقت',num:'14 يوم',sub:'جرّب كل شي مجاناً',cta:'ابدأ الآن'}],
 ['06',...F,T2,{headline:'كل شغلك بشاشة وحدة — بالعربي',shot:'pulse.png'}],
 ['07',...F,T2,{headline:'سجّل يوم العامل — والراتب بينحسب لحاله',shot:'workdays.png'}],
 ['08',...F,T2,{headline:'رواتب وسلف… محسوبة لحالها',shot:'payroll.png'}],
 ['09',...SQ,T3,{headline:'ليش تدفع أكثر؟',lTitle:'محاسب',lBig:'1,800',lSub:'بالسنة · وما بيدير عامل',rTitle:'Contractor Pro',rBig:'990',rSub:'بالسنة · بيدير كل شي'}],
 ['10',...SQ,T3,{headline:'الفرق واضح',lTitle:'الطريقة القديمة',lBig:'فوضى',lSub:'ورق وحسابات آخر الليل',rTitle:'مع التطبيق',rBig:'نظام',rSub:'كل شي محسوب لحاله'}],
 ['11',...SQ,T4,{quote:'كنت أسهر أحسب رواتب العمال… هلأ بدقيقة بخلّص.',author:'مقاول بناء، رهط'}],
 ['12',...SQ,T4,{quote:'أول مرة بعرف ضريبتي قبل ما توصل الفاتورة.',author:'صاحب عֵסֵק، الناصرة'}],
 ['13',...F,T6,{headline:'كل شي بمكان واحد',items:[{t:'عمّالك وأيام شغلهم ورواتبهم'},{t:'ضريبة: מע"מ + دخل + ביטוח לאומي'},{t:'توقّع السيولة ورادار التحصيل'},{t:'بوّابة خاصة للعامل'}]}],
 ['14',...F,T6,{headline:'ليش Contractor Pro؟',items:[{t:'أول تطبيق مقاولات بالعربي 100%'},{t:'كله من موبايلك'},{t:'أرخص من نص سنة محاسب'},{t:'جرّبه مجاناً 14 يوم'}]}],
 ['15',...ST,T5,{hook:'الساعة 11 ونص…<br>ولسّا بتحسب بإيدك؟',bubbles:[{t:'راتب محمد؟',pos:'left:120px;top:360px'},{t:'إيصال 320₪',pos:'right:120px;top:300px'},{t:'מע"מ؟',pos:'right:150px;top:560px'},{t:'سلفة 600₪',pos:'left:150px;top:600px'}]}],
 ['16',...ST,T5,{hook:'شغلك مليان…<br>بس جيبتك فاضية؟',glow:'rgba(34,197,94,.18)',cta:'تحكّم بسيولتك',bubbles:[{t:'دفعة متأخّرة',pos:'left:130px;top:340px'},{t:'رواتب بكرا',pos:'right:120px;top:300px'},{t:'מע"מ 15 الشهر',pos:'right:150px;top:560px'}]}],
 ['17',...SQ,T3,{headline:'بأي لغة بتدير شغلك؟',lTitle:'التطبيقات الثانية',lBig:'עברית',lSub:'لغة مش لغتك',rTitle:'Contractor Pro',rBig:'عربي',rSub:'لغتك، على موبايلك'}],
 ['18',...F,T6,{headline:'ضريبة بلا وجع',items:[{t:'מע"מ 18% داخل وخارج محسوب'},{t:'ضريبة دخل بالشرائح'},{t:'ביטוח לאומי بشريحتين — مش نسبة مسطّحة'},{t:'تصدير جاهز لفترة الإبلاغ'}],cta:'خلّيها على التطبيق'}],
 ['19',...SQ,T1,{label:'أول تطبيق مقاولات',num:'بالعربي',sub:'100% — كله من موبايلك',fs:150,cta:'جرّب مجاناً 14 يوم'}],
 ['20',...ST,T2,{headline:'نبض مصلحتك بضغطة',shot:'pulse.png',phoneTop:560,pw:640,ph:920,cta:'جرّب مجاناً · 990₪/سنة'}],
];

const browser = await chromium.launch({ args:['--no-sandbox','--force-color-profile=srgb'] });
const page = await browser.newPage({ deviceScaleFactor:1 });
for (const [id,w,h,T,o] of ads){
  const html = T(w,h,o);
  const f = path.join(DIR, `_tmp.html`);
  writeFileSync(f, html);
  await page.setViewportSize({width:w,height:h});
  await page.goto('file://'+f);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(DIR, `ad_${id}.png`) });
  console.log('ad_'+id+'.png', w+'x'+h);
}
await browser.close();
console.log('DONE 20 ads');
