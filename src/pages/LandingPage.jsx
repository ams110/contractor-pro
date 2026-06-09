import React, { useEffect, useState } from 'react'
import {
  HardHat, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot
} from 'lucide-react'
import { motion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

// نستعمل نفس توكنات الهوية (C/GRAD) ومكوّنات kit الفخامة (PremiumCard/IconChip)
// المستعملة في التطبيق — لا توكنات محليّة ولا بطاقات معاد بناؤها (CLAUDE.md §2.1/§19).

// دخول موحّد بنفس روح PremiumCard (tween 0.45 + spring للنقر).
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, delay },
})

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Noto Sans Arabic', system-ui, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; }
  .lp-btn { transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease !important; }
  .lp-btn:hover { opacity: .92; }
  .lp-btn:active { transform: scale(0.96) !important; }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes glow  { 0%,100%{opacity:.5} 50%{opacity:1} }
  .float    { animation: float 3.5s ease-in-out infinite }
  .glow-orb { animation: glow 3s ease-in-out infinite }
  .grad-text { background: linear-gradient(135deg,#F97316,#DC2626); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  /* Navbar responsive: inline actions on desktop, hamburger on mobile */
  .lp-nav-actions { display: flex; align-items: center; gap: 8px; }
  .lp-burger { display: none; }
  @media (max-width: 640px) {
    .lp-nav-pad     { padding-inline: 16px !important; }
    .lp-nav-actions { display: none !important; }
    .lp-burger      { display: flex !important; }
  }
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
    <nav className="lp-nav-pad" style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: (scrolled || menuOpen) ? 'rgba(7,8,15,0.96)' : 'rgba(7,8,15,0.72)',
      backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${(scrolled || menuOpen) ? C.borderMid : C.border}`,
      padding: '0 24px',
      transition: 'background .3s, border-color .3s',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', direction: 'rtl' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(249,115,22,0.35)', flexShrink: 0 }}>
            <HardHat size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>Contractor Pro</div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.06em' }}>إدارة مقاولات</div>
          </div>
        </div>

        {/* Desktop actions (hidden ≤640px) */}
        <div className="lp-nav-actions">
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

        {/* Mobile hamburger (shown ≤640px) */}
        <button className="lp-burger lp-btn" onClick={() => setMenuOpen(o => !o)} aria-label="القائمة"
          style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {menuOpen ? <X size={20} strokeWidth={2.4} /> : <Menu size={20} strokeWidth={2.4} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lp-burger" style={{ maxWidth: 1120, margin: '0 auto', flexDirection: 'column', gap: 10, padding: '6px 0 18px', direction: 'rtl' }}>
          <button onClick={() => { setMenuOpen(false); navigate('/pricing') }} className="lp-btn"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '13px', borderRadius: 13 }}>
            الأسعار
          </button>
          {loggedIn ? (
            <button onClick={() => { setMenuOpen(false); navigate('/app') }} className="lp-btn"
              style={{ width: '100%', background: GRAD.brand, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px', borderRadius: 13, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
              الدخول للتطبيق
            </button>
          ) : (
            <>
              <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="lp-btn"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '13px', borderRadius: 13 }}>
                تسجيل الدخول
              </button>
              <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="lp-btn"
                style={{ width: '100%', background: GRAD.brand, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px', borderRadius: 13, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
                ابدأ مجاناً
              </button>
            </>
          )}
        </div>
      )}
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
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.primary}1a`, border: `1px solid ${C.primary}40`, borderRadius: 100, padding: '6px 16px', marginBottom: 32, fontSize: 12, color: C.primary, fontWeight: 700 }}>
          <CircleDot size={10} strokeWidth={3} />
          التطبيق الأول للمقاول العربي في إسرائيل
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
          style={{ fontSize: 'clamp(28px,6vw,56px)', fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.02em' }}>
          كل يوم شغل، كل دفعة،<br />
          كل مصروف —<br />
          <span className="grad-text">محفوظ. مش في دماغك.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
          style={{ fontSize: 'clamp(15px,2.5vw,19px)', color: C.textDim, lineHeight: 1.7, marginBottom: 44, maxWidth: 580, margin: '0 auto 44px' }}>
          Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} className="lp-btn"
            style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 38px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
            جرّب مجاناً 14 يوم
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '16px 28px', borderRadius: 16 }}>
            شاهد كيف يعمل
          </button>
        </motion.div>

        {/* Trust signals */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
          style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
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
        </motion.div>
      </div>
    </section>
  )
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS = [
  { value: '3 لغات', label: 'عربي · عبري · إنجليزي', icon: Users,       color: C.primary   },
  { value: '18%',    label: 'حساب ضريبة القيمة المضافة', icon: Receipt,  color: C.cyan      },
  { value: '100%',   label: 'بياناتك مشفّرة وآمنة',     icon: Shield,      color: C.secondary },
  { value: '14 يوم', label: 'تجربة مجانية بلا بطاقة',  icon: TrendingUp,  color: C.gold      },
]
function StatsStrip() {
  return (
    <div style={{ padding: '0 24px 72px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STATS.map((s, i) => (
          <PremiumCard key={i} color={s.color} delay={i * 0.06} padding="20px">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <IconChip icon={s.icon} color={s.color} size={44} radius={13} iconSize={20} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          </PremiumCard>
        ))}
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
        <motion.div {...rise()} style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            شايف نفسك هنا؟
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>هذه المشاكل اليومية لها حل واحد.</p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PAIN_POINTS.map((p, i) => (
            <PremiumCard key={i} color={p.color} delay={i * 0.08} radius={22} padding="28px">
              <IconChip icon={p.Icon} color={p.color} size={52} radius={16} iconSize={24} strokeWidth={1.8} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12, lineHeight: 1.4 }}>
                {p.problem}
              </h3>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75 }}>
                {p.solution}
              </p>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
// يحاكي لوحة التطبيق الحقيقية: نبض المصلحة (العدّاد الدائري) + KPIs + مخطّط شهري + مشاريع.
function PhoneMockup() {
  const score = 87
  const R = 26
  const CIRC = 2 * Math.PI * R
  const months = [42, 58, 50, 71, 64, 88]
  const kpis = [
    { label: 'صافي الربح', value: '₪94K', color: C.success },
    { label: 'نقد بالجيب', value: '₪31K', color: C.cyan    },
    { label: 'مستحق',      value: '₪12K', color: C.gold    },
  ]
  const mockProjects = [
    { name: 'فيلا رهط',    amount: '₪42,500', pct: 68,  active: true  },
    { name: 'شقة الناصرة', amount: '₪18,000', pct: 100, active: false },
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
      {/* Business Pulse — العدّاد الدائري (توقيع التطبيق) */}
      <div style={{ padding: '12px 10px 0', background: C.bg }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${C.success}14, ${C.card} 70%)`, border: `1px solid ${C.success}33`, borderRadius: 14, padding: 11, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div aria-hidden style={{ position: 'absolute', top: -30, insetInlineEnd: -20, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${C.success}45 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />
          {/* gauge */}
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg width={60} height={60} viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={R} fill="none" stroke={C.card} strokeWidth="6" />
              <circle cx="30" cy="30" r={R} fill="none" stroke="url(#pulseGrad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(CIRC * score) / 100} ${CIRC}`} transform="rotate(-90 30 30)" />
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={C.success} />
                  <stop offset="1" stopColor={C.cyan} />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
              <span style={{ fontSize: 6, color: C.textDim, marginTop: 1 }}>من 100</span>
            </div>
          </div>
          {/* text */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.text }}>نبض المصلحة</div>
            <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>صحة مالية ممتازة</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, background: `${C.success}1c`, border: `1px solid ${C.success}3a`, borderRadius: 7, padding: '2px 7px' }}>
              <TrendingUp size={9} color={C.success} strokeWidth={2.5} />
              <span style={{ fontSize: 8, fontWeight: 800, color: C.success }}>+12% هذا الشهر</span>
            </div>
          </div>
        </div>
      </div>
      {/* KPI row */}
      <div style={{ padding: '10px 10px 0', background: C.bg }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 11, padding: '9px 6px', textAlign: 'center', border: `1px solid ${k.color}20` }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              <div style={{ fontSize: 7, color: C.textDim, marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Monthly income chart */}
      <div style={{ padding: '10px 10px 0', background: C.bg }}>
        <div style={{ background: C.card, borderRadius: 12, padding: '9px 10px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: C.textDim }}>الدخل الشهري</span>
            <span style={{ fontSize: 8, fontWeight: 800, color: C.primary }}>₪88K</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 34 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, height: `${m}%`, borderRadius: '3px 3px 0 0', background: i === months.length - 1 ? GRAD.brand : `${C.primary}40` }} />
            ))}
          </div>
        </div>
      </div>
      {/* Projects */}
      <div style={{ padding: '10px 10px 10px', background: C.bg }}>
        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 7 }}>المشاريع النشطة</div>
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
        <motion.div {...rise()}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 12, textTransform: 'uppercase' }}>قوة في جيبك</div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, lineHeight: 1.25, marginBottom: 20 }}>
            كل شي محتاجه<br />
            <span className="grad-text">في شاشة واحدة</span>
          </h2>
          <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.8, marginBottom: 36 }}>
            من تسجيل أيام العمل اليومية إلى حساب ضريبة الدخل والتأمين الوطني — Contractor Pro يغطيك بالكامل.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} {...rise(i * 0.05)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconChip icon={Icon} color={C.primary} size={30} radius={9} iconSize={14} strokeWidth={2} />
                <span style={{ fontSize: 14, color: C.textDim }}>{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
    text:  'يحسب لك ضريبة القيمة المضافة والخصم الضريبي على كل مصروف تلقائياً حسب الفئة — ما بتضيّع شيكل تقدر تستردّه.',
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
        <motion.div {...rise()} style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            مبني خصّيصاً لشغل المقاول
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>كل ميزة حلّ لمشكلة حقيقية بتواجهك كل يوم.</p>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {VALUE_CARDS.map((c, i) => (
            <PremiumCard key={i} color={c.color} delay={i * 0.08} radius={22} padding="28px">
              <IconChip icon={c.icon} color={c.color} size={48} radius={14} iconSize={24} strokeWidth={2} style={{ marginBottom: 18 }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>{c.title}</div>
              <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>{c.text}</p>
            </PremiumCard>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing teaser ───────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Starter',  price: 129, desc: 'للمقاول المستقل',             color: C.primary,   highlight: false },
  { name: 'Pro',      price: 249, desc: 'لفريق حتى 5 أشخاص',          color: C.secondary, highlight: true  },
  { name: 'Business', price: 499, desc: 'غير محدود + تقارير متقدمة',   color: C.gold,      highlight: false },
]
function PricingTeaser() {
  const [cycle, setCycle] = useState('month')   // 'month' | 'year'
  const isYear = cycle === 'year'
  return (
    <section style={{ padding: '72px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <motion.div {...rise()} style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
            خطط بسيطة وواضحة
          </h2>
          <p style={{ fontSize: 16, color: C.textDim }}>كل الخطط تبدأ بتجربة مجانية 14 يوم — بدون بطاقة ائتمان.</p>
        </motion.div>

        {/* مبدّل دورة الفوترة */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 4, gap: 4 }}>
            {[{ key: 'month', label: 'شهري' }, { key: 'year', label: 'سنوي' }].map(opt => {
              const active = cycle === opt.key
              return (
                <button key={opt.key} onClick={() => setCycle(opt.key)} className="lp-btn"
                  style={{ position: 'relative', background: active ? GRAD.brand : 'transparent', border: 'none', color: active ? '#fff' : C.textDim, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '8px 22px', borderRadius: 11 }}>
                  {opt.label}
                  {opt.key === 'year' && (
                    <span style={{ marginInlineStart: 6, fontSize: 9, fontWeight: 800, color: active ? '#fff' : C.success }}>وفّر شهرين</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, maxWidth: 820, margin: '0 auto' }}>
          {PLANS.map((plan, i) => {
            const annual     = plan.price * 10            // خصم شهرين
            const effMonthly = Math.round(annual / 12)
            return (
              <PremiumCard key={i} color={plan.color} delay={i * 0.07} radius={22} padding="28px 24px"
                style={{
                  transform: plan.highlight ? 'scale(1.03)' : 'none',
                  boxShadow: plan.highlight ? `0 8px 40px ${plan.color}20` : 'none',
                }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, background: GRAD.premium, borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                    الأكثر شيوعاً
                  </div>
                )}
                <div style={{ fontSize: 15, fontWeight: 800, color: plan.color, marginBottom: 8, marginTop: plan.highlight ? 18 : 0 }}>{plan.name}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  ₪{isYear ? effMonthly : plan.price}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: isYear ? 6 : 20 }}>/ شهر</div>
                {isYear && (
                  <div style={{ fontSize: 11, color: C.success, fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>
                    يُدفع ₪{annual} سنوياً · وفّر ₪{plan.price * 2}
                  </div>
                )}
                <div style={{ fontSize: 13, color: C.textDim, marginBottom: 24, lineHeight: 1.5 }}>{plan.desc}</div>
                <button onClick={() => navigate('/register')} className="lp-btn"
                  style={{ width: '100%', background: plan.highlight ? `linear-gradient(135deg, ${plan.color}, ${plan.color}CC)` : `${plan.color}15`, border: `1px solid ${plan.color}30`, color: plan.highlight ? '#fff' : plan.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '10px', borderRadius: 12 }}>
                  ابدأ مجاناً
                </button>
              </PremiumCard>
            )
          })}
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
      <motion.div {...rise()} style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
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
      </motion.div>
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
            { l: 'المدوّنة',       path: '/blog'    },
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
