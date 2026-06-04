import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Radar as RadarIcon, TrendingUp, FolderInput, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { C } from '../constants/index.js'

const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  fair:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  weak:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.warning, good: C.success }
const ICONS = { TrendingUp, FolderInput, AlertTriangle, ShieldCheck }

export default function ExpenseRadar({ radar, monthKey }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  if (!radar || !radar.hasData) return null
  const t = TONE[radar.tone] || TONE.fair
  const flagged = radar.anomalies.filter(an => an.tone !== 'good').length

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`, border: `1px solid ${t.main}33`, borderRadius: 18, padding: '14px 13px', marginBottom: 14 }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان مع الماسح النابض */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, position: 'relative' }}>
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
          <motion.div aria-hidden
            animate={inView ? { scale: [1, 1.6], opacity: [0.5, 0] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, borderRadius: 10, background: t.main, opacity: 0.3 }} />
          <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RadarIcon size={16} color={t.main} strokeWidth={2.5} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>كاشف التسريب</div>
          <div style={{ fontSize: 10, color: C.textDim }}>مسح ذكي للمصاريف الشاذّة — {monthKey}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 12px', borderRadius: 12, background: t.soft, border: `1px solid ${t.main}55` }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: t.main, lineHeight: 1 }}>{flagged}</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: t.main, opacity: 0.85 }}>تنبيه</span>
        </div>
      </div>

      {/* قائمة الشذوذ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {radar.anomalies.map((an, i) => {
          const Icon = ICONS[an.icon] || AlertTriangle
          const color = INSIGHT_TONE[an.tone] || C.warning
          return (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${color}26`, borderRadius: 13 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}1c`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={color} strokeWidth={2.2} />
              </div>
              <span style={{ flex: 1, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{an.text}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
