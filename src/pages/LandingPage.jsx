import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

const C = {
  bg:        '#050810',
  surface:   '#090D1A',
  card:      '#0D1424',
  primary:   '#00E5FF',
  secondary: '#7C3AED',
  accent:    '#FF2D6B',
  success:   '#00D68F',
  warning:   '#FFB700',
  text:      '#EEF2FF',
  textDim:   '#4A5580',
  border:    'rgba(255,255,255,0.06)',
  borderMid: 'rgba(255,255,255,0.11)',
  glass:     'rgba(255,255,255,0.03)',
}
const GRAD = {
  brand:  'linear-gradient(135deg, #00E5FF 0%, #7C3AED 100%)',
  warm:   'linear-gradient(135deg, #FFB700 0%, #FF6B35 100%)',
  danger: 'linear-gradient(135deg, #FF2D6B 0%, #FF6B35 100%)',
  aurora: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(124,58,237,0.12) 50%, rgba(255,45,107,0.08) 100%)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050810; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

  @keyframes float    { 0%,100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-10px) rotate(1deg) } }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
  @keyframes aurora   { 0%,100% { opacity:.6; transform:scale(1) } 50% { opacity:1; transform:scale(1.08) } }
  @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:.5 } }
  @keyframes shimmer  { 0% { background-position:200% center } 100% { background-position:-200% center } }
  @keyframes spin     { to { transform:rotate(360deg) } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
  @keyframes orb      { 0%,100% { transform:translate(0,0) scale(1) } 33% { transform:translate(30px,-20px) scale(1.05) } 66% { transform:translate(-20px,15px) scale(0.97) } }

  .float    { animation: float 4s ease-in-out infinite }
  .fade-up  { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both }
  .aurora-orb { animation: orb 12s ease-in-out infinite }

  .grad-text {
    background: linear-gradient(135deg, #00E5FF, #7C3AED, #FF2D6B);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .glass-card {
    background: rgba(13,20,36,0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.07);
  }

  .btn-primary {
    background: linear-gradient(135deg, #00E5FF 0%, #7C3AED 100%);
    border: none;
    color: #fff;
    font-family: inherit;
    font-weight: 800;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
    box-shadow: 0 0 32px rgba(0,229,255,0.3), 0 0 64px rgba(124,58,237,0.2);
  }
  .btn-primary:hover  { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(0,229,255,0.4), 0 0 80px rgba(124,58,237,0.3); }
  .btn-primary:active { transform: scale(0.97); }

  .btn-ghost {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: #EEF2FF;
    font-family: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease, transform .15s ease;
    backdrop-filter: blur(8px);
  }
  .btn-ghost:hover  { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); transform: translateY(-1px); }
  .btn-ghost:active { transform: scale(0.97); }

  .bento-card {
    background: rgba(13,20,36,0.6);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 24px;
    backdrop-filter: blur(16px);
    transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
    overflow: hidden;
    position: relative;
  }
  .bento-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,229,255,0.03) 0%, transparent 60%);
    pointer-events: none;
  }
  .bento-card:hover {
    border-color: rgba(0,229,255,0.2);
    transform: translateY(-3px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,229,255,0.1);
  }

  details summary { cursor: pointer; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
`

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar({ loggedIn }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(5,8,16,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      padding: '0 24px',
      transition: 'background .3s ease, backdrop-filter .3s ease, border-color .3s ease',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: GRAD.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 0 20px rgba(0,229,255,0.4)',
          }}>🏗️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Contractor Pro</div>
            <div style={{ fontSize: 10, color: C.primary, letterSpacing: '0.08em', fontWeight: 600, opacity: 0.8 }}>قبلן פרו</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/pricing')}
            style={{ background: 'transparent', border: 'none', color: C.textDim, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 16px', borderRadius: 10, transition: 'color .15s', fontFamily: 'inherit' }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.textDim}>
            الأسعار
          </button>
          {loggedIn ? (
            <button onClick={() => navigate('/app')} className="btn-primary" style={{ fontSize: 14, padding: '10px 22px', borderRadius: 14 }}>
              الدخول للتطبيق ←
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-ghost" style={{ fontSize: 13, padding: '9px 18px', borderRadius: 12 }}>
                تسجيل الدخول
              </button>
              <button onClick={() => navigate('/register')} className="btn-primary" style={{ fontSize: 13, padding: '10px 20px', borderRadius: 12 }}>
                ابدأ مجاناً
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px 90px', textAlign: 'center', direction: 'rtl' }}>
      {/* Aurora background */}
      <div className="aurora-orb" style={{ position: 'absolute', top: '-20%', right: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div className="aurora-orb" style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '-4s' }} />
      <div className="aurora-orb" style={{ position: 'absolute', top: '30%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,45,107,0.07) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '-8s' }} />

      <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative' }}>
        {/* Badge */}
        <div className="fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 100, padding: '7px 18px',
          marginBottom: 32, fontSize: 12, color: C.primary, fontWeight: 700,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          التطبيق الأول للمقاول العربي في إسرائيل — 2026
        </div>

        {/* Headline */}
        <h1 className="fade-up" style={{ fontSize: 'clamp(32px,6vw,58px)', fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 22, letterSpacing: '-0.03em', animationDelay: '.06s' }}>
          كل يوم شغل، كل دفعة،<br />
          كل مصروف —<br />
          <span className="grad-text">محفوظ. مش في دماغك.</span>
        </h1>

        {/* Sub */}
        <p className="fade-up" style={{ fontSize: 'clamp(15px,2.2vw,19px)', color: C.textDim, lineHeight: 1.7, marginBottom: 44, maxWidth: 560, margin: '0 auto 44px', animationDelay: '.13s' }}>
          Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
        </p>

        {/* CTAs */}
        <div className="fade-up" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '.22s' }}>
          <button onClick={() => navigate('/register')} className="btn-primary"
            style={{ fontSize: 16, padding: '17px 40px', borderRadius: 18, letterSpacing: '0.01em' }}>
            جرّب مجاناً 14 يوم ←
          </button>
          <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="btn-ghost" style={{ fontSize: 15, padding: '17px 30px', borderRadius: 18 }}>
            شاهد كيف يعمل
          </button>
        </div>

        {/* Social proof */}
        <div className="fade-up" style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, animationDelay: '.32s' }}>
          <div style={{ display: 'flex' }}>
            {['👷', '🏗️', '⚡', '🪵', '🏠'].map((e, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: C.card, border: `2px solid ${C.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginRight: i > 0 ? -10 : 0, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{e}</div>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 11, color: C.warning }}>★</span>)}
            </div>
            <span style={{ fontSize: 12, color: C.textDim }}>+200 مقاول يستخدمون التطبيق</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const STATS = [
  { value: '+200', label: 'مقاول نشط', icon: '👷' },
  { value: '₪12M+', label: 'مشاريع مُديرة', icon: '🏗️' },
  { value: '99.9%', label: 'وقت التشغيل', icon: '⚡' },
  { value: '14 يوم', label: 'تجربة مجانية', icon: '🎁' },
]

function StatsBar() {
  return (
    <div style={{ padding: '0 24px 64px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STATS.map((s, i) => (
          <div key={i} className="bento-card" style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bento Features ───────────────────────────────────────────────────────────
function BentoFeatures() {
  const stats = [
    { label: 'إجمالي المشاريع', value: '12', icon: '🏗️', color: '#00E5FF' },
    { label: 'عمال نشطون', value: '8', icon: '👷', color: '#7C3AED' },
    { label: 'أيام هذا الشهر', value: '94', icon: '📅', color: '#FFB700' },
  ]
  const projects = [
    { name: 'فيلا أبو عيسى — رهط', amount: '₪42,500', pct: 68, active: true },
    { name: 'شقة — الناصرة الإيليت', amount: '₪18,000', pct: 100, active: false },
    { name: 'مستودع — المنطقة الصناعية', amount: '₪31,200', pct: 45, active: true },
  ]

  return (
    <section id="features" style={{ padding: '0 24px 80px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>قوة في جيبك</div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: C.text, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>

          {/* Phone Mockup - large */}
          <div className="bento-card" style={{ gridColumn: 'span 5', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, background: 'rgba(9,13,26,0.8)' }}>
            <div className="float" style={{
              width: 220, background: C.card,
              borderRadius: 36, border: '1.5px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px rgba(0,229,255,0.1)',
            }}>
              <div style={{ height: 26, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
              </div>
              <div style={{ background: 'rgba(5,8,16,0.98)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: '0 0 12px rgba(0,229,255,0.4)' }}>🏗️</div>
                  <div style={{ fontSize: 9, fontWeight: 800, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Contractor Pro</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🔔</div>
              </div>
              <div style={{ padding: '10px 8px 6px', background: C.bg }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                  {stats.map((s, i) => (
                    <div key={i} style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 14 }}>{s.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: s.color, margin: '2px 0 1px', letterSpacing: '-0.02em' }}>{s.value}</div>
                      <div style={{ fontSize: 7, color: C.textDim, lineHeight: 1.3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '0 8px 8px', background: C.bg }}>
                <div style={{ fontSize: 8, color: C.textDim, fontWeight: 700, marginBottom: 6, marginTop: 4 }}>المشاريع النشطة</div>
                {projects.map((proj, i) => (
                  <div key={i} style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px', marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: C.text, maxWidth: '65%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{proj.name}</span>
                      <span style={{ fontSize: 7, fontWeight: 900, color: proj.active ? C.primary : C.success }}>{proj.amount}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${proj.pct}%`, background: proj.active ? GRAD.brand : 'linear-gradient(90deg,#00D68F,#00E5FF)', boxShadow: `0 0 6px ${proj.active ? '#00E5FF' : '#00D68F'}66` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(5,8,16,0.98)', padding: '7px 5px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {['📊', '🏗️', '👷', '📅', '💸'].map((ic, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: i === 0 ? 14 : 12, filter: i === 0 ? `drop-shadow(0 0 4px #00E5FF)` : 'grayscale(1) opacity(.3)' }}>{ic}</span>
                    {i === 0 && <div style={{ width: 14, height: 2, borderRadius: 1, background: GRAD.brand, boxShadow: '0 0 6px #00E5FF' }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features list */}
          <div style={{ gridColumn: 'span 7', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { icon: '📅', title: 'تسجيل أيام العمل', desc: 'سجّل كل يوم في 3 ثواني — وافق أو ارفض بلمسة واحدة.', color: '#00E5FF' },
              { icon: '💰', title: 'الرواتب والسلف', desc: 'احسب الراتب الشهري تلقائياً وتابع كل سلفة.', color: '#7C3AED' },
              { icon: '💸', title: 'استرداد الضريبة', desc: 'كل مصروف وكل دفعة مدوّنة — استرد ضريبة القيمة المضافة تلقائياً.', color: '#FFB700' },
              { icon: '📊', title: 'تقارير PDF وExcel', desc: 'صدّر أي تقرير بلمسة واحدة — جاهز للمحاسب.', color: '#00D68F' },
              { icon: '👥', title: 'فريق بصلاحيات', desc: 'أضف مشرفين وعمال مع صلاحيات مخصصة لكل شخص.', color: '#FF6B35' },
              { icon: '🔔', title: 'إشعارات فورية', desc: 'كل طلب وكل موافقة يصلك فوراً على هاتفك.', color: '#FF2D6B' },
            ].map((f, i) => (
              <div key={i} className="bento-card" style={{ padding: '22px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${f.color}12`, border: `1px solid ${f.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PAIN_POINTS = [
  { icon: '📋', problem: 'تضيع أيام العمل بدون توثيق', solution: 'سجّل كل يوم عمل في 3 ثواني — وافق أو ارفض بلمسة.', color: '#00E5FF' },
  { icon: '💸', problem: 'الفلوس بتروح بدون حساب', solution: 'كل مصروف وكل دفعة مدوّنة. استرد ضريبة القيمة المضافة تلقائياً.', color: '#7C3AED' },
  { icon: '📊', problem: 'ما تعرف إيش رابح وإيش خسران', solution: 'أرباح كل مشروع أمامك دايم — بدون كمة ورق وبدون حاسبة.', color: '#FFB700' },
]

function PainPoints() {
  return (
    <section style={{ padding: '0 24px 80px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: '-0.02em' }}>
            شايف نفسك هنا؟
          </h2>
          <p style={{ fontSize: 15, color: C.textDim }}>هذه المشاكل اليومية لها حل واحد.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="bento-card" style={{ padding: '32px' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}0A 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ width: 54, height: 54, borderRadius: 18, background: `${p.color}10`, border: `1px solid ${p.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>{p.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12, lineHeight: 1.4 }}>{p.problem}</h3>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75 }}>{p.solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'محمد أبو حسين', role: 'مقاول بناء — الناصرة', avatar: '👷', text: 'قبل التطبيق كنت أكتب كل شي في ورق وأضيع نصف ساعة كل يوم أحسب. هلق كل شي أمامي في ثانية.', stars: 5 },
  { name: 'خالد الزعبي', role: 'مقاول كهرباء — يافا', avatar: '⚡', text: 'ميزة استرداد ضريبة القيمة المضافة وحدها تساوي الاشتراك. وفّرت عليّ آلاف الشواقل هاي السنة.', stars: 5 },
  { name: 'أحمد صباح', role: 'مقاول تشطيبات — حيفا', avatar: '🏠', text: 'العمال بيسجلوا حضورهم من التطبيق مباشرة وأنا بوافق. انتهى زمن الخلافات على الأيام والرواتب.', stars: 5 },
]

function Testimonials() {
  return (
    <section style={{ padding: '0 24px 80px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: '-0.02em' }}>ماذا يقول المقاولون</h2>
          <p style={{ fontSize: 15, color: C.textDim }}>أصحاب مشاريع حقيقية — نتائج حقيقية.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bento-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
                {Array(t.stars).fill(0).map((_, s) => (
                  <span key={s} style={{ fontSize: 14, color: C.warning, filter: 'drop-shadow(0 0 4px #FFB70088)' }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: '#8899BB', lineHeight: 1.8, marginBottom: 22 }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: '80px 24px 100px', textAlign: 'center', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,229,255,0.07) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
        <div style={{ width: 80, height: 80, borderRadius: 26, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, margin: '0 auto 28px', boxShadow: '0 0 40px rgba(0,229,255,0.4), 0 0 80px rgba(124,58,237,0.3)' }}>🏗️</div>
        <h2 style={{ fontSize: 'clamp(26px,5vw,46px)', fontWeight: 900, color: C.text, lineHeight: 1.18, marginBottom: 16, letterSpacing: '-0.02em' }}>
          ابدأ اليوم — مجاناً لمدة 14 يوم
        </h2>
        <p style={{ fontSize: 16, color: C.textDim, lineHeight: 1.7, marginBottom: 40 }}>
          بدون بطاقة ائتمان. بدون التزام. فقط تطبيق يخفف عنك.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="btn-primary" style={{ fontSize: 16, padding: '17px 44px', borderRadius: 18 }}>
            ابدأ التجربة المجانية ←
          </button>
          <button onClick={() => navigate('/pricing')} className="btn-ghost" style={{ fontSize: 14, padding: '17px 30px', borderRadius: 18 }}>
            شاهد الأسعار
          </button>
        </div>
        <p style={{ marginTop: 22, fontSize: 12, color: C.textDim }}>
          Starter ₪129 · Pro ₪249 · Business ₪499 — كل الخطط تبدأ بتجربة مجانية 14 يوم
        </p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.surface, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 0 12px rgba(0,229,255,0.3)' }}>🏗️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Contractor Pro</div>
            <div style={{ fontSize: 10, color: C.textDim }}>© {new Date().getFullYear()} كل الحقوق محفوظة</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['الخصوصية', 'شروط الاستخدام', 'تواصل معنا'].map(l => (
            <span key={l} style={{ fontSize: 12, color: C.textDim, cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.target.style.color = C.primary}
              onMouseLeave={e => e.target.style.color = C.textDim}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true)
    })
  }, [])

  return (
    <>
      <style>{css}</style>
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
        <Navbar loggedIn={loggedIn} />
        <Hero />
        <StatsBar />
        <BentoFeatures />
        <PainPoints />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
