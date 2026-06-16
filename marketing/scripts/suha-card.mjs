import { chromium } from 'playwright'
import { resolve } from 'node:path'
const OUT = resolve(process.cwd(), 'promo-frames')
const GRAD='linear-gradient(135deg, #F97316, #DC2626)'
const HH=`<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/></svg>`
const html=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}body{font-family:'Noto Sans Arabic';color:#F8FAFC}</style></head><body>
<div style="position:absolute;top:64px;inset-inline-end:64px;display:flex;align-items:center;gap:14px;background:rgba(7,8,15,.55);backdrop-filter:blur(8px);padding:14px 22px 14px 16px;border-radius:22px;border:1px solid rgba(249,115,22,.3)">
<div style="width:64px;height:64px;border-radius:17px;background:${GRAD};display:flex;align-items:center;justify-content:center">${HH}</div>
<div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:34px;letter-spacing:-0.03em">Contractor<span style="color:#F97316"> Pro</span></div></div>
<div style="position:absolute;bottom:300px;inset-inline-start:64px;display:flex;align-items:center;gap:16px;background:rgba(7,8,15,.6);backdrop-filter:blur(8px);padding:16px 26px;border-radius:20px;border:1px solid rgba(249,115,22,.3)">
<div style="width:12px;height:64px;border-radius:6px;background:${GRAD}"></div>
<div><div style="font-family:'Noto Kufi Arabic';font-weight:900;font-size:46px;line-height:1">سُهى</div>
<div style="font-size:30px;color:#CBD5E1;font-weight:600;margin-top:6px">محاسِبة · مكتب مقاولات</div></div></div></body></html>`
const b=await chromium.launch({channel:'chromium'}).catch(()=>chromium.launch())
const c=await b.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1}); const p=await c.newPage()
await p.setContent(html,{waitUntil:'networkidle'}); await p.waitForTimeout(250)
await p.screenshot({path:resolve(OUT,'suha-overlay.png'),omitBackground:true}); console.log('✅ suha-overlay.png'); await b.close()
