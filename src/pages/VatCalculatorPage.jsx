import React, { useState } from 'react'
import { HardHat, ArrowLeft, Share2, Receipt, Calculator } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'
import { trackCtaClick } from '../lib/track.js'
import { VAT } from '../constants/index.js'
import { useAppStore } from '../store/useAppStore.js'
import { tl } from '../lib/labels.js'

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A', primary: '#F97316',
  text: '#F8FAFC', textDim: '#64748B', border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)' }
const PCT = Math.round(VAT * 100) // 18
// منسّق نقود: يقرّب للأغورة (خانتين عشريتين) ويحذف الكسر للأرقام الصحيحة.
const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })

function shareWhatsApp(language) {
  trackCtaClick('vat_calculator_share')
  const url = 'https://app.linko.services/vat-calculator'
  const text = tl(language,
    `احسب ${'מע"מ'} (${PCT}%) على أي مبلغ مجاناً 🧾\n${url}`,
    `חשב ${'מע"מ'} (${PCT}%) על כל סכום בחינם 🧾\n${url}`,
    `Calculate VAT (${PCT}%) on any amount free 🧾\n${url}`)
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export default function VatCalculatorPage() {
  useRouteSeo('/vat-calculator')
  const language = useAppStore(s => s.language)
  const [amount, setAmount] = useState('1000')
  const [mode, setMode] = useState('add') // 'add' = صافي→إجمالي · 'extract' = إجمالي→صافي

  const amt = Number(amount) || 0
  const net   = mode === 'add' ? amt : amt / (1 + VAT)
  const gross = mode === 'add' ? amt * (1 + VAT) : amt
  const vat   = gross - net

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12, background: C.surface,
    border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 16, fontWeight: 700,
    fontFamily: 'inherit', textAlign: 'center', outline: 'none',
  }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 6, display: 'block' }

  const modeBtn = (active) => ({
    flex: 1, padding: '11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 800,
    background: active ? `${C.primary}1c` : 'transparent',
    border: `1px solid ${active ? C.primary + '55' : C.borderMid}`,
    color: active ? C.primary : C.textDim,
  })

  const Row = ({ label, value, strong }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 800 : 600, color: strong ? C.text : C.textDim }}>{label}</span>
      <span style={{ fontSize: strong ? 22 : 16, fontWeight: strong ? 900 : 700, color: strong ? C.primary : C.text, fontVariantNumeric: 'tabular-nums' }}>₪{money(value)}</span>
    </div>
  )

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
        <button onClick={() => { trackCtaClick('vat_calculator_nav_login'); navigate('/login') }} style={{ background: 'none', border: `1px solid ${C.borderMid}`, color: C.text, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tl(language, 'دخول', 'כניסה', 'Login')}</button>
      </nav>

      {/* Hero + calculator */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 18px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 8 }}>
          {tl(language, `احسب ${'מע"מ'} (${PCT}%) بثانية`, `חשב ${'מע"מ'} (${PCT}%) בשנייה`, `Calculate VAT (${PCT}%) in a second`)}
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, textAlign: 'center', lineHeight: 1.7, marginBottom: 24, maxWidth: 380, marginInline: 'auto' }}>
          {tl(language,
            `أضِف ${'מע"מ'} على مبلغ صافٍ أو استخرجه من مبلغ إجمالي — مجاناً وبلا تسجيل.`,
            `הוסף ${'מע"מ'} על סכום נטו או חלץ אותו מסכום ברוטו — בחינם וללא הרשמה.`,
            `Add VAT to a net amount or extract it from a gross total — free, no signup.`)}
        </p>

        <div dir="rtl" style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => setMode('add')} style={modeBtn(mode === 'add')}>
              {tl(language, `أضِف ${'מע"מ'}`, `הוסף ${'מע"מ'}`, 'Add VAT')}
            </button>
            <button onClick={() => setMode('extract')} style={modeBtn(mode === 'extract')}>
              {tl(language, `استخرج ${'מע"מ'}`, `חלץ ${'מע"מ'}`, 'Extract VAT')}
            </button>
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              {mode === 'add'
                ? tl(language, 'المبلغ الصافي (₪)', 'סכום נטו (₪)', 'Net amount (₪)')
                : tl(language, 'المبلغ الإجمالي (₪)', 'סכום ברוטו (₪)', 'Gross amount (₪)')}
            </label>
            <input type="number" inputMode="decimal" min="0" value={amount}
              onChange={e => setAmount(e.target.value)} style={inputStyle} />
          </div>

          {/* Result */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${C.primary}14, ${C.surface} 70%)`,
            border: `1px solid ${C.primary}33`, borderRadius: 20, padding: 18, marginBottom: 16,
          }}>
            <Row label={tl(language, 'قبل المע"מ', 'לפני המע"מ', 'Before VAT')} value={net} />
            <Row label={tl(language, `${'מע"מ'} ${PCT}%`, `${'מע"מ'} ${PCT}%`, `VAT ${PCT}%`)} value={vat} />
            <Row label={tl(language, 'الإجمالي', 'סך הכול', 'Total')} value={gross} strong />
            <div style={{ marginTop: 12, fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
              {tl(language,
                `+ كبلان يحسب ${'מע"מ'} المدخلات والمخرجات وتقرير الفترة تلقائياً.`,
                `+ כבלאן מחשב ${'מע"מ'} תשומות ועסקאות ודוח תקופה אוטומטית.`,
                '+ Kabblan calculates input/output VAT and period reports automatically.')}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => { trackCtaClick('vat_calculator_register'); navigate('/register') }}
            style={{
              width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
              background: GRAD.brand, color: '#fff',
              fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 28px rgba(249,115,22,0.4)',
            }}>
            <Receipt size={18} strokeWidth={2.2} />
            {tl(language, `سجّل مجاناً وأدِر ${'מע"מ'} مصلحتك`, `הירשם בחינם ונהל את ${'מע"מ'} העסק`, 'Sign up free and manage your VAT')}
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          <button onClick={() => shareWhatsApp(language)} style={{ marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Share2 size={16} strokeWidth={2.2} /> {tl(language, 'شارك الحاسبة عبر واتساب', 'שתף את המחשבון בוואטסאפ', 'Share via WhatsApp')}
          </button>

          {/* Cross-link to salary calculator */}
          <button onClick={() => { trackCtaClick('vat_to_salary'); navigate('/calculator') }} style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 14, background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Calculator size={15} strokeWidth={2.2} /> {tl(language, 'جرّب أيضاً: حاسبة راتب العامل', 'נסה גם: מחשבון שכר עובד', 'Try also: worker salary calculator')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {[['/', tl(language, 'الرئيسية', 'בית', 'Home')], ['/calculator', tl(language, 'حاسبة الراتب', 'מחשבון שכר', 'Salary calc')], ['/pricing', tl(language, 'الأسعار', 'מחירים', 'Pricing')], ['/privacy', tl(language, 'الخصوصية', 'פרטיות', 'Privacy')], ['/contact', tl(language, 'تواصل', 'צור קשר', 'Contact')]].map(([p, label]) => (
            <button key={p} onClick={() => navigate(p)} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()} كبلان</div>
      </footer>
    </div>
  )
}
