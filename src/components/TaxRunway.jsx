import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Landmark, Activity, AlertTriangle, CalendarClock, CheckCircle2,
  Sparkles, PiggyBank, TrendingUp,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { Activity, AlertTriangle, CalendarClock, CheckCircle2, Sparkles, PiggyBank, TrendingUp }

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

// ─── عدّاد السقف ثنائي القوس (محصّل فعلي + توقّع سنوي) ───────────────────────────
function CapGauge({ capPct, projectedPct, tone, yearIncome, cap, animate }) {
  const t = TONE[tone] || TONE.fair
  const R = 60, SW = 12, SIZE = 150, CX = SIZE / 2
  const actual = Math.min(100, capPct)
  const proj   = Math.min(100, projectedPct)
  const displayPct = useCountUp(capPct, 1200, animate)

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <motion.div aria-hidden
        animate={animate ? { scale: [1, 1.1, 1], opacity: [0.5, 0.15, 0.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 16, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`tr-${tone}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.main} stopOpacity={0.65} />
            <stop offset="100%" stopColor={t.main} />
          </linearGradient>
        </defs>
        {/* المسار الخلفي */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
        {/* قوس التوقّع (شبحي متقطّع) */}
        <motion.circle cx={CX} cy={CX} r={R} fill="none"
          stroke={t.main} strokeWidth={SW} strokeLinecap="round" opacity={0.28}
          strokeDasharray="3 3" pathLength={100}
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - proj : 100 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
        {/* قوس المحصّل الفعلي */}
        <motion.circle cx={CX} cy={CX} r={R} fill="none"
          stroke={`url(#tr-${tone})`} strokeWidth={SW} strokeLinecap="round"
          pathLength={100} strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: animate ? 100 - actual : 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${t.glow})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: t.main, letterSpacing: '-0.03em', lineHeight: 1, direction: 'ltr' }}>{displayPct}%</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim }}>من السقف</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.text, fontFamily: 'monospace', marginTop: 2 }}>₪{fmt(yearIncome)}</span>
      </div>
    </div>
  )
}

// ─── البطاقة الكاملة ──────────────────────────────────────────────────────────────
export default function TaxRunway({ runway }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const provision = useCountUp(runway?.monthlyProvision || 0, 1300, inView)
  if (!runway) return null
  const t = TONE[runway.tone] || TONE.fair

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 20, padding: '16px 14px', marginBottom: 14 }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
        <motion.div animate={inView ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Landmark size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>عدّاد الضريبة</div>
          <div style={{ fontSize: 10, color: C.textDim }}>توقّع ذكي للسقف السنوي وفاتورتك الضريبية</div>
        </div>
      </div>

      {/* العدّاد (لعוסק פטور) + الفاتورة */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        {runway.isOsekPatur && (
          <CapGauge capPct={runway.capPct} projectedPct={runway.projectedPct} tone={runway.tone}
            yearIncome={runway.yearIncome} cap={runway.cap} animate={inView} />
        )}

        <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* التوقّع السنوي */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: '11px 13px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 3 }}>الدخل السنوي المتوقّع</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 19, fontWeight: 900, color: t.main, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(runway.projectedAnnual)}</span>
              {runway.isOsekPatur && <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{runway.projectedPct}% من السقف</span>}
            </div>
            {runway.willExceed && runway.capMonth && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 10, fontWeight: 700, color: C.accent }}>
                <CalendarClock size={11} strokeWidth={2.2} />
                بلوغ السقف المتوقّع: {runway.capMonth}
              </div>
            )}
          </div>

          {/* عدّاد التجنيب الشهري */}
          {runway.monthlyProvision > 0 && (
            <div style={{ background: `${C.cyan}0E`, border: `1px solid ${C.cyan}33`, borderRadius: 13, padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <PiggyBank size={12} color={C.cyan} strokeWidth={2.2} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>جنّب شهرياً للضريبة</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, direction: 'ltr', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>/شهر</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.cyan, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(provision)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {runway.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Sparkles
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
