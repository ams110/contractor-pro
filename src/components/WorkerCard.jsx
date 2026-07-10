import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  RotateCw, MessageCircle, Copy, Check, QrCode,
  Star, AlertTriangle, Wallet,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { openWhatsApp, waMessages } from '../lib/whatsapp.js'
import { tEnum } from '../lib/labels.js'
import { toneFromColor } from '../ui/Premium.jsx'
import PortalUpsell from './PortalUpsell.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة العامل — Premium DNA (§2.1): سطح داكن + نبرة لونية حسب حالة الرصيد
//  بدل التدرّج البرتقالي الموحّد. مضغوطة وقابلة للمسح السريع، والرصيد هو
//  البطل. تنقلب 3D لوجه QR البوّابة كما قبل. بصرية بحتة — نفس الـprops.
//  النبرة: مستحق له → warning · مسدّد → success · مدفوع زيادة → cyan.
// ════════════════════════════════════════════════════════════════════════
function initialsOf(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function WorkerCard({ worker, stats = {}, dna, anomaly, lang = 'ar', qr, portalUrl, portalEnabled = true, showAmounts = true, onOpen, delay = 0 }) {
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)

  const balance = stats.balance || 0
  const url = portalUrl || `${window.location.origin}${window.location.pathname}?portal`
  const alerts = (stats.pending || 0) + (anomaly?.total || 0)
  // أحمر فقط عند شذوذ فعلي — المعلّق العادي تحذيري حتى ما تغرق القائمة بالأحمر
  const alertColor = (anomaly?.total || 0) > 0 ? C.accent : C.warning

  const tone = toneFromColor(balance > 0 ? C.warning : balance < 0 ? C.cyan : C.success)
  const balanceLabel = balance > 0
    ? L('مستحق له', 'לתשלום', 'Owed')
    : balance < 0 ? L('مدفوع زيادة', 'שולם ביתר', 'Overpaid') : L('مسدّد', 'מאוזן', 'Settled')

  function flip(e) { e.stopPropagation(); setFlipped(f => !f) }
  function copyLink(e) {
    e.stopPropagation()
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }
  function shareWa(e) {
    e.stopPropagation()
    openWhatsApp(worker.phone, waMessages.portalInvite({ workerName: worker.name, url }))
  }
  function shareStatement(e) {
    e.stopPropagation()
    openWhatsApp(worker.phone, waMessages.workerStatement({
      workerName: worker.name,
      earned: stats.earned || 0,
      paid: stats.paid || 0,
      advances: stats.adv || 0,
      balance: stats.balance || 0,
    }))
  }

  const miniStats = [
    { label: L('المستحق', 'הרוויח', 'Earned'), value: showAmounts ? `₪${fmt(stats.earned || 0)}` : '•••' },
    { label: L('المدفوع', 'שולם', 'Paid'),     value: showAmounts ? `₪${fmt(stats.paid || 0)}` : '•••' },
    { label: L('أيام', 'ימים', 'Days'),         value: stats.days || 0 },
  ]

  const chipBtn = (color) => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 10,
    background: `${color}14`, border: `1px solid ${color}30`, color,
    fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  })

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
          onClick={() => onOpen?.(worker)}
          style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${tone.soft}, ${C.surface} 62%)`,
            border: `1px solid ${tone.main}33`,
            padding: '14px 14px 12px',
          }}>
          {/* وميض دائري بالزاوية (توقيع البطاقة الفخمة) */}
          <div aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)`, opacity: 0.38, pointerEvents: 'none' }} />

          {/* رأس: أفاتار + اسم/تخصّص ↔ الرصيد */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: tone.soft, border: `1px solid ${tone.main}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {worker.avatar_url
                ? <img src={worker.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 15, fontWeight: 900, color: tone.main, letterSpacing: '-0.02em' }}>{initialsOf(worker.name)}</span>}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {worker.specialty && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: C.textDim, padding: '2px 8px', borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tEnum(worker.specialty, lang)}
                  </span>
                )}
                {dna && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 999, background: `${C.gold}18`, border: `1px solid ${C.gold}3a` }}>
                    {dna.star && <Star size={9} color={C.gold} strokeWidth={2.5} fill={C.gold} />}
                    <span style={{ fontSize: 10, fontWeight: 900, color: C.gold, direction: 'ltr' }}>{dna.score}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: C.gold }}>{dna.tier}</span>
                  </span>
                )}
                {worker.phone && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, fontFamily: 'monospace', letterSpacing: '0.05em', direction: 'ltr' }}>{worker.phone}</span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: C.textDim, marginBottom: 2 }}>
                <Wallet size={11} color={tone.main} strokeWidth={2.4} /> {balanceLabel}
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, color: tone.main, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {showAmounts ? `${balance < 0 ? '−' : ''}₪${fmt(Math.abs(balance))}` : '•••'}
              </div>
            </div>
          </div>

          {/* شريط إحصائيات مفصول بخيط */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {miniStats.map((s, i) => (
              <div key={s.label} style={{ textAlign: 'center', borderInlineStart: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: C.textDim, marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* صفّ الإجراءات السريعة */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, marginTop: 11 }}>
            {worker.phone && showAmounts && (
              <button onClick={shareStatement} title={L('كشف حساب واتساب', 'דוח חשבון בוואטסאפ', 'WhatsApp statement')} style={chipBtn(C.success)}>
                <MessageCircle size={12} strokeWidth={2.5} /> {L('كشف', 'דוח', 'Bill')}
              </button>
            )}
            <button onClick={flip} style={chipBtn(C.cyan)}>
              <QrCode size={12} strokeWidth={2.4} /> {L('البوّابة', 'פורטל', 'Portal')}
            </button>
            <div style={{ flex: 1 }} />
            {alerts > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999, background: `${alertColor}16`, border: `1px solid ${alertColor}3a` }}>
                <AlertTriangle size={10} color={alertColor} strokeWidth={2.5} />
                <span style={{ fontSize: 9.5, fontWeight: 800, color: alertColor }}>{alerts} {L('معلّق', 'ממתין', 'Pending')}</span>
              </span>
            )}
          </div>
        </div>

        {/* ══ الوجه الخلفي (QR البوّابة) ══ */}
        <div
          onClick={(e) => { e.stopPropagation(); setFlipped(false) }}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            background: `linear-gradient(140deg, ${C.surface}, ${C.card})`, border: `1px solid ${C.borderMid}`,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)', padding: 14,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
          {portalEnabled ? (<>
            <div style={{ width: 96, height: 96, borderRadius: 14, background: '#fff', padding: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
              {qr ? <img src={qr} alt="" style={{ width: '100%', height: '100%' }} /> : <QrCode size={44} color={C.surface} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <QrCode size={14} color={C.primary} strokeWidth={2.4} />
                <span style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{L('بوّابة العامل', 'פורטל העובד', 'Worker Portal')}</span>
              </div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.5, marginBottom: 9 }}>
                {L('امسح الكود أو شارك الرابط ليدخل العامل بوّابته', 'סרוק או שתף את הקישור', 'Scan or share the link with your worker')}
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <button onClick={shareWa} style={chipBtn(C.success)}>
                  <MessageCircle size={13} strokeWidth={2.4} /> {L('واتساب', 'וואטסאפ', 'WhatsApp')}
                </button>
                <button onClick={copyLink} style={chipBtn(copied ? C.success : C.primary)}>
                  {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />} {copied ? L('تم', 'הועתק', 'Copied') : L('نسخ', 'העתק', 'Copy')}
                </button>
                <button onClick={flip} style={chipBtn(C.cyan)}>
                  <RotateCw size={12} strokeWidth={2.4} /> {L('رجوع', 'חזרה', 'Back')}
                </button>
              </div>
            </div>
          </>) : (
            <PortalUpsell lang={lang} />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
