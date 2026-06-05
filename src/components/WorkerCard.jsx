import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  RotateCw, HardHat, MessageCircle, Copy, Check, QrCode,
  Star, AlertTriangle, Wallet,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { openWhatsApp, waMessages } from '../lib/whatsapp.js'
import { HolographicSheen } from '../ui/Premium.jsx'

// ════════════════════════════════════════════════════════════════════════
//  بطاقة هوية العامل — Wallet-style، لمعة holographic، تنقلب 3D لـ QR البوّابة
//  بصرية بحتة: تعيد استخدام رابط البوّابة العام دون أي تغيير في منطقه.
// ════════════════════════════════════════════════════════════════════════
function initialsOf(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function WorkerCard({ worker, stats = {}, dna, anomaly, lang = 'ar', qr, portalUrl, onOpen, delay = 0 }) {
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const L = (ar, he, en) => (lang === 'en' ? en : lang === 'he' ? he : ar)

  const balance = stats.balance || 0
  const url = portalUrl || `${window.location.origin}${window.location.pathname}?portal`

  function flip(e) { e.stopPropagation(); setFlipped(f => !f) }
  function copyLink(e) {
    e.stopPropagation()
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }
  function shareWa(e) {
    e.stopPropagation()
    openWhatsApp(worker.phone, waMessages.portalInvite({ workerName: worker.name, url }))
  }

  const miniStats = [
    { label: L('المستحق', 'הרוויח', 'Earned'), value: `₪${fmt(stats.earned || 0)}` },
    { label: L('المدفوع', 'שולם', 'Paid'),     value: `₪${fmt(stats.paid || 0)}` },
    { label: L('أيام', 'ימים', 'Days'),         value: stats.days || 0 },
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
          onClick={() => onOpen?.(worker)}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${C.secondary} 0%, #6D28D9 28%, ${C.primary} 92%, ${C.gold} 118%)`,
            boxShadow: '0 12px 36px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.22)',
            padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
          <HolographicSheen />
          {/* نقش دائري خافت */}
          <div style={{ position: 'absolute', top: -64, insetInlineEnd: -46, width: 190, height: 190, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -36, insetInlineEnd: -16, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

          {/* صف علوي */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
                {worker.avatar_url
                  ? <img src={worker.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{initialsOf(worker.name)}</span>}
              </div>
              {worker.specialty && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', padding: '4px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.26)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                  {worker.specialty}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {dna && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.34)' }}>
                  {dna.star && <Star size={10} color="#fff" strokeWidth={2.5} fill="#fff" />}
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', direction: 'ltr' }}>{dna.score}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{dna.tier}</span>
                </span>
              )}
              <button onClick={flip} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <RotateCw size={12} color="#fff" strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{L('اقلب', 'הפוך', 'Flip')}</span>
              </button>
            </div>
          </div>

          {/* الاسم + الرصيد */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>CONTRACTOR&nbsp;PRO</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</div>
              {worker.phone && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', letterSpacing: '0.08em', marginTop: 2, direction: 'ltr', textAlign: 'start' }}>{worker.phone}</div>
              )}
            </div>
            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.78)', marginBottom: 1 }}>
                <Wallet size={11} color="#fff" strokeWidth={2.4} /> {L('الرصيد', 'מאזן', 'Balance')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.28)' }}>₪{fmt(Math.abs(balance))}</div>
            </div>
          </div>

          {/* شريط إحصائيات صغير */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {miniStats.map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 9, padding: '5px 6px', textAlign: 'center', backdropFilter: 'blur(2px)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* تنبيه معلّق */}
          {(stats.pending > 0 || anomaly?.total > 0) && (
            <div style={{ position: 'absolute', insetInlineStart: 16, bottom: 14, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.22)' }}>
              <AlertTriangle size={10} color="#fff" strokeWidth={2.5} />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{(stats.pending || 0) + (anomaly?.total || 0)}</span>
            </div>
          )}
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
          <div style={{ width: 100, height: 100, borderRadius: 14, background: '#fff', padding: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
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
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={shareWa} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: `${C.success}1c`, border: `1px solid ${C.success}40`, color: C.success, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                <MessageCircle size={13} strokeWidth={2.4} /> {L('واتساب', 'וואטסאפ', 'WhatsApp')}
              </button>
              <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: copied ? `${C.success}1c` : `${C.primary}1c`, border: `1px solid ${copied ? C.success : C.primary}40`, color: copied ? C.success : C.primary, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />} {copied ? L('تم', 'הועתק', 'Copied') : L('نسخ', 'העתק', 'Copy')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
