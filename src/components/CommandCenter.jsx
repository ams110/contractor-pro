import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  LayoutDashboard, ShieldCheck, Hourglass, Radar, Fingerprint, Users,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Activity, MessageCircle,
  CheckCircle2, Sparkles, PhoneCall, CalendarClock, FolderInput,
  UserX, UserMinus, Trash2, Zap,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'
import { PremiumCard, IconChip, InsightRow, INSIGHT_TONE, TONES } from '../ui/Premium.jsx'

const ICONS = {
  ShieldCheck, Hourglass, Radar, Fingerprint, Users,
  TrendingUp, TrendingDown, AlertTriangle, Clock, Activity, MessageCircle,
  CheckCircle2, Sparkles, PhoneCall, CalendarClock, FolderInput,
  UserX, UserMinus, Trash2, Zap,
}

function Scorecard({ card, onNav, delay, animate }) {
  const t = TONES[card.tone] || TONES.fair
  const Icon = ICONS[card.icon] || Activity
  const display = card.money ? `₪${fmt(card.value)}` : String(card.value)
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={animate ? { opacity: 1, y: 0 } : {}} transition={{ delay }}
      whileTap={{ scale: 0.96 }} onClick={() => onNav?.(card.screen)}
      style={{ flex: '1 1 0', minWidth: 80, background: C.card, border: `1px solid ${t.main}33`, borderRadius: 14, padding: '11px 9px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <IconChip icon={Icon} color={t.main} size={30} />
      <div style={{ fontSize: card.money ? 14 : 19, fontWeight: 900, color: t.main, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: card.money ? 'monospace' : 'inherit' }}>{display}{card.score ? <span style={{ fontSize: 9, color: C.textDim }}>/100</span> : ''}</div>
      <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, lineHeight: 1.2 }}>{card.label}</div>
    </motion.button>
  )
}

export default function CommandCenter({ cc, onNav }) {
  const language = useAppStore(s => s.language)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  if (!cc || !cc.hasData) return null
  const t = cc.alertCount > 0 ? TONES.weak : TONES.good

  return (
    <PremiumCard tone={t} radius={22} style={{ marginBottom: 12 }}>
      <div ref={ref}>
        {/* العنوان */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, position: 'relative' }}>
          <motion.div animate={inView ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <IconChip icon={LayoutDashboard} color={t.main} size={30} radius={10} iconSize={16} strokeWidth={2.5} />
          </motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{tl(language, 'مركز القيادة الذكي', 'מרכז שליטה חכם', 'Smart Command Center')}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{tl(language, 'كل مؤشّرات مصلحتك في مكان واحد', 'כל מדדי העסק שלך במקום אחד', 'All your business metrics in one place')}</div>
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
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em' }}>{tl(language, 'أهم ما يحتاج انتباهك', 'מה שדורש את תשומת לבך', 'What needs your attention most')}</div>
            {cc.feed.map((item, i) => (
              <InsightRow
                key={i}
                icon={ICONS[item.icon] || Sparkles}
                color={INSIGHT_TONE[item.tone] || C.cyan}
                text={item.text}
                inView={inView}
                delay={0.5 + i * 0.08}
                onClick={() => onNav?.(item.screen)}
              />
            ))}
          </div>
        ) : (
          <InsightRow icon={CheckCircle2} color={C.success} text={tl(language, 'كل المؤشّرات خضراء — ما في تنبيهات تحتاج انتباهك الآن.', 'כל המדדים ירוקים — אין התראות שדורשות את תשומת לבך כעת.', 'All metrics are green — no alerts need your attention right now.')} inView={inView} />
        )}
      </div>
    </PremiumCard>
  )
}
