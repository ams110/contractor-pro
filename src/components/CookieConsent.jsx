import React, { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import { navigate } from '../Router.jsx'

const KEY = 'cp_cookie_consent'

const C = {
  surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', text: '#F8FAFC', textDim: '#94A3B8',
  border: 'rgba(249,115,22,0.18)',
}

/**
 * لافتة موافقة كوكيز خفيفة. التطبيق يستخدم تخزيناً ضرورياً فقط (جلسة/تفضيلات)
 * بلا تتبّع إعلاني، فالموافقة إقرار بسيط يُحفظ محلياً ويظهر مرّة واحدة.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // لا تظهر داخل بوّابة العامل أو إذا سبق القبول
    const params = new URLSearchParams(window.location.search)
    if (params.has('portal') || params.has('worker')) return
    if (!localStorage.getItem(KEY)) setShow(true)
  }, [])

  function accept() {
    localStorage.setItem(KEY, new Date().toISOString())
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', insetInline: 0, bottom: 0, zIndex: 9999,
      padding: '14px 16px', direction: 'rtl',
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto', maxWidth: 680, width: '100%',
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Cookie size={19} color={C.primary} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            نستخدم تخزيناً ضرورياً فقط لتشغيل الجلسة وتذكّر تفضيلاتك — بلا تتبّع إعلاني.{' '}
            <span onClick={() => navigate('/privacy')} style={{ color: C.primary, cursor: 'pointer', fontWeight: 700 }}>
              سياسة الخصوصية
            </span>
          </div>
        </div>
        <button onClick={accept}
          style={{ background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '10px 22px', borderRadius: 12, whiteSpace: 'nowrap' }}>
          موافق
        </button>
        <button onClick={accept} aria-label="إغلاق"
          style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
