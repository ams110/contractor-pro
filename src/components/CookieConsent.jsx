import React, { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { isGranted, loadGtag } from '../lib/analytics.js'

// مفتاح إصدار v2: يُعيد سؤال كل المستخدمين بعد إضافة تحليلات Google Analytics
// (المفتاح القديم cp_cookie_consent كان لوعد «بلا تتبّع» فلا يُستعمل للموافقة هنا).
const KEY = 'cp_consent_v2'

const C = {
  surface: '#0D0F1C', card: '#12152A',
  primary: '#F97316', text: '#F8FAFC', textDim: '#94A3B8',
  border: 'rgba(249,115,22,0.18)',
}

/**
 * لافتة موافقة كوكيز. التطبيق يستخدم تخزيناً ضرورياً دائماً (جلسة/تفضيلات)،
 * وتحليلات Google Analytics **اختيارية** لا تُحمَّل إلا بعد ضغط «موافق».
 * «رفض» يُبقي التحليلات مطفأة. الاختيار يُحفظ محلياً ويظهر مرّة واحدة.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // لا تظهر داخل بوّابة العامل
    const params = new URLSearchParams(window.location.search)
    if (params.has('portal') || params.has('worker')) return
    let stored = null
    try { stored = localStorage.getItem(KEY) } catch { /* تخزين غير متاح */ }
    if (!stored) { setShow(true); return }
    // قرار سابق: فعّل التحليلات فقط إن وافق المستخدم
    if (isGranted(stored)) loadGtag()
  }, [])

  function decide(value) {
    try { localStorage.setItem(KEY, value) } catch { /* تخزين غير متاح */ }
    if (isGranted(value)) loadGtag()
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
            نستخدم تخزيناً ضرورياً لتشغيل الجلسة، وأدوات تحليل (Google Analytics) لفهم
            استخدام الموقع وتحسينه — بلا تتبّع إعلاني. يمكنك الرفض دون التأثير على عمل التطبيق.{' '}
            <span onClick={() => navigate('/privacy')} style={{ color: C.primary, cursor: 'pointer', fontWeight: 700 }}>
              سياسة الخصوصية
            </span>
          </div>
        </div>
        <button onClick={() => decide('denied')}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '10px 18px', borderRadius: 12, whiteSpace: 'nowrap' }}>
          رفض
        </button>
        <button onClick={() => decide('granted')}
          style={{ background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '10px 22px', borderRadius: 12, whiteSpace: 'nowrap' }}>
          موافق
        </button>
        <button onClick={() => decide('denied')} aria-label="إغلاق (رفض)"
          style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
