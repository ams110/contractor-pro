import React from 'react'
import { HardHat, ArrowLeft, Share2, Receipt } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'
import { trackCtaClick } from '../lib/track.js'
import SalaryCalculator from '../components/SalaryCalculator.jsx'

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A', primary: '#F97316',
  text: '#F8FAFC', textDim: '#64748B', border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)' }

function shareWhatsApp() {
  trackCtaClick('calculator_share')
  const url = 'https://app.linko.services/calculator'
  const text = `احسب راتب عاملك بالساعات الإضافية مجاناً 👷\n${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export default function CalculatorPage() {
  useRouteSeo('/calculator')

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'inherit' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', position: 'sticky', top: 0, background: `${C.bg}E6`, backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={20} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>كبلان</span>
        </button>
        <button onClick={() => { trackCtaClick('calculator_nav_login'); navigate('/login') }} style={{ background: 'none', border: `1px solid ${C.borderMid}`, color: C.text, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>دخول</button>
      </nav>

      {/* Hero + calculator */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 18px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 8 }}>
          احسب راتب عاملك بثانية
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, textAlign: 'center', lineHeight: 1.7, marginBottom: 24, maxWidth: 380, marginInline: 'auto' }}>
          الساعات الإضافية (125%/150%) محسوبة تلقائياً حسب قانون العمل الإسرائيلي — مجاناً وبلا تسجيل.
        </p>

        <SalaryCalculator
          mode="public"
          ctaLabel="سجّل مجاناً واحفظ عمّالك"
          onCta={() => { trackCtaClick('calculator_register'); navigate('/register') }}
        />

        <button onClick={shareWhatsApp} style={{ marginTop: 14, width: '100%', maxWidth: 440, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Share2 size={16} strokeWidth={2.2} /> شارك الحاسبة عبر واتساب
        </button>

        <button onClick={() => { trackCtaClick('salary_to_vat'); navigate('/vat-calculator') }} style={{ marginTop: 10, width: '100%', maxWidth: 440, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 14, background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Receipt size={15} strokeWidth={2.2} /> جرّب أيضاً: حاسبة {'מע"מ'} 18%
        </button>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {[['/', 'الرئيسية'], ['/pricing', 'الأسعار'], ['/privacy', 'الخصوصية'], ['/terms', 'الشروط'], ['/contact', 'تواصل']].map(([p, label]) => (
            <button key={p} onClick={() => navigate(p)} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()} كبلان</div>
      </footer>
    </div>
  )
}
