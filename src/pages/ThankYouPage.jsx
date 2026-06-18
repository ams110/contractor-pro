import React, { useEffect, useState } from 'react'
import { CheckCircle2, HardHat, ArrowLeft } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { navigate } from '../Router.jsx'
import { trackEvent } from '../lib/analytics.js'
import { ttTrack } from '../lib/tiktok.js'

// صفحة الشكر بعد نجاح الدفع — يصلها الزبون **فقط** عبر successUrl من Paddle.
// تُستعمل كصفحة تحويل الشراء في Google Ads (قياس دقيق: لا يصلها إلا الدافع)،
// وتُطلق حدثي تحويل الشراء في GA4 وTikTok Pixel.
export default function ThankYouPage() {
  const [plan, setPlan] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('plan') || ''
    const cycle = params.get('cycle') || 'month'
    setPlan(p)

    // أحداث تحويل الشراء — مرّة واحدة عند فتح الصفحة
    trackEvent('purchase', { plan: p, cycle, currency: 'ILS' })
    ttTrack('CompletePayment', { content_name: p, content_type: cycle, currency: 'ILS' })
  }, [])

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh', background: C.bg, color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes tyPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes tyRing { 0%{transform:scale(0.8);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
        @keyframes tyUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* توهّج خلفي */}
      <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.14), transparent 70%)', top: '12%', pointerEvents: 'none' }} />

      {/* أيقونة النجاح مع حلقة نابضة */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${C.success}`,
          animation: 'tyRing 2s ease-out infinite' }} />
        <div style={{ width: 96, height: 96, borderRadius: '50%',
          background: `${C.success}1c`, border: `1.5px solid ${C.success}45`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'tyPop 0.6s ease-out' }}>
          <CheckCircle2 size={52} color={C.success} strokeWidth={2.2} />
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 12, animation: 'tyUp 0.5s ease-out 0.1s both' }}>
        تم تفعيل اشتراكك! 🎉
      </h1>
      <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.7, maxWidth: 380, marginBottom: 8, animation: 'tyUp 0.5s ease-out 0.2s both' }}>
        شكراً لانضمامك إلى <strong style={{ color: C.text }}>Contractor Pro</strong>
        {plan ? <> — باقة <strong style={{ color: C.primary }}>{plan}</strong></> : null}.
        كل مزايا خطتك صارت مفعّلة الآن.
      </p>

      <button onClick={() => navigate('/app')}
        style={{ marginTop: 24, background: GRAD.primary, border: 'none', color: '#fff',
          fontSize: 15, fontWeight: 800, cursor: 'pointer', padding: '14px 32px', borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 8, animation: 'tyUp 0.5s ease-out 0.35s both',
          boxShadow: '0 10px 30px rgba(249,115,22,0.35)' }}>
        <HardHat size={19} />
        ابدأ استخدام التطبيق
        <ArrowLeft size={18} />
      </button>
    </div>
  )
}
