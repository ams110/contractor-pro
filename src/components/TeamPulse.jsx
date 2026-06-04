import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Users, Activity, Zap, UserX, UserMinus, Trash2,
} from 'lucide-react'
import { C } from '../constants/index.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}
const MEMBER_TONE = { excellent: C.success, good: C.cyan, fair: C.warning, weak: C.textDim }
const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { Activity, Zap, UserX, UserMinus, Trash2 }

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

function Gauge({ score, tone, grade, animate }) {
  const t = TONE[tone] || TONE.fair
  const R = 54, SW = 11, SIZE = 138, CX = SIZE / 2
  const display = useCountUp(score, 1200, animate)
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <motion.div aria-hidden animate={animate ? { scale: [1, 1.1, 1], opacity: [0.5, 0.15, 0.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`tp-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.main} stopOpacity={0.65} /><stop offset="100%" stopColor={t.main} />
          </linearGradient>
        </defs>
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        <motion.circle cx={CX} cy={CX} r={R} fill="none" stroke={`url(#tp-${tone})`} strokeWidth={SW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100" initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - score : 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, direction: 'ltr' }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
        {grade && (
          <span style={{ padding: '2px 11px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55`, fontSize: 11, fontWeight: 800, color: t.main }}>{grade}</span>
        )}
      </div>
    </div>
  )
}

export default function TeamPulse({ pulse }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  if (!pulse || !pulse.hasData) return null
  const t = TONE[pulse.tone] || TONE.fair
  const maxCount = Math.max(1, ...pulse.rows.map(r => r.count))

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 18, padding: '14px 13px', marginBottom: 16 }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, position: 'relative' }}>
        <motion.div animate={inView ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>نبض الفريق</div>
          <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لتفاعل أعضاء فريقك</div>
        </div>
      </div>

      {/* العدّاد + ترتيب الأعضاء */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <Gauge score={pulse.score} tone={pulse.tone} grade={pulse.grade} animate={inView} />
        <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pulse.rows.slice(0, 5).map((r, i) => {
            const mc = MEMBER_TONE[r.tone] || C.textDim
            return (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{r.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: mc }}>{r.tier}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, direction: 'ltr' }}>
                      {r.daysSince == null ? '—' : r.count}
                    </span>
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: inView ? `${(r.count / maxCount) * 100}%` : 0 }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: mc, boxShadow: `0 0 8px ${mc}66` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pulse.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Activity
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 + i * 0.1 }}
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
