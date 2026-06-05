import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Medal, Crown, Gift } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  شريط العامل الشهري — صف العامل داخل مجموعة الشهر: أفاتار + ميدالية ترتيب
//  (الأعلى صرفاً) + شرائح (أيام/متوسط) + مخطّط نشاطه المصغّر + إجماله الشهري.
//  بصري بحت يقرأ بيانات مجمّعة مسبقاً، ويحافظ على الفتح/الطي للتذاكر.
// ════════════════════════════════════════════════════════════════════════

const RANK = {
  1: { ring: C.gold,    grad: `linear-gradient(160deg, ${C.gold}, ${C.primary})`, Icon: Crown },
  2: { ring: '#94A3B8', grad: 'linear-gradient(160deg, #94A3B8, #475569)',        Icon: Medal },
  3: { ring: '#B45309', grad: 'linear-gradient(160deg, #B45309, #78350F)',        Icon: Medal },
}

function initialsOf(name) {
  return (name || '؟').split(' ').map(w => w[0]).join('').slice(0, 2)
}

function Sparkline({ bars = [], color }) {
  const max = Math.max(1, ...bars)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, marginTop: 5 }}>
      {bars.map((v, i) => (
        <div key={i} style={{ flex: 1, minWidth: 2, height: `${Math.max(10, (v / max) * 100)}%`, borderRadius: 2, background: v > 0 ? color : `${color}26`, opacity: v > 0 ? 0.8 : 0.35 }} />
      ))}
    </div>
  )
}

export default function WorkerMonthStrip({
  name, rank, workDays = 0, holidays = 0, total = 0, bars = [], isOpen = false, onToggle, isLast = false,
}) {
  const r = RANK[rank]
  const accent = r ? r.ring : C.secondary
  const avg = workDays ? Math.round(total / workDays) : 0

  return (
    <button onClick={onToggle}
      style={{
        width: '100%', position: 'relative', overflow: 'hidden', textAlign: 'inherit', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', cursor: 'pointer',
        background: rank === 1
          ? `linear-gradient(135deg, ${C.gold}1f, ${C.surface} 60%)`
          : (isOpen ? `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.03))` : `linear-gradient(135deg, ${accent}0e, transparent)`),
        border: 'none', borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
      }}>
      {rank === 1 && <HolographicSheen opacity={0.13} />}

      {/* أفاتار + ميدالية */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: r ? r.grad : GRAD.premium, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
          {initialsOf(name)}
        </div>
        {r && (
          <div style={{ position: 'absolute', bottom: -4, insetInlineStart: -4, width: 18, height: 18, borderRadius: '50%', background: r.ring, border: `1.5px solid ${C.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <r.Icon size={10} color="#fff" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* الوسط */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || '؟'}</span>
          {rank === 1 && <span style={{ fontSize: 8, fontWeight: 800, color: C.gold, background: `${C.gold}1c`, border: `1px solid ${C.gold}40`, borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>الأعلى</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>{workDays} يوم</span>
          {holidays > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, color: C.warning }}><Gift size={9} strokeWidth={2.2} /> {holidays}</span>}
          {avg > 0 && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: C.textDim, opacity: 0.5 }} /><span style={{ fontSize: 10, fontWeight: 700, color: C.textDim }}>₪{fmt(avg)}/يوم</span></>}
        </div>
        <Sparkline bars={bars} color={accent} />
      </div>

      {/* الإجمالي + سهم */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.success, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>₪{fmt(total)}</div>
        <ChevronDown size={13} style={{ color: C.textDim, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>
    </button>
  )
}
