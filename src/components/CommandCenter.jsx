import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  LayoutDashboard, ShieldCheck, Hourglass, Radar, Fingerprint, Users,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Activity, MessageCircle,
  CheckCircle2, Sparkles, PhoneCall, CalendarClock, FolderInput,
  UserX, UserMinus, Trash2, Zap, ChevronLeft,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}
const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = {
  ShieldCheck, Hourglass, Radar, Fingerprint, Users,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Activity, MessageCircle,
  CheckCircle2, Sparkles, PhoneCall, CalendarClock, FolderInput,
  UserX, UserMinus, Trash2, Zap,
}

function Scorecard({ card, onNav, delay, animate }) {
  const t = TONE[card.tone] || TONE.fair
  const Icon = ICONS[card.icon] || Activity
  const display = card.money ? `₪${fmt(card.value)}` : String(card.value)
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={animate ? { opacity: 1, y: 0 } : {}} transition={{ delay }}
      whileTap={{ scale: 0.96 }} onClick={() => onNav?.(card.screen)}
      style={{ flex: '1 1 0', minWidth: 80, background: C.card, border: `1px solid ${t.main}33`, borderRadius: 14, padding: '11px 9px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={t.main} strokeWidth={2.3} />
      </div>
      <div style={{ fontSize: card.money ? 14 : 19, fontWeight: 900, color: t.main, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: card.money ? 'monospace' : 'inherit' }}>{display}{card.score ? <span style={{ fontSize: 9, color: C.textDim }}>/100</span> : ''}</div>
      <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, lineHeight: 1.2 }}>{card.label}</div>
    </motion.button>
  )
}

export default function CommandCenter({ cc, onNav }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  if (!cc || !cc.hasData) return null
  const t = cc.alertCount > 0 ? TONE.weak : TONE.good

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 22, padding: '16px 14px', marginBottom: 12 }}>
      <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, position: 'relative' }}>
        <motion.div animate={inView ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LayoutDashboard size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>مركز القيادة الذكي</div>
          <div style={{ fontSize: 10, color: C.textDim }}>كل مؤشّرات مصلحتك في مكان واحد</div>
        </div>
        {cc.alertCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 11px', borderRadius: 20, background: `${C.accent}18`, border: `1px solid ${C.accent}44` }}>
            <AlertTriangle size={11} color={C.accent} strokeWidth={2.5} />
            <span style={{ fontSize: 12, fontWeight: 900, color: C.accent }}>{cc.alertCount}</span>
          </div>
        )}
      </div>

      {/* بطاقات المؤشّرات */}
      <div style={{ display: 'flex', gap: 8, marginBottom: cc.feed.length ? 12 : 0, flexWrap: 'wrap' }}>
        {cc.scorecards.map((card, i) => (
          <Scorecard key={card.key} card={card} onNav={onNav} delay={0.2 + i * 0.06} animate={inView} />
        ))}
      </div>

      {/* الموجز الموحّد */}
      {cc.feed.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em' }}>أهم ما يحتاج انتباهك</div>
          {cc.feed.map((item, i) => {
            const Icon = ICONS[item.icon] || Sparkles
            const color = INSIGHT_TONE[item.tone] || C.cyan
            return (
              <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 + i * 0.08 }}
                whileTap={{ scale: 0.98 }} onClick={() => onNav?.(item.screen)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${color}26`, borderRadius: 13, cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color={color} strokeWidth={2.2} />
                </div>
                <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{item.text}</span>
                <ChevronLeft size={15} color={C.textDim} />
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.success}26`, borderRadius: 13 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: `${C.success}1c`, border: `1px solid ${C.success}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={14} color={C.success} strokeWidth={2.2} />
          </div>
          <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>كل المؤشّرات خضراء — ما في تنبيهات تحتاج انتباهك الآن.</span>
        </div>
      )}
    </motion.div>
  )
}
