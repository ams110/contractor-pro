import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')
const W=1080,H=1920
const C={ primary:'#F97316', success:'#22C55E', cyan:'#06B6D4', text:'#F8FAFC', textDim:'#CBD5E1' }
const GRAD='linear-gradient(135deg, #F97316, #DC2626)'
const HH=`<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const glow=(c,x,y,s=700)=>`<div style="position:absolute;${x};${y};width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,${c},transparent 70%);filter:blur(28px)"></div>`
const base=(inner,opaque=false)=>`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}body{${opaque?'background:#07080F':'background:transparent'};font-family:'Noto Sans Arabic';color:${C.text};position:relative}.kufi{font-family:'Noto Kufi Arabic'}</style></head><body>${inner}</body></html>`

// عنوان مشهد سفلي (سينمائي، بسيط)
const cap=(line,color=C.text)=>base(`
<div style="position:absolute;inset-inline:0;bottom:0;height:560px;background:linear-gradient(to top,rgba(0,0,0,.85) 12%,rgba(0,0,0,.45) 45%,transparent);
 display:flex;align-items:flex-end;justify-content:center;padding:0 90px 200px;z-index:2">
 <div class="kufi" style="font-weight:800;font-size:62px;line-height:1.35;text-align:center;letter-spacing:-0.02em;color:${color};text-shadow:0 4px 30px rgba(0,0,0,.8)">${line}</div></div>`)

const cards={
  'hero-cap-stress': cap('بين الورق والحسابات…<br>وبعيد عن عيلتي'),
  'hero-cap-app':    cap('هلّأ… كل شي<br><span style="color:'+C.success+'">محسوب لحالو</span>'),
  'hero-cap-family': cap('ورجعت <span style="color:'+C.primary+'">لعيلتي</span> ❤️'),
  'hero-cta': base(`
   ${glow('rgba(249,115,22,.32)','top:50%','inset-inline-start:50%;transform:translate(-50%,-50%)',900)}
   <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:54px;padding:0 80px;text-align:center;z-index:2">
     <div style="display:flex;align-items:center;gap:18px">
       <div style="width:104px;height:104px;border-radius:27px;background:${GRAD};display:flex;align-items:center;justify-content:center;box-shadow:0 18px 50px rgba(249,115,22,.5)">${HH}</div>
       <div class="kufi" style="font-weight:900;font-size:58px;letter-spacing:-0.03em">Contractor<span style="color:${C.primary}"> Pro</span></div></div>
     <div class="kufi" style="font-weight:900;font-size:96px;line-height:1.2;letter-spacing:-0.04em">شغلك مرتّب،<br>ووقتك <span style="background:${GRAD};-webkit-background-clip:text;background-clip:text;color:transparent">إلك</span>.</div>
     <div style="background:${GRAD};color:#fff;font-weight:900;font-size:52px;padding:32px 80px;border-radius:26px;box-shadow:0 18px 50px rgba(249,115,22,.5)" class="kufi">جرّبه مجّاناً</div>
   </div>`, true),
}
const b=await chromium.launch({channel:'chromium'}).catch(()=>chromium.launch())
const c=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:1}); const p=await c.newPage()
for(const[n,h]of Object.entries(cards)){ await p.setContent(h,{waitUntil:'networkidle'}); await p.waitForTimeout(220)
 await p.screenshot({path:resolve(OUT,`${n}.png`),omitBackground:n!=='hero-cta'}); console.log('✅',n) }
await b.close()
