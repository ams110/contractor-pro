import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ShieldCheck, User, Fingerprint, Tag, Banknote, Wallet, Bell, Camera,
  Check, ChevronLeft, Sparkles,
} from 'lucide-react'
import { C } from '../constants/index.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const ICONS = { User, Fingerprint, Tag, Banknote, Wallet, Bell, Camera }

// عدّاد تصاعدي ناعم
function useCountUp(target, duration = 1100, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf, t0
    const tick = (t) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / duration)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return val
}

function Ring({ score, tone, label, animate }) {
  const t = TONE[tone] || TONE.fair
  const R = 54, SW = 11, SIZE = 134, CX = SIZE / 2
  const display = useCountUp(score, 1100, animate)
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <motion.div aria-hidden
        animate={animate ? { scale: [1, 1.1, 1], opacity: [0.45, 0.12, 0.45] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, pointerEvents: 'none' }}
      />
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`rdy-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.main} stopOpacity={0.6} />
            <stop offset="100%" stopColor={t.main} />
          </linearGradient>
        </defs>
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        <motion.circle
          cx={CX} cy={CX} r={R} fill="none"
          stroke={`url(#rdy-${tone})`} strokeWidth={SW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - score : 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${t.glow})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, direction: 'ltr' }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
        <span style={{ padding: '2px 11px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55`, fontSize: 11, fontWeight: 800, color: t.main }}>{label}</span>
      </div>
    </div>
  )
}

export default function AccountReadiness({ readiness, onFix }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  if (!readiness) return null
  const t = TONE[readiness.tone] || TONE.fair
  const complete = readiness.missing.length === 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`,
        border: `1px solid ${t.main}33`, borderRadius: 22, padding: '16px', marginBottom: 20,
      }}
    >
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -30, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={15} color={t.main} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>جاهزية الحساب</div>
          <div style={{ fontSize: 10, color: C.textDim }}>اكتمل {readiness.doneCount} من {readiness.total} — أمّن وأكمل إعدادك</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <Ring score={readiness.score} tone={readiness.tone} label={readiness.label} animate={inView} />

        <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {complete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: C.card, border: `1px solid ${C.success}26`, borderRadius: 13 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.success}1c`, border: `1px solid ${C.success}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={15} color={C.success} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>حسابك مُعدّ ومؤمّن بالكامل — ما في إشي ناقص 🎯</span>
            </div>
          ) : (
            readiness.missing.slice(0, 3).map((m, i) => {
              const Icon = ICONS[m.icon] || Sparkles
              const color = m.critical ? C.accent : C.primary
              return (
                <motion.button
                  key={m.key}
                  initial={{ opacity: 0, x: 10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  onClick={() => onFix?.(m.key)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                    background: C.card, border: `1px solid ${color}26`, borderRadius: 12,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start', width: '100%',
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.hint}</div>
                  </div>
                  {m.critical && <span style={{ fontSize: 8, fontWeight: 800, color: C.accent, background: `${C.accent}18`, border: `1px solid ${C.accent}33`, borderRadius: 5, padding: '2px 5px', flexShrink: 0 }}>مهم</span>}
                  <ChevronLeft size={14} color={C.textDim} style={{ flexShrink: 0 }} />
                </motion.button>
              )
            })
          )}
        </div>
      </div>
    </motion.div>
  )
}
