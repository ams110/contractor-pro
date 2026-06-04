import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts'
import {
  Fingerprint, Activity, Clock, AlertTriangle, TrendingDown, TrendingUp,
  CheckCircle2, Sparkles, Star,
} from 'lucide-react'
import { C } from '../constants/index.js'

// نبرة لونية → ألوان الثيم (نفس مفاتيح نبض المصلحة)
const TONE = {
  excellent: { main: C.success, soft: 'rgba(34,197,94,0.14)',  glow: 'rgba(34,197,94,0.45)' },
  good:      { main: C.cyan,    soft: 'rgba(6,182,212,0.14)',  glow: 'rgba(6,182,212,0.45)' },
  fair:      { main: C.warning, soft: 'rgba(234,179,8,0.14)',  glow: 'rgba(234,179,8,0.45)' },
  weak:      { main: C.primary, soft: 'rgba(249,115,22,0.14)', glow: 'rgba(249,115,22,0.45)' },
  critical:  { main: C.accent,  soft: 'rgba(239,68,68,0.14)',  glow: 'rgba(239,68,68,0.45)' },
}

const INSIGHT_TONE = { warn: C.accent, tip: C.cyan, good: C.success }
const ICONS = { Activity, Clock, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, Sparkles }

// ─── شارة مدمجة للقوائم (درجة + نجمة) ─────────────────────────────────────────────
export function WorkerDNABadge({ dna }) {
  if (!dna) return null
  const t = TONE[dna.tone] || TONE.fair
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}44` }}>
      {dna.star && <Star size={10} color={t.main} strokeWidth={2.5} fill={t.main} />}
      <span style={{ fontSize: 11, fontWeight: 900, color: t.main, letterSpacing: '-0.02em', direction: 'ltr' }}>{dna.score}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: t.main, opacity: 0.85 }}>{dna.tier}</span>
    </div>
  )
}

// ─── البطاقة الكاملة (تبويب ملخّص العامل) ─────────────────────────────────────────
export default function WorkerDNA({ dna }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  if (!dna) return null
  const t = TONE[dna.tone] || TONE.fair

  const radarData = dna.factors.map(f => ({ axis: f.label, score: f.score }))

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.soft}, ${C.surface} 60%)`,
        border: `1px solid ${t.main}33`, borderRadius: 20, padding: '16px 14px', marginBottom: 12,
      }}
    >
      {/* وميض خلفي */}
      <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* العنوان */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
        <motion.div
          animate={inView ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 30, height: 30, borderRadius: 10, background: t.soft, border: `1px solid ${t.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Fingerprint size={16} color={t.main} strokeWidth={2.5} />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>بصمة العامل</div>
          <div style={{ fontSize: 10, color: C.textDim }}>تحليل ذكي لأداء العامل وموثوقيته</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: t.soft, border: `1px solid ${t.main}55` }}>
          {dna.star && <Star size={12} color={t.main} strokeWidth={2.5} fill={t.main} />}
          <span style={{ fontSize: 12, fontWeight: 800, color: t.main }}>{dna.tier}</span>
        </div>
      </div>

      {/* الرادار + الدرجة */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ position: 'relative', width: 200, height: 180, flex: 1, minWidth: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <defs>
                <linearGradient id={`dna-${dna.tone}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stopColor={t.main} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={t.main} stopOpacity={0.18} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: C.textDim, fontSize: 10, fontWeight: 700 }}
              />
              <Radar
                dataKey="score"
                stroke={t.main}
                strokeWidth={2}
                fill={`url(#dna-${dna.tone})`}
                isAnimationActive={inView}
                animationDuration={1100}
              />
            </RadarChart>
          </ResponsiveContainer>
          {/* الدرجة في الزاوية */}
          <div style={{ position: 'absolute', insetInlineStart: 4, top: 4, display: 'flex', alignItems: 'baseline', gap: 2, direction: 'ltr' }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: t.main, letterSpacing: '-0.03em', lineHeight: 1, textShadow: `0 0 14px ${t.glow}` }}>{dna.score}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim }}>/100</span>
          </div>
        </div>
      </div>

      {/* الرؤى الذكية */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dna.insights.map((ins, i) => {
          const Icon = ICONS[ins.icon] || Sparkles
          const color = INSIGHT_TONE[ins.tone] || C.cyan
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + i * 0.1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: C.card, border: `1px solid ${color}26`, borderRadius: 13,
              }}
            >
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
