import React, { useState, useEffect } from 'react'
import { HardHat } from 'lucide-react'
import { C } from '../constants/index.js'
import Building3D from '../components/Building3D.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDING 3D REEL — فيديو إعلاني ٩:١٦ يعرض مجسّم العمارة 3D **الحقيقي**
//  (نفس كومبوننت <Building3D/> المستعمل بدفتر المشروع) وهو يُبنى طابق فوق طابق.
//  يُسجَّل عبر Playwright (انظر تعليمات أسفل الملف). المسار: /b3dreel
// ═══════════════════════════════════════════════════════════════════════════

const B = { id: 'b1', name: 'عمارة A', status: 'structure' }
// طوابق تظهر تباعاً (من تحت لفوق): مكتمل→مكتمل→تشطيب→هيكل→أساس
const SEQ = ['done', 'done', 'finishing', 'structure', 'foundation']
const mkFloor = (i, status) => ({ id: 'f' + i, level: 'floor', parent_id: 'b1', sort_order: i, status })

export default function Building3DReel() {
  const [n, setN] = useState(0)

  useEffect(() => {
    const ms = [2600, 3300, 4000, 4700, 5400]
    const timers = ms.map((t, i) => setTimeout(() => setN(i + 1), t))
    return () => timers.forEach(clearTimeout)
  }, [])

  const units = SEQ.slice(0, n).map((s, i) => mkFloor(i, s))

  return (
    <div style={{ width: 1080, height: 1920, overflow: 'hidden', position: 'relative', background: C.bg, fontFamily: "'Noto Kufi Arabic','Noto Naskh Arabic',sans-serif", direction: 'rtl' }}>
      <style>{`
        @keyframes b3dFade{to{opacity:1}}
        @keyframes b3dCap{0%{opacity:0;transform:translateY(28px)}11%{opacity:1;transform:translateY(0)}86%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-22px)}}
        @keyframes b3dPop{to{opacity:1;transform:scale(1)}}
        @keyframes b3dTowerOut{to{opacity:.1;filter:blur(3px)}}
        .b3dGrid{position:absolute;inset:0;opacity:0;background-image:linear-gradient(rgba(6,182,212,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.08) 1px,transparent 1px);background-size:54px 54px;animation:b3dFade .8s ease forwards .1s}
        .b3dGlow{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at 50% 40%,rgba(11,21,48,.9) 0%,transparent 60%);animation:b3dFade 1s ease forwards}
        .b3dCap{position:absolute;left:0;right:0;text-align:center;color:${C.text};opacity:0;padding:0 70px;text-shadow:0 4px 30px rgba(0,0,0,.95);animation:b3dCap var(--dur) ease forwards var(--at)}
        .b3dStage{position:absolute;top:740px;left:50%;transform:translateX(-50%) scale(1.5);width:600px;height:600px;animation:b3dTowerOut .7s ease forwards 12.7s}
        .b3dDim{position:absolute;inset:0;background:rgba(7,8,15,.4);opacity:0;animation:b3dFade .6s ease forwards 12.7s}
        .b3dFinale{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;opacity:0;animation:b3dFade .6s ease forwards 12.8s}
        .b3dSoon{font-size:150px;font-weight:700;color:${C.text};letter-spacing:-2px;text-shadow:0 0 50px rgba(249,115,22,.6);opacity:0;transform:scale(.6);animation:b3dPop .8s cubic-bezier(.2,1.5,.4,1) forwards 13s}
        .b3dLogo{display:flex;align-items:center;gap:22px;opacity:0;animation:b3dFade .7s ease forwards 13.5s}
        .b3dTag{font-size:38px;color:#94a3b8;font-weight:500;opacity:0;animation:b3dFade .7s ease forwards 14s}
      `}</style>

      <div className="b3dGlow" />
      <div className="b3dGrid" />

      {/* المجسّم الحقيقي من التطبيق */}
      <div className="b3dStage">
        <Building3D building={B} units={units} size="full" spin animate />
      </div>

      {/* النصوص */}
      <div className="b3dCap" style={{ top: 230, fontSize: 64, fontWeight: 700, lineHeight: 1.25, '--at': '.4s', '--dur': '2.1s' }}>
        بتسجّل <b style={{ color: C.cyan }}>عمارة</b> بالتطبيق؟
      </div>
      <div className="b3dCap" style={{ top: 1190, fontSize: 72, fontWeight: 700, lineHeight: 1.2, '--at': '2.5s', '--dur': '4.1s' }}>
        شوفها <b style={{ color: C.primary }}>تنبني قدّامك</b><br />طابق فوق طابق
      </div>
      <div className="b3dCap" style={{ top: 1190, fontSize: 42, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.95, '--at': '7s', '--dur': '2.9s' }}>
        كل طابق بمرحلته<br />
        {['#F97316', '#EAB308', '#06B6D4', '#22C55E'].map((c, i) => (
          <span key={i} style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', background: c, verticalAlign: -3, marginLeft: 10, marginRight: i ? 18 : 0 }} />
        ))}
      </div>
      <div className="b3dCap" style={{ top: 1200, fontSize: 60, fontWeight: 700, lineHeight: 1.3, '--at': '10s', '--dur': '2.7s' }}>
        مجسّم <b style={{ color: C.cyan }}>3D حيّ</b><br />جوّا دفتر المشروع
      </div>

      {/* الكشف */}
      <div className="b3dDim" />
      <div className="b3dFinale">
        <div className="b3dSoon">قريباً</div>
        <div className="b3dLogo">
          <div style={{ width: 118, height: 118, borderRadius: 30, background: 'linear-gradient(135deg,#F97316,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 50px rgba(249,115,22,.45)' }}>
            <HardHat size={68} color="#fff" strokeWidth={2.1} />
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, color: C.text }}>
            Contractor Pro
            <span style={{ display: 'block', fontSize: 30, fontWeight: 500, color: C.cyan, marginTop: 4 }}>إدارة مقاولاتك بجيبتك</span>
          </div>
        </div>
        <div className="b3dTag">الميزة الجديدة — قبل ما حدا غيرك</div>
      </div>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 42%,transparent 45%,rgba(0,0,0,.7) 100%)' }} />
    </div>
  )
}
