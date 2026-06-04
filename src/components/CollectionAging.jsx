import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Hourglass, PhoneCall, AlertTriangle, Clock, CalendarClock,
  CheckCircle2, MessageCircle,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { openWhatsApp, waMessages } from '../lib/whatsapp.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  fair:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  weak:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

// لون كل دلو حسب العمر
const BUCKET_COLOR = { current: C.success, d30: C.warning, d60: C.gold, d90: C.accent }
const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { PhoneCall, AlertTriangle, Clock, CalendarClock, CheckCircle2 }

export default function CollectionAging({ aging }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  if (!aging || !aging.hasData) return null
  const t = TONE[aging.tone] || TONE.fair
  const total = aging.totalOutstanding

  function remind(item) {
    openWhatsApp(item.phone, waMessages.paymentReminder({
      clientName: item.client || item.name, projectName: item.name, amount: item.outstanding,
    }))
  }

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 18, padding: '14px 13px', marginBottom: 14 }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, position: 'relative' }}>
        <motion.div animate={inView ? { rotate: [0, 8, -8, 0] } : {}} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hourglass size={15} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>رادار التحصيل</div>
          <div style={{ fontSize: 10, color: C.textDim }}>أعمار ذمم العملاء وأولوية الاتصال</div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: t.main, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(total)}</div>
          <div style={{ fontSize: 9, color: C.textDim }}>إجمالي مستحقّ</div>
        </div>
      </div>

      {/* شريط أعمار الذمم المكدّس */}
      {total > 0 && (
        <>
          <div style={{ display: 'flex', height: 12, borderRadius: 7, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginBottom: 8 }}>
            {aging.buckets.filter(b => b.amount > 0).map((b, i) => (
              <motion.div key={b.key}
                initial={{ width: 0 }} animate={{ width: inView ? `${(b.amount / total) * 100}%` : 0 }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                style={{ height: '100%', background: BUCKET_COLOR[b.key], boxShadow: `0 0 8px ${BUCKET_COLOR[b.key]}66` }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {aging.buckets.filter(b => b.amount > 0).map(b => (
              <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: BUCKET_COLOR[b.key] }} />
                <span style={{ fontSize: 10, color: C.textDim }}>{b.label}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: BUCKET_COLOR[b.key], fontFamily: 'monospace' }}>₪{fmt(b.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* الرؤى الذكية */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: aging.items.length > 0 ? 12 : 0 }}>
        {aging.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Clock
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.4 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${color}26`, borderRadius: 13 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={color} strokeWidth={2.2} />
              </div>
              <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{ins.text}</span>
            </motion.div>
          )
        })}
      </div>

      {/* قائمة أولوية الاتصال (أعلى 4) */}
      {aging.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em' }}>أولوية الاتصال</div>
          {aging.items.slice(0, 4).map((it, i) => {
            const bc = BUCKET_COLOR[it.bucket]
            return (
              <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 13 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: bc, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.client || it.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{it.name} · متأخّر {it.daysSince} يوم</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: bc, fontFamily: 'monospace' }}>₪{fmt(it.outstanding)}</div>
                {it.phone && (
                  <button onClick={() => remind(it)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 10, background: `${C.success}18`, border: `1.5px solid ${C.success}44`, color: C.success, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <MessageCircle size={12} strokeWidth={2} /> تذكير
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
