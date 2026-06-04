import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ShieldCheck, Activity, Clock, AlertTriangle, TrendingDown, TrendingUp,
  MessageCircle, CheckCircle2, Sparkles, Crosshair,
} from 'lucide-react'
import { C } from '../constants/index.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { Activity, Clock, AlertTriangle, TrendingDown, TrendingUp, MessageCircle, CheckCircle2, Sparkles }

function useCountUp(target, duration = 1200, start = false) {
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

// ─── عدّاد دائري مدمج ─────────────────────────────────────────────────────────────
function Gauge({ score, tone, grade, animate }) {
  const t = TONE[tone] || TONE.fair
  const R = 56, SW = 11, SIZE = 144, CX = SIZE / 2
  const display = useCountUp(score, 1200, animate)
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <motion.div aria-hidden
        animate={animate ? { scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`ph-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.main} stopOpacity={0.65} />
            <stop offset="100%" stopColor={t.main} />
          </linearGradient>
        </defs>
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        <motion.circle cx={CX} cy={CX} r={R} fill="none"
          stroke={`url(#ph-${tone})`} strokeWidth={SW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - score : 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, direction: 'ltr' }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
        {grade && (
          <span style={{ display: 'inline-block', padding: '2px 12px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55`, fontSize: 11, fontWeight: 800, color: t.main }}>
            {grade}
          </span>
        )}
      </div>
    </div>
  )
}

function FactorBar({ label, score, delay, animate }) {
  const color = score >= 70 ? C.success : score >= 50 ? C.warning : C.accent
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: animate ? `${score}%` : 0 }}
          transition={{ duration: 0.9, delay, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  )
}

// ─── البطاقة الكاملة ──────────────────────────────────────────────────────────────
export default function ProjectHealth({ health }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  if (!health) return null
  const t = TONE[health.tone] || TONE.fair
  const pm = health.projectedMargin
  const pmColor = pm == null ? C.textDim : pm >= 20 ? C.success : pm >= 10 ? C.warning : C.accent

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 20, padding: '16px 14px', marginBottom: 12 }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
        <motion.div animate={inView ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>صحّة المشروع</div>
          <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لربحية المشروع ومخاطره</div>
        </div>
      </div>

      {/* العدّاد + العوامل */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <Gauge score={health.score} tone={health.tone} grade={health.grade} animate={inView} />
        <div style={{ flex: 1, minWidth: 160 }}>
          {health.factors.map((f, i) => (
            <FactorBar key={f.key} label={f.label} score={f.score} delay={0.3 + i * 0.1} animate={inView} />
          ))}
        </div>
      </div>

      {/* الإنذار المبكّر: الهامش النهائي المتوقّع */}
      {pm != null && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.5 }}
          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: `${pmColor}10`, border: `1px solid ${pmColor}33`, borderRadius: 13 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${pmColor}1c`, border: `1px solid ${pmColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crosshair size={15} color={pmColor} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>الهامش النهائي المتوقّع</div>
            <div style={{ fontSize: 10, color: C.textDim }}>لو استمرّت التكلفة بنفس معدّل الإنجاز</div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: pmColor, letterSpacing: '-0.02em', direction: 'ltr' }}>{pm}%</span>
        </motion.div>
      )}

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {health.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Sparkles
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.6 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${color}26`, borderRadius: 13 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={color} strokeWidth={2.2} />
              </div>
              <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{ins.text}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
