import React from 'react'
import { motion } from 'framer-motion'
import { ReceiptText, ArrowDownLeft, ArrowUpRight, Image as ImageIcon } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة الإيصال — صف مالي بأسلوب الإيصال الورقي: رقم مرجعي كختم + نقطة حالة
//  + شرائح + خطّ تثقيب وحفرتين + إجمالي ملوّن. مرن (مدخولات/مصاريف/فواتير).
//  بصري بحت، يستقبل البيانات والإجراءات كـ props.
// ════════════════════════════════════════════════════════════════════════
export default function ReceiptCard({
  accent = C.success, refNumber, date, title, subtitle,
  amount, amountLabel = 'قُبض', direction = 'in', // 'in' أخضر داخل / 'out' أحمر خارج
  chips = [], onView, viewLabel = 'عرض الإيصال', actions, children,
  notchColor = C.bg, delay = 0,
}) {
  const AmountIcon = direction === 'out' ? ArrowUpRight : ArrowDownLeft
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ delay }}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginBottom: 9,
        background: `linear-gradient(135deg, ${accent}12, ${C.card} 60%)`, border: `1px solid ${accent}2e`,
        boxShadow: `0 8px 22px ${accent}14` }}>
      <HolographicSheen opacity={0.14} />

      {/* شريط علوي: ختم المرجع + التاريخ/الحالة/الإجراءات */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px 8px', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${accent}1c`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ReceiptText size={15} color={accent} strokeWidth={2.2} />
          </div>
          {refNumber && <span style={{ fontSize: 11, fontWeight: 900, color: accent, fontFamily: 'monospace', letterSpacing: '0.02em', background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: 7, padding: '2px 8px', whiteSpace: 'nowrap' }}>{refNumber}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {date && <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{date}</span>}
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 7px ${accent}` }} />
          {actions}
        </div>
      </div>

      {/* العنوان + الشرائح + إضافات */}
      <div style={{ position: 'relative', padding: '0 13px 10px' }}>
        {title && <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.4, marginBottom: chips.length ? 7 : 0 }}>{title}</div>}
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c, i) => {
              const col = c.color || C.textDim
              return (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: col, background: `${col}15`, border: `1px solid ${col}30`, borderRadius: 7, padding: '2px 8px' }}>
                  {c.Icon && <c.Icon size={11} strokeWidth={2.2} />} {c.label}
                </span>
              )
            })}
          </div>
        )}
        {subtitle && <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic', marginTop: 6 }}>{subtitle}</div>}
        {children}
      </div>

      {/* تثقيب + حفرتان */}
      <div style={{ position: 'relative', height: 0, borderTop: `2px dashed ${accent}33`, margin: '0 12px' }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineStart: -8, bottom: 43, width: 16, height: 16, borderRadius: '50%', background: notchColor }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: -8, bottom: 43, width: 16, height: 16, borderRadius: '50%', background: notchColor }} />

      {/* الإجمالي + عرض */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 13px 11px', minHeight: 32 }}>
        {onView
          ? <button onClick={onView} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: C.primary, background: `${C.primary}14`, border: `1px solid ${C.primary}30`, borderRadius: 9, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <ImageIcon size={12} strokeWidth={2.2} /> {viewLabel}
            </button>
          : <span />}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 9.5, color: C.textDim, fontWeight: 600 }}>{amountLabel}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 18, fontWeight: 900, color: accent, letterSpacing: '-0.02em' }}>
            <AmountIcon size={14} strokeWidth={2.6} />₪{fmt(amount || 0)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
