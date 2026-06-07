import React, { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

// ─── نظام النبرة (Tone) — مستخرَج من أسلوب «مركز القيادة» ──────────────────────
// كل نبرة = لون أساسي + خلفية ناعمة + توهّج، تُلوّن البطاقة حسب الحالة.
export const TONES = {
  brand:     { main: C.primary,   soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  premium:   { main: C.secondary, soft: 'rgba(124,58,237,0.14)', glow: 'rgba(124,58,237,0.45)' },
  gold:      { main: C.gold,      soft: 'rgba(217,119,6,0.14)',  glow: 'rgba(217,119,6,0.45)'  },
  cyan:      { main: C.cyan,      soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)'  },
  excellent: { main: C.success,   soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)'  },
  good:      { main: C.cyan,      soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)'  },
  fair:      { main: C.warning,   soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)'  },
  weak:      { main: C.primary,   soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,    soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)'  },
}

// نبرة من لون اعتباطي (للحالات اللي ما إلها نبرة جاهزة)
export function toneFromColor(color = C.primary) {
  return { main: color, soft: `${color}24`, glow: `${color}73` }
}

function resolveTone(tone, color) {
  if (color) return toneFromColor(color)
  if (typeof tone === 'object' && tone) return tone
  return TONES[tone] || TONES.brand
}

// ─── IconChip — المربّع الناعم للأيقونة (توقيع مركز القيادة) ───────────────────
export function IconChip({ icon: Icon, tone = 'brand', color, size = 30, iconSize, radius = 9, strokeWidth = 2.3, pulse = false, style = {} }) {
  const t = resolveTone(tone, color)
  const isz = iconSize || Math.round(size * 0.5)
  const chip = (
    <div style={{ width: size, height: size, borderRadius: radius, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      {Icon && <Icon size={isz} color={t.main} strokeWidth={strokeWidth} />}
    </div>
  )
  if (!pulse) return chip
  return (
    <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
      {chip}
    </motion.div>
  )
}

// ─── PremiumCard — البطاقة المتدرّجة مع توهّج دائري وحدود متوهّجة ──────────────
// نفس روح بطاقة «مركز القيادة»: خلفية متدرّجة بلون النبرة + بقعة توهّج + حدّ ملوّن.
export function PremiumCard({
  children, tone = 'brand', color, onClick,
  glow = true, glowSide = 'end', gradient = true, radius = 20, padding = '16px 14px',
  animate = true, delay = 0, style = {},
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const t = resolveTone(tone, color)

  const base = {
    position: 'relative',
    overflow: 'hidden',
    background: gradient ? `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)` : C.surface,
    border: `1px solid ${t.main}33`,
    borderRadius: radius,
    padding,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }

  const Blob = glow ? (
    <div aria-hidden style={{ position: 'absolute', top: -60, [glowSide === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />
  ) : null

  const inner = (
    <>
      {Blob}
      <div style={{ position: 'relative' }}>{children}</div>
    </>
  )

  if (!animate) {
    return <div ref={ref} style={base} onClick={onClick}>{inner}</div>
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      style={base}
      onClick={onClick}
    >
      {inner}
    </motion.div>
  )
}

// ─── PremiumStat — بطاقة إحصائية بأسلوب مركز القيادة (Chip + رقم كبير) ─────────
export function PremiumStat({ label, value, sub, icon, tone = 'brand', color, onClick, money = false, suffix, delay = 0, style = {} }) {
  const t = resolveTone(tone, color)
  return (
    <PremiumCard tone={tone} color={color} onClick={onClick} delay={delay} style={style}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <IconChip icon={icon} color={t.main} size={36} radius={11} />
        {suffix}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
        {money ? `₪${value}` : value}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: t.main, marginTop: 4, fontWeight: 700 }}>{sub}</div>}
    </PremiumCard>
  )
}

// ─── HolographicSheen — لمعة قطرية تكتسح البطاقة (إصلاح: skew على غلاف ثابت) ───
// ملاحظة: framer-motion يتحكّم بخاصية `transform` كاملةً عند تحريك `x`، فأي
// `transform: skewX(...)` يُكتب في style على نفس العنصر المتحرّك يُلغي الحركة.
// الحل: نضع الـ skew على غلاف ثابت، ونحرّك عنصراً داخلياً بلا transform في style.
export function HolographicSheen({ width = '55%', duration = 4.5, repeatDelay = 1.4, opacity = 0.34, skew = -18, blend = 'soft-light' }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', transform: `skewX(${skew}deg)` }}>
      <motion.div
        initial={{ x: '-160%' }}
        animate={{ x: '160%' }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', repeatDelay }}
        style={{
          position: 'absolute', top: 0, bottom: 0, width,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${opacity}), transparent)`,
          mixBlendMode: blend,
        }}
      />
    </div>
  )
}

// ─── useCountUp — عدّاد تصاعدي ناعم (easeOutCubic عبر RAF، يدعم السالب) ────────────
// المصدر الموحّد للعدّادات: كان مكرَّراً في BusinessPulse/CashForecast/NetWorth/Dashboard.
export function useCountUp(target, duration = 1300, start = false) {
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

// ─── Money — مبلغ بالشيكل مع إشارة سالب صريحة «−» وأرقام جدوليّة ───────────────────
export function Money({ v, color = C.text, size = 22 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {v < 0 ? '−' : ''}₪{fmt(Math.abs(v))}
    </span>
  )
}

// ─── INSIGHT_TONE — نبرة صفوف الرؤى الداخلية ──────────────────────────────────────
export const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }

// ─── InsightRow — صفّ رؤية داخلي موحّد (شريحة أيقونة + نصّ + سهم للقابل للنقر) ──────
// كان مكرَّراً حرفياً في BusinessPulse/CashForecast/NetWorth/CommandCenter.
export function InsightRow({ icon: Icon, color = C.cyan, text, onClick, delay = 0, inView = true }) {
  const clickable = !!onClick
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay }}
      onClick={onClick}
      whileTap={clickable ? { scale: 0.98 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: C.card, border: `1px solid ${color}26`, borderRadius: 13,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {Icon && <Icon size={14} color={color} strokeWidth={2.2} />}
      </div>
      <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{text}</span>
      {clickable && <ChevronLeft size={15} color={C.textDim} />}
    </motion.div>
  )
}
