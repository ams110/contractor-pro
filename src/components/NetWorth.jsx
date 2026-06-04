import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Landmark, Wallet, DollarSign, Users, Clock, ChevronLeft,
  AlertTriangle, CheckCircle2, ShieldCheck, Scale,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

// نبرة لونية → ألوان الثيم (نفس لغة «نبض المصلحة»/«التوقّع» للاتّساق)
const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { Wallet, DollarSign, Users, Clock, Landmark, AlertTriangle, CheckCircle2, ShieldCheck }

// لون شريحة الشلال: ذمم/نقد موجب = داخل، التزامات = خارج، الصافي = نبرة المركز
function segColor(seg, t) {
  if (seg.key === 'net')  return t.main
  if (seg.key === 'cash') return seg.delta >= 0 ? C.cyan : C.accent
  return seg.delta >= 0 ? C.primary : C.accent
}

// عدّاد تصاعدي ناعم عبر requestAnimationFrame (يدعم السالب)
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

function Money({ v, color, size = 34 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {v < 0 ? '−' : ''}₪{fmt(Math.abs(v))}
    </span>
  )
}

export default function NetWorth({ netWorth, onNav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  if (!netWorth || !netWorth.hasData) return null

  const t = TONE[netWorth.tone] || TONE.fair
  const { netWorth: net, coverage, liabilities, segments, insights } = netWorth
  const netDisplay = useCountUp(net, 1300, inView)

  // ── مقياس الشلال: نطاق يشمل كل البدايات/النهايات والصفر ──
  const bounds = segments.flatMap(s => [s.start, s.end]).concat(0)
  const top    = Math.max(...bounds)
  const bottom = Math.min(...bounds)
  const range  = Math.max(1, top - bottom)
  const pct    = v => ((v - bottom) / range) * 100   // موضع القيمة من أسفل المخطّط (%)
  const zeroPct = pct(0)

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`,
        border: `1px solid ${t.main}33`, borderRadius: 22, padding: '18px 16px', marginBottom: 12,
      }}>
      <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, position: 'relative' }}>
        <motion.div animate={inView ? { rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Landmark size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>ذمّتك الصافية</div>
          <div style={{ fontSize: 10, color: C.textDim }}>لو صفّيت كل حساباتك اليوم</div>
        </div>
        {/* شارة التغطية / الحالة */}
        {liabilities > 0 && coverage != null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 9, background: `${t.main}16`, border: `1px solid ${t.main}3a` }}>
            <Scale size={12} color={t.main} strokeWidth={2.3} />
            <span style={{ fontSize: 11, fontWeight: 800, color: t.main, fontVariantNumeric: 'tabular-nums' }}>
              ×{coverage >= 9.5 ? '+9' : coverage.toFixed(1)}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 9, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)' }}>
            <ShieldCheck size={12} color={C.success} strokeWidth={2.3} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.success }}>بلا ديون</span>
          </div>
        )}
      </div>

      {/* الرقم المركزي */}
      <div style={{ marginBottom: 14, position: 'relative' }}>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, marginBottom: 5 }}>صافي مركزك الآن</div>
        <Money v={netDisplay} color={t.main} size={36} />
      </div>

      {/* ── شلال البناء ── */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 7, height: 132, position: 'relative' }}>
          {/* خط الصفر */}
          <div aria-hidden style={{ position: 'absolute', insetInline: 0, bottom: `${zeroPct}%`, height: 1, background: C.borderMid, pointerEvents: 'none' }} />

          {segments.map((seg, i) => {
            const color  = segColor(seg, t)
            const barTop = Math.max(seg.start, seg.end)
            const barBot = Math.min(seg.start, seg.end)
            const hPct   = Math.max(2.5, pct(barTop) - pct(barBot))  // حدّ أدنى للظهور
            const botPct = pct(barBot)
            const clickable = !!seg.screen
            const isNet  = seg.key === 'net'
            return (
              <motion.div key={seg.key}
                onClick={clickable ? () => onNav?.(seg.screen) : undefined}
                whileTap={clickable ? { scale: 0.96 } : {}}
                style={{ flex: 1, position: 'relative', cursor: clickable ? 'pointer' : 'default', minWidth: 0 }}>
                {/* قيمة البند فوق العمود */}
                <div style={{ position: 'absolute', insetInline: 0, bottom: `calc(${botPct + hPct}% + 3px)`, textAlign: 'center', fontSize: 9.5, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {seg.delta < 0 ? '−' : isNet ? '' : '+'}₪{fmt(Math.abs(seg.delta) >= 1000 ? Math.round(Math.abs(seg.delta) / 1000) + 'k' : Math.abs(seg.delta))}
                </div>
                {/* العمود */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: inView ? `${hPct}%` : 0 }}
                  transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', insetInline: 0, bottom: `${botPct}%`,
                    borderRadius: 6,
                    background: isNet
                      ? `linear-gradient(180deg, ${color}, ${color}bb)`
                      : `${color}d0`,
                    border: `1px solid ${color}`,
                    boxShadow: isNet ? `0 0 16px ${color}55` : `0 0 8px ${color}40`,
                  }} />
              </motion.div>
            )
          })}
        </div>

        {/* تسميات الأعمدة */}
        <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
          {segments.map(seg => {
            const Icon  = ICONS[seg.icon] || Wallet
            const color = segColor(seg, t)
            return (
              <div key={seg.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                <Icon size={13} color={color} strokeWidth={2.2} />
                <span style={{ fontSize: 8.5, color: C.textDim, fontWeight: 600, textAlign: 'center', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{seg.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Landmark
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          const clickable = ins.tone === 'warn' || ins.text.includes('رادار التحصيل')
          const target = ins.text.includes('رادار التحصيل') ? 'finance' : 'projects'
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 + i * 0.1 }}
              onClick={clickable ? () => onNav?.(target) : undefined}
              whileTap={clickable ? { scale: 0.98 } : {}}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${color}26`, borderRadius: 13, cursor: clickable ? 'pointer' : 'default' }}>
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
