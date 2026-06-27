import React from 'react'
import { motion } from 'framer-motion'
import {
  Sun, CloudSun, Clock, DollarSign, Star, MapPin, Check, Hourglass, XCircle, Gift,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { tEnum } from '../lib/labels.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  تذكرة الشِفت — بطاقة يوم عمل بأسلوب «التذكرة»: كعب تاريخ ممزّق + كعب أجر
//  مفصول بخطّ تثقيب وحفرتين + ختم حالة + لمعة. بصرية بحتة تقرأ بيانات اليوم.
// ════════════════════════════════════════════════════════════════════════

// نوع اليوم → لون + تدرّج الكعب + أيقونة
const TYPE = {
  'كامل':      { color: C.primary,   grad: `linear-gradient(160deg, ${C.primary}, ${C.gold})`,   icon: Sun },
  'نص يوم':    { color: C.warning,   grad: `linear-gradient(160deg, ${C.warning}, ${C.gold})`,   icon: CloudSun },
  'ساعات':     { color: C.blue || '#3B82F6', grad: `linear-gradient(160deg, ${C.blue || '#3B82F6'}, ${C.cyan})`, icon: Clock },
  'مبلغ مسكر': { color: C.secondary, grad: `linear-gradient(160deg, ${C.secondary}, #2563EB)`,   icon: DollarSign },
  'عطلة':      { color: C.textDim,   grad: 'linear-gradient(160deg, #475569, #1E293B)',          icon: Star },
}

const STATUS = {
  approved: { color: C.success, label: { ar: 'معتمد', he: 'מאושר', en: 'Approved' }, Icon: Check },
  pending:  { color: C.warning, label: { ar: 'بانتظار', he: 'ממתין', en: 'Pending' }, Icon: Hourglass },
  rejected: { color: C.accent,  label: { ar: 'مرفوض', he: 'נדחה', en: 'Rejected' }, Icon: XCircle },
}

function parseDate(s, loc) {
  const [Y, M, D] = String(s || '').slice(0, 10).split('-').map(Number)
  if (!Y || !M || !D) return { day: '—', month: '', weekday: '' }
  const d = new Date(Y, M - 1, D)
  return {
    day: D,
    month: d.toLocaleDateString(loc, { month: 'short' }),
    weekday: d.toLocaleDateString(loc, { weekday: 'short' }),
  }
}

export default function WorkDayTicket({
  wd, name, projectName, holidayName, lang = 'ar',
  hideName = false, selected = false, onClick, actions,
  notchColor = C.bg, delay = 0,
}) {
  const L = (o) => (lang === 'en' ? o.en : lang === 'he' ? o.he : o.ar)
  const loc = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-US' : 'ar'
  const t = TYPE[wd.day_type] || TYPE['كامل']
  const Icon = t.icon
  const { day, month, weekday } = parseDate(wd.date, loc)
  const st = STATUS[wd.status] || STATUS.approved
  const accent = selected ? C.primary : t.color
  const showHours = wd.hours != null && wd.day_type !== 'عطلة' && wd.day_type !== 'مبلغ مسكر'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      onClick={onClick} dir="rtl"
      style={{
        position: 'relative', display: 'flex', alignItems: 'stretch', minHeight: 96, borderRadius: 18, overflow: 'hidden',
        background: selected ? `linear-gradient(135deg, ${C.primary}1f, ${C.card} 55%)` : `linear-gradient(135deg, ${t.color}14, ${C.card} 55%)`,
        border: `1px solid ${accent}${selected ? '66' : '33'}`,
        boxShadow: `0 10px 28px ${t.color}1c`,
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <HolographicSheen opacity={0.2} />

      {/* كعب التاريخ */}
      <div style={{ position: 'relative', width: 74, flexShrink: 0, background: t.grad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 1 }}>
        <Icon size={15} color="#fff" strokeWidth={2.2} style={{ opacity: 0.95, marginBottom: 2 }} />
        <div style={{ fontSize: 25, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{day}</div>
        <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.95 }}>{month}</div>
        <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>{weekday}</div>
      </div>

      {/* الوسط */}
      <div style={{ flex: 1, minWidth: 0, padding: '11px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        {!hideName && <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || '؟'}</div>}
        {projectName && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: hideName ? 13 : 11, fontWeight: hideName ? 800 : 600, color: hideName ? C.text : C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <MapPin size={11} color={t.color} strokeWidth={2.2} /> {projectName}
          </div>
        )}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: t.color, background: `${t.color}1c`, border: `1px solid ${t.color}38`, borderRadius: 7, padding: '2px 8px' }}>{tEnum(wd.day_type, lang)}</span>
          {showHours && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.textDim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '2px 8px' }}>{wd.hours} {L({ ar: 'ساعات', he: 'שעות', en: 'hrs' })}</span>}
          {wd.location && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.primary, background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 7, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={8} strokeWidth={2.2} /> {wd.location}</span>}
          {holidayName && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.warning, background: `${C.warning}18`, border: `1px solid ${C.warning}33`, borderRadius: 7, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Gift size={8} strokeWidth={2.2} /> {holidayName}</span>}
        </div>
      </div>

      {/* خط التثقيب + حفرتان */}
      <div style={{ position: 'relative', width: 0, borderInlineStart: `2px dashed ${accent}40`, margin: '13px 0', flexShrink: 0 }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 92, top: -9, width: 18, height: 18, borderRadius: '50%', background: notchColor }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 92, bottom: -9, width: 18, height: 18, borderRadius: '50%', background: notchColor }} />

      {/* كعب الأجر */}
      <div style={{ width: 92, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 6px' }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: C.textDim }}>{L({ ar: 'الأجر', he: 'שכר', en: 'Wage' })}</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: accent, letterSpacing: '-0.03em' }}>₪{fmt(wd.amount || 0)}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 800, color: st.color, background: `${st.color}1a`, border: `1px solid ${st.color}40`, borderRadius: 20, padding: '2px 7px' }}>
          <st.Icon size={9} strokeWidth={2.8} /> {L(st.label)}
        </span>
      </div>

      {/* عمود إجراءات اختياري */}
      {actions && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 8px 0 4px', borderInlineStart: `1px solid ${C.border}` }}>
          {actions}
        </div>
      )}
    </motion.div>
  )
}
