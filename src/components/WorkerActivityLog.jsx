import React, { useState, useEffect } from 'react'
import {
  LogIn, Fingerprint, CalendarPlus, Receipt, Wallet, HandCoins,
  Package, KeyRound, ShieldCheck, ShieldOff, Activity as ActivityIcon,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { supabase } from '../lib/supabase.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

// خريطة الأفعال → أيقونة + لون (التسمية تُترجَم حسب اللغة)
const ACTION_META = {
  login:           { Icon: LogIn,       color: C.cyan },
  submit_day:      { Icon: CalendarPlus, color: C.primary },
  submit_expense:  { Icon: Receipt,     color: C.warning },
  request_payment: { Icon: Wallet,      color: C.success },
  request_advance: { Icon: HandCoins,   color: C.accent },
  add_material:    { Icon: Package,     color: C.secondary },
  change_password: { Icon: KeyRound,    color: C.gold },
  enable_passkey:  { Icon: ShieldCheck, color: C.secondary },
  disable_passkey: { Icon: ShieldOff,   color: C.textDim },
}

// تسمية الفعل حسب اللغة
function actionLabel(action, language) {
  switch (action) {
    case 'login':           return tl(language, 'تسجيل دخول', 'כניסה', 'Login')
    case 'submit_day':      return tl(language, 'سجّل يوم عمل', 'רשם יום עבודה', 'Logged a work day')
    case 'submit_expense':  return tl(language, 'قدّم مصروف', 'הגיש הוצאה', 'Submitted an expense')
    case 'request_payment': return tl(language, 'طلب راتب', 'ביקש משכורת', 'Requested salary')
    case 'request_advance': return tl(language, 'طلب سلفة', 'ביקש מקדמה', 'Requested an advance')
    case 'add_material':    return tl(language, 'سجّل بضاعة', 'רשם חומרים', 'Logged materials')
    case 'change_password': return tl(language, 'غيّر كلمة المرور', 'שינה סיסמה', 'Changed password')
    case 'enable_passkey':  return tl(language, 'فعّل البصمة', 'הפעיל טביעת אצבע', 'Enabled passkey')
    case 'disable_passkey': return tl(language, 'ألغى البصمة', 'ביטל טביעת אצבע', 'Disabled passkey')
    default:                return action
  }
}

function relTime(iso, language) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return tl(language, 'الآن', 'עכשיו', 'now')
  if (diff < 3600)  return tl(language, `قبل ${Math.floor(diff / 60)} د`, `לפני ${Math.floor(diff / 60)} ד'`, `${Math.floor(diff / 60)}m ago`)
  if (diff < 86400) return tl(language, `قبل ${Math.floor(diff / 3600)} س`, `לפני ${Math.floor(diff / 3600)} ש'`, `${Math.floor(diff / 3600)}h ago`)
  if (diff < 172800) return tl(language, 'أمس', 'אתמול', 'yesterday')
  const locale = language === 'he' ? 'he' : language === 'en' ? 'en' : 'ar'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function detailText(action, meta = {}, language) {
  switch (action) {
    case 'login':           return meta.method === 'passkey' ? tl(language, 'بالبصمة', 'בטביעת אצבע', 'with passkey') : tl(language, 'بكلمة المرور', 'בסיסמה', 'with password')
    case 'submit_day':      return [meta.day_type, meta.project, meta.location, meta.amount != null ? `${fmt(meta.amount)}₪` : null].filter(Boolean).join(' · ')
    case 'submit_expense':  return [meta.category, meta.project, meta.amount != null ? `${fmt(meta.amount)}₪` : null].filter(Boolean).join(' · ')
    case 'request_payment': return [meta.amount != null ? `${fmt(meta.amount)}₪` : null, meta.method, meta.project, meta.notes].filter(Boolean).join(' · ')
    case 'request_advance': return [meta.amount != null ? `${fmt(meta.amount)}₪` : null, meta.notes].filter(Boolean).join(' · ')
    case 'add_material':    return [meta.item, meta.quantity != null ? `${meta.quantity} ${meta.unit || ''}`.trim() : null].filter(Boolean).join(' · ')
    default:                return ''
  }
}

export default function WorkerActivityLog({ empId, limit = 200 }) {
  const language = useAppStore(s => s.language)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    supabase.rpc('get_worker_activity', { p_emp_id: empId || null, p_limit: limit })
      .then(({ data }) => { if (alive) setRows(Array.isArray(data) ? data : []) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [empId, limit])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
        <ActivityIcon size={38} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
        <div style={{ fontSize: 13 }}>{tl(language, 'لا يوجد نشاط بعد', 'אין פעילות עדיין', 'No activity yet')}</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>{tl(language, 'يظهر هنا كل ما يقوم به العامل من البوّابة', 'כאן יופיע כל מה שהעובד מבצע מהפורטל', 'Everything the worker does from the portal appears here')}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => {
        const meta   = r.meta || {}
        const m      = ACTION_META[r.action] || { Icon: ActivityIcon, color: C.textDim }
        const label  = actionLabel(r.action, language)
        const detail = detailText(r.action, meta, language)
        const Icon   = m.Icon
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.card, borderRadius: 13, border: `1px solid ${m.color}22` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${m.color}1c`, border: `1px solid ${m.color}3a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} strokeWidth={2.2} color={m.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {label}
                {r.worker_name && !empId && <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}> · {r.worker_name}</span>}
              </div>
              {detail && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, flexShrink: 0, fontWeight: 600 }}>{relTime(r.created_at, language)}</div>
          </div>
        )
      })}
    </div>
  )
}
