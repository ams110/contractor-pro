import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ComposedChart, Area, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, Activity, PiggyBank,
  Wallet, ShieldCheck, ChevronLeft, Telescope,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

// نبرة لونية → ألوان الثيم (نفس لغة «نبض المصلحة» للاتّساق)
const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { TrendingUp, TrendingDown, AlertTriangle, Activity, PiggyBank, Wallet }

// عدّاد تصاعدي ناعم عبر requestAnimationFrame (يدعم القيم السالبة)
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

// مبلغ بالشيكل مع إشارة سالب صريحة
function Money({ v, color, size = 30 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {v < 0 ? '−' : ''}₪{fmt(Math.abs(v))}
    </span>
  )
}

// تلميح الرسم
function ChartTip({ active, payload, main }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  const val = p.kind === 'future' ? p.forecast : p.actual
  if (val == null) return null
  return (
    <div style={{ background: C.card, border: `1px solid ${main}44`, borderRadius: 10, padding: '7px 11px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2 }}>
        {p.kind === 'future' ? 'توقّع' : 'فعلي'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: main, fontVariantNumeric: 'tabular-nums' }}>
        {val < 0 ? '−' : ''}₪{fmt(Math.abs(val))}
      </div>
    </div>
  )
}

export default function CashForecast({ forecast, onNav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  if (!forecast) return null

  const t = TONE[forecast.tone] || TONE.fair
  const { avgFlow, projected, runway, rising, horizon, series, insights } = forecast
  const projDisplay = useCountUp(projected, 1300, inView)

  // فهرس نقطة الوصل (آخر نقطة تاريخية) لرسم خط «الآن»
  const junctionIdx = series.findIndex(s => s.kind === 'future')
  const nowLabel = junctionIdx > 0 ? series[junctionIdx - 1].label : undefined

  const gid = `fc-${forecast.tone}`

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`,
        border: `1px solid ${t.main}33`, borderRadius: 22, padding: '18px 16px', marginBottom: 12,
      }}
    >
      {/* وميض خلفي */}
      <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineStart: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان + شريحة الاتجاه */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
        <motion.div
          animate={inView ? { rotate: [0, -8, 8, 0] } : {}}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Telescope size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>التوقّع الذكي للسيولة</div>
          <div style={{ fontSize: 10, color: C.textDim }}>إلى أين يتّجه نقدك خلال {horizon === 3 ? '٣ أشهر' : `${horizon} أشهر`}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 9, background: rising ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${rising ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}` }}>
          {rising ? <TrendingUp size={12} color={C.success} /> : <TrendingDown size={12} color={C.accent} />}
          <span style={{ fontSize: 11, fontWeight: 800, color: rising ? C.success : C.accent, fontVariantNumeric: 'tabular-nums' }}>
            {avgFlow < 0 ? '−' : '+'}₪{fmt(Math.abs(avgFlow))}<span style={{ fontSize: 9, color: C.textDim, fontWeight: 600 }}>/شهر</span>
          </span>
        </div>
      </div>

      {/* الرقم المتوقّع + عدّاد الأمان */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 6, position: 'relative', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 4 }}>
            سيولتك المتوقّعة بعد {horizon === 3 ? '٣ أشهر' : `${horizon} أشهر`}
          </div>
          <Money v={projDisplay} color={t.main} size={32} />
        </div>

        {runway != null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 13, background: `${t.main}14`, border: `1px solid ${t.main}3a` }}>
            <AlertTriangle size={16} color={t.main} strokeWidth={2.3} />
            <div>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600 }}>السيولة تكفي لـ</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: t.main }}>{fmtRunway(runway)}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 13, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)' }}>
            <ShieldCheck size={16} color={C.success} strokeWidth={2.3} />
            <div>
              <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600 }}>الوضع النقدي</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: C.success }}>مستقرّ ونامٍ</div>
            </div>
          </div>
        )}
      </div>

      {/* الرسم البياني: ماضٍ صلب → مستقبل متقطّع + نطاق ثقة */}
      <div style={{ position: 'relative', marginTop: 8, marginInline: -6 }}>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.main} stopOpacity={0.32} />
                <stop offset="100%" stopColor={t.main} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label" tick={{ fontSize: 9, fill: C.textDim }}
              axisLine={false} tickLine={false} interval={0} height={16}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<ChartTip main={t.main} />} cursor={{ stroke: t.main, strokeOpacity: 0.25, strokeWidth: 1 }} />

            {/* نطاق الثقة (cone) — يتّسع مع البُعد */}
            <Area
              type="monotone" dataKey="range" stroke="none"
              fill={t.main} fillOpacity={0.10} isAnimationActive={inView}
              animationDuration={900} connectNulls={false} activeDot={false}
            />

            {/* خط «الآن» الفاصل بين الفعلي والمتوقّع */}
            {nowLabel && (
              <ReferenceLine
                x={nowLabel} stroke={C.textDim} strokeOpacity={0.5} strokeDasharray="3 3"
                label={{ value: 'الآن', position: 'top', fontSize: 9, fill: C.textDim }}
              />
            )}

            {/* المسار الفعلي — مساحة صلبة */}
            <Area
              type="monotone" dataKey="actual" stroke={t.main} strokeWidth={2.5}
              fill={`url(#${gid}-fill)`} dot={false}
              isAnimationActive={inView} animationDuration={1100}
              activeDot={{ r: 4, fill: t.main, stroke: C.surface, strokeWidth: 2 }}
            />

            {/* المسار المتوقّع — خط متقطّع */}
            <Line
              type="monotone" dataKey="forecast" stroke={t.main} strokeWidth={2.5}
              strokeDasharray="5 4" dot={false} connectNulls
              isAnimationActive={inView} animationDuration={1100} animationBegin={300}
              activeDot={{ r: 4, fill: t.main, stroke: C.surface, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Activity
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          const clickable = ins.tone === 'warn'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.1 }}
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

// مدّة قصيرة للشارة (نسخة مختصرة من fmtMonths)
function fmtRunway(m) {
  if (m >= 12) return '+سنة'
  const r = Math.max(1, Math.round(m))
  if (r === 1) return 'شهر'
  if (r === 2) return 'شهرين'
  if (r <= 10) return `${r} أشهر`
  return `${r} شهر`
}
