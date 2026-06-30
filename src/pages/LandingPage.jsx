import React, { useEffect, useRef, useState } from 'react'
import {
  HardHat, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot, Sun, CloudSun, MapPin, Check, Hourglass,
  Activity, Clock, ChevronLeft, Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip, HolographicSheen, useCountUp, TONES } from '../ui/Premium.jsx'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'
import { trackCtaClick } from '../lib/track.js'
import { useRouteSeo } from '../lib/seo.js'
import { landingStringsFor } from './landingStrings.js'

// تنقّل مع تتبّع نقر CTA على القناتين (GA4 cta_click + TikTok ClickButton).
function goCta(location, path) {
  trackCtaClick(location)
  navigate(path)
}

// نصوص الصفحة حسب اللغة الحالية (ar افتراضي · he للحملات العبرية عبر ?lang=he).
// كل مكوّن يستدعي useLang() ليقرأ نسخته — بلا prop drilling. تفاعلي مع i18n.
function useLang() {
  const { i18n } = useTranslation()
  return landingStringsFor(i18n.language)
}

// نستعمل نفس توكنات الهوية (C/GRAD) ومكوّنات kit الفخامة (PremiumCard/IconChip)
// المستعملة في التطبيق — لا توكنات محليّة ولا بطاقات معاد بناؤها (CLAUDE.md §2.1/§19).
//
// النسخة «التطبيق نفسه» — كل المحتوى والتصميم من التطبيق الحقيقي بنفس الـDNA:
// 1) الهيرو = لوحة التحكم الحيّة داخل إطار التطبيق: نبض المصلحة بعدّاده الدائري
//    النابض + بطاقات KPI + مخطّط شهري + كرت مشروع — مبنية بنفس kit الفخامة
//    (PremiumCard/IconChip/useCountUp/HolographicSheen/Gauge) وتتنفّس قدام الزائر.
// 2) «من الفوضى للنظام»: تذاكر شِفت وكروت مشاريع وصفوف رواتب طبق الأصل من
//    مكوّنات التطبيق تنشفط جوّا التلفون الحي.
// 3) ورقة CP-01 «نماذج حية» · CP-02 الميزات · CP-03 الأسعار.
//
// 💾 نسخ محفوظة بتاريخ الفرع: المدينة الحيّة b8a0ab7 · الفوضى→النظام 7986143 ·
//    المخطط الهندسي 6f9006e · الهجينة 09ab2df.

// دخول موحّد بروح 3D: يطلع من العمق مع ميلان خفيف.
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 26, rotateX: 12, transformPerspective: 900 },
  whileInView: { opacity: 1, y: 0, rotateX: 0, transformPerspective: 900 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
})

const SPRING = { stiffness: 90, damping: 22, mass: 0.4 }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #07080F; font-family: 'Noto Sans Arabic', system-ui, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; overflow-x: hidden; overflow-x: clip; }
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
  /* بطاقات KPI عائمة حول الديوراما — تختفي على الشاشات الضيّقة جداً */
  .lp-float-chip { position: absolute; pointer-events: none; z-index: 4; }
  @media (max-width: 520px) { .lp-float-chip { display: none; } }
  /* شبكة قسم «جوّا التطبيق» + فولباك تقليل الحركة */
  .lp-cinema-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; max-width: 1000px; width: 100%; }
  @media (max-width: 860px) { .lp-cinema-grid { grid-template-columns: 1fr; gap: 24px; } }
  /* شبكة هيرو المخطط: نص + المشهد الحي (عمود واحد على الموبايل) */
  .lp-hero-grid { display: grid; grid-template-columns: 1.04fr 1fr; align-items: center; max-width: 1180px; margin: 0 auto; gap: 10px; padding: 26px 26px 64px; }
  .lp-hero-canvas { height: clamp(420px, 64vh, 600px); }
  @media (max-width: 900px) {
    .lp-hero-grid { grid-template-columns: 1fr; padding: 40px 18px 76px; }
    .lp-hero-canvas { height: min(48vh, 440px); }
  }
  /* بطاقات الفوضى الإضافية — تنخفي على الشاشات الضيّقة (ازدحام) */
  @media (max-width: 700px) { .lp-chaos-hide { display: none; } }
  /* ورقة المخطط الهندسي: رسمة + callouts (عمود واحد على الموبايل) */
  .lp-bp-grid { display: grid; grid-template-columns: 1fr 1.05fr; }
  @media (max-width: 860px) { .lp-bp-grid { grid-template-columns: 1fr; } }
  /* حبيبات فيلم سينمائية فوق المسرح (بلا mix-blend — أرخص على الرندر البرمجي) */
  .lp-grain {
    position: absolute; inset: 0; z-index: 30; pointer-events: none; opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce) {
    .float, .glow-orb { animation: none !important; }
  }
`

// ─── أدوات السكرول 3D ─────────────────────────────────────────────────────────

// شريط تقدّم السكرول أعلى الصفحة (يتعبّى من اليمين — RTL).
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.3 })
  return (
    <motion.div aria-hidden style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 200,
      background: GRAD.brand, transformOrigin: 'right', scaleX,
      boxShadow: '0 0 12px rgba(249,115,22,0.5)', pointerEvents: 'none',
    }} />
  )
}

// مقطع يطلع من العمق: ميلان rotateX + ارتفاع + تكبير مربوطة كلها بموضع السكرول
// (مش انميشن once — العنصر "يتسحّب" من العمق كل ما يدخل الشاشة).
function Depth({ children, tilt = 12, lift = 70, from = 0.94, style = {} }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 96%', 'start 42%'] })
  const p = useSpring(scrollYProgress, SPRING)
  const rotateX = useTransform(p, [0, 1], [tilt, 0])
  const y = useTransform(p, [0, 1], [lift, 0])
  const scale = useTransform(p, [0, 1], [from, 1])
  const opacity = useTransform(p, [0, 1], [0, 1])
  if (reduce) return <div ref={ref} style={style}>{children}</div>
  return (
    <motion.div ref={ref} style={{
      rotateX, y, scale, opacity,
      transformPerspective: 1200, transformStyle: 'preserve-3d', willChange: 'transform',
      ...style,
    }}>
      {children}
    </motion.div>
  )
}

// بطاقة تنقلب من العمق (rotateY) عند دخولها الشاشة — للشبكات (stagger عبر delay).
function Flip3D({ children, delay = 0, dir = 1, style = {} }) {
  const reduce = useReducedMotion()
  if (reduce) return <div style={style}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 26 * dir, rotateX: 8, y: 46, scale: 0.92 }}
      whileInView={{ opacity: 1, rotateY: 0, rotateX: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000, transformStyle: 'preserve-3d', height: '100%', ...style }}
    >
      {children}
    </motion.div>
  )
}

// زر مغناطيسي: ينجذب نحو المؤشّر بنطاق صغير ويرجع بـspring (ديسكتوب فقط عملياً).
function Magnetic({ children, strength = 16 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 280, damping: 18, mass: 0.3 })
  const sy = useSpring(y, { stiffness: 280, damping: 18, mass: 0.3 })
  if (reduce) return <div style={{ display: 'inline-flex' }}>{children}</div>
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set(((e.clientX - r.left) / r.width - 0.5) * strength * 2)
    y.set(((e.clientY - r.top) / r.height - 0.5) * strength * 2)
  }
  const onLeave = () => { x.set(0); y.set(0) }
  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={{ x: sx, y: sy, display: 'inline-flex' }}>
      {children}
    </motion.div>
  )
}

// شريحة عائمة بعمق حول عنوان الـHero (بهوية بطاقات التطبيق).
function FloatChip({ icon: Icon, color, text, style = {}, dur = 3.5, delay = 0 }) {
  return (
    <div className="lp-float-chip" style={style}>
      <div className="float" style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px',
        background: `linear-gradient(135deg, ${color}1f, ${C.card} 70%)`,
        border: `1px solid ${color}3a`, borderRadius: 14,
        boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 24px ${color}22`,
        animationDuration: `${dur}s`, animationDelay: `${delay}s`,
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1c`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} strokeWidth={2.4} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    </div>
  )
}

// ─── Boot Intro — شاشة إقلاع سينمائية (مرة بالجلسة) ──────────────────────────
// لوغو ينبثق بـspring + شريط تحميل يتعبّى، ثم الستارة تنسحب لفوق وتكشف المسرح.
function BootIntro({ onDone }) {
  const t = useLang()
  return (
    <motion.div
      exit={{ y: '-100%' }}
      transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, direction: 'rtl' }}>
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotate: -14 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        style={{ width: 76, height: 76, borderRadius: 24, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 60px rgba(249,115,22,0.5)' }}>
        <HardHat size={36} color="#fff" strokeWidth={2.2} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
        style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t.brand}</div>
        <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 3, letterSpacing: '0.08em' }}>{t.brandSub}</div>
      </motion.div>
      <div style={{ width: 150, height: 3, background: C.card, borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.85, ease: 'easeInOut', delay: 0.2 }}
          onAnimationComplete={onDone}
          style={{ height: '100%', background: GRAD.brand, borderRadius: 2, transformOrigin: 'right' }} />
      </div>
    </motion.div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ loggedIn }) {
  const t = useLang()
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
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>{t.brand}</div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.06em' }}>{t.brandSub}</div>
          </div>
        </div>

        {/* Desktop actions (hidden ≤640px) */}
        <div className="lp-nav-actions">
          <button onClick={() => goCta('nav_pricing', '/pricing')} className="lp-btn"
            style={{ background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 14px', borderRadius: 10 }}>
            {t.nav.pricing}
          </button>
          {loggedIn ? (
            <button onClick={() => navigate('/app')} className="lp-btn"
              style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
              {t.nav.enterApp}
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="lp-btn"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 18px', borderRadius: 12 }}>
                {t.nav.login}
              </button>
              <button onClick={() => goCta('nav_register', '/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
                {t.nav.startFree}
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger (shown ≤640px) */}
        <button className="lp-burger lp-btn" onClick={() => setMenuOpen(o => !o)} aria-label={t.nav.menu}
          style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {menuOpen ? <X size={20} strokeWidth={2.4} /> : <Menu size={20} strokeWidth={2.4} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lp-burger" style={{ maxWidth: 1120, margin: '0 auto', flexDirection: 'column', gap: 10, padding: '6px 0 18px', direction: 'rtl' }}>
          <button onClick={() => { setMenuOpen(false); navigate('/pricing') }} className="lp-btn"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '13px', borderRadius: 13 }}>
            {t.nav.pricing}
          </button>
          {loggedIn ? (
            <button onClick={() => { setMenuOpen(false); navigate('/app') }} className="lp-btn"
              style={{ width: '100%', background: GRAD.brand, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px', borderRadius: 13, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
              {t.nav.enterApp}
            </button>
          ) : (
            <>
              <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="lp-btn"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '13px', borderRadius: 13 }}>
                {t.nav.login}
              </button>
              <button onClick={() => { setMenuOpen(false); goCta('nav_mobile_register', '/register') }} className="lp-btn"
                style={{ width: '100%', background: GRAD.brand, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px', borderRadius: 13, boxShadow: '0 4px 18px rgba(249,115,22,0.4)' }}>
                {t.nav.startFree}
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
// يحاكي لوحة التحكم الحقيقية للتطبيق (نبض المصلحة + KPIs + مخطّط + مشاريع) —
// «حيّ» عند ظهوره: العدّاد يلفّ والأرقام تعدّ والمخطّط ينمو. يُعرض بقسم
// «جوّا التطبيق» وبفولباك تقليل الحركة.

// الشريط السفلي مع تبويب نشط متغيّر حسب الشاشة
function MiniNav({ active = 0 }) {
  const icons = [LayoutDashboard, Building2, Users, Wallet, Settings]
  return (
    <div style={{ background: `${C.bg}F8`, padding: '8px 6px 10px', display: 'flex', justifyContent: 'space-around', borderTop: `1px solid ${C.border}` }}>
      {icons.map((Icon, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <Icon size={i === active ? 16 : 13} color={i === active ? C.primary : C.textDim} strokeWidth={i === active ? 2.5 : 1.8} />
          {i === active && <div style={{ width: 12, height: 2.5, borderRadius: 2, background: GRAD.brand }} />}
        </div>
      ))}
    </div>
  )
}

function PhoneMockup({ float = true }) {
  const tx = useLang()
  const score = 87
  const R = 26
  const CIRC = 2 * Math.PI * R
  const months = [42, 58, 50, 71, 64, 88]
  // داشبورد «حي» عند الفتح: العدّاد يلفّ والأرقام تعدّ والمخطّط ينمو
  const [live, setLive] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLive(true), 750)
    return () => clearTimeout(t)
  }, [])
  const liveScore = useCountUp(score, 1300, live)
  const k1 = useCountUp(94, 1300, live)
  const k2 = useCountUp(31, 1300, live)
  const k3 = useCountUp(12, 1300, live)
  const kpis = [
    { label: tx.phone.netProfit,  value: `₪${k1}K`, color: C.success },
    { label: tx.phone.cashInHand, value: `₪${k2}K`, color: C.cyan    },
    { label: tx.phone.owed,       value: `₪${k3}K`, color: C.gold    },
  ]
  const mockProjects = [
    { name: tx.phone.projVilla, amount: '₪42,500', pct: 68,  active: true  },
    { name: tx.phone.projApt,   amount: '₪18,000', pct: 100, active: false },
  ]
  return (
    <div className={float ? 'float' : undefined} style={{ width: 268, background: C.surface, borderRadius: 42, border: `2px solid rgba(249,115,22,0.15)`, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(249,115,22,0.06)' }}>
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
          <span style={{ fontSize: 10, fontWeight: 800, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{tx.brand}</span>
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
      {/* منطقة الشاشة — لوحة التحكم */}
      <div style={{ position: 'relative' }}>
      {/* Business Pulse — العدّاد الدائري (توقيع التطبيق) */}
      <div style={{ padding: '12px 10px 0', background: C.bg }}>
        <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${C.success}14, ${C.card} 70%)`, border: `1px solid ${C.success}33`, borderRadius: 14, padding: 11, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div aria-hidden style={{ position: 'absolute', top: -30, insetInlineEnd: -20, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${C.success}45 0%, transparent 70%)`, opacity: 0.4, pointerEvents: 'none' }} />
          {/* gauge */}
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg width={60} height={60} viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={R} fill="none" stroke={C.card} strokeWidth="6" />
              <circle cx="30" cy="30" r={R} fill="none" stroke="url(#pulseGrad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(CIRC * liveScore) / 100} ${CIRC}`} transform="rotate(-90 30 30)" />
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={C.success} />
                  <stop offset="1" stopColor={C.cyan} />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{liveScore}</span>
              <span style={{ fontSize: 6, color: C.textDim, marginTop: 1 }}>{tx.phone.of100}</span>
            </div>
          </div>
          {/* text */}
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.text }}>{tx.phone.pulseTitle}</div>
            <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>{tx.phone.pulseSub}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, background: `${C.success}1c`, border: `1px solid ${C.success}3a`, borderRadius: 7, padding: '2px 7px' }}>
              <TrendingUp size={9} color={C.success} strokeWidth={2.5} />
              <span style={{ fontSize: 8, fontWeight: 800, color: C.success }}>{tx.phone.pulseDelta}</span>
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
            <span style={{ fontSize: 8, fontWeight: 700, color: C.textDim }}>{tx.phone.monthlyIncome}</span>
            <span style={{ fontSize: 8, fontWeight: 800, color: C.primary }}>₪88K</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 34 }}>
            {months.map((m, i) => (
              <motion.div key={i}
                initial={{ height: '8%' }}
                animate={live ? { height: `${m}%` } : {}}
                transition={{ duration: 0.7, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                style={{ flex: 1, borderRadius: '3px 3px 0 0', background: i === months.length - 1 ? GRAD.brand : `${C.primary}40` }} />
            ))}
          </div>
        </div>
      </div>
      {/* Projects */}
      <div style={{ padding: '10px 10px 10px', background: C.bg }}>
        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 7 }}>{tx.phone.activeProjects}</div>
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
      <MiniNav active={0} />
      </div>
    </div>
  )
}

// ─── Hero — «المخطط الهندسي الحي» ────────────────────────────────────────────
// الصفحة كلها «دفتر مخططات»: الهيرو ورقة الغلاف (CP-00) — ورقة blueprint
// بشبكة سماوية، رسمة موقع (مبنى + رافعة) بخط المخططات ترسم حالها قدام
// الزائر (SVG pathLength)، خطوط أبعاد ذهبية، عنوان «مُقاس» بشرطات أبعاد،
// وختم أحمر «جاهز للتنفيذ» يُطبع لما تكتمل الرسمة. بلا تثبيت سكرول.
// أيقونة/لون كل قصّة — النصوص (title/desc) تأتي من قاموس اللغة (t.story[i]).
const STORY_META = [
  { Icon: CalendarDays, color: C.primary   },
  { Icon: Wallet,       color: C.secondary },
  { Icon: TrendingUp,   color: C.success   },
]

// خلفية شبكة المخطط (تُستعمل بورقة الهيرو وأوراق الأقسام)
const BP_GRID_BG = `
  linear-gradient(${C.cyan}10 1px, transparent 1px),
  linear-gradient(90deg, ${C.cyan}10 1px, transparent 1px),
  linear-gradient(${C.cyan}07 1px, transparent 1px),
  linear-gradient(90deg, ${C.cyan}07 1px, transparent 1px),
  linear-gradient(165deg, #0A1226, #0A0F22 70%)`
const BP_GRID_SIZE = '88px 88px, 88px 88px, 22px 22px, 22px 22px, 100% 100%'

// علامات زوايا ورقة المخطط
function SheetCorners() {
  return [{ top: 10, insetInlineStart: 10 }, { top: 10, insetInlineEnd: 10 }, { bottom: 10, insetInlineStart: 10 }, { bottom: 10, insetInlineEnd: 10 }].map((pos, i) => (
    <div key={i} aria-hidden style={{ position: 'absolute', width: 18, height: 18, zIndex: 2, ...pos, borderTop: i < 2 ? `2px solid ${C.cyan}66` : 'none', borderBottom: i >= 2 ? `2px solid ${C.cyan}66` : 'none', borderInlineStart: i % 2 === 0 ? `2px solid ${C.cyan}66` : 'none', borderInlineEnd: i % 2 === 1 ? `2px solid ${C.cyan}66` : 'none' }} />
  ))
}

// ورقة مخطط — إطار موحّد للأقسام: رقم ورقة + شبكة + زوايا + جدول عنوان مصغّر
function Sheet({ no, title, children, style = {} }) {
  const t = useLang()
  return (
    <div style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${C.cyan}3a`,
      background: BP_GRID_BG, backgroundSize: BP_GRID_SIZE,
      boxShadow: `0 30px 80px rgba(0,0,0,0.45), inset 0 0 80px ${C.cyan}08`,
      ...style,
    }}>
      <SheetCorners />
      {/* شريط رقم الورقة */}
      <div style={{ position: 'absolute', top: 12, insetInlineStart: 38, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 800, color: `${C.cyan}BB`, letterSpacing: '0.14em' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
        {t.sheetWord} {no} — {title}
      </div>
      {children}
    </div>
  )
}

// ─── الهيرو = التطبيق نفسه حيّاً ──────────────────────────────────────────────
// بدل أي تجريد (مدن/مخططات): نعرض لوحة التحكم الحقيقية بالحجم الكبير — نبض
// المصلحة بعدّاده الدائري النابض + بطاقات KPI + كرت مشروع + مخطّط شهري — كلها
// مبنية بنفس kit التطبيق (PremiumCard/IconChip/useCountUp/HolographicSheen)
// وبنفس الـDNA حرفياً، تتنفّس قدام الزائر داخل إطار التطبيق. أصدق وعد:
// «هاد بالضبط اللي رح تفتحه». headline + CTA بجانبها (ديسكتوب) أو فوقها (موبايل).

// العدّاد الدائري — نسخة مطابقة لـBusinessPulse.Gauge (بمقاس الهيرو)
// ─── Hero — «المخطط الهندسي الحي» (ورقة الغلاف CP-00) ───────────────────────
const HERO_PATHS = [
  { d: 'M16 388 L504 388', w: 2 },                                                            // خط الأرض
  { d: 'M64 388 V172 L184 124 L304 172 V388', w: 1.8 },                                       // هيكل المبنى
  { d: 'M64 240 H304 M64 312 H304', w: 1.2 },                                                 // بلاطات الطوابق
  { d: 'M94 196 h36 v24 h-36 Z M166 186 h40 v30 h-40 Z M238 196 h36 v24 h-36 Z', w: 1.2 },    // شبابيك ع
  { d: 'M94 262 h36 v24 h-36 Z M166 262 h40 v24 h-40 Z M238 262 h36 v24 h-36 Z', w: 1.2 },    // شبابيك 2
  { d: 'M158 388 v-50 h52 v50', w: 1.4 },                                                     // المدخل
  { d: 'M408 388 V84', w: 1.8 },                                                              // صاري الرافعة
  { d: 'M338 96 H496 M408 96 L376 124 M408 96 L440 124', w: 1.4 },                            // ذراع + شدّادات
  { d: 'M464 96 V210', w: 1 },                                                                // الكيبل
  { d: 'M444 210 h40 v28 h-40 Z', w: 1.4 },                                                   // الحمولة
]
function BlueprintHero() {
  const t = useLang()
  const words = t.hero.words
  const reduce = useReducedMotion()
  const draw = (i, dur = 1.0) => reduce ? {} : {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: dur, delay: 0.5 + i * 0.22, ease: 'easeInOut' },
  }
  const fadeIn = (delay) => reduce ? {} : {
    initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }

  // انكشاف العنوان كلمة-كلمة (بروح «الرسم»)
  let wi = 0
  const word = (w, k) => {
    if (w === '\n') return <br key={k} />
    const d = 0.15 + (wi++) * 0.07
    if (reduce) return <span key={k} style={{ display: 'inline-block', marginInlineEnd: '0.26em' }}>{w}</span>
    return (
      <motion.span key={k}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: d, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-block', marginInlineEnd: '0.26em' }}>
        {w}
      </motion.span>
    )
  }
  const gradDelay = 0.15 + words.filter(w => w !== '\n').length * 0.07 + 0.1

  return (
    <section style={{ padding: 'clamp(10px, 2vw, 24px)', direction: 'rtl' }}>
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1.5px solid ${C.cyan}3a`,
        background: BP_GRID_BG, backgroundSize: BP_GRID_SIZE,
        boxShadow: `0 30px 80px rgba(0,0,0,0.5), inset 0 0 110px ${C.cyan}0a`,
        minHeight: 'calc(100vh - 64px - 48px)', display: 'flex', alignItems: 'center',
      }}>
        <SheetCorners />
        <div style={{ position: 'absolute', top: 12, insetInlineStart: 38, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 800, color: `${C.cyan}BB`, letterSpacing: '0.14em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
          {t.hero.sheetLabel}
        </div>

        <div className="lp-hero-grid" style={{ position: 'relative', width: '100%' }}>
          {/* عمود النص — عنوان «مُقاس» بخطوط أبعاد */}
          <div style={{ textAlign: 'start', maxWidth: 600, padding: '40px 8px 16px' }}>
            <motion.div {...fadeIn(0)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.cyan}14`, border: `1px solid ${C.cyan}40`, borderRadius: 8, padding: '6px 14px', marginBottom: 'clamp(14px, 2.6vh, 24px)', fontSize: 11.5, color: C.cyan, fontWeight: 800, letterSpacing: '0.06em' }}>
              <CircleDot size={10} strokeWidth={3} />
              {t.hero.badge}
            </motion.div>

            {/* خط بُعد فوق العنوان */}
            <motion.div {...fadeIn(0.1)} aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 1.5, height: 12, background: `${C.gold}99` }} />
              <span style={{ flex: 1, maxWidth: 300, height: 1.5, background: `${C.gold}66` }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: C.gold, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em' }}>{t.hero.scale}</span>
              <span style={{ flex: 1, maxWidth: 300, height: 1.5, background: `${C.gold}66` }} />
              <span style={{ width: 1.5, height: 12, background: `${C.gold}99` }} />
            </motion.div>

            <h1 style={{ fontSize: 'clamp(26px,4.4vw,48px)', fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.02em' }}>
              {words.map(word)}
              <br />
              <motion.span className="grad-text"
                initial={reduce ? false : { opacity: 0, y: 18, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: gradDelay, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block' }}>
                {t.hero.finish}
              </motion.span>
            </h1>

            <motion.p {...fadeIn(gradDelay + 0.12)}
              style={{ fontSize: 'clamp(13.5px,1.6vw,16.5px)', color: C.textDim, lineHeight: 1.75, marginBottom: 'clamp(16px, 2.8vh, 26px)', maxWidth: 520 }}>
              {t.hero.para}
            </motion.p>

            <motion.div {...fadeIn(gradDelay + 0.2)}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Magnetic>
                <button onClick={() => goCta('landing_hero', '/register')} className="lp-btn"
                  style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', padding: '15px 36px', borderRadius: 14, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.hero.ctaTry}
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
              </Magnetic>
              <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
                style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '15px 26px', borderRadius: 14 }}>
                {t.hero.ctaWatch}
              </button>
              <button onClick={() => goCta('landing_calculator', '/calculator')} className="lp-btn"
                style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '15px 26px', borderRadius: 14 }}>
                {t.hero.ctaSalary}
              </button>
              <button onClick={() => goCta('landing_vat_calculator', '/vat-calculator')} className="lp-btn"
                style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '15px 26px', borderRadius: 14 }}>
                {t.hero.ctaVat}
              </button>
            </motion.div>

            <motion.div {...fadeIn(gradDelay + 0.32)}
              style={{ marginTop: 'clamp(14px, 2.6vh, 24px)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[Shield, Smartphone, CheckCircle2].map((Icon, i) => ({ icon: Icon, label: t.hero.trust[i] })).map(({ icon: Icon, label }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={15} color={C.cyan} strokeWidth={2.2} />
                  <span style={{ fontSize: 13, color: C.textDim }}>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* عمود الرسمة — موقع العمل يرسم حاله + ختم الاعتماد */}
          <div className="lp-hero-draw" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 8px 24px' }}>
            <svg viewBox="0 0 520 420" style={{ width: 'min(560px, 94%)', overflow: 'visible' }} aria-hidden>
              {HERO_PATHS.map((p, i) => (
                <motion.path key={i} d={p.d} stroke={C.cyan} strokeWidth={p.w} fill="none"
                  strokeLinecap="round" strokeLinejoin="round" {...draw(i, 0.9)} />
              ))}
              {/* خطوط الأبعاد الذهبية */}
              <motion.g {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 2.9, duration: 0.6 } })}>
                <path d="M64 96 L304 96 M64 88 L64 104 M304 88 L304 104" stroke={`${C.gold}99`} strokeWidth="1.2" fill="none" />
                <text x="184" y="86" textAnchor="middle" fill={C.gold} fontSize="12" fontWeight="700" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.hero.dimW}</text>
                <path d="M30 172 L30 388 M22 172 L38 172 M22 388 L38 388" stroke={`${C.gold}99`} strokeWidth="1.2" fill="none" />
                <text x="30" y="284" textAnchor="middle" fill={C.gold} fontSize="11" fontWeight="700" transform="rotate(-90 22 284)" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.hero.dimH}</text>
              </motion.g>
              {/* وردة الشمال */}
              <motion.g {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 3.2, duration: 0.5 } })}>
                <circle cx="478" cy="38" r="17" stroke={`${C.cyan}77`} strokeWidth="1.2" fill="none" />
                <path d="M478 26 L483 43 L478 39 L473 43 Z" fill={C.cyan} opacity="0.85" />
                <text x="478" y="68" textAnchor="middle" fill={`${C.cyan}AA`} fontSize="9" fontWeight="700">{t.hero.north}</text>
              </motion.g>
            </svg>

            {/* ختم الاعتماد — يُطبع لما تكتمل الرسمة */}
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 2.1, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: -11 }}
              transition={{ delay: reduce ? 0 : 3.5, duration: 0.4, ease: [0.22, 1.4, 0.36, 1] }}
              style={{
                position: 'absolute', bottom: '13%', insetInlineEnd: '8%',
                border: `2.5px solid ${C.accent}CC`, borderRadius: 10, padding: '8px 18px',
                boxShadow: `inset 0 0 0 2px transparent, 0 0 0 3px ${C.accent}22`,
                textAlign: 'center', background: `${C.accent}0d`, backdropFilter: 'blur(2px)',
              }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.accent, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{t.hero.stamp}</div>
              <div style={{ fontSize: 8.5, fontWeight: 800, color: `${C.accent}BB`, letterSpacing: '0.18em', marginTop: 2 }}>CONTRACTOR PRO — CP-00</div>
            </motion.div>
          </div>
        </div>

        {/* جدول العنوان أسفل ورقة الغلاف */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${C.cyan}33`, background: 'rgba(10,15,34,0.72)', backdropFilter: 'blur(6px)' }}>
          {t.hero.titleBlock.map(([k, v], i) => (
            <div key={i} className="lp-titleblock-cell" style={{ flex: '1 1 120px', padding: '8px 16px', borderInlineStart: i ? `1px solid ${C.cyan}22` : 'none' }}>
              <div style={{ fontSize: 8.5, color: `${C.cyan}AA`, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 11.5, color: C.text, fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LandingTicket({ day, month, weekday, name, project, type, color, grad, TypeIcon, chips = [], amount, status, notch = C.bg, width = 330 }) {
  const t = useLang()
  const st = status === 'pending'
    ? { color: C.warning, label: t.ticket.pending, Icon: Hourglass }
    : { color: C.success, label: t.ticket.approved, Icon: Check }
  return (
    <div dir="rtl" style={{
      position: 'relative', display: 'flex', alignItems: 'stretch', minHeight: 86, width, maxWidth: '88vw',
      borderRadius: 18, overflow: 'hidden',
      background: `linear-gradient(135deg, ${color}14, ${C.card} 55%)`,
      border: `1px solid ${color}33`, boxShadow: `0 10px 28px ${color}1c`,
    }}>
      <HolographicSheen opacity={0.2} />
      {/* كعب التاريخ المتدرّج */}
      <div style={{ width: 64, flexShrink: 0, background: grad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 1 }}>
        <TypeIcon size={13} color="#fff" strokeWidth={2.2} style={{ opacity: 0.95, marginBottom: 2 }} />
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{day}</div>
        <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.95 }}>{month}</div>
        <div style={{ fontSize: 8, fontWeight: 600, opacity: 0.8 }}>{weekday}</div>
      </div>
      {/* الوسط: الاسم + المشروع + الشرائح */}
      <div style={{ flex: 1, minWidth: 0, padding: '9px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: C.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {project && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: C.textDim, whiteSpace: 'nowrap' }}>
            <MapPin size={10} color={color} strokeWidth={2.2} /> {project}
          </div>
        )}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color, background: `${color}1c`, border: `1px solid ${color}38`, borderRadius: 7, padding: '2px 8px' }}>{type}</span>
          {chips.map((c, i) => (
            <span key={i} style={{ fontSize: 9, fontWeight: 700, color: C.textDim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '2px 8px' }}>{c}</span>
          ))}
        </div>
      </div>
      {/* خط التثقيب + الحفرتان */}
      <div style={{ width: 0, borderInlineStart: `2px dashed ${color}40`, margin: '11px 0', flexShrink: 0 }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 80, top: -8, width: 16, height: 16, borderRadius: '50%', background: notch }} />
      <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 80, bottom: -8, width: 16, height: 16, borderRadius: '50%', background: notch }} />
      {/* كعب الأجر + ختم الحالة */}
      <div style={{ width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0 5px' }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: C.textDim }}>{t.ticket.wage}</div>
        <div style={{ fontSize: 15, fontWeight: 900, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>₪{amount}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, fontWeight: 800, color: st.color, background: `${st.color}1a`, border: `1px solid ${st.color}40`, borderRadius: 20, padding: '2px 7px' }}>
          <st.Icon size={8} strokeWidth={2.8} /> {st.label}
        </span>
      </div>
    </div>
  )
}

function LandingProjectCard({ name, client, status, profit, margin, stats = [], width = 310 }) {
  const t = useLang()
  const statusLabel = status || t.project.active
  // تدرّج «نشط» الحقيقي من ProjectCard: أخضر → أزرق → سماوي
  const gradient = `linear-gradient(135deg, ${C.success} 0%, #0EA5E9 58%, ${C.cyan} 115%)`
  return (
    <div dir="rtl" style={{
      position: 'relative', width, maxWidth: '88vw', aspectRatio: '1.6 / 1', borderRadius: 20, overflow: 'hidden',
      background: gradient,
      boxShadow: '0 12px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
      padding: 13, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <HolographicSheen />
      <div aria-hidden style={{ position: 'absolute', top: -52, insetInlineEnd: -38, width: 150, height: 150, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', top: -28, insetInlineEnd: -12, width: 110, height: 110, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <Building2 size={17} color="#fff" strokeWidth={1.9} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.28)' }}>{statusLabel}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>PROJECT</div>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {client && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}><MapPin size={9} color="#fff" strokeWidth={2.2} /> {client}</div>}
        </div>
        <div style={{ textAlign: 'end', flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>
            <TrendingUp size={10} color="#fff" strokeWidth={2.4} /> {t.project.profit}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 1px 8px rgba(0,0,0,0.28)', fontVariantNumeric: 'tabular-nums' }}>₪{profit}</div>
          {margin && <div style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{margin}%</div>}
        </div>
      </div>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 8, padding: '4px 5px', textAlign: 'center', backdropFilter: 'blur(2px)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.78)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// صف راتب — توقيع شاشة الدفعات: أفاتار دائري متدرّج + ترقيم PAY- + حبّة مبلغ
function LandingPayRow({ init, name, sub, amt, color, status, grad, width = 300 }) {
  return (
    <div dir="rtl" style={{ width, maxWidth: '84vw', background: C.card, borderRadius: 14, padding: '10px 12px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 10px 28px rgba(0,0,0,0.4)' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{init}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 1, whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'center', padding: '4px 9px', borderRadius: 9, background: `${color}20`, border: `1px solid ${color}44`, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{amt}</div>
        <div style={{ fontSize: 7.5, fontWeight: 800, color, opacity: 0.85 }}>{status}</div>
      </div>
    </div>
  )
}

// ورقة ملاحظة عامة (إيصال/מע"מ) — نمط شرائح الرؤى
function NoteCard({ Icon, color, title, sub, amt, width = 280 }) {
  return (
    <div dir="rtl" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', width, maxWidth: '80vw',
      background: `linear-gradient(135deg, ${color}16, ${C.card} 70%)`, borderRadius: 14,
      border: `1px solid ${color}55`, boxShadow: `0 12px 34px rgba(0,0,0,0.5), 0 0 18px ${color}1a`,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: `${color}1c`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} color={color} strokeWidth={2.3} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 9.5, color: C.textDim, marginTop: 1, whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{amt}</div>
    </div>
  )
}

// ─── من الفوضى للنظام — بمكوّنات التطبيق الحقيقية ────────────────────────────
// قسم مثبّت: تذاكر شِفت وكروت مشاريع وصفوف رواتب حقيقية الشكل طايرة بفوضى —
// ومع السكرول التلفون الحي يطلع وكلها تنشفط جوّاه + ختم «محفوظ. مرتّب. محسوب.».
const TICKET_GRAD_FULL = `linear-gradient(160deg, ${C.primary}, ${C.gold})`
const TICKET_GRAD_HALF = `linear-gradient(160deg, ${C.warning}, ${C.gold})`
// بطاقات الفوضى — مواضعها ثابتة، ونصوصها (أسماء/مشاريع/أنواع...) من قاموس اللغة.
function makeChaosCards(t) {
  const d = t.chaosData
  return [
    { sx: '-33vw', sy: '-26vh', rot: -14, dur: 5.2, render: () => (
      <LandingTicket day={8} month={d.monthJun} weekday={d.weekdayTue} name={d.worker1} project={t.phone.projVilla} type={d.typeFull}
        color={C.primary} grad={TICKET_GRAD_FULL} TypeIcon={Sun} chips={[d.hours8]} amount="450" status="approved" />
    ) },
    { sx: '32vw', sy: '-27vh', rot: 12, dur: 6.0, render: () => (
      <LandingTicket day={9} month={d.monthJun} weekday={d.weekdayWed} name={d.worker2} project={t.phone.projApt} type={d.typeHalf}
        color={C.warning} grad={TICKET_GRAD_HALF} TypeIcon={CloudSun} chips={[d.hours4]} amount="225" status="pending" />
    ) },
    { sx: '-36vw', sy: '7vh', rot: 10, dur: 4.8, render: () => (
      <LandingProjectCard name={t.phone.projVilla} client={d.client} profit="42,500" margin={28}
        stats={[{ label: t.project.revenue, value: '₪150K' }, { label: t.project.costs, value: '₪108K' }, { label: t.project.days, value: '64' }]} />
    ) },
    { sx: '35vw', sy: '9vh', rot: -12, dur: 5.6, render: () => (
      <LandingPayRow init={d.initAhmad} name={d.salaryAhmad} sub={d.salarySub} amt="₪3,800" color={C.secondary} status={d.paid} grad={GRAD.premium} />
    ) },
    { sx: '-25vw', sy: '31vh', rot: 17, dur: 5.0, hideM: true, render: () => (
      <NoteCard Icon={Receipt} color={C.cyan} title={d.vatRefund} sub={d.invoice} amt="₪357" />
    ) },
    { sx: '26vw', sy: '30vh', rot: -16, dur: 5.8, hideM: true, render: () => (
      <NoteCard Icon={Receipt} color={C.accent} title={d.materialsInvoice} sub={d.materialsSub} amt="₪2,340" />
    ) },
  ]
}

function ChaosCard({ c, i, p }) {
  const a = 0.26 + i * 0.055
  const b = a + 0.2
  const x = useTransform(p, [a, b], [c.sx, '0vw'])
  const y = useTransform(p, [a, b], [c.sy, '3vh'])
  const rotate = useTransform(p, [a, b], [c.rot, 0])
  const scale = useTransform(p, [a, b - 0.03, b], [1, 0.55, 0.12])
  const opacity = useTransform(p, [b - 0.02, b], [1, 0])
  return (
    <motion.div className={c.hideM ? 'lp-chaos-hide' : undefined}
      style={{ position: 'absolute', x, y, rotate, scale, opacity, zIndex: 6, pointerEvents: 'none' }}>
      <div className="float" style={{ animationDuration: `${c.dur}s`, animationDelay: `${(i % 5) * 0.6}s` }}>
        {c.render()}
      </div>
    </motion.div>
  )
}

function ChaosToOrder() {
  const t = useLang()
  const cards = makeChaosCards(t)
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.35 })
  const chaosLabelOp = useTransform(p, [0, 0.08, 0.5, 0.58], [1, 1, 1, 0])
  const headOp = useTransform(p, [0.02, 0.1], [0, 1])
  const phoneY = useTransform(p, [0.03, 0.24], ['76vh', '0vh'])
  const phoneRotX = useTransform(p, [0.03, 0.24], [16, 0])
  const doneOp = useTransform(p, [0.84, 0.91], [0, 1])
  const doneScale = useTransform(p, [0.84, 0.94], [1.7, 1])

  if (reduce) {
    return (
      <section id="features" style={{ padding: '72px 24px', direction: 'rtl' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10 }}>
            {t.chaos.titlePre} <span className="grad-text">{t.chaos.titleHi}</span>
          </h2>
          <p style={{ fontSize: 15, color: C.textDim, marginBottom: 28 }}>{t.chaos.sub}</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {cards.filter(c => !c.hideM).map((c, i) => <div key={i}>{c.render()}</div>)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} style={{ position: 'relative', height: '300vh', direction: 'rtl' }}>
      {/* مرساة «شاهد كيف يعمل» */}
      <div id="features" aria-hidden style={{ position: 'absolute', top: '28%' }} />
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'clip', background: C.bg }}>
        <div className="lp-grain" aria-hidden />
        {/* العنوان */}
        <div style={{ position: 'absolute', top: 'clamp(74px, 9.6vh, 100px)', left: 0, right: 0, textAlign: 'center', padding: '0 18px', zIndex: 7, pointerEvents: 'none' }}>
          <motion.div style={{ opacity: chaosLabelOp, fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 7 }}>
            {t.chaos.label}
          </motion.div>
          <motion.h2 style={{ opacity: headOp, fontSize: 'clamp(19px,3vw,30px)', fontWeight: 900, color: C.text, lineHeight: 1.25, textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            {t.chaos.titlePre} <span className="grad-text">{t.chaos.titleHi}</span>
          </motion.h2>
        </div>

        {/* المكوّنات الحقيقية الطايرة */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
          {cards.map((c, i) => <ChaosCard key={i} c={c} i={i} p={p} />)}
        </div>

        {/* التلفون الحي — اللاقط */}
        <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', y: phoneY, rotateX: phoneRotX, transformPerspective: 1100, zIndex: 4, pointerEvents: 'none' }}>
          <div aria-hidden style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 62%)' }} />
          <div style={{ position: 'relative', borderRadius: 42, overflow: 'hidden', marginTop: 30 }}>
            <PhoneMockup float={false} />
            <HolographicSheen duration={5} repeatDelay={2.2} opacity={0.2} />
          </div>
          {/* ختم النهاية */}
          <motion.div style={{
            opacity: doneOp, scale: doneScale, position: 'absolute', top: 'calc(50% - 326px)', zIndex: 8,
            display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.success}1c`, border: `1px solid ${C.success}55`,
            borderRadius: 100, padding: '7px 16px', fontSize: 13, fontWeight: 900, color: C.success,
            boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 24px ${C.success}33`, backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
          }}>
            <CheckCircle2 size={15} strokeWidth={2.6} />
            {t.chaos.done}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}


// ─── ورقة CP-01 — نماذج حية من شاشاتك ────────────────────────────────────────
// التذاكر والكروت بالحجم الكامل كما تبدو فعلاً بالتطبيق + التلفون الحي.
function AppShowcase() {
  const t = useLang()
  const d = t.chaosData
  const SHEET_BG = '#0A1226'   // أرضية ورقة المخطط — لحفر التثقيب بالتذاكر
  return (
    <section style={{ padding: '36px 24px 72px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Sheet no="CP-01" title={t.sheetTitles.samples}>
          <div style={{ padding: '54px 22px 36px' }}>
            <Depth tilt={16} lift={60}>
              <div style={{ textAlign: 'center', marginBottom: 42 }}>
                <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
                  {t.showcase.titlePre} <span className="grad-text">{t.showcase.titleHi}</span>
                </h2>
                <p style={{ fontSize: 16, color: C.textDim }}>{t.showcase.sub}</p>
              </div>
            </Depth>
            <div className="lp-cinema-grid" style={{ margin: '0 auto', alignItems: 'start' }}>
              {/* عمود التذاكر + الراتب */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <div style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, color: C.primary, letterSpacing: '0.1em' }}>{t.showcase.colDays}</div>
                <Flip3D delay={0} style={{ height: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <LandingTicket day={8} month={d.monthJun} weekday={d.weekdayTue} name={d.worker1} project={t.phone.projVilla} type={d.typeFull}
                    color={C.primary} grad={TICKET_GRAD_FULL} TypeIcon={Sun} chips={[d.hours8]} amount="450" status="approved" notch={SHEET_BG} width={440} />
                </Flip3D>
                <Flip3D delay={0.12} dir={-1} style={{ height: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <LandingTicket day={9} month={d.monthJun} weekday={d.weekdayWed} name={d.worker2} project={t.phone.projApt} type={d.typeHalf}
                    color={C.warning} grad={TICKET_GRAD_HALF} TypeIcon={CloudSun} chips={[d.hours4]} amount="225" status="pending" notch={SHEET_BG} width={440} />
                </Flip3D>
                <div style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, color: C.secondary, letterSpacing: '0.1em', marginTop: 8 }}>{t.showcase.colPay}</div>
                <Flip3D delay={0.2} style={{ height: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <LandingPayRow init={d.initAhmad} name={d.salaryAhmad} sub={d.salarySub} amt="₪3,800" color={C.secondary} status={d.paid} grad={GRAD.premium} width={440} />
                </Flip3D>
              </div>
              {/* عمود كرت المشروع + قصّة الميزات */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <div style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, color: C.success, letterSpacing: '0.1em' }}>{t.showcase.colProjects}</div>
                <Flip3D delay={0.1} dir={-1} style={{ height: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <LandingProjectCard name={t.phone.projVilla} client={d.client} profit="42,500" margin={28} width={400}
                    stats={[{ label: t.project.revenue, value: '₪150K' }, { label: t.project.costs, value: '₪108K' }, { label: t.project.days, value: '64' }]} />
                </Flip3D>
                <div style={{ width: '100%', maxWidth: 440, marginTop: 6 }}>
                  {STORY_META.map((m, i) => (
                    <Flip3D key={i} delay={0.2 + i * 0.1} dir={i % 2 ? -1 : 1} style={{ height: 'auto' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                        <IconChip icon={m.Icon} color={m.color} size={36} radius={11} iconSize={17} strokeWidth={2.2} />
                        <div>
                          <div style={{ fontSize: 14.5, fontWeight: 900, color: C.text, marginBottom: 4 }}>{t.story[i].title}</div>
                          <p style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.65 }}>{t.story[i].desc}</p>
                        </div>
                      </div>
                    </Flip3D>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Sheet>
      </div>
    </section>
  )
}



// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS_META = [
  { icon: Users,      color: C.primary   },
  { icon: Receipt,    color: C.cyan      },
  { icon: Shield,     color: C.secondary },
  { icon: TrendingUp, color: C.gold      },
]
function StatsStrip() {
  const t = useLang()
  return (
    <div style={{ padding: '64px 24px 72px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STATS_META.map((s, i) => (
          <Flip3D key={i} delay={i * 0.08} dir={i % 2 ? -1 : 1}>
            <PremiumCard color={s.color} animate={false} padding="20px" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <IconChip icon={s.icon} color={s.color} size={44} radius={13} iconSize={20} strokeWidth={2} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{t.stats[i].value}</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{t.stats[i].label}</div>
                </div>
              </div>
            </PremiumCard>
          </Flip3D>
        ))}
      </div>
    </div>
  )
}

// ─── Pain Points ──────────────────────────────────────────────────────────────
const PAIN_POINTS_META = [
  { Icon: CalendarDays, color: C.primary   },
  { Icon: Wallet,       color: C.secondary },
  { Icon: BarChart3,    color: C.gold      },
]
function PainPoints() {
  const t = useLang()
  return (
    <section style={{ padding: '64px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              {t.painHead.title}
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>{t.painHead.sub}</p>
          </div>
        </Depth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PAIN_POINTS_META.map((p, i) => (
            <Flip3D key={i} delay={i * 0.1} dir={i === 1 ? -1 : 1}>
              <PremiumCard color={p.color} animate={false} radius={22} padding="28px" style={{ height: '100%' }}>
                <IconChip icon={p.Icon} color={p.color} size={52} radius={16} iconSize={24} strokeWidth={1.8} style={{ marginBottom: 20 }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12, lineHeight: 1.4 }}>
                  {t.pains[i].problem}
                </h3>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75 }}>
                  {t.pains[i].solution}
                </p>
              </PremiumCard>
            </Flip3D>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── المخطط الهندسي الحي — الميزات كورقة Blueprint ───────────────────────────
// ورقة مخطط معماري بشبكة سماوية: واجهة مبنى ترسم حالها خط-خط (SVG pathLength)
// مع خطوط أبعاد، وكل ميزة callout موصول بالرسمة — وجدول عنوان مثل المخططات
// الحقيقية. useReducedMotion → كل الخطوط مرسومة من البداية.
const FEATURES_META = [
  { Icon: CalendarDays, color: C.primary   },
  { Icon: Users,        color: C.secondary },
  { Icon: Receipt,      color: C.cyan      },
  { Icon: BarChart3,    color: C.gold      },
  { Icon: Shield,       color: C.success   },
  { Icon: Bell,         color: C.accent    },
]
// واجهة المبنى: 4 طوابق + باب + رافعة جانبية — مسارات منفصلة حتى تترسم تباعاً
const BP_PATHS = [
  'M40 330 L40 110 L150 70 L260 110 L260 330 Z',                              // الهيكل
  'M40 165 L260 165 M40 220 L260 220 M40 275 L260 275',                       // بلاطات الطوابق
  'M70 132 h34 v20 h-34 Z M130 122 h40 v26 h-40 Z M196 132 h34 v20 h-34 Z',   // شبابيك ع
  'M70 185 h34 v22 h-34 Z M130 185 h40 v22 h-40 Z M196 185 h34 v22 h-34 Z',   // شبابيك 2
  'M70 240 h34 v22 h-34 Z M196 240 h34 v22 h-34 Z',                           // شبابيك 1
  'M128 330 v-44 h44 v44',                                                    // الباب
  'M288 330 L288 86 L288 86 L228 64 M288 96 L316 88',                         // الرافعة
]
function BlueprintFeatures() {
  const t = useLang()
  const reduce = useReducedMotion()
  const draw = (i) => reduce ? {} : {
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: 1.1, delay: 0.15 + i * 0.28, ease: 'easeInOut' },
  }
  return (
    <section style={{ padding: '72px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Depth tilt={14} lift={50}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: C.cyan, fontWeight: 800, letterSpacing: '0.14em', marginBottom: 8 }}>{t.blueprint.label}</div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10 }}>
              {t.blueprint.titlePre} <span style={{ color: C.cyan }}>{t.blueprint.titleHi}</span>
            </h2>
            <p style={{ fontSize: 15, color: C.textDim }}>{t.blueprint.sub}</p>
          </div>
        </Depth>

        {/* ورقة المخطط */}
        <div className="lp-blueprint" style={{
          position: 'relative', borderRadius: 18, overflow: 'hidden',
          border: `1.5px solid ${C.cyan}3a`,
          background: `
            linear-gradient(${C.cyan}10 1px, transparent 1px),
            linear-gradient(90deg, ${C.cyan}10 1px, transparent 1px),
            linear-gradient(${C.cyan}07 1px, transparent 1px),
            linear-gradient(90deg, ${C.cyan}07 1px, transparent 1px),
            linear-gradient(165deg, #0A1226, #0A0F22 70%)`,
          backgroundSize: '88px 88px, 88px 88px, 22px 22px, 22px 22px, 100% 100%',
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), inset 0 0 80px ${C.cyan}08`,
        }}>
          {/* علامات الزوايا */}
          {[{ top: 10, insetInlineStart: 10 }, { top: 10, insetInlineEnd: 10 }, { bottom: 10, insetInlineStart: 10 }, { bottom: 10, insetInlineEnd: 10 }].map((pos, i) => (
            <div key={i} aria-hidden style={{ position: 'absolute', width: 18, height: 18, ...pos, borderTop: i < 2 ? `2px solid ${C.cyan}66` : 'none', borderBottom: i >= 2 ? `2px solid ${C.cyan}66` : 'none', borderInlineStart: i % 2 === 0 ? `2px solid ${C.cyan}66` : 'none', borderInlineEnd: i % 2 === 1 ? `2px solid ${C.cyan}66` : 'none' }} />
          ))}

          <div className="lp-bp-grid">
            {/* الرسمة */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px' }}>
              <svg viewBox="0 0 340 360" style={{ width: 'min(360px, 88vw)', overflow: 'visible' }} aria-hidden>
                {/* خط الأرض */}
                <motion.path d="M10 330 L330 330" stroke={`${C.cyan}AA`} strokeWidth="2" fill="none" {...draw(0)} />
                {BP_PATHS.map((d, i) => (
                  <motion.path key={i} d={d} stroke={C.cyan} strokeWidth="1.6" fill="none"
                    strokeLinecap="round" strokeLinejoin="round" {...draw(i + 1)} />
                ))}
                {/* خط الأبعاد العلوي */}
                <motion.g {...(reduce ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { delay: 2.4, duration: 0.6 } })}>
                  <path d="M40 46 L260 46 M40 40 L40 52 M260 40 L260 52" stroke={`${C.gold}99`} strokeWidth="1.2" fill="none" />
                  <text x="150" y="38" textAnchor="middle" fill={C.gold} fontSize="11" fontWeight="700" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.blueprint.dim}</text>
                  <path d="M306 110 L306 330 M300 110 L312 110 M300 330 L312 330" stroke={`${C.gold}99`} strokeWidth="1.2" fill="none" />
                </motion.g>
              </svg>
            </div>

            {/* الـcallouts — كل ميزة بخط واصل يكبر */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '28px 22px' }}>
              {FEATURES_META.map(({ Icon, color }, i) => (
                <motion.div key={i}
                  {...(reduce ? {} : {
                    initial: { opacity: 0, x: -28 },
                    whileInView: { opacity: 1, x: 0 },
                    viewport: { once: true, amount: 0.5 },
                    transition: { duration: 0.55, delay: 0.3 + i * 0.14, ease: [0.22, 1, 0.36, 1] },
                  })}
                  style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {/* الخط الواصل */}
                  <motion.div aria-hidden
                    {...(reduce ? {} : {
                      initial: { scaleX: 0 },
                      whileInView: { scaleX: 1 },
                      viewport: { once: true, amount: 0.5 },
                      transition: { duration: 0.45, delay: 0.42 + i * 0.14, ease: 'easeOut' },
                    })}
                    style={{ width: 26, height: 1.5, background: `${color}88`, transformOrigin: 'right center', flexShrink: 0 }} />
                  <div aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0, marginInlineEnd: 10 }} />
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 11, flex: 1, padding: '11px 14px',
                    background: `linear-gradient(135deg, ${color}12, ${C.card} 75%)`,
                    border: `1px solid ${color}30`, borderRadius: 13,
                  }}>
                    <IconChip icon={Icon} color={color} size={32} radius={10} iconSize={15} strokeWidth={2.2} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{t.features[i]}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* جدول العنوان (Title Block) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${C.cyan}33` }}>
            {t.blueprint.titleBlock.map(([k, v], i) => (
              <div key={i} style={{ flex: '1 1 140px', padding: '10px 16px', borderInlineStart: i ? `1px solid ${C.cyan}22` : 'none' }}>
                <div style={{ fontSize: 9, color: `${C.cyan}AA`, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 800 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Why contractors ──────────────────────────────────────────────────────────
// بطاقات قيمة صادقة (بلا شهادات أو أسماء مُختلَقة).
const VALUE_CARDS_META = [
  { icon: Receipt,      color: C.primary   },
  { icon: CalendarDays, color: C.secondary },
  { icon: BarChart3,    color: C.gold      },
]
function Testimonials() {
  const t = useLang()
  return (
    <section style={{ padding: '64px 24px', direction: 'rtl', background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              {t.valuesHead.title}
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>{t.valuesHead.sub}</p>
          </div>
        </Depth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {VALUE_CARDS_META.map((c, i) => (
            <Flip3D key={i} delay={i * 0.1} dir={i === 1 ? -1 : 1}>
              <PremiumCard color={c.color} animate={false} radius={22} padding="28px" style={{ height: '100%' }}>
                <IconChip icon={c.icon} color={c.color} size={48} radius={14} iconSize={24} strokeWidth={2} style={{ marginBottom: 18 }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>{t.values[i].title}</div>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>{t.values[i].text}</p>
              </PremiumCard>
            </Flip3D>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing teaser ───────────────────────────────────────────────────────────
const PLANS = [
  { name: 'Starter',  price: 129, color: C.primary,   highlight: false },
  { name: 'Pro',      price: 249, color: C.secondary, highlight: true  },
  { name: 'Business', price: 499, color: C.gold,      highlight: false },
]
function PricingTeaser() {
  const t = useLang()
  const [cycle, setCycle] = useState('month')   // 'month' | 'year'
  const isYear = cycle === 'year'
  return (
    <section style={{ padding: '36px 24px 72px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Sheet no="CP-03" title={t.sheetTitles.pricing}>
        <div style={{ padding: '52px 22px 36px' }}>
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              {t.pricing.title}
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>{t.pricing.sub}</p>
          </div>

          {/* مبدّل دورة الفوترة */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 4, gap: 4 }}>
              {[{ key: 'month', label: t.pricing.monthly }, { key: 'year', label: t.pricing.yearly }].map(opt => {
                const active = cycle === opt.key
                return (
                  <button key={opt.key} onClick={() => setCycle(opt.key)} className="lp-btn"
                    style={{ position: 'relative', background: active ? GRAD.brand : 'transparent', border: 'none', color: active ? '#fff' : C.textDim, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: '8px 22px', borderRadius: 11 }}>
                    {opt.label}
                    {opt.key === 'year' && (
                      <span style={{ marginInlineStart: 6, fontSize: 9, fontWeight: 800, color: active ? '#fff' : C.success }}>{t.pricing.save2}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </Depth>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, maxWidth: 820, margin: '0 auto' }}>
          {PLANS.map((plan, i) => {
            const annual     = plan.price * 10            // خصم شهرين
            const effMonthly = Math.round(annual / 12)
            return (
              <Flip3D key={i} delay={i * 0.1} dir={i === 1 ? -1 : 1}>
                <PremiumCard color={plan.color} animate={false} radius={22} padding="28px 24px"
                  style={{
                    height: '100%',
                    transform: plan.highlight ? 'scale(1.03)' : 'none',
                    boxShadow: plan.highlight ? `0 8px 40px ${plan.color}20` : 'none',
                  }}>
                  {plan.highlight && (
                    <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, background: GRAD.premium, borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                      {t.pricing.popular}
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: plan.color, marginBottom: 8, marginTop: plan.highlight ? 18 : 0 }}>{plan.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    ₪{isYear ? effMonthly : plan.price}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: isYear ? 6 : 20 }}>{t.pricing.perMonth}</div>
                  {isYear && (
                    <div style={{ fontSize: 11, color: C.success, fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>
                      {t.pricing.annualNote.replace('{annual}', annual).replace('{save}', plan.price * 2)}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: C.textDim, marginBottom: 24, lineHeight: 1.5 }}>{t.plansDesc[i]}</div>
                  <button onClick={() => goCta('landing_pricing_card', '/register')} className="lp-btn"
                    style={{ width: '100%', background: plan.highlight ? `linear-gradient(135deg, ${plan.color}, ${plan.color}CC)` : `${plan.color}15`, border: `1px solid ${plan.color}30`, color: plan.highlight ? '#fff' : plan.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '10px', borderRadius: 12 }}>
                    {t.pricing.startFree}
                  </button>
                </PremiumCard>
              </Flip3D>
            )
          })}
        </div>
        </div>
        </Sheet>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const t = useLang()
  return (
    <section style={{ padding: '80px 24px', textAlign: 'center', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <Depth tilt={20} lift={90} from={0.88}>
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 16px 56px rgba(249,115,22,0.45)' }}>
            <HardHat size={36} color="#fff" strokeWidth={2} />
          </div>
          <h2 style={{ fontSize: 'clamp(24px,5vw,44px)', fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 18 }}>
            {t.finalCta.title}
          </h2>
          <p style={{ fontSize: 17, color: C.textDim, lineHeight: 1.7, marginBottom: 40 }}>
            {t.finalCta.sub1}<br />{t.finalCta.sub2}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnetic>
              <button onClick={() => goCta('landing_final_cta', '/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 44px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.finalCta.start}
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            </Magnetic>
            <button onClick={() => goCta('landing_final_pricing', '/pricing')} className="lp-btn"
              style={{ background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '16px 30px', borderRadius: 16 }}>
              {t.finalCta.seePricing}
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: C.textDim }}>
            {t.finalCta.plansLine}
          </p>
        </div>
      </Depth>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
const FOOTER_PATHS = ['/blog', '/privacy', '/terms', '/refund', '/contact']
function Footer() {
  const t = useLang()
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '32px 24px', direction: 'rtl' }}>
      <motion.div {...rise()} style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.brand}</span>
          <span style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {FOOTER_PATHS.map((path, i) => (
            <span key={path} onClick={() => navigate(path)}
              style={{ fontSize: 12, color: C.textDim, cursor: 'pointer' }}>{t.footerLinks[i]}</span>
          ))}
        </div>
      </motion.div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  // عنوان/وصف الصفحة حسب اللغة الحالية (عبري عند ?lang=he) — يحدّث <title> وقت التشغيل
  useRouteSeo('/')
  const [loggedIn, setLoggedIn] = useState(false)
  const reduce = useReducedMotion()
  // شاشة الإقلاع — مرة واحدة بالجلسة، وتُتخطّى مع تقليل الحركة
  const [boot, setBoot] = useState(() => {
    try { return !sessionStorage.getItem('cp_lp_boot') } catch { return true }
  })
  const endBoot = () => {
    setBoot(false)
    try { sessionStorage.setItem('cp_lp_boot', '1') } catch { /* تخزين غير متاح */ }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true)
    })
  }, [])

  return (
    <>
      <style>{css}</style>
      <AnimatePresence>
        {boot && !reduce && <BootIntro onDone={endBoot} />}
      </AnimatePresence>
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
        <ScrollProgress />
        <Navbar loggedIn={loggedIn} />
        <BlueprintHero />
        <StatsStrip />
        <ChaosToOrder />
        <AppShowcase />
        <BlueprintFeatures />
        <PainPoints />
        <Testimonials />
        <PricingTeaser />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
