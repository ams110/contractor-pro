import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowLeft, MousePointerClick, HardHat } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { IDEAS, SCREEN_MAP, Phone } from './AdStudio.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  AD REEL — نسخة فيديو ٩:١٦ من بوسترات AdStudio (هوك متحرّك → موبايل بشاشة
//  حقيقية → CTA). كابشن محروق للمشاهدة بلا صوت. يُسجَّل عبر scripts/reel-shots.mjs.
//  المسار: /adreel?idea=N&dur=11000
//  يضبط window.__reelDone=true عند انتهاء التايملاين ليعرف سكربت التسجيل متى يقف.
// ═══════════════════════════════════════════════════════════════════════════

const STAGE = { w: 1080, h: 1920 }

// نبرة لونية لكل فكرة (مطابقة لـ AdStudio)
const TONE = {
  brand:   { c: C.primary,   grad: GRAD.primary, glow: 'rgba(249,115,22,0.45)' },
  success: { c: C.success,   grad: GRAD.success, glow: 'rgba(34,197,94,0.45)'  },
  cyan:    { c: C.cyan,      grad: GRAD.cyan,    glow: 'rgba(6,182,212,0.45)'  },
  premium: { c: C.secondary, grad: GRAD.purple,  glow: 'rgba(124,58,237,0.45)' },
  gold:    { c: C.gold,      grad: GRAD.gold,    glow: 'rgba(217,119,6,0.45)'  },
  danger:  { c: C.accent,    grad: GRAD.danger,  glow: 'rgba(239,68,68,0.45)'  },
}

export default function AdReel() {
  const params  = new URLSearchParams(window.location.search)
  const i       = Number(params.get('idea') || 0)
  const idea    = IDEAS[i] || IDEAS[0]
  const map     = SCREEN_MAP[i] || { s: 'dashboard' }
  const t       = TONE[idea.tone] || TONE.brand
  const dur     = Number(params.get('dur') || 11000)

  const [phase, setPhase] = useState(0) // 0 intro · 1 محتوى · 2 CTA

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 250)
    const t2 = setTimeout(() => setPhase(2), 7600)
    const t3 = setTimeout(() => { window.__reelDone = true }, dur)
    window.__reelDone = false
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [dur])

  return (
    <div style={{
      width: STAGE.w, height: STAGE.h, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 70% at 80% -8%, ${t.c}24, transparent 52%), radial-gradient(100% 60% at -10% 108%, ${t.glow.replace('0.45', '0.16')}, transparent 48%), ${C.bg}`,
      fontFamily: "'Noto Sans Arabic', system-ui, sans-serif", direction: 'rtl', color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '120px 72px 96px',
    }}>
      {/* شبكة خفيفة */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: '56px 56px', maskImage: 'radial-gradient(circle at 50% 32%, #000 28%, transparent 72%)', WebkitMaskImage: 'radial-gradient(circle at 50% 32%, #000 28%, transparent 72%)' }} />
      {/* توهّج نابض خلف الموبايل */}
      <motion.div aria-hidden animate={{ opacity: [0.4, 0.62, 0.4], scale: [1, 1.08, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '40%', insetInline: 0, margin: 'auto', width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 66%)`, filter: 'blur(10px)' }} />

      {/* الشارة */}
      <motion.div initial={{ opacity: 0, y: -18 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}
        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 22px', borderRadius: 99, background: `${t.c}1a`, border: `1px solid ${t.c}44`, marginBottom: 30 }}>
        <Sparkles size={22} color={t.c} />
        <span style={{ fontSize: 22, fontWeight: 800, color: t.c }}>{idea.tag}</span>
      </motion.div>

      {/* الهوك */}
      <motion.h1 initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }} animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}} transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', textAlign: 'center', fontSize: 78, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.035em', margin: 0, maxWidth: 920 }}>
        {idea.kw}{' '}
        <span style={{ background: t.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{idea.head}</span>
      </motion.h1>

      {/* الكابشن المحروق */}
      <motion.p initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.55 }}
        style={{ position: 'relative', textAlign: 'center', fontSize: 27, lineHeight: 1.55, color: C.textDim, fontWeight: 500, margin: '26px 0 0', maxWidth: 800 }}>
        {idea.sub}
      </motion.p>

      {/* الموبايل — ينزلق صاعداً ثم يطفو */}
      <motion.div
        initial={{ opacity: 0, y: 620 }}
        animate={phase >= 1 ? { opacity: 1, y: [600, 0, 0, -14, 0], } : {}}
        transition={{ opacity: { duration: 0.6, delay: 0.6 }, y: { duration: 6.5, delay: 0.6, times: [0, 0.18, 0.5, 0.75, 1], ease: 'easeInOut' } }}
        style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginTop: 44, width: '100%' }}>
        <Phone screen={map.s} focus={map.f} scale={1.5} />
      </motion.div>

      {/* CTA السفلي */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: 30 }}>
        <motion.div animate={phase >= 2 ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 38px', borderRadius: 20, background: GRAD.success, boxShadow: `0 16px 40px ${C.success}55` }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: '#062b14' }}>جرّب 14 يوم مجاناً</span>
          <ArrowLeft size={28} color="#062b14" strokeWidth={2.8} />
        </motion.div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: C.text }}>
          <MousePointerClick size={24} color={t.c} />
          <span style={{ fontSize: 24, fontWeight: 800 }}>الرابط بالبايو</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${C.primary}55` }}>
            <HardHat size={30} color="#fff" strokeWidth={2.4} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>Contractor <span style={{ color: C.primary }}>Pro</span></div>
            <div style={{ fontSize: 15, color: C.textDim, fontWeight: 600 }}>إدارة مقاولاتك من جيبك</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
