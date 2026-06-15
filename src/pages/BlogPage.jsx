import React, { useEffect } from 'react'
import { HardHat, ArrowRight } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useSeo, breadcrumbLd } from '../lib/seo.js'

// ─── Design Tokens (محلية — مطابقة لباقي الصفحات) ──────────────────────────────
const C = {
  bg: '#07080F', surface: '#0D0F1C',
  primary: '#F97316', text: '#F8FAFC', textDim: '#64748B',
  border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316, #DC2626)' }

const SORO_SRC = 'https://app.trysoro.com/api/embed/63d5ce7b-1c67-4654-927c-2bad2b65f3c7'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Noto Sans Arabic', system-ui, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; }
  .bl-btn { transition: transform .15s ease, opacity .15s ease !important; }
  .bl-btn:hover { opacity: .9; }
  .bl-btn:active { transform: scale(0.97) !important; }
`

function TopBar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(7,8,15,0.96)', backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${C.borderMid}`, padding: '0 24px',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={19} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Contractor Pro</span>
        </div>
        <button onClick={() => navigate('/')} className="bl-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 16px', borderRadius: 12 }}>
          الرئيسية
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  )
}

export default function BlogPage() {
  useSeo({
    path: '/blog',
    title: 'المدوّنة | Contractor Pro — نصائح إدارة المقاولات والضرائب',
    description: 'مقالات ونصائح للمقاول العربي في إسرائيل: إدارة المشاريع والعمّال، حساب الرواتب، وفهم الضرائب (מע"מ + ضريبة الدخل + ביטוח לאומי).',
    jsonLd: breadcrumbLd([
      { name: 'الرئيسية', path: '/' },
      { name: 'المدوّنة', path: '/blog' },
    ]),
  })
  useEffect(() => {
    window.scrollTo(0, 0)
    // حقن سكربت Soro مرّة واحدة فقط (يبحث عن #soro-blog ويعرض المحتوى)
    if (document.querySelector(`script[src="${SORO_SRC}"]`)) return
    const s = document.createElement('script')
    s.src = SORO_SRC
    s.defer = true
    document.body.appendChild(s)
  }, [])

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <style>{css}</style>
      <TopBar />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px 80px', direction: 'rtl' }}>
        <h1 style={{ fontSize: 'clamp(24px,5vw,34px)', fontWeight: 900, marginBottom: 8 }}>المدوّنة</h1>
        <p style={{ fontSize: 14, color: C.textDim, marginBottom: 32 }}>نصائح وأخبار لإدارة أعمال المقاولات.</p>
        {/* حاوية مدوّنة Soro */}
        <div id="soro-blog" />
      </main>
    </div>
  )
}
