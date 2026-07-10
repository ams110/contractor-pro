import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Hammer, TrendingUp, TrendingDown,
  MapPin, Clock, CheckCircle2, AlertTriangle, Banknote,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tEnum } from '../lib/labels.js'
import { toneFromColor } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة المشروع — Premium DNA (§2.1): سطح داكن + نبرة لونية حسب الحالة
//  بدل التدرّج المشبع الموحّد. الربح هو البطل + شريط تقدّم التحصيل.
//  تنقلب 3D لتفصيل P&L كما قبل. بصرية بحتة — نفس الـprops والحسابات.
// ════════════════════════════════════════════════════════════════════════

// لون النبرة حسب حالة المشروع (خسارة نشطة → أحمر إنذاري)
function statusColor(status, profit) {
  if ((status === 'نشط' || status === 'موافق عليه') && profit < 0) return C.accent
  switch (status) {
    case 'نشط':        return C.primary
    case 'موافق عليه':  return C.gold
    case 'عرض سعر':    return C.warning
    case 'مكتمل':      return C.success
    case 'ملغي':       return C.accent
    case 'مؤرشف':      return C.textDim
    default:           return C.primary
  }
}

export default function ProjectCard({ project, stats = {}, businessName, lang = 'ar', showAmounts = true, onOpen, delay = 0 }) {
  const M = (s) => showAmounts ? s : '•••'   // تقنيع المبالغ
  const [flipped, setFlipped] = useState(false)
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)

  const profit = stats.profit || 0
  const isProfit = profit >= 0
  const tone = toneFromColor(statusColor(project.status, profit))
  const profitColor = isProfit ? C.success : C.accent
  const Icon = project.type === 'يومي' ? Hammer : Building2
  const price = parseFloat(project.price) || 0
  const remaining = price > 0 ? price - (stats.revenue || 0) : 0
  const collectedPct = price > 0 ? Math.max(0, Math.min(100, Math.round(((stats.revenue || 0) / price) * 100))) : 0

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
        style={{ position: 'relative', width: '100%', transformStyle: 'preserve-3d', cursor: 'pointer' }}
      >
        {/* ══ الوجه الأمامي — في التدفّق، يحدّد ارتفاع البطاقة ══ */}
        <div
          onClick={() => onOpen?.(project)}
          style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${tone.soft}, ${C.surface} 62%)`,
            border: `1px solid ${tone.main}33`,
            padding: '14px 14px 12px',
          }}>
          {/* وميض دائري بالزاوية (توقيع البطاقة الفخمة) */}
          <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)`, opacity: 0.38, pointerEvents: 'none' }} />

          {/* رأس: أيقونة + اسم/عميل ↔ الربح */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: tone.soft, border: `1px solid ${tone.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={21} color={tone.main} strokeWidth={2} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: tone.main, padding: '2px 8px', borderRadius: 999, background: tone.soft, border: `1px solid ${tone.main}3a`, whiteSpace: 'nowrap' }}>
                  {project.status ? tEnum(project.status, lang) : L('نشط', 'פעיל', 'Active')}
                </span>
                {project.client_name && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                    <MapPin size={10} strokeWidth={2.2} /> {project.client_name}
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: C.textDim, marginBottom: 2 }}>
                {isProfit ? <TrendingUp size={11} color={profitColor} strokeWidth={2.4} /> : <TrendingDown size={11} color={profitColor} strokeWidth={2.4} />}
                {isProfit ? L('الربح', 'רווח', 'Profit') : L('الخسارة', 'הפסד', 'Loss')}
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: profitColor, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {M(`${isProfit ? '' : '−'}₪${fmt(Math.abs(profit))}`)}
              </div>
              {stats.margin ? <div style={{ fontSize: 9.5, fontWeight: 700, color: C.textDim }}>{stats.margin}%</div> : null}
            </div>
          </div>

          {/* شريط تقدّم التحصيل (للمقاولة المسعّرة) */}
          {price > 0 && showAmounts && (
            <div style={{ position: 'relative', marginTop: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim }}>
                  {L('التحصيل', 'גבייה', 'Collected')} {collectedPct}%
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: remaining > 0 ? C.warning : C.success }}>
                  {remaining > 0 ? <Clock size={9} strokeWidth={2.2} /> : <CheckCircle2 size={9} strokeWidth={2.2} />}
                  {remaining > 0 ? `${L('متبقّي', 'נותר', 'Left')} ₪${fmt(remaining)}` : L('اكتمل التحصيل', 'נגבה במלואו', 'Fully collected')}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ width: `${collectedPct}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${tone.main}, ${C.gold})`, transition: 'width .5s ease' }} />
              </div>
            </div>
          )}

          {/* شريط إحصائيات مفصول بخيط */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {miniStats.map((s, i) => (
              <div key={s.label} style={{ textAlign: 'center', borderInlineStart: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: C.textDim, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* صفّ سفلي: P&L + مصلحة + تنبيه معلّق */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, marginTop: 11 }}>
            <button onClick={flip}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 10, background: `${C.cyan}14`, border: `1px solid ${C.cyan}30`, color: C.cyan, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              <Banknote size={12} strokeWidth={2.4} /> {L('الربح والخسارة', 'רווח והפסד', 'P&L')}
            </button>
            {businessName && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: C.textDim, padding: '4px 9px', borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Building2 size={10} strokeWidth={2} /> {businessName}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {stats.pending > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: `${C.warning}16`, border: `1px solid ${C.warning}3a` }}>
                <AlertTriangle size={10} color={C.warning} strokeWidth={2.5} />
                <span style={{ fontSize: 9.5, fontWeight: 800, color: C.warning }}>{stats.pending} {L('معلّق', 'ממתין', 'Pending')}</span>
              </span>
            )}
          </div>
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
