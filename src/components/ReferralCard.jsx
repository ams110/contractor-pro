import React, { useState, useEffect } from 'react'
import { Gift, Copy, Check, Send, Users } from 'lucide-react'
import { C } from '../constants/index.js'
import { useAppStore } from '../store/useAppStore.js'
import { usePlanStore } from '../store/usePlanStore.js'
import { tl } from '../lib/labels.js'
import { supabase } from '../lib/supabase.js'
import { waMessages } from '../lib/whatsapp.js'
import { referralShareUrl } from '../lib/referral.js'
import { IconChip } from '../ui/Premium.jsx'

/**
 * بطاقة «جيب صاحبك» — برنامج الإحالة.
 * من محاكاة الإحالة: الرسالة هدية للصاحب (بلا ذكر مكافأة المُرسِل)، قابلة
 * للتعديل بكلمات المُرسِل قبل الإرسال، والبطاقة تظهر **للمدفوعين فقط**
 * (نصف الشخصيات رفضت توصّي بإشي ما دفعت فيه). مكافأة المُرسِل تظهر هنا
 * بصمت («رصيدك») — مش برسالة الصاحب.
 */
export default function ReferralCard({ userId: userIdProp }) {
  const language = useAppStore(s => s.language)
  const { plan, trialActive, paddleEnabled } = usePlanStore()
  const [userId,  setUserId]  = useState(userIdProp || null)
  const [code,    setCode]    = useState(null)
  const [stats,   setStats]   = useState({ signed: 0, rewarded: 0 })
  const [copied,  setCopied]  = useState(false)
  const [editing, setEditing] = useState(false)
  const [msg,     setMsg]     = useState('')

  // «مش أثناء التجربة»: البطاقة للمدفوعين فقط (لما الدفع مفعّل)
  const isPaid = !paddleEnabled || (!trialActive && plan !== 'free')

  // بلا prop → خذ هوية المستخدم المصادَق (يسمح بالتركيب بأي شاشة بلا تمرير)
  useEffect(() => {
    if (userIdProp) { setUserId(userIdProp); return }
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [userIdProp])

  useEffect(() => {
    if (!userId || !isPaid) return
    supabase.from('profiles').select('referral_code').eq('id', userId).maybeSingle()
      .then(({ data }) => setCode(data?.referral_code || null))
    supabase.from('referrals').select('status').eq('referrer_user_id', userId)
      .then(({ data }) => {
        if (!data) return
        setStats({
          signed:   data.length,
          rewarded: data.filter(r => r.status === 'rewarded' || r.status === 'reward_pending').length,
        })
      })
  }, [userId, isPaid])

  // بلا كود (migration الإحالة لسا ما طُبّقت) أو غير مدفوع → لا بطاقة
  if (!isPaid || !code) return null

  const url  = referralShareUrl(code)
  const text = msg || waMessages.referralInvite({ url })

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  function shareWa() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${C.success}14, ${C.surface} 70%)`, border: `1px solid ${C.success}2e`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: -40, top: -40, width: 160, height: 160, background: `radial-gradient(circle, ${C.success}45, transparent 70%)`, opacity: 0.35, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <IconChip icon={Gift} tone="excellent" pulse />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{tl(language, 'جيب صاحبك — شهر مجاني', 'תביא חבר — חודש חינם', 'Bring a friend — free month')}</div>
          <div style={{ fontSize: 10.5, color: C.textDim }}>{tl(language, 'صاحبك بياخد شهر مجاني لما يشترك — وانت كمان', 'החבר שלך מקבל חודש חינם כשהוא נרשם — וגם אתה', 'Your friend gets a free month when they subscribe — and so do you')}</div>
        </div>
        {stats.rewarded > 0 && (
          <div style={{ padding: '4px 9px', borderRadius: 9, background: `${C.success}16`, border: `1px solid ${C.success}3a`, fontSize: 11, fontWeight: 800, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={11} strokeWidth={2.4} /> {stats.rewarded} {tl(language, 'شهور', 'חודשים', 'months')}
          </div>
        )}
      </div>

      {/* الرسالة — قابلة للتعديل بكلماتك (مطلب المحاكاة الصريح) */}
      {editing ? (
        <textarea value={text} onChange={e => setMsg(e.target.value)} rows={3}
          style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 11px', color: C.text, fontSize: 12, lineHeight: 1.6, resize: 'vertical', marginBottom: 8, fontFamily: 'inherit' }} />
      ) : (
        <div onClick={() => setEditing(true)}
          style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '9px 11px', fontSize: 11.5, color: C.textDim, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 8, cursor: 'text' }}>
          {text}
          <div style={{ fontSize: 9.5, color: C.textDim, opacity: 0.7, marginTop: 4 }}>{tl(language, 'اكبس لتعدّلها بكلماتك قبل الإرسال', 'לחץ כדי לערוך במילים שלך', 'Tap to edit in your own words')}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={shareWa}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 12, background: C.success, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          <Send size={14} strokeWidth={2.4} /> {tl(language, 'ابعت عالواتساب', 'שלח בוואטסאפ', 'Send on WhatsApp')}
        </button>
        <button onClick={copyLink}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px', borderRadius: 12, background: `${C.success}14`, border: `1px solid ${C.success}33`, color: C.success, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          {copied ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2.2} />}
          {copied ? tl(language, 'انتسخ', 'הועתק', 'Copied') : tl(language, 'انسخ الرابط', 'העתק קישור', 'Copy link')}
        </button>
      </div>

      {stats.signed > 0 && (
        <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 8 }}>
          {tl(language, `${stats.signed} سجّلوا من رابطك`, `${stats.signed} נרשמו מהקישור שלך`, `${stats.signed} signed up from your link`)}
          {stats.rewarded > 0 && tl(language, ` · ${stats.rewarded} شهور مجانية كسبتها`, ` · ${stats.rewarded} חודשים חינם שהרווחת`, ` · ${stats.rewarded} free months earned`)}
        </div>
      )}
    </div>
  )
}
