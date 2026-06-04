import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Activity, Wallet, Clock, AlertTriangle, TrendingDown, TrendingUp,
  MessageCircle, CheckCircle2, Sparkles, ChevronLeft,
} from 'lucide-react'
import { C } from '../constants/index.js'

// نبرة لونية → ألوان الثيم
const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = {
  warn: C.accent,
  tip:  C.cyan,
  good: C.success,
}

const ICONS = { Activity, Wallet, Clock, AlertTriangle, TrendingDown, TrendingUp, MessageCircle, CheckCircle2, Sparkles }

// عدّاد تصاعدي ناعم عبر requestAnimationFrame
function useCountUp(target, duration = 1300, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf, t0
    const tick = (t) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)   // easeOutCubic
      setVal(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return val
}

// ─── العدّاد الدائري ──────────────────────────────────────────────────────────────
function Gauge({ score, tone, animate }) {
  const t = TONE[tone] || TONE.fair
  const R = 70, SW = 13, SIZE = 180, CX = SIZE / 2
  const display = useCountUp(score, 1300, animate)

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      {/* هالة نابضة — "النبض" */}
      <motion.div
        aria-hidden
        animate={animate ? { scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, pointerEvents: 'none' }}
      />
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`pulse-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={t.main} stopOpacity={0.65} />
            <stop offset="100%" stopColor={t.main} />
          </linearGradient>
        </defs>
        {/* المسار الخلفي */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        {/* التقدّم */}
        <motion.circle
          cx={CX} cy={CX} r={R} fill="none"
          stroke={`url(#pulse-${tone})`} strokeWidth={SW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - score : 100 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }}
        />
      </svg>
      {/* الرقم في المنتصف */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 46, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
      </div>
    </div>
  )
}

// ─── شريط عامل ──────────────────────────────────────────────────────────────────
function FactorBar({ label, score, delay, animate }) {
  const color = score >= 70 ? C.success : score >= 50 ? C.warning : C.accent
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: animate ? `${score}%` : 0 }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
    </div>
  )
}

// ─── البطاقة الكاملة ──────────────────────────────────────────────────────────────
export default function BusinessPulse({ pulse, onNav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  if (!pulse) return null
  const t = TONE[pulse.tone] || TONE.fair

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`,
        border: `1px solid ${t.main}33`, borderRadius: 22, padding: '18px 16px', marginBottom: 12,
      }}
    >
      {/* وميض خلفي */}
      <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
        <motion.div
          animate={inView ? { scale: [1, 1.18, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Activity size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>نبض المصلحة</div>
          <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لصحّة مصلحتك المالية</div>
        </div>
      </div>

      {/* العدّاد + العوامل */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
          <Gauge score={pulse.score} tone={pulse.tone} animate={inView} />
          {/* الدرجة تحت الرقم */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '58%', textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55`, fontSize: 12, fontWeight: 800, color: t.main }}>
              {pulse.grade}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          {pulse.factors.map((f, i) => (
            <FactorBar key={f.key} label={f.label} score={f.score} delay={0.3 + i * 0.1} animate={inView} />
          ))}
        </div>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pulse.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Sparkles
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          const clickable = ins.icon === 'MessageCircle' || ins.icon === 'Clock'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.6 + i * 0.1 }}
              onClick={clickable ? () => onNav?.('projects') : undefined}
              whileTap={clickable ? { scale: 0.98 } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: C.card, border: `1px solid ${color}26`, borderRadius: 13,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={color} strokeWidth={2.2} />
              </div>
              <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{ins.text}</span>
              {clickable && <ChevronLeft size={15} color={C.textDim} />}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
