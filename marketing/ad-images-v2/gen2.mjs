// 30 premium "hero" ad creatives (badge + headline + sub + slot + CTA + brand footer).
// node gen2.mjs   (NODE_PATH=/tmp/node_modules)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const A = '/home/user/contractor-pro/marketing/video-ad/assets';
mkdirSync(DIR, { recursive: true });

const C={bg:'#07080F',surface:'#0D0F1C',card:'#12152A',primary:'#F97316',accent:'#EF4444',secondary:'#7C3AED',
  success:'#22C55E',cyan:'#06B6D4',gold:'#D97706',text:'#F8FAFC',dim:'#64748B'};

// inline icons (stroke=currentColor)
const I={
 zap:'<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
 activity:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 percent:'<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
 wallet:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
 trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
 smart:'<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 hat:'<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
 check:'<polyline points="20 6 9 17 4 12"/>',
};
const svg=(p,sw=2)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

const css=`
@font-face{font-family:'Cairo';font-weight:700;src:url('file://${A}/cairo-arabic-700-normal.woff2'),url('file://${A}/cairo-latin-700-normal.woff2');}
@font-face{font-family:'Cairo';font-weight:900;src:url('file://${A}/cairo-arabic-900-normal.woff2'),url('file://${A}/cairo-latin-900-normal.woff2');}
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
body{font-family:'Cairo',sans-serif;color:${C.text};}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:radial-gradient(120% 70% at 50% 8%, #1a1206 0%, #0c0a12 38%, ${C.bg} 75%);}
.badge{position:absolute;left:50%;top:300px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;
  border:1.5px solid rgba(249,115,22,.5);background:rgba(249,115,22,.10);color:${C.primary};border-radius:999px;padding:16px 34px;font-weight:900;font-size:34px;white-space:nowrap;}
.badge svg{width:34px;height:34px;}
.h1{position:absolute;left:80px;right:80px;top:430px;text-align:center;font-weight:900;font-size:96px;line-height:1.16;letter-spacing:-0.02em;}
.h1 .o{color:${C.primary};}
.sub{position:absolute;left:120px;right:120px;top:690px;text-align:center;font-weight:700;font-size:40px;line-height:1.5;color:#94a3b8;}
.cta{position:absolute;left:70px;bottom:120px;display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,${C.primary},${C.accent});
  color:#fff;font-weight:900;font-size:42px;padding:26px 46px;border-radius:22px;box-shadow:0 16px 50px rgba(249,115,22,.45);}
.cta svg{width:36px;height:36px;}
.foot{position:absolute;right:70px;bottom:128px;display:flex;align-items:center;gap:16px;}
.foot .tx{text-align:right;}
.foot .tx .n{font-weight:900;font-size:40px;}
.foot .tx .t{font-weight:700;font-size:26px;color:${C.dim};}
.foot .ic{width:66px;height:66px;border-radius:18px;background:linear-gradient(135deg,${C.primary},${C.accent});display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(249,115,22,.4);}
.foot .ic svg{width:38px;height:38px;color:#fff;}
.phone{position:absolute;left:50%;top:800px;transform:translateX(-50%);width:600px;height:880px;border-radius:52px;border:11px solid #1b1f33;background:#0b0d18;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6);}
.phone img{width:100%;display:block;}
.bignum{position:absolute;left:0;right:0;top:820px;text-align:center;}
.bignum .n{font-weight:900;font-size:300px;line-height:.9;letter-spacing:-0.04em;background:linear-gradient(135deg,${C.primary},${C.accent});-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums;}
.bignum .l{font-weight:900;font-size:58px;margin-top:24px;}
.card{position:absolute;left:90px;right:90px;top:820px;display:flex;flex-direction:column;gap:24px;}
.row{display:flex;align-items:center;gap:22px;background:${C.card};border:1px solid rgba(249,115,22,.16);border-radius:20px;padding:28px 32px;}
.row svg{width:46px;height:46px;flex:none;color:${C.success};}
.row span{font-weight:700;font-size:42px;}
.glowc{position:absolute;width:760px;height:760px;border-radius:50%;filter:blur(8px);pointer-events:none;}
.bighook{position:absolute;left:70px;right:70px;top:620px;text-align:center;font-weight:900;font-size:124px;line-height:1.18;letter-spacing:-0.02em;}
.bighook .o{color:${C.primary};}
`;
const foot=()=>`<div class="foot"><div class="tx"><div class="n">Contractor Pro</div><div class="t">إدارة مقاولات — للمقاول العربي</div></div><div class="ic">${svg(I.hat)}</div></div>`;
const cta=(t='جرّب 14 يوم مجاناً')=>`<div class="cta"><span>${t}</span>${svg(I.check,2.5)}</div>`;
const badge=(ic,t)=>`<div class="badge">${svg(I[ic])}<span>${t}</span></div>`;
const page=(inner)=>`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="stage">
  <div class="glowc" style="left:50%;top:2%;transform:translateX(-50%);background:radial-gradient(circle,rgba(249,115,22,.20),transparent 62%)"></div>
  ${inner}</div></body></html>`;

// slot builders
const phone=(shot)=>`<div class="phone"><img src="file://${A}/${shot}"></div>`;
const bignum=(n,l)=>`<div class="bignum"><div class="n">${n}</div><div class="l">${l}</div></div>`;
const list=(items)=>`<div class="card">${items.map(t=>`<div class="row">${svg(I.check,3)}<span>${t}</span></div>`).join('')}</div>`;

const hero=({bdg,bt,h1,sub,slot,c})=>page(`${badge(bdg,bt)}<div class="h1">${h1}</div>${sub?`<div class="sub">${sub}</div>`:''}${slot||''}${cta(c)}${foot()}`);
const hook=({bdg,bt,big,sub,c,glow})=>page(`${badge(bdg,bt)}
  <div class="glowc" style="left:50%;top:30%;transform:translate(-50%,0);background:radial-gradient(circle,${glow||'rgba(239,68,68,.18)'},transparent 62%)"></div>
  <div class="bighook">${big}</div>${sub?`<div class="sub" style="top:1180px">${sub}</div>`:''}${cta(c)}${foot()}`);

// ---------------- 30 CONFIGS ----------------
const ads=[
 // phone-hero (rotate 3 screenshots, different ideas)
 ['01',hero,{bdg:'activity',bt:'لوحة التحكّم الذكية',h1:'كل أرقام مصلحتك<br><span class="o">أمامك بثانية</span>',sub:'نبض المصلحة، توقّع السيولة، وصافي الربح — محسوبة تلقائياً.',slot:phone('pulse.png')}],
 ['02',hero,{bdg:'activity',bt:'نبض المصلحة',h1:'اعرف صحّة شغلك<br><span class="o">من رقم واحد</span>',sub:'مؤشّر ذكي 0–100 بيقيس السيولة والربحية والتحصيل.',slot:phone('pulse.png')}],
 ['03',hero,{bdg:'trend',bt:'التوقّع الذكي',h1:'شوف سيولتك<br><span class="o">3 أشهر قدّام</span>',sub:'التطبيق بيتوقّع مصاريك الجايّة قبل ما تتورّط.',slot:phone('pulse.png')}],
 ['04',hero,{bdg:'users',bt:'إدارة العمّال',h1:'سجّل يوم العامل<br><span class="o">بلمسة وحدة</span>',sub:'نص يوم، يوم كامل، أوفرتايم — كله بضغطة.',slot:phone('workdays.png')}],
 ['05',hero,{bdg:'wallet',bt:'حساب تلقائي',h1:'الراتب بينحسب<br><span class="o">لحاله</span>',sub:'حتى الخصومات حسب نوع العامل — بلا غلطات.',slot:phone('workdays.png')}],
 ['06',hero,{bdg:'wallet',bt:'الرواتب والسلف',h1:'مين مدفوع<br><span class="o">ومين باقيله؟</span>',sub:'كل عامل، راتبه، سلفه، ورصيده — بنظرة وحدة.',slot:phone('payroll.png')}],
 ['07',hero,{bdg:'shield',bt:'توقيع آمن',h1:'وقّع الراتب ببصمة<br><span class="o">قبل ما يطلع</span>',sub:'تأكيد بصمة للعمليات الحسّاسة — أمان كامل.',slot:phone('payroll.png')}],
 ['08',hero,{bdg:'smart',bt:'كله بموبايلك',h1:'عمّالك وحساباتهم<br><span class="o">بجيبتك</span>',sub:'من أي مكان، من الموبايل — بلا أوراق ولا دفاتر.',slot:phone('workdays.png')}],
 ['09',hero,{bdg:'activity',bt:'مساعدك الذكي',h1:'التطبيق بيحكيلك<br><span class="o">شو تعمل اليوم</span>',sub:'تنبيهات: تحصيل متأخّر، راتب مستحقّ، فرصة ربح.',slot:phone('pulse.png')}],
 ['10',hero,{bdg:'wallet',bt:'رصيد العامل',h1:'بلا «وين حسابي؟»<br><span class="o">بعد اليوم</span>',sub:'كل عامل بيشوف رصيده وسلفه — شفافية كاملة.',slot:phone('payroll.png')}],
 // stat-hero
 ['11',hero,{bdg:'wallet',bt:'أرخص من محاسب',h1:'سنة كاملة بـ',slot:bignum('₪990','أرخص من نص سنة محاسب')}],
 ['12',hero,{bdg:'percent',bt:'محرّك الضرائب',h1:'מע"מ صار',slot:bignum('18%','محسوب لحاله — بلا غلطات')}],
 ['13',hero,{bdg:'clock',bt:'وجع السيولة',h1:'الزبون بيدفعك بعد',slot:bignum('70 يوم','بس الـמע"מ والرواتب ما بستنّوا')}],
 ['14',hero,{bdg:'shield',bt:'تنبيه ذكي',h1:'سقف עוסק פטור',slot:bignum('₪120k','بنبّهك قبل ما تتجاوزه')}],
 ['15',hero,{bdg:'zap',bt:'بدون مخاطرة',h1:'جرّب كل شي',slot:bignum('14 يوم','مجاناً · بدون بطاقة'),c:'ابدأ الآن'}],
 ['16',hero,{bdg:'smart',bt:'الأول من نوعه',h1:'مقاولات',slot:bignum('بالعربي','100% — كله من موبايلك')}],
 ['17',hero,{bdg:'zap',bt:'سرعة',h1:'كل حساباتك جاهزة خلال',slot:bignum('3 ثواني','بدل سهر الليل على الورق')}],
 ['18',hero,{bdg:'trend',bt:'تحت السيطرة',h1:'اعرف أرباحك',slot:bignum('لحظياً','لكل مشروع على حدة')}],
 // checklist-hero
 ['19',hero,{bdg:'activity',bt:'كل شي بمكان واحد',h1:'مصلحتك كلها<br><span class="o">بتطبيق واحد</span>',slot:list(['عمّالك وأيام شغلهم ورواتبهم','ضريبة: מע"מ + دخل + ביטוח לאומي','توقّع السيولة ورادار التحصيل','بوّابة خاصة للعامل'])}],
 ['20',hero,{bdg:'percent',bt:'ضريبة بلا وجع',h1:'الضريبة<br><span class="o">محسوبة صح</span>',slot:list(['מע"מ 18% داخل وخارج','ضريبة دخل بالشرائح','ביטוח לאומي بشريحتين','تصدير جاهز للإبلاغ'])}],
 ['21',hero,{bdg:'hat',bt:'ليش Contractor Pro؟',h1:'مصمَّم<br><span class="o">للمقاول العربي</span>',slot:list(['أول تطبيق مقاولات بالعربي 100%','أرخص من نص سنة محاسب','كله من موبايلك','تجربة مجانية 14 يوم'])}],
 ['22',hero,{bdg:'users',bt:'بوّابة العامل',h1:'خلّي العامل<br><span class="o">يخدم حاله</span>',slot:list(['يشوف كشف حسابه','يطلب سلفته بنفسه','يسجّل بضاعة ومصروف','بلا ما يزعجك كل يوم'])}],
 ['23',hero,{bdg:'zap',bt:'بيشتغل بدالك',h1:'3 أشياء<br><span class="o">التطبيق بيعملها عنك</span>',slot:list(['بيحسب الرواتب والخصومات','بيطلّع ضريبتك جاهزة','بينبّهك قبل أي مشكلة'])}],
 // hook-hero (bold text)
 ['24',hook,{bdg:'clock',bt:'آخر الليل',big:'بطّل تحسب<br><span class="o">آخر الليل</span>',sub:'خلّي التطبيق يحسبلك كل شي — وانت نام مرتاح.'}],
 ['25',hook,{bdg:'wallet',bt:'عصرة السيولة',big:'شغلك مليان…<br><span class="o">وجيبتك فاضية؟</span>',sub:'شوف سيولتك ومين متأخّر بالدفع قبل ما تتورّط.',glow:'rgba(34,197,94,.16)',c:'تحكّم بسيولتك'}],
 ['26',hook,{bdg:'smart',bt:'وفّر مصاري',big:'المحاسب غالي…<br><span class="o">والموبايل بكفّي</span>',sub:'990 شيكل بالسنة بدل آلاف للمحاسب.'}],
 ['27',hook,{bdg:'users',bt:'راحة بال',big:'عمّالك بيسألوا<br><span class="o">«وين حسابي؟»</span>',sub:'بوّابة العامل بتورّيهم حسابهم — وتريّحك.',glow:'rgba(6,182,212,.16)',c:'جرّب البوّابة مجاناً'}],
 ['28',hook,{bdg:'hat',bt:'بسيط',big:'مش لازم تكون محاسب<br><span class="o">عشان تدير مصلحتك</span>',sub:'كل شي بالعربي وبضغطة — حتى لو ما بتفهم بالأرقام.'}],
 ['29',hook,{bdg:'activity',bt:'الفرق',big:'كل المقاولين<br>بيعانوا من هاد…<br><span class="o">إلا اللي عندهم Pro</span>',sub:'عمال، رواتب، ضريبة، سيولة — كله مظبوط.'}],
 ['30',hook,{bdg:'zap',bt:'ابدأ اليوم',big:'جرّبه مجاناً<br><span class="o">وشوف الفرق بأسبوع</span>',sub:'14 يوم مجاناً · بدون بطاقة · app.linko.services',c:'ابدأ الآن'}],
];

const browser=await chromium.launch({args:['--no-sandbox','--force-color-profile=srgb']});
const p=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
for(const [id,fn,o] of ads){
  const html=fn(o);
  const f=path.join(DIR,'_t.html'); writeFileSync(f,html);
  await p.goto('file://'+f);
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(120);
  await p.screenshot({path:path.join(DIR,`v2_${id}.png`)});
  console.log('v2_'+id+'.png');
}
await browser.close();
console.log('DONE 30');
