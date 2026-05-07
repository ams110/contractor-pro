import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

const C = {
  bg:        '#07090D',
  surface:   '#0D1117',
  card:      '#131920',
  primary:   '#00DDB3',
  secondary: '#6366F1',
  accent:    '#F43F5E',
  success:   '#22C55E',
  text:      '#F8FAFC',
  textDim:   '#64748B',
  border:    'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.14)',
}
const GRAD = {
  brand:  'linear-gradient(135deg, #00DDB3 0%, #6366F1 100%)',
  warm:   'linear-gradient(135deg, #EAB308 0%, #F97316 100%)',
  danger: 'linear-gradient(135deg, #F43F5E 0%, #F97316 100%)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07090D; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .lp-btn { transition: transform .15s ease, box-shadow .15s ease !important; }
  .lp-btn:active { transform: scale(0.96) !important; }
  @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
  @keyframes gradMove { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }
  .float   { animation: float 3s ease-in-out infinite }
  .fade-up { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both }
  .grad-text { background: linear-gradient(135deg,#00DDB3,#6366F1); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  details summary { cursor: pointer; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
`

// ─── Sub-components ───────────────────────────────────────────────────────────

function Navbar({ loggedIn }) {
  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,9,13,0.92)', backdropFilter:'blur(24px)', borderBottom:`1px solid ${C.border}`, padding:'0 24px' }}>
      <div style={{ maxWidth:1120, margin:'0 auto', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', direction:'rtl' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width:40, height:40, borderRadius:13, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏗️</div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:C.text, lineHeight:1.1 }}>Contractor Pro</div>
            <div style={{ fontSize:10, color:C.textDim, letterSpacing:'0.06em' }}>قبلן פרו</div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => navigate('/pricing')}
            style={{ background:'transparent', border:'none', color:C.textDim, fontSize:13, fontWeight:600, cursor:'pointer', padding:'8px 14px', borderRadius:10, transition:'color .15s' }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.textDim}>
            الأسعار
          </button>
          {loggedIn ? (
            <button onClick={() => navigate('/app')} className="lp-btn"
              style={{ background:GRAD.brand, border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', padding:'9px 20px', borderRadius:12, boxShadow:'0 4px 18px #00DDB344' }}>
              الدخول للتطبيق →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/app')} className="lp-btn"
                style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.borderMid}`, color:C.text, fontSize:13, fontWeight:700, cursor:'pointer', padding:'8px 18px', borderRadius:12 }}>
                تسجيل الدخول
              </button>
              <button onClick={() => navigate('/pricing')} className="lp-btn"
                style={{ background:GRAD.brand, border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', padding:'9px 20px', borderRadius:12, boxShadow:'0 4px 18px #00DDB344' }}>
                ابدأ مجاناً
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section style={{ position:'relative', overflow:'hidden', padding:'96px 24px 80px', textAlign:'center', direction:'rtl' }}>
      {/* Background orbs */}
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, #00DDB318 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:450, height:450, borderRadius:'50%', background:'radial-gradient(circle, #6366F118 0%, transparent 65%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:720, margin:'0 auto', position:'relative' }}>
        {/* Badge */}
        <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${C.primary}14`, border:`1px solid ${C.primary}33`, borderRadius:100, padding:'6px 16px', marginBottom:28, fontSize:12, color:C.primary, fontWeight:700 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:C.primary, display:'inline-block' }} />
          التطبيق الأول للمقاول العربي في إسرائيل
        </div>

        {/* Headline */}
        <h1 className="fade-up" style={{ fontSize:'clamp(28px,6vw,52px)', fontWeight:900, color:C.text, lineHeight:1.18, marginBottom:20, letterSpacing:'-0.02em', animationDelay:'.05s' }}>
          كل يوم شغل، كل دفعة،<br />
          كل مصروف —<br />
          <span className="grad-text">محفوظ. مش في دماغك.</span>
        </h1>

        {/* Subheadline */}
        <p className="fade-up" style={{ fontSize:'clamp(15px,2.5vw,19px)', color:C.textDim, lineHeight:1.65, marginBottom:40, maxWidth:560, margin:'0 auto 40px', animationDelay:'.12s' }}>
          Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
        </p>

        {/* CTAs */}
        <div className="fade-up" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', animationDelay:'.2s' }}>
          <button onClick={() => navigate('/pricing')} className="lp-btn"
            style={{ background:GRAD.brand, border:'none', color:'#000', fontSize:16, fontWeight:800, cursor:'pointer', padding:'16px 36px', borderRadius:16, boxShadow:'0 8px 32px #00DDB355', letterSpacing:'0.01em' }}>
            جرّب مجاناً 14 يوم ←
          </button>
          <button onClick={() => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior:'smooth' }) }} className="lp-btn"
            style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.borderMid}`, color:C.text, fontSize:15, fontWeight:700, cursor:'pointer', padding:'16px 28px', borderRadius:16 }}>
            شاهد كيف يعمل
          </button>
        </div>

        {/* Social proof */}
        <div className="fade-up" style={{ marginTop:36, display:'flex', alignItems:'center', justifyContent:'center', gap:12, animationDelay:'.3s' }}>
          <div style={{ display:'flex' }}>
            {['🏗️','👷','🪵','💸','📊'].map((e,i) => (
              <div key={i} style={{ width:30, height:30, borderRadius:'50%', background:C.card, border:`2px solid ${C.bg}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginRight: i > 0 ? -8 : 0 }}>{e}</div>
            ))}
          </div>
          <span style={{ fontSize:13, color:C.textDim }}>+200 مقاول يستخدمون التطبيق</span>
        </div>
      </div>
    </section>
  )
}

const PAIN_POINTS = [
  {
    icon: '📋',
    problem: 'تضيع أيام العمل بدون توثيق',
    solution: 'سجّل كل يوم عمل في 3 ثواني — وافق أو ارفض بلمسة.',
    color: '#00DDB3',
  },
  {
    icon: '💸',
    problem: 'الفلوس بتروح بدون حساب',
    solution: 'كل مصروف وكل دفعة مدوّنة. استرد ضريبة القيمة المضافة تلقائياً.',
    color: '#6366F1',
  },
  {
    icon: '📊',
    problem: 'ما تعرف إيش رابح وإيش خسران',
    solution: 'أرباح كل مشروع أمامك دايم — بدون كمة ورق وبدون حاسبة.',
    color: '#EAB308',
  },
]

function PainPoints() {
  return (
    <section style={{ padding:'64px 24px', direction:'rtl' }}>
      <div style={{ maxWidth:1120, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:'clamp(22px,4vw,36px)', fontWeight:900, color:C.text, marginBottom:10 }}>
            شايف نفسك هنا؟
          </h2>
          <p style={{ fontSize:15, color:C.textDim }}>هذه المشاكل اليومية لها حل واحد.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
          {PAIN_POINTS.map((p, i) => (
            <div key={i} style={{ background:C.surface, borderRadius:20, padding:28, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle, ${p.color}0C 0%, transparent 70%)`, pointerEvents:'none' }} />
              <div style={{ width:52, height:52, borderRadius:16, background:`${p.color}18`, border:`1px solid ${p.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:18 }}>
                {p.icon}
              </div>
              <h3 style={{ fontSize:16, fontWeight:800, color:C.accent, marginBottom:10, lineHeight:1.4 }}>
                {p.problem}
              </h3>
              <p style={{ fontSize:14, color:C.textDim, lineHeight:1.7 }}>
                {p.solution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AppMockup() {
  const stats = [
    { label:'إجمالي المشاريع', value:'12', icon:'🏗️', color:'#00DDB3' },
    { label:'عمال نشطون', value:'8', icon:'👷', color:'#6366F1' },
    { label:'أيام هذا الشهر', value:'94', icon:'📅', color:'#EAB308' },
  ]
  const projects = [
    { name:'فيلا أبو عيسى — رهط', amount:'₪42,500', status:'نشط', pct:68 },
    { name:'شقة — الناصرة الإيليت', amount:'₪18,000', status:'مكتمل', pct:100 },
    { name:'مستودع — المنطقة الصناعية', amount:'₪31,200', status:'نشط', pct:45 },
  ]

  return (
    <section id="features" style={{ padding:'32px 24px 80px', direction:'rtl' }}>
      <div style={{ maxWidth:1120, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:48, alignItems:'center' }}>
        {/* Left: text */}
        <div>
          <div style={{ fontSize:11, color:C.primary, fontWeight:700, letterSpacing:'0.12em', marginBottom:12 }}>قوة في جيبك</div>
          <h2 style={{ fontSize:'clamp(22px,4vw,36px)', fontWeight:900, color:C.text, lineHeight:1.25, marginBottom:18 }}>
            كل شي محتاجه<br /><span className="grad-text">في شاشة واحدة</span>
          </h2>
          <p style={{ fontSize:15, color:C.textDim, lineHeight:1.75, marginBottom:32 }}>
            من تسجيل أيام العمل اليومية إلى حساب ضريبة الدخل والبيتواح ليئومي — Contractor Pro يغطيك بالكامل.
          </p>
          {[
            '📅 تسجيل أيام العمل بالموافقة والرفض',
            '💰 متابعة الرواتب والسلف لكل عامل',
            '💸 تتبع المصاريف واسترداد الضريبة',
            '📊 تقارير PDF وExcel بلمسة',
            '👥 فريق عمل مع صلاحيات مخصصة',
            '🔔 إشعارات فورية لكل طلب',
          ].map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:`${C.primary}18`, border:`1px solid ${C.primary}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>✓</div>
              <span style={{ fontSize:14, color:C.textDim }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Right: phone mockup */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div className="float" style={{ width:260, background:C.surface, borderRadius:40, border:`2px solid ${C.borderMid}`, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            {/* Notch */}
            <div style={{ height:28, background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:70, height:8, background:C.card, borderRadius:4 }} />
            </div>
            {/* App header */}
            <div style={{ background:'rgba(7,9,13,0.96)', padding:'10px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:9, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏗️</div>
                <div style={{ fontSize:10, fontWeight:800, background:GRAD.brand, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Contractor Pro</div>
              </div>
              <div style={{ width:22, height:22, borderRadius:7, background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>🔔</div>
            </div>
            {/* Stats */}
            <div style={{ padding:'12px 10px 8px', background:C.bg }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {stats.map((s,i) => (
                  <div key={i} style={{ background:C.card, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:16 }}>{s.icon}</div>
                    <div style={{ fontSize:14, fontWeight:800, color:s.color, margin:'3px 0 1px' }}>{s.value}</div>
                    <div style={{ fontSize:8, color:C.textDim, lineHeight:1.3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Projects list */}
            <div style={{ padding:'0 10px 10px', background:C.bg }}>
              <div style={{ fontSize:9, color:C.textDim, fontWeight:700, marginBottom:8, marginTop:4 }}>المشاريع النشطة</div>
              {projects.map((proj, i) => (
                <div key={i} style={{ background:C.card, borderRadius:12, padding:'10px', marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:C.text, maxWidth:'65%', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{proj.name}</span>
                    <span style={{ fontSize:8, fontWeight:800, color: proj.status === 'مكتمل' ? C.success : C.primary }}>{proj.amount}</span>
                  </div>
                  <div style={{ height:3, background:`${C.primary}18`, borderRadius:2 }}>
                    <div style={{ height:'100%', borderRadius:2, width:`${proj.pct}%`, background: proj.status === 'مكتمل' ? C.success : GRAD.brand }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Bottom nav */}
            <div style={{ background:'rgba(10,13,19,0.98)', padding:'8px 6px', display:'flex', justifyContent:'space-around', borderTop:`1px solid ${C.border}` }}>
              {['📊','🏗️','👷','📅','💸'].map((ic,i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <span style={{ fontSize: i===0 ? 16 : 13, filter: i===0 ? 'none' : 'grayscale(1) opacity(.35)' }}>{ic}</span>
                  {i===0 && <div style={{ width:12, height:2, borderRadius:1, background:GRAD.brand }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const TESTIMONIALS = [
  {
    name: 'محمد أبو حسين',
    role: 'مقاول بناء — الناصرة',
    avatar: '👷',
    text: 'قبل التطبيق كنت أكتب كل شي في ورق وأضيع نصف ساعة كل يوم أحسب. هلق كل شي أمامي في ثانية.',
    stars: 5,
  },
  {
    name: 'خالد الزعبي',
    role: 'مقاول كهرباء — يافا',
    avatar: '⚡',
    text: 'ميزة استرداد ضريبة القيمة المضافة وحدها تساوي الاشتراك. وفّرت عليّ آلاف الشواقل هاي السنة.',
    stars: 5,
  },
  {
    name: 'أحمد صباح',
    role: 'مقاول تشطيبات — حيفا',
    avatar: '🏠',
    text: 'العمال بيسجلوا حضورهم من التطبيق مباشرة وأنا بوافق. انتهى زمن الخلافات على الأيام والرواتب.',
    stars: 5,
  },
]

function Testimonials() {
  return (
    <section style={{ padding:'64px 24px', direction:'rtl' }}>
      <div style={{ maxWidth:1120, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:'clamp(22px,4vw,36px)', fontWeight:900, color:C.text, marginBottom:10 }}>
            ماذا يقول المقاولون
          </h2>
          <p style={{ fontSize:15, color:C.textDim }}>أصحاب مشاريع حقيقية — نتائج حقيقية.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}>
          {TESTIMONIALS.map((t,i) => (
            <div key={i} style={{ background:C.surface, borderRadius:20, padding:28, border:`1px solid ${C.border}` }}>
              {/* Stars */}
              <div style={{ display:'flex', gap:3, marginBottom:16 }}>
                {Array(t.stars).fill(0).map((_,s) => (
                  <span key={s} style={{ fontSize:14, color:'#EAB308' }}>★</span>
                ))}
              </div>
              {/* Quote */}
              <p style={{ fontSize:14, color:C.textDim, lineHeight:1.75, marginBottom:20 }}>
                "{t.text}"
              </p>
              {/* Author */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.name}</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section style={{ padding:'80px 24px', textAlign:'center', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, #00DDB310 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
        <div style={{ width:72, height:72, borderRadius:22, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 24px', boxShadow:'0 16px 48px #00DDB355' }}>🏗️</div>
        <h2 style={{ fontSize:'clamp(24px,5vw,42px)', fontWeight:900, color:C.text, lineHeight:1.2, marginBottom:16 }}>
          ابدأ اليوم — مجاناً لمدة 14 يوم
        </h2>
        <p style={{ fontSize:16, color:C.textDim, lineHeight:1.65, marginBottom:36 }}>
          بدون بطاقة ائتمان. بدون التزام. فقط تطبيق يخفف عنك.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => navigate('/pricing')} className="lp-btn"
            style={{ background:GRAD.brand, border:'none', color:'#000', fontSize:16, fontWeight:800, cursor:'pointer', padding:'16px 40px', borderRadius:16, boxShadow:'0 8px 32px #00DDB355' }}>
            ابدأ التجربة المجانية ←
          </button>
          <button onClick={() => navigate('/pricing')} className="lp-btn"
            style={{ background:'transparent', border:`1px solid ${C.borderMid}`, color:C.textDim, fontSize:14, fontWeight:600, cursor:'pointer', padding:'16px 28px', borderRadius:16 }}>
            شاهد الأسعار
          </button>
        </div>
        <p style={{ marginTop:20, fontSize:12, color:C.textDim }}>
          Starter ₪129 · Pro ₪249 · Business ₪499 — كل الخطط تبدأ بتجربة مجانية 14 يوم
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'32px 24px', direction:'rtl' }}>
      <div style={{ maxWidth:1120, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>🏗️</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Contractor Pro</span>
          <span style={{ fontSize:11, color:C.textDim }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {['الخصوصية', 'شروط الاستخدام', 'تواصل معنا'].map(l => (
            <span key={l} style={{ fontSize:12, color:C.textDim, cursor:'pointer' }}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // Auto-redirect logged-in users to the app
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLoggedIn(true)
        // Uncomment to auto-redirect: navigate('/app')
      }
    })
  }, [])

  return (
    <>
      <style>{css}</style>
      <div style={{ background:C.bg, minHeight:'100vh', color:C.text }}>
        <Navbar loggedIn={loggedIn} />
        <Hero />
        <PainPoints />
        <AppMockup />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
