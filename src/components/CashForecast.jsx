import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ComposedChart, Area, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, Activity, PiggyBank,
  Wallet, ShieldCheck, Telescope,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { PremiumCard, IconChip, InsightRow, INSIGHT_TONE, TONES, useCountUp, Money } from '../ui/Premium.jsx'

const ICONS = { TrendingUp, TrendingDown, AlertTriangle, Activity, PiggyBank, Wallet }

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
  // الـ hook يُستدعى قبل أي return مبكّر (قاعدة React Hooks)
  const projDisplay = useCountUp(forecast?.projected ?? 0, 1300, inView)
  if (!forecast) return null

  const t = TONES[forecast.tone] || TONES.fair
  const { avgFlow, projected, runway, rising, horizon, series, insights } = forecast

  // فهرس نقطة الوصل (آخر نقطة تاريخية) لرسم خط «الآن»
  const junctionIdx = series.findIndex(s => s.kind === 'future')
  const nowLabel = junctionIdx > 0 ? series[junctionIdx - 1].label : undefined

  const gid = `fc-${forecast.tone}`

  return (
    <PremiumCard tone={t} radius={22} padding="18px 16px" glowSide="start" delay={0.05} style={{ marginBottom: 12 }}>
      <div ref={ref}>
        {/* العنوان + شريحة الاتجاه */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
          <motion.div
            animate={inView ? { rotate: [0, -8, 8, 0] } : {}}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IconChip icon={Telescope} color={t.main} size={30} radius={10} iconSize={16} strokeWidth={2.5} />
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
            const clickable = ins.tone === 'warn'
            return (
              <InsightRow
                key={i}
                icon={ICONS[ins.icon] || Activity}
                color={INSIGHT_TONE[ins.tone] || C.cyan}
                text={ins.text}
                inView={inView}
                delay={0.5 + i * 0.1}
                onClick={clickable ? () => onNav?.('projects') : undefined}
              />
            )
          })}
        </div>
      </div>
    </PremiumCard>
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
