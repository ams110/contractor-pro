import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, TrendingUp, TrendingDown, CalendarDays, Users, Gift } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  رأس الشهر — بانر شهري بأسلوب «كشف الحساب»: بلاطة الشهر + مخطّط نشاط مصغّر
//  (sparkline) + مؤشّر اتجاه مقابل الشهر السابق + إجمالي الصرف. الشهر الحالي
//  متوهّج بتدرّج ولمعة. بصري بحت يقرأ بيانات مجمّعة مسبقاً.
// ════════════════════════════════════════════════════════════════════════

function Sparkline({ bars = [], color }) {
  const max = Math.max(1, ...bars)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22, marginTop: 6 }}>
      {bars.map((v, i) => (
        <motion.div key={i}
          initial={{ height: 2 }} animate={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          transition={{ delay: i * 0.012, type: 'spring', stiffness: 320, damping: 26 }}
          style={{ flex: 1, minWidth: 2, borderRadius: 2, background: v > 0 ? color : `${color}26`, opacity: v > 0 ? 0.85 : 0.4 }}
        />
      ))}
    </div>
  )
}

export default function WorkMonthHeader({
  monthShort, year, monthNum, label, total, workDays, holidays = 0, workerCount = 0,
  isCurrent = false, isOpen = false, trendPct = null, bars = [], onToggle,
}) {
  const accent = isCurrent ? C.primary : C.success
  const trendUp = trendPct != null && trendPct >= 0
  const TrendIcon = trendUp ? TrendingUp : TrendingDown

  return (
    <button onClick={onToggle}
      style={{
        width: '100%', position: 'relative', overflow: 'hidden', textAlign: 'inherit', fontFamily: 'inherit',
        borderRadius: isOpen ? '18px 18px 0 0' : 18,
        background: isCurrent ? `linear-gradient(135deg, ${C.primary}26, ${C.surface} 62%)` : `linear-gradient(135deg, rgba(255,255,255,0.06), ${C.surface})`,
        border: `1.5px solid ${isCurrent ? C.primary + '55' : C.border}`,
        boxShadow: isCurrent ? `0 8px 26px ${C.primary}24` : 'none',
        padding: '12px 14px', cursor: 'pointer', transition: 'border-radius .2s',
      }}>
      {isCurrent && <HolographicSheen opacity={0.16} />}
      {isCurrent && <div aria-hidden style={{ position: 'absolute', top: -50, insetInlineEnd: -34, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${C.primary}45 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* بلاطة الشهر */}
        <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: isCurrent ? GRAD.primary : `${accent}1c`, border: `1px solid ${accent}40`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isCurrent ? '#fff' : accent, boxShadow: isCurrent ? `0 4px 14px ${C.primary}44` : 'none' }}>
          <CalendarDays size={14} strokeWidth={2.2} style={{ opacity: 0.9 }} />
          <span style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{String(monthNum).padStart(2, '0')}/{String(year).slice(2)}</span>
        </div>

        {/* الوسط */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: isCurrent ? C.primary : C.text, letterSpacing: '-0.02em' }}>{label}</span>
            {isCurrent && <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fff', background: GRAD.primary, borderRadius: 20, padding: '2px 8px' }}>الحالي</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.textDim }}><CalendarDays size={10} strokeWidth={2.2} /> {workDays} يوم</span>
            {holidays > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.warning }}><Gift size={10} strokeWidth={2.2} /> {holidays} عطلة</span>}
            {workerCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: C.textDim }}><Users size={10} strokeWidth={2.2} /> {workerCount} عامل</span>}
          </div>
          <Sparkline bars={bars} color={accent} />
        </div>

        {/* الإجمالي + الاتجاه + السهم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: isCurrent ? C.primary : C.success, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(total)}</div>
            {trendPct != null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 3, fontSize: 9.5, fontWeight: 800, color: trendUp ? C.success : C.textDim }}>
                <TrendIcon size={10} strokeWidth={2.6} /> {Math.abs(trendPct)}%
              </div>
            )}
          </div>
          <ChevronDown size={15} style={{ color: C.textDim, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
        </div>
      </div>
    </button>
  )
}
