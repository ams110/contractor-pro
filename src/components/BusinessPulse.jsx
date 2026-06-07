import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Activity, Wallet, Clock, AlertTriangle, TrendingDown, TrendingUp,
  MessageCircle, CheckCircle2, Sparkles,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { PremiumCard, IconChip, InsightRow, INSIGHT_TONE, TONES, useCountUp } from '../ui/Premium.jsx'

const ICONS = { Activity, Wallet, Clock, AlertTriangle, TrendingDown, TrendingUp, MessageCircle, CheckCircle2, Sparkles }

// ─── العدّاد الدائري ──────────────────────────────────────────────────────────────
function Gauge({ score, tone, grade, animate }) {
  const t = TONES[tone] || TONES.fair
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
      {/* المحتوى في المنتصف */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, direction: 'ltr' }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{display}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textDim }}>/100</span>
        </div>
        {grade && (
          <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55`, fontSize: 12, fontWeight: 800, color: t.main, lineHeight: 1.4 }}>
            {grade}
          </span>
        )}
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
  const t = TONES[pulse.tone] || TONES.fair

  return (
    <PremiumCard tone={t} radius={22} padding="18px 16px" style={{ marginBottom: 12 }}>
      <div ref={ref}>
        {/* العنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
          <motion.div
            animate={inView ? { scale: [1, 1.18, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IconChip icon={Activity} color={t.main} size={30} radius={10} iconSize={16} strokeWidth={2.5} />
          </motion.div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>نبض المصلحة</div>
            <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لصحّة مصلحتك المالية</div>
          </div>
        </div>

        {/* العدّاد + العوامل */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <Gauge score={pulse.score} tone={pulse.tone} grade={pulse.grade} animate={inView} />

          <div style={{ flex: 1, minWidth: 180 }}>
            {pulse.factors.map((f, i) => (
              <FactorBar key={f.key} label={f.label} score={f.score} delay={0.3 + i * 0.1} animate={inView} />
            ))}
          </div>
        </div>

        {/* الرؤى الذكية */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pulse.insights.map((ins, i) => {
            const clickable = ins.icon === 'MessageCircle' || ins.icon === 'Clock'
            return (
              <InsightRow
                key={i}
                icon={ICONS[ins.icon] || Sparkles}
                color={INSIGHT_TONE[ins.tone] || C.cyan}
                text={ins.text}
                inView={inView}
                delay={0.6 + i * 0.1}
                onClick={clickable ? () => onNav?.('projects') : undefined}
              />
            )
          })}
        </div>
      </div>
    </PremiumCard>
  )
}
