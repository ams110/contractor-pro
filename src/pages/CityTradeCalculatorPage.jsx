import React from 'react'
import { HardHat, Share2, Receipt, MapPin, MessageCircle } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'
import { trackCtaClick } from '../lib/track.js'
import { useAppStore } from '../store/useAppStore.js'
import { tl } from '../lib/labels.js'
import { CITY_TRADE_PAGES } from '../lib/cityTradePages.js'
import SalaryCalculator from '../components/SalaryCalculator.jsx'

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A', primary: '#F97316', cyan: '#06B6D4',
  text: '#F8FAFC', textDim: '#64748B', border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)' }

// صفحة حاسبة راتب محلّية (مدينة × تخصّص) — SEO محلّي + AEO (أسئلة شائعة + FAQ schema).
// المسار: /calculator/{city}/{trade}. البيانات من CITY_TRADE_PAGES.
export default function CityTradeCalculatorPage({ city, trade }) {
  const key = `${city}/${trade}`
  const page = CITY_TRADE_PAGES[key]
  useRouteSeo(`/calculator/${key}`)
  const language = useAppStore(s => s.language)
  if (!page) { navigate('/calculator'); return null }

  const cityName = tl(language, page.cityAr, page.cityHe, page.cityAr)
  const h1 = tl(language, page.h1_ar, page.h1_he, page.h1_ar)
  const intro = tl(language, page.intro_ar, page.intro_he, page.intro_ar)
  const tradeName = tl(language, page.tradeArFull, page.tradeHe, page.tradeArFull)
  const faqHead = tl(language, 'أسئلة شائعة', 'שאלות נפוצות', 'FAQ')

  function shareWhatsApp() {
    trackCtaClick(`ct_calc_share_${key}`)
    const url = `https://app.linko.services/calculator/${key}`
    window.open(`https://wa.me/?text=${encodeURIComponent(`${tl(language, 'احسب راتب عاملك مجاناً', 'חשב את שכר העובד בחינם', 'Calculate worker salary free')} 👷\n${url}`)}`, '_blank')
  }

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'inherit' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', position: 'sticky', top: 0, background: `${C.bg}E6`, backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={20} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>كبلان</span>
        </button>
        <button onClick={() => { trackCtaClick(`ct_calc_login_${key}`); navigate('/login') }} style={{ background: 'none', border: `1px solid ${C.borderMid}`, color: C.text, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tl(language, 'دخول', 'כניסה', 'Login')}</button>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 18px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, color: C.primary, fontSize: 13, fontWeight: 800 }}>
          <MapPin size={15} strokeWidth={2.4} /> {cityName} · {tradeName}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.35 }}>{h1}</h1>
        <p style={{ fontSize: 14, color: C.textDim, textAlign: 'center', lineHeight: 1.8, marginBottom: 24, maxWidth: 440, marginInline: 'auto' }}>{intro}</p>

        <SalaryCalculator
          mode="public"
          ctaLabel={tl(language, 'سجّل مجاناً واحفظ عمّالك', 'הירשם בחינם ושמור את העובדים', 'Sign up free and save your workers')}
          onCta={() => { trackCtaClick(`ct_calc_register_${key}`); navigate('/register') }}
        />

        <button onClick={shareWhatsApp} style={{ marginTop: 14, width: '100%', maxWidth: 440, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Share2 size={16} strokeWidth={2.2} /> {tl(language, 'شارك عبر واتساب', 'שתף בוואטסאפ', 'Share via WhatsApp')}
        </button>

        <button onClick={() => { trackCtaClick(`ct_to_vat_${key}`); navigate('/vat-calculator') }} style={{ marginTop: 10, width: '100%', maxWidth: 440, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 14, background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Receipt size={15} strokeWidth={2.2} /> {tl(language, `جرّب أيضاً: حاسبة ${'מע"מ'} 18%`, `נסה גם: מחשבון ${'מע"מ'} 18%`, 'Try also: VAT calculator')}
        </button>

        <section style={{ marginTop: 34 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageCircle size={18} color={C.cyan} strokeWidth={2.2} />
            <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>{faqHead}</h2>
          </div>
          {page.faq.map((item, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.cyan}38`, borderRadius: 14, padding: '13px 15px', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 7, lineHeight: 1.5 }}>{tl(language, item.q, item.q_he, item.q)}</div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.8 }}>{tl(language, item.a, item.a_he, item.a)}</div>
            </div>
          ))}
        </section>
      </div>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {[['/', tl(language, 'الرئيسية', 'בית', 'Home')], ['/calculator', tl(language, 'حاسبة الراتب', 'מחשבון שכר', 'Salary calc')], ['/vat-calculator', tl(language, `حاسبة ${'מע"מ'}`, `מחשבון ${'מע"מ'}`, 'VAT calc')], ['/pricing', tl(language, 'الأسعار', 'מחירים', 'Pricing')]].map(([p, label]) => (
            <button key={p} onClick={() => navigate(p)} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()} كبلان</div>
      </footer>
    </div>
  )
}
