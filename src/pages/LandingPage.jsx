import React, { useEffect, useState } from 'react'
import {
  HardHat, Zap, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  ChevronDown, Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot, Plus
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#07080F',
  surface:   '#0D0F1C',
  card:      '#12152A',
  primary:   '#F97316',
  secondary: '#7C3AED',
  gold:      '#D97706',
  cyan:      '#06B6D4',
  success:   '#22C55E',
  warning:   '#EAB308',
  accent:    '#EF4444',
  text:      '#F8FAFC',
  textDim:   '#64748B',
  border:    'rgba(249,115,22,0.08)',
  borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = {
  brand:   'linear-gradient(135deg, #F97316, #DC2626)',
  premium: 'linear-gradient(135deg, #7C3AED, #2563EB)',
  gold:    'linear-gradient(135deg, #D97706, #F59E0B)',
  warm:    'linear-gradient(135deg, #F97316, #F59E0B)',
  cyan:    'linear-gradient(135deg, #06B6D4, #0EA5E9)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Noto Sans Arabic', system-ui, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; }
  .lp-btn { transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease !important; }
  .lp-btn:hover { opacity: .92; }
  .lp-btn:active { transform: scale(0.96) !important; }
  @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes fadeUp     { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes glow       { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes shimmer    { 0%{background-position:200% 0} to{background-position:-200% 0} }
  @keyframes badgePop   { 0%{transform:scale(0)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }
  .float     { animation: float 3.5s ease-in-out infinite }
  .fade-up   { animation: fadeUp .55s cubic-bezier(.22,1,.36,1) both }
  .glow-orb  { animation: glow 3s ease-in-out infinite }
  .grad-text { background: linear-gradient(135deg,#F97316,#DC2626); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .shimmer   { background: linear-gradient(90deg, #F9731618 0%, #F9731632 50%, #F9731618 100%); background-size: 200% 100%; animation: shimmer 2.5s linear infinite; }
`

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ loggedIn }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: scrolled ? 'rgba(7,8,15,0.96)' : 'rgba(7,8,15,0.72)',
      backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${scrolled ? C.borderMid : C.border}`,
      padding: '0 24px',
      transition: 'background .3s, border-color .3s',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>
            <HardHat size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>Contractor Pro</div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.06em' }}>قبلן פרו</div>
          </div>
        </div>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/pricing')} className="lp-btn"
            style={{ background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 14px', borderRadius: 10 }}>
            الأسعار
          </button>
          {loggedIn ? (
            <button onClick={() => navigate('/app')} className="lp-btn"
              style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
              الدخول للتطبيق
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="lp-btn"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 18px', borderRadius: 12 }}>
                تسجيل الدخول
              </button>
              <button onClick={() => navigate('/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
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
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 24px 80px', textAlign: 'center', direction: 'rtl' }}>
      {/* Ambient orbs */}
      <div className="glow-orb" style={{ position: 'absolute', top: '-8%', right: '-3%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div className="glow-orb" style={{ position: 'absolute', bottom: '-12%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '1.5s' }} />

      <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative' }}>
        {/* Badge */}
        <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 100, padding: '6px 16px', marginBottom: 32, fontSize: 12, color: C.primary, fontWeight: 700 }}>
          <CircleDot size={10} strokeWidth={3} />
          التطبيق الأول للمقاول العربي في إسرائيل
        </div>

        {/* Headline */}
        <h1 className="fade-up" style={{ fontSize: 'clamp(28px,6vw,56px)', fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.02em', animationDelay: '.05s' }}>
          كل يوم شغل، كل دفعة،<br />
          كل مصروف —<br />
          <span className="grad-text">محفوظ. مش في دماغك.</span>
        </h1>

        {/* Sub */}
        <p className="fade-up" style={{ fontSize: 'clamp(15px,2.5vw,19px)', color: C.textDim, lineHeight: 1.7, marginBottom: 44, maxWidth: 580, margin: '0 auto 44px', animationDelay: '.12s' }}>
          Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
        </p>

        {/* CTAs */}
        <div className="fade-up" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '.2s' }}>
          <button onClick={() => navigate('/register')} className="lp-btn"
            style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 38px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
            جرّب مجاناً 14 يوم
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '16px 28px', borderRadius: 16 }}>
            شاهد كيف يعمل
          </button>
        </div>

        {/* Trust signals */}
        <div className="fade-up" style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap', animationDelay: '.32s' }}>
          {[
            { icon: Shield,      label: 'آمن ومشفّر' },
            { icon: Smartphone,  label: 'يعمل بدون إنترنت' },
            { icon: CheckCircle2, label: 'بدون بطاقة ائتمان' },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon size={15} color={C.primary} strokeWidth={2.2} />
              <span style={{ fontSize: 13, color: C.textDim }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS = [
  { value: '3 لغات', label: 'عربي · עברית · English', icon: Users,       color: C.primary },
  { value: '18%',    label: 'حساب מע״מ تلقائي',        icon: Receipt,     color: C.cyan    },
  { value: '100%',   label: 'بياناتك مشفّرة وآمنة',     icon: Shield,      color: C.secondary },
  { value: '14 يوم', label: 'تجربة مجانية بلا بطاقة',  icon: TrendingUp,  color: C.gold    },
]
function StatsStrip() {
  return (
    <div style={{ padding: '0 24px 72px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STATS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} style={{ background: C.surface, borderRadius: 18, padding: '24px 20px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={s.color} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PAIN_POINTS = [
  {
    Icon:     CalendarDays,
    problem:  'تضيع أيام العمل بدون توثيق',
    solution: 'سجّل كل يوم عمل في 3 ثواني — وافق أو ارفض بلمسة.',
    color:    C.primary,
  },
  {
    Icon:     Wallet,
    problem:  'الفلوس بتروح بدون حساب',
    solution: 'كل مصروف وكل دفعة مدوّنة. استرد ضريبة القيمة المضافة تلقائياً.',
    color:    C.secondary,
  },
  {
    Icon:     BarChart3,
    problem:  'ما تعرف إيش رابح وإيش خسران',
    solution: 'أرباح كل مشروع أمامك دايم — بدون ورق وبدون حاسبة.',
    color:    C.gold,
  },
]
function PainPoints() {
  return (
    <section style={{ padding: '64px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            شايف نفسك هنا؟
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>هذه المشاكل اليومية لها حل واحد.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PAIN_POINTS.map((p, i) => {
            const Icon = p.Icon
            return (
              <div key={i} style={{ background: C.surface, borderRadius: 22, padding: 28, border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}0A 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${p.color}15`, border: `1px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Icon size={24} color={p.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12, lineHeight: 1.4 }}>
                  {p.problem}
                </h3>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75 }}>
                  {p.solution}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  const mockStats = [
    { label: 'المشاريع',  value: '12', color: C.primary   },
    { label: 'العمال',    value: '8',  color: C.secondary  },
    { label: 'هذا الشهر', value: '94', color: C.gold       },
  ]
  const mockProjects = [
    { name: 'فيلا رهط',       amount: '₪42,500', pct: 68,  active: true  },
    { name: 'شقة الناصرة',    amount: '₪18,000', pct: 100, active: false },
    { name: 'مستودع صناعي',   amount: '₪31,200', pct: 45,  active: true  },
  ]
  const navIcons = [
    { Icon: LayoutDashboard, active: true  },
    { Icon: Building2,       active: false },
    { Icon: Users,           active: false },
    { Icon: Wallet,          active: false },
    { Icon: Settings,        active: false },
  ]
  return (
    <div className="float" style={{ width: 268, background: C.surface, borderRadius: 42, border: `2px solid rgba(249,115,22,0.15)`, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(249,115,22,0.06)' }}>
      {/* Notch */}
      <div style={{ height: 30, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 72, height: 9, background: C.card, borderRadius: 5 }} />
      </div>
      {/* App header */}
      <div style={{ background: C.bg, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Contractor Pro</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={10} color={C.textDim} />
          </div>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Bell size={10} color={C.textDim} />
            <div style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: C.primary, border: `1px solid ${C.bg}` }} />
          </div>
        </div>
      </div>
      {/* Stats row */}
      <div style={{ padding: '12px 10px 8px', background: C.bg }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {mockStats.map((s, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: `1px solid ${s.color}18` }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: C.textDim, marginTop: 3, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Projects */}
      <div style={{ padding: '0 10px 10px', background: C.bg }}>
        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 7, marginTop: 2 }}>المشاريع النشطة</div>
        {mockProjects.map((proj, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 11, padding: '9px 10px', marginBottom: 5, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.text, maxWidth: '60%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{proj.name}</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: proj.active ? C.primary : C.success }}>{proj.amount}</span>
            </div>
            <div style={{ height: 3, background: `${C.primary}15`, borderRadius: 2 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${proj.pct}%`, background: proj.active ? GRAD.brand : `linear-gradient(90deg,${C.success},${C.cyan})` }} />
            </div>
          </div>
        ))}
        {/* Add btn */}
        <div style={{ background: `${C.primary}10`, border: `1px dashed ${C.primary}30`, borderRadius: 11, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Plus size={10} color={C.primary} />
          <span style={{ fontSize: 9, color: C.primary, fontWeight: 600 }}>مشروع جديد</span>
        </div>
      </div>
      {/* Bottom nav */}
      <div style={{ background: `${C.bg}F8`, padding: '8px 6px 10px', display: 'flex', justifyContent: 'space-around', borderTop: `1px solid ${C.border}` }}>
        {navIcons.map(({ Icon, active }, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Icon size={active ? 16 : 13} color={active ? C.primary : C.textDim} strokeWidth={active ? 2.5 : 1.8} />
            {active && <div style={{ width: 12, height: 2.5, borderRadius: 2, background: GRAD.brand }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── App Showcase ─────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: CalendarDays, text: 'تسجيل أيام العمل بالموافقة والرفض'     },
  { Icon: Users,        text: 'متابعة الرواتب والسلف لكل عامل'         },
  { Icon: Receipt,      text: 'تتبع المصاريف واسترداد ضريبة القيمة المضافة' },
  { Icon: BarChart3,    text: 'تقارير PDF وExcel بلمسة'                 },
  { Icon: Shield,       text: 'فريق عمل مع صلاحيات مخصصة'              },
  { Icon: Bell,         text: 'إشعارات فورية لكل طلب وتغيير'            },
]
function AppShowcase() {
  return (
    <section id="features" style={{ padding: '40px 24px 88px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 56, alignItems: 'center' }}>
        {/* Text side */}
        <div>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>قوة في جيبك</div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, lineHeight: 1.25, marginBottom: 20 }}>
            كل شي محتاجه<br />
            <span className="grad-text">في شاشة واحدة</span>
          </h2>
          <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.8, marginBottom: 36 }}>
            من تسجيل أيام العمل اليومية إلى حساب ضريبة الدخل والبيتواح ليئومي — Contractor Pro يغطيك بالكامل.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map(({ Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${C.primary}12`, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color={C.primary} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 14, color: C.textDim }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}

// ─── Why contractors ──────────────────────────────────────────────────────────
// بطاقات قيمة صادقة (بلا شهادات أو أسماء مُختلَقة).
const VALUE_CARDS = [
  {
    icon:  Receipt,
    color: C.primary,
    title: 'وفّر على الضريبة',
    text:  'يحسب לك מע״מ والخصم الضريبي على كل مصروف تلقائياً حسب الفئة — ما بتضيّع شيكل تقدر تستردّه.',
  },
  {
    icon:  CalendarDays,
    color: C.secondary,
    title: 'خلص الخلافات على الأيام',
    text:  'العامل بيسجّل حضوره من بوّابته وأنت بتوافق. كل يوم شغل وكل دفعة موثّقة — بلا أوراق وبلا نسيان.',
  },
  {
    icon:  BarChart3,
    color: C.gold,
    title: 'شوف وضعك بثانية',
    text:  'صافي الربح، النقد بالجيب، المستحقّ للعمال والعملاء — كله أمامك بلوحة واحدة بدل ما تحسب براسك.',
  },
]
function Testimonials() {
  return (
    <section style={{ padding: '64px 24px', direction: 'rtl', background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            مبني خصّيصاً لشغل المقاول
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>كل ميزة حلّ لمشكلة حقيقية بتواجهك كل يوم.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {VALUE_CARDS.map((c, i) => {
            const Icon = c.icon
            return (
              <div key={i} style={{ background: C.card, borderRadius: 22, padding: 28, border: `1px solid ${C.border}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={24} color={c.color} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>{c.title}</div>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>{c.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing teaser ───────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Starter',  price: '₪129', desc: 'للمقاول المستقل',             color: C.primary,   highlight: false },
  { name: 'Pro',      price: '₪249', desc: 'لفريق حتى 5 أشخاص',          color: C.secondary, highlight: true  },
  { name: 'Business', price: '₪499', desc: 'غير محدود + تقارير متقدمة',   color: C.gold,      highlight: false },
]
function PricingTeaser() {
  return (
    <section style={{ padding: '72px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            خطط بسيطة وواضحة
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>كل الخطط تبدأ بتجربة مجانية 14 يوم — بدون بطاقة ائتمان.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, maxWidth: 820, margin: '0 auto' }}>
          {PLANS.map((plan, i) => (
            <div key={i} style={{
              background: plan.highlight ? `${plan.color}12` : C.surface,
              borderRadius: 22, padding: '28px 24px',
              border: `1px solid ${plan.highlight ? plan.color + '40' : C.border}`,
              position: 'relative', overflow: 'hidden',
              transform: plan.highlight ? 'scale(1.03)' : 'none',
              boxShadow: plan.highlight ? `0 8px 40px ${plan.color}20` : 'none',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: 14, left: 14, background: GRAD.premium, borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                  الأكثر شيوعاً
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 800, color: plan.color, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1, marginBottom: 6 }}>{plan.price}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 20 }}>/ شهر</div>
              <div style={{ fontSize: 13, color: C.textDim, marginBottom: 24, lineHeight: 1.5 }}>{plan.desc}</div>
              <button onClick={() => navigate('/register')} className="lp-btn"
                style={{ width: '100%', background: plan.highlight ? `linear-gradient(135deg, ${plan.color}, ${plan.color}CC)` : `${plan.color}15`, border: `1px solid ${plan.color}30`, color: plan.highlight ? '#fff' : plan.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '10px', borderRadius: 12 }}>
                ابدأ مجاناً
              </button>
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
    <section style={{ padding: '80px 24px', textAlign: 'center', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
        <div style={{ width: 76, height: 76, borderRadius: 24, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 16px 56px rgba(249,115,22,0.45)' }}>
          <HardHat size={36} color="#fff" strokeWidth={2} />
        </div>
        <h2 style={{ fontSize: 'clamp(24px,5vw,44px)', fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 18 }}>
          ابدأ اليوم — مجاناً لمدة 14 يوم
        </h2>
        <p style={{ fontSize: 17, color: C.textDim, lineHeight: 1.7, marginBottom: 40 }}>
          بدون بطاقة ائتمان. بدون التزام.<br />فقط تطبيق يخفف عنك.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="lp-btn"
            style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 44px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
            ابدأ التجربة المجانية
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => navigate('/pricing')} className="lp-btn"
            style={{ background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '16px 30px', borderRadius: 16 }}>
            شاهد الأسعار
          </button>
        </div>
        <p style={{ marginTop: 24, fontSize: 12, color: C.textDim }}>
          Starter ₪129 · Pro ₪249 · Business ₪499
        </p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '32px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Contractor Pro</span>
          <span style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { l: 'الخصوصية',       path: '/privacy' },
            { l: 'شروط الاستخدام', path: '/terms'   },
            { l: 'الإلغاء والاسترجاع', path: '/refund' },
            { l: 'تواصل معنا',     path: '/contact' },
          ].map(({ l, path }) => (
            <span key={l} onClick={() => navigate(path)}
              style={{ fontSize: 12, color: C.textDim, cursor: 'pointer' }}>{l}</span>
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
        <StatsStrip />
        <PainPoints />
        <AppShowcase />
        <Testimonials />
        <PricingTeaser />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
