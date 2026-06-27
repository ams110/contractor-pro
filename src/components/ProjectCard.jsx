import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Hammer, RotateCw, TrendingUp, TrendingDown,
  MapPin, Clock, CheckCircle2, AlertTriangle, Banknote,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tEnum } from '../lib/labels.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة المشروع — Wallet-style، اللون حسب الحالة، تنقلب 3D لتفصيل P&L.
//  بصرية بحتة: تقرأ من stats المحسوبة مسبقاً دون أي تغيير في الحسابات.
// ════════════════════════════════════════════════════════════════════════

// تدرّج حسب حالة المشروع — مع تمييز المشاريع النشطة الخاسرة (متعثّرة) بالأحمر.
function projectGradient(status, profit) {
  if ((status === 'نشط' || status === 'موافق عليه') && profit < 0)
    return `linear-gradient(135deg, ${C.accent} 0%, ${C.primary} 70%, ${C.gold} 118%)`
  switch (status) {
    case 'نشط':       return `linear-gradient(135deg, ${C.success} 0%, #0EA5E9 58%, ${C.cyan} 115%)`
    case 'موافق عليه': return `linear-gradient(135deg, ${C.cyan} 0%, #2563EB 60%, ${C.secondary} 118%)`
    case 'عرض سعر':   return `linear-gradient(135deg, ${C.gold} 0%, ${C.warning} 52%, ${C.primary} 115%)`
    case 'مكتمل':     return `linear-gradient(135deg, ${C.secondary} 0%, #2563EB 60%, ${C.cyan} 118%)`
    case 'ملغي':      return `linear-gradient(135deg, #64748B 0%, ${C.accent} 95%)`
    case 'مؤرشف':     return `linear-gradient(135deg, #475569 0%, #1E293B 110%)`
    default:          return `linear-gradient(135deg, ${C.primary} 0%, ${C.gold} 50%, ${C.secondary} 115%)`
  }
}

export default function ProjectCard({ project, stats = {}, businessName, lang = 'ar', showAmounts = true, onOpen, delay = 0 }) {
  const M = (s) => showAmounts ? s : '•••'   // تقنيع المبالغ
  const [flipped, setFlipped] = useState(false)
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)

  const profit = stats.profit || 0
  const isProfit = profit >= 0
  const gradient = projectGradient(project.status, profit)
  const Icon = project.type === 'يومي' ? Hammer : Building2
  const price = parseFloat(project.price) || 0
  const remaining = price > 0 ? price - (stats.revenue || 0) : 0

  function flip(e) { e.stopPropagation(); setFlipped(f => !f) }

  const miniStats = [
    { label: L('إيرادات', 'הכנסות', 'Revenue'), value: M(`₪${fmt(stats.revenue || 0)}`) },
    { label: L('التكاليف', 'הוצאות', 'Costs'),   value: M(`₪${fmt(stats.cost || 0)}`) },
    { label: L('أيام', 'ימים', 'Days'),           value: stats.wdCount || 0 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ perspective: 1400 }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        whileTap={{ scale: 0.985 }}
        style={{ position: 'relative', width: '100%', aspectRatio: '1.6 / 1', transformStyle: 'preserve-3d', cursor: 'pointer' }}
      >
        {/* ══ الوجه الأمامي ══ */}
        <div
          onClick={() => onOpen?.(project)}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: gradient,
            boxShadow: '0 12px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
            padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
          <HolographicSheen />
          <div style={{ position: 'absolute', top: -64, insetInlineEnd: -46, width: 190, height: 190, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -36, insetInlineEnd: -16, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

          {/* صف علوي */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                <Icon size={22} color="#fff" strokeWidth={1.9} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>
                {project.status ? tEnum(project.status, lang) : L('نشط', 'פעיל', 'Active')}
              </span>
            </div>
            <button onClick={flip} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              <RotateCw size={12} color="#fff" strokeWidth={2.5} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{L('اقلب', 'הפוך', 'Flip')}</span>
            </button>
          </div>

          {/* الاسم + العميل + الربح */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>PROJECT</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
              {project.client_name && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  <MapPin size={11} color="#fff" strokeWidth={2.2} /> {project.client_name}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.78)', marginBottom: 1, justifyContent: 'flex-end' }}>
                {isProfit ? <TrendingUp size={11} color="#fff" strokeWidth={2.4} /> : <TrendingDown size={11} color="#fff" strokeWidth={2.4} />}
                {isProfit ? L('الربح', 'רווח', 'Profit') : L('الخسارة', 'הפסד', 'Loss')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.28)' }}>{M(`${isProfit ? '' : '−'}₪${fmt(Math.abs(profit))}`)}</div>
              {stats.margin ? <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{stats.margin}%</div> : null}
            </div>
          </div>

          {/* إحصائيات */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {miniStats.map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 9, padding: '5px 6px', textAlign: 'center', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* تنبيه معلّق */}
          {stats.pending > 0 && (
            <div style={{ position: 'absolute', insetInlineStart: 16, bottom: 14, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <AlertTriangle size={10} color="#fff" strokeWidth={2.5} />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{stats.pending}</span>
            </div>
          )}
        </div>

        {/* ══ الوجه الخلفي (P&L) ══ */}
        <div
          onClick={(e) => { e.stopPropagation(); setFlipped(false) }}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            background: `linear-gradient(140deg, ${C.surface}, ${C.card})`, border: `1px solid ${C.borderMid}`,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Banknote size={14} color={C.primary} strokeWidth={2.4} />
            <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{L('الربح والخسارة', 'רווח והפסד', 'Profit & Loss')}</span>
          </div>
          {[
            { label: L('الإيراد', 'הכנסה', 'Revenue'), value: M(`₪${fmt(stats.revenue || 0)}`), color: C.success },
            { label: L('التكاليف', 'הוצאות', 'Costs'),  value: M(`₪${fmt(stats.cost || 0)}`), color: C.accent },
            { label: L('صافي الربح', 'רווח נקי', 'Net Profit'), value: M(`${isProfit ? '' : '−'}₪${fmt(Math.abs(profit))}`), color: isProfit ? C.success : C.accent, bold: true },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontSize: row.bold ? 14 : 12, fontWeight: row.bold ? 900 : 800, color: row.color }}>{row.value}</span>
            </div>
          ))}
          {price > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 1 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                {remaining > 0 ? <Clock size={11} color={C.warning} strokeWidth={2.2} /> : <CheckCircle2 size={11} color={C.success} strokeWidth={2.2} />}
                {remaining > 0 ? L('متبقّي تحصيله', 'נותר לגבות', 'Remaining') : L('اكتمل التحصيل', 'נגבה במלואו', 'Fully collected')}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: remaining > 0 ? C.warning : C.success }}>{M(remaining > 0 ? `₪${fmt(remaining)}` : `₪${fmt(price)}`)}</span>
            </div>
          )}
          {businessName && (
            <span style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 20, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Building2 size={9} strokeWidth={2} /> {businessName}
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
