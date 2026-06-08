import React, { useState, useEffect } from 'react'
import {
  LogIn, Fingerprint, CalendarPlus, Receipt, Wallet, HandCoins,
  Package, KeyRound, ShieldCheck, ShieldOff, Activity as ActivityIcon,
} from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { supabase } from '../lib/supabase.js'

// خريطة الأفعال → تسمية عربية + أيقونة + لون
const ACTION_META = {
  login:           { label: 'تسجيل دخول',     Icon: LogIn,       color: C.cyan },
  submit_day:      { label: 'سجّل يوم عمل',    Icon: CalendarPlus, color: C.primary },
  submit_expense:  { label: 'قدّم مصروف',      Icon: Receipt,     color: C.warning },
  request_payment: { label: 'طلب راتب',        Icon: Wallet,      color: C.success },
  request_advance: { label: 'طلب سلفة',        Icon: HandCoins,   color: C.accent },
  add_material:    { label: 'سجّل بضاعة',      Icon: Package,     color: C.secondary },
  change_password: { label: 'غيّر كلمة المرور', Icon: KeyRound,    color: C.gold },
  enable_passkey:  { label: 'فعّل البصمة',     Icon: ShieldCheck, color: C.secondary },
  disable_passkey: { label: 'ألغى البصمة',     Icon: ShieldOff,   color: C.textDim },
}

function relTime(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `قبل ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`
  if (diff < 172800) return 'أمس'
  return d.toLocaleDateString('ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function detailText(action, meta = {}) {
  switch (action) {
    case 'login':           return meta.method === 'passkey' ? 'بالبصمة' : 'بكلمة المرور'
    case 'submit_day':      return [meta.day_type, meta.project, meta.location, meta.amount != null ? `${fmt(meta.amount)}₪` : null].filter(Boolean).join(' · ')
    case 'submit_expense':  return [meta.category, meta.project, meta.amount != null ? `${fmt(meta.amount)}₪` : null].filter(Boolean).join(' · ')
    case 'request_payment': return [meta.amount != null ? `${fmt(meta.amount)}₪` : null, meta.method, meta.project, meta.notes].filter(Boolean).join(' · ')
    case 'request_advance': return [meta.amount != null ? `${fmt(meta.amount)}₪` : null, meta.notes].filter(Boolean).join(' · ')
    case 'add_material':    return [meta.item, meta.quantity != null ? `${meta.quantity} ${meta.unit || ''}`.trim() : null].filter(Boolean).join(' · ')
    default:                return ''
  }
}

export default function WorkerActivityLog({ empId, limit = 200 }) {
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
        <div style={{ fontSize: 13 }}>لا يوجد نشاط بعد</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>يظهر هنا كل ما يقوم به العامل من البوّابة</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => {
        const meta   = r.meta || {}
        const m      = ACTION_META[r.action] || { label: r.action, Icon: ActivityIcon, color: C.textDim }
        const detail = detailText(r.action, meta)
        const Icon   = m.Icon
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.card, borderRadius: 13, border: `1px solid ${m.color}22` }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${m.color}1c`, border: `1px solid ${m.color}3a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} strokeWidth={2.2} color={m.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {m.label}
                {r.worker_name && !empId && <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}> · {r.worker_name}</span>}
              </div>
              {detail && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, flexShrink: 0, fontWeight: 600 }}>{relTime(r.created_at)}</div>
          </div>
        )
      })}
    </div>
  )
}
