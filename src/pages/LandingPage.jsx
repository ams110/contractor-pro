import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import {
  HardHat, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot
} from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip, HolographicSheen, useCountUp } from '../ui/Premium.jsx'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

// نستعمل نفس توكنات الهوية (C/GRAD) ومكوّنات kit الفخامة (PremiumCard/IconChip)
// المستعملة في التطبيق — لا توكنات محليّة ولا بطاقات معاد بناؤها (CLAUDE.md §2.1/§19).
//
// بنية الصفحة — 3 أفكار بصرية تشتغل كقصة واحدة:
// 1) Hero «المدينة الحيّة»: ديوراما WebGL (Three.js) — مدينة إيزومترية عائمة
//    تدور وتتنفّس جنب نص الهيرو، بلا تثبيت سكرول. lazy + فولباك بلا Canvas.
// 2) «من الفوضى للنظام»: أوراق المقاول اليومية طايرة بفوضى تترتّب بلوحة
//    واحدة مع السكرول (Framer Motion، قسم مثبّت قصير).
// 3) «المخطط الهندسي الحي»: الميزات كورقة blueprint ترسم حالها (SVG pathLength).
// والباقي فخامة حركية نظيفة بنفس kit التطبيق.
const HeroScene = lazy(() => import('./landing3d/HeroScene.jsx'))

// فحص توفّر WebGL مرة واحدة (متصفّحات قديمة/سياقات محظورة → فولباك ثابت)
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}

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
  /* شبكة الهيرو: نص + ديوراما المدينة (عمود واحد على الموبايل) */
  .lp-hero-grid {
    display: grid; grid-template-columns: 1.02fr 1fr; align-items: center;
    max-width: 1180px; margin: 0 auto; gap: 16px;
    min-height: calc(100vh - 64px); padding: 28px 24px 40px;
  }
  .lp-hero-canvas { height: clamp(440px, 72vh, 640px); }
  @media (max-width: 900px) {
    .lp-hero-grid { grid-template-columns: 1fr; gap: 4px; padding: 28px 20px 16px; min-height: 0; }
    .lp-hero-canvas { height: min(52vh, 460px); }
  }
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
        <div style={{ fontSize: 19, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>Contractor Pro</div>
        <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 3, letterSpacing: '0.08em' }}>إدارة مقاولات</div>
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

function PhoneMockup() {
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
    { label: 'صافي الربح', value: `₪${k1}K`, color: C.success },
    { label: 'نقد بالجيب', value: `₪${k2}K`, color: C.cyan    },
    { label: 'مستحق',      value: `₪${k3}K`, color: C.gold    },
  ]
  const mockProjects = [
    { name: 'فيلا رهط',    amount: '₪42,500', pct: 68,  active: true  },
    { name: 'شقة الناصرة', amount: '₪18,000', pct: 100, active: false },
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
      <MiniNav active={0} />
      </div>
    </div>
  )
}

// ─── Hero — «المدينة الحيّة» ─────────────────────────────────────────────────
// هيرو بلا تثبيت سكرول: نص واضح على طرف، وديوراما WebGL (مدينة إيزومترية
// عائمة تدور وتتنفّس) على الطرف الآخر، مع شرائح KPI طايرة حولها.
// useReducedMotion أو غياب WebGL → عمود النص يتوسّط بلا Canvas.
const STORY = [
  {
    Icon: CalendarDays, color: C.primary,
    title: 'سجّل أيام الشغل بلمسة',
    desc:  'كل يوم عمل لكل عامل — موافقة أو رفض فوري. بلا دفاتر، بلا واتساب ضايع، بلا نسيان.',
  },
  {
    Icon: Wallet, color: C.secondary,
    title: 'الرواتب والسلف محسوبة لحالها',
    desc:  'ساعات إضافية، سلف، خصومات — الحساب جاهز قبل ما تسأل، وكشف حساب لكل عامل.',
  },
  {
    Icon: TrendingUp, color: C.success,
    title: 'أرباحك قدامك لحظة بلحظة',
    desc:  'صافي الربح، نقد الجيب، وضريبة القيمة المضافة — كل شي محتاجه بلوحة واحدة.',
  },
]

const HEADLINE_WORDS = ['كل', 'يوم', 'شغل،', 'كل', 'دفعة،', '\n', 'كل', 'مصروف', '—']

function Hero() {
  const reduce = useReducedMotion()
  const [webgl] = useState(hasWebGL)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900
  const mouseRef = useRef({ x: 0, y: 0 })
  const show3d = !reduce && webgl
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mouseRef.current.x = (e.clientX - r.left) / r.width - 0.5
    mouseRef.current.y = (e.clientY - r.top) / r.height - 0.5
  }
  const onLeave = () => { mouseRef.current.x = 0; mouseRef.current.y = 0 }

  // انكشاف العنوان كلمة-كلمة
  let wi = 0
  const word = (w, k) => {
    if (w === '\n') return <br key={k} />
    const d = 0.1 + (wi++) * 0.07
    if (reduce) return <span key={k} style={{ display: 'inline-block', marginInlineEnd: '0.26em' }}>{w}</span>
    return (
      <motion.span key={k}
        initial={{ opacity: 0, rotateX: -88, y: 22 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-block', transformOrigin: 'bottom center', marginInlineEnd: '0.26em' }}>
        {w}
      </motion.span>
    )
  }
  const gradDelay = 0.1 + HEADLINE_WORDS.filter(w => w !== '\n').length * 0.07 + 0.12
  const enter = (delay) => reduce ? {} : {
    initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <section onPointerMove={onMove} onPointerLeave={onLeave}
      style={{ position: 'relative', overflow: 'hidden', direction: 'rtl' }}>
      {/* توهّجات خلفية بهوية amber/بنفسجي */}
      <div aria-hidden className="glow-orb" style={{ position: 'absolute', top: '-18%', insetInlineStart: '-8%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.13) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div aria-hidden className="glow-orb" style={{ position: 'absolute', bottom: '-22%', insetInlineEnd: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.11) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '1.4s' }} />

      <div className="lp-hero-grid" style={{ position: 'relative' }}>
        {/* عمود النص */}
        <div style={{ textAlign: 'start', maxWidth: 560, justifySelf: show3d ? 'start' : 'center', ...(show3d ? {} : { textAlign: 'center' }) }}>
          <motion.div {...enter(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.primary}1a`, border: `1px solid ${C.primary}40`, borderRadius: 100, padding: '6px 16px', marginBottom: 'clamp(16px, 3vh, 28px)', fontSize: 12, color: C.primary, fontWeight: 700 }}>
            <CircleDot size={10} strokeWidth={3} />
            التطبيق الأول للمقاول العربي في إسرائيل
          </motion.div>

          <h1 style={{ fontSize: 'clamp(30px,4.6vw,52px)', fontWeight: 900, color: C.text, lineHeight: 1.18, marginBottom: 18, letterSpacing: '-0.02em', perspective: 900 }}>
            {HEADLINE_WORDS.map(word)}
            <br />
            <motion.span className="grad-text"
              initial={reduce ? false : { opacity: 0, rotateX: -88, y: 26, scale: 0.92 }}
              animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: gradDelay, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'inline-block', transformOrigin: 'bottom center' }}>
              محفوظ. مش في دماغك.
            </motion.span>
          </h1>

          <motion.p {...enter(gradDelay + 0.15)}
            style={{ fontSize: 'clamp(14px,1.6vw,17px)', color: C.textDim, lineHeight: 1.75, marginBottom: 'clamp(20px, 3.4vh, 32px)', maxWidth: 520 }}>
            Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
          </motion.p>

          <motion.div {...enter(gradDelay + 0.24)}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: show3d ? 'flex-start' : 'center' }}>
            <Magnetic>
              <button onClick={() => navigate('/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', padding: '15px 36px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                جرّب مجاناً 14 يوم
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            </Magnetic>
            <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '15px 26px', borderRadius: 16 }}>
              شاهد كيف يعمل
            </button>
          </motion.div>

          <motion.div {...enter(gradDelay + 0.38)}
            style={{ marginTop: 'clamp(16px, 3vh, 28px)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: show3d ? 'flex-start' : 'center' }}>
            {[
              { icon: Shield,       label: 'آمن ومشفّر' },
              { icon: Smartphone,   label: 'يعمل بدون إنترنت' },
              { icon: CheckCircle2, label: 'بدون بطاقة ائتمان' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon size={15} color={C.primary} strokeWidth={2.2} />
                <span style={{ fontSize: 13, color: C.textDim }}>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* عمود الديوراما */}
        {show3d && (
          <motion.div className="lp-hero-canvas"
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative' }}>
            <Suspense fallback={null}>
              <HeroScene mouse={mouseRef} low={isMobile} />
            </Suspense>
            {/* شرائح KPI طايرة حول المدينة */}
            <FloatChip icon={CheckCircle2} color={C.success} text="يوم عمل — تمت الموافقة"
              style={{ top: '14%', insetInlineStart: '2%' }} dur={3.4} />
            <FloatChip icon={Wallet} color={C.cyan} text="₪4,250 راتب مدفوع"
              style={{ top: '38%', insetInlineEnd: '0%' }} dur={4.1} delay={0.7} />
            <FloatChip icon={TrendingUp} color={C.gold} text="+18% صافي الربح"
              style={{ bottom: '12%', insetInlineStart: '8%' }} dur={3.8} delay={1.3} />
          </motion.div>
        )}
      </div>
    </section>
  )
}

// ─── من الفوضى للنظام ─────────────────────────────────────────────────────────
// قسم مثبّت: أوراق المقاول اليومية (يوم عمل/فاتورة/سلفة/راتب/מע"מ) طايرة
// بفوضى حوالين الشاشة — ومع السكرول كل ورقة تطير لمكانها بلوحة واحدة منظّمة.
const CHAOS_NOTES = [
  { Icon: CalendarDays, color: C.primary,   title: 'يوم عمل — محمد',   sub: 'الثلاثاء · ورشة رهط',  amt: '₪450',     sx: '-36vw', sy: '-26vh', rot: -22 },
  { Icon: Receipt,      color: C.accent,    title: 'فاتورة مواد',      sub: 'حديد + إسمنت',          amt: '₪2,340',  sx: '34vw',  sy: '-30vh', rot: 18  },
  { Icon: Wallet,       color: C.gold,      title: 'سلفة — خالد',      sub: 'نقدي · بلا إيصال',      amt: '₪600',     sx: '-40vw', sy: '8vh',   rot: 14  },
  { Icon: Users,        color: C.secondary, title: 'راتب أحمد',        sub: 'نيسان · 22 يوم',        amt: '₪3,800',  sx: '38vw',  sy: '4vh',   rot: -16 },
  { Icon: Receipt,      color: C.cyan,      title: 'מע"מ للاسترداد',   sub: 'فاتورة INV-1042',       amt: '₪357',    sx: '-30vw', sy: '30vh',  rot: 24  },
  { Icon: BarChart3,    color: C.success,   title: 'دفعة من عميل',     sub: 'فيلا الناصرة',          amt: '₪15,000', sx: '32vw',  sy: '28vh',  rot: -20 },
]
function ChaosNote({ n, i, p, reduce }) {
  const total = CHAOS_NOTES.length
  // نافذة طيران كل ورقة (stagger)
  const a = 0.08 + i * 0.07
  const b = Math.min(0.78, a + 0.34)
  const slotY = (i - (total - 1) / 2) * 58
  const x = useTransform(p, [a, b], [n.sx, '0vw'])
  const y = useTransform(p, [a, b], [n.sy, `${slotY}px`])
  const rotate = useTransform(p, [a, b], [n.rot, 0])
  const ordered = useTransform(p, [b - 0.02, b], [0, 1])
  const border = useTransform(ordered, (v) => v > 0.5 ? `1px solid ${n.color}40` : `1px solid ${n.color}66`)
  if (reduce) {
    return (
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <NoteCard n={n} />
      </div>
    )
  }
  return (
    <motion.div style={{ position: 'absolute', x, y, rotate, zIndex: 3 }}>
      <motion.div style={{ border, borderRadius: 14 }}>
        <NoteCard n={n} />
      </motion.div>
    </motion.div>
  )
}
function NoteCard({ n }) {
  const { Icon } = n
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: 'min(330px, 78vw)',
      background: `linear-gradient(135deg, ${n.color}16, ${C.card} 70%)`, borderRadius: 14,
      boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 20px ${n.color}1a`, direction: 'rtl',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${n.color}1c`, border: `1px solid ${n.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={n.color} strokeWidth={2.3} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{n.title}</div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, whiteSpace: 'nowrap' }}>{n.sub}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: n.color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{n.amt}</div>
    </div>
  )
}
function ChaosToOrder() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.35 })
  // الإطار المنظّم يظهر لما توصل أول الأوراق
  const panelOp = useTransform(p, [0.08, 0.2], [0, 1])
  const panelScale = useTransform(p, [0.08, 0.25], [0.94, 1])
  const chaosLabelOp = useTransform(p, [0, 0.1, 0.2], [1, 1, 0])
  const doneOp = useTransform(p, [0.8, 0.9], [0, 1])
  const doneScale = useTransform(p, [0.8, 0.92], [1.6, 1])

  if (reduce) {
    return (
      <section id="features" style={{ padding: '72px 24px', direction: 'rtl' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10 }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
          <p style={{ fontSize: 15, color: C.textDim, marginBottom: 28 }}>أوراق اليوم كلها — مرتّبة لحالها.</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {CHAOS_NOTES.map((n, i) => <ChaosNote key={i} n={n} i={i} reduce />)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} style={{ position: 'relative', height: '300vh', direction: 'rtl' }}>
      <div id="features" aria-hidden style={{ position: 'absolute', top: '22%' }} />
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* العنوان */}
        <div style={{ position: 'absolute', top: 'clamp(74px, 10vh, 110px)', left: 0, right: 0, textAlign: 'center', padding: '0 18px', zIndex: 5 }}>
          <motion.div style={{ opacity: chaosLabelOp, fontSize: 11, color: C.accent, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 7 }}>
            هيك شكل يومك بدون نظام
          </motion.div>
          <h2 style={{ fontSize: 'clamp(20px,3.2vw,32px)', fontWeight: 900, color: C.text, lineHeight: 1.25 }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
        </div>

        {/* الإطار المنظّم اللي بتهبط فيه الأوراق */}
        <motion.div style={{
          opacity: panelOp, scale: panelScale,
          width: 'min(400px, 86vw)', height: CHAOS_NOTES.length * 58 + 56,
          borderRadius: 24, border: `1px solid ${C.borderMid}`,
          background: `linear-gradient(160deg, ${C.primary}0e, ${C.surface} 70%)`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)', position: 'relative',
        }}>
          <motion.div style={{
            opacity: doneOp, scale: doneScale, position: 'absolute', top: -16, insetInlineEnd: -10, zIndex: 6,
            display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.success}1c`, border: `1px solid ${C.success}55`,
            borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 900, color: C.success,
            boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 24px ${C.success}33`, backdropFilter: 'blur(6px)',
          }}>
            <CheckCircle2 size={14} strokeWidth={2.6} />
            محفوظ. مرتّب. محسوب.
          </motion.div>
        </motion.div>

        {/* الأوراق الطايرة */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {CHAOS_NOTES.map((n, i) => <ChaosNote key={i} n={n} i={i} p={p} />)}
        </div>
      </div>
    </section>
  )
}


// ─── App Showcase — جوّا التطبيق ──────────────────────────────────────────────
// التلفون الحي (لوحة التحكم الحقيقية) مع قصّة الميزات — يعرض المنتج الفعلي
// بعد ما المشهد الثلاثي باع الإحساس.
function AppShowcase() {
  return (
    <section id="app-showcase" style={{ padding: '72px 24px', direction: 'rtl', background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              جوّا التطبيق — <span className="grad-text">لوحة تحكم حيّة</span>
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>نفس الشاشات اللي رح تشتغل عليها كل يوم.</p>
          </div>
        </Depth>
        <div className="lp-cinema-grid" style={{ margin: '0 auto' }}>
          <div>
            {STORY.map((s, i) => (
              <Flip3D key={i} delay={i * 0.1} dir={i % 2 ? -1 : 1} style={{ height: 'auto' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
                  <IconChip icon={s.Icon} color={s.color} size={40} radius={12} iconSize={19} strokeWidth={2.2} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 5 }}>{s.title}</div>
                    <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                </div>
              </Flip3D>
            ))}
          </div>
          <Depth tilt={18} lift={80} from={0.9} style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 42, overflow: 'hidden' }}>
              <PhoneMockup />
              <HolographicSheen duration={5} repeatDelay={2.2} opacity={0.22} />
            </div>
          </Depth>
        </div>
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
    <div style={{ padding: '64px 24px 72px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {STATS.map((s, i) => (
          <Flip3D key={i} delay={i * 0.08} dir={i % 2 ? -1 : 1}>
            <PremiumCard color={s.color} animate={false} padding="20px" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <IconChip icon={s.icon} color={s.color} size={44} radius={13} iconSize={20} strokeWidth={2} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{s.label}</div>
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
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              شايف نفسك هنا؟
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>هذه المشاكل اليومية لها حل واحد.</p>
          </div>
        </Depth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PAIN_POINTS.map((p, i) => (
            <Flip3D key={i} delay={i * 0.1} dir={i === 1 ? -1 : 1}>
              <PremiumCard color={p.color} animate={false} radius={22} padding="28px" style={{ height: '100%' }}>
                <IconChip icon={p.Icon} color={p.color} size={52} radius={16} iconSize={24} strokeWidth={1.8} style={{ marginBottom: 20 }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.accent, marginBottom: 12, lineHeight: 1.4 }}>
                  {p.problem}
                </h3>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75 }}>
                  {p.solution}
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
const FEATURES = [
  { Icon: CalendarDays, text: 'تسجيل أيام العمل بالموافقة والرفض',          color: C.primary   },
  { Icon: Users,        text: 'متابعة الرواتب والسلف لكل عامل',              color: C.secondary },
  { Icon: Receipt,      text: 'تتبع المصاريف واسترداد ضريبة القيمة المضافة', color: C.cyan      },
  { Icon: BarChart3,    text: 'تقارير PDF وExcel بلمسة',                      color: C.gold      },
  { Icon: Shield,       text: 'فريق عمل مع صلاحيات مخصصة',                   color: C.success   },
  { Icon: Bell,         text: 'إشعارات فورية لكل طلب وتغيير',                 color: C.accent    },
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
            <div style={{ fontSize: 11, color: C.cyan, fontWeight: 800, letterSpacing: '0.14em', marginBottom: 8 }}>BLUEPRINT — مخطط رقم CP-01</div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 10 }}>
              مخطط <span style={{ color: C.cyan }}>مصلحتك الجديدة</span>
            </h2>
            <p style={{ fontSize: 15, color: C.textDim }}>كل ميزة مرسومة بمكانها — مثل ما بترسم مشاريعك.</p>
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
                  <text x="150" y="38" textAnchor="middle" fill={C.gold} fontSize="11" fontWeight="700" style={{ fontVariantNumeric: 'tabular-nums' }}>22.00 م</text>
                  <path d="M306 110 L306 330 M300 110 L312 110 M300 330 L312 330" stroke={`${C.gold}99`} strokeWidth="1.2" fill="none" />
                </motion.g>
              </svg>
            </div>

            {/* الـcallouts — كل ميزة بخط واصل يكبر */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: '28px 22px' }}>
              {FEATURES.map(({ Icon, text, color }, i) => (
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
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{text}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* جدول العنوان (Title Block) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${C.cyan}33` }}>
            {[
              ['المشروع', 'مصلحتك — بنظام'],
              ['المقياس', '1 : 1'],
              ['رسم', 'Contractor Pro'],
              ['الحالة', 'جاهز للتنفيذ ✓'],
            ].map(([k, v], i) => (
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
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              مبني خصّيصاً لشغل المقاول
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>كل ميزة حلّ لمشكلة حقيقية بتواجهك كل يوم.</p>
          </div>
        </Depth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {VALUE_CARDS.map((c, i) => (
            <Flip3D key={i} delay={i * 0.1} dir={i === 1 ? -1 : 1}>
              <PremiumCard color={c.color} animate={false} radius={22} padding="28px" style={{ height: '100%' }}>
                <IconChip icon={c.icon} color={c.color} size={48} radius={14} iconSize={24} strokeWidth={2} style={{ marginBottom: 18 }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>{c.title}</div>
                <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>{c.text}</p>
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
        <Depth tilt={16} lift={60}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12 }}>
              خطط بسيطة وواضحة
            </h2>
            <p style={{ fontSize: 16, color: C.textDim }}>كل الخطط تبدأ بتجربة مجانية 14 يوم — بدون بطاقة ائتمان.</p>
          </div>

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
              </Flip3D>
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
      <Depth tilt={20} lift={90} from={0.88}>
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
            <Magnetic>
              <button onClick={() => navigate('/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 44px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ابدأ التجربة المجانية
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            </Magnetic>
            <button onClick={() => navigate('/pricing')} className="lp-btn"
              style={{ background: 'transparent', border: `1px solid ${C.borderMid}`, color: C.textDim, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '16px 30px', borderRadius: 16 }}>
              شاهد الأسعار
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: C.textDim }}>
            Starter ₪129 · Pro ₪249 · Business ₪499
          </p>
        </div>
      </Depth>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '32px 24px', direction: 'rtl' }}>
      <motion.div {...rise()} style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
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
      </motion.div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
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
        <Hero />
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
