import React, { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { isGranted, initAnalytics, grantConsent } from '../lib/analytics.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

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
  const language = useAppStore(s => s.language)

  useEffect(() => {
    // لا تحليلات داخل بوّابة العامل
    const params = new URLSearchParams(window.location.search)
    if (params.has('portal') || params.has('worker')) return
    let stored = null
    try { stored = localStorage.getItem(KEY) } catch { /* تخزين غير متاح */ }
    // Consent Mode v2: حمّل GA للجميع بحالة موافقة مبدئية حسب القرار السابق
    initAnalytics(isGranted(stored))
    if (!stored) setShow(true)
  }, [])

  function decide(value) {
    try { localStorage.setItem(KEY, value) } catch { /* تخزين غير متاح */ }
    if (isGranted(value)) grantConsent()
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
            {tl(language,
              'نستخدم تخزيناً ضرورياً لتشغيل الجلسة، وأدوات تحليل (Google Analytics) لفهم استخدام الموقع وتحسينه — بلا تتبّع إعلاني. يمكنك الرفض دون التأثير على عمل التطبيق.',
              'אנו משתמשים באחסון חיוני להפעלת ההפעלה ובכלי ניתוח (Google Analytics) כדי להבין את השימוש באתר ולשפר אותו — ללא מעקב פרסומי. ניתן לסרב מבלי לפגוע בפעולת האפליקציה.',
              'We use essential storage to run your session, and analytics tools (Google Analytics) to understand site usage and improve it — no ad tracking. You can decline without affecting the app.')}{' '}
            <span onClick={() => navigate('/privacy')} style={{ color: C.primary, cursor: 'pointer', fontWeight: 700 }}>
              {tl(language, 'سياسة الخصوصية', 'מדיניות הפרטיות', 'Privacy Policy')}
            </span>
          </div>
        </div>
        <button onClick={() => decide('denied')}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '10px 18px', borderRadius: 12, whiteSpace: 'nowrap' }}>
          {tl(language, 'رفض', 'דחה', 'Decline')}
        </button>
        <button onClick={() => decide('granted')}
          style={{ background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '10px 22px', borderRadius: 12, whiteSpace: 'nowrap' }}>
          {tl(language, 'موافق', 'אישור', 'Accept')}
        </button>
        <button onClick={() => decide('denied')} aria-label={tl(language, 'إغلاق (رفض)', 'סגירה (דחייה)', 'Close (decline)')}
          style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
