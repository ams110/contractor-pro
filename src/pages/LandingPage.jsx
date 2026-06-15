import React, { useEffect, useRef, useState } from 'react'
import {
  HardHat, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot, Sun, CloudSun, Clock, Check, Hourglass
} from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useVelocity, useReducedMotion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip, HolographicSheen, useCountUp } from '../ui/Premium.jsx'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'
import { useSeo, faqLd } from '../lib/seo.js'

// نستعمل نفس توكنات الهوية (C/GRAD) ومكوّنات kit الفخامة (PremiumCard/IconChip)
// المستعملة في التطبيق — لا توكنات محليّة ولا بطاقات معاد بناؤها (CLAUDE.md §2.1/§19).
//
// طبقة السكرول 3D: التلفون هو بطل الصفحة — MegaHero قسم 460vh مثبّت يبدأ
// بدخول درامي للتلفون من أول ثانية ثم يدير 3 مشاهد حوله بالسكرول، وكل
// المقاطع الباقية تتحرّك بعمق حقيقي (perspective + rotateX/rotateY) عبر
// useScroll/useTransform مع useSpring للنعومة. useReducedMotion يطفّي كل
// الحركة لمن طلب تقليلها من نظامه.

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
  /* أرضية شبكة 3D بمنظور — تتحرّك للأمام بلا توقّف (روح synthwave بهوية amber).
     الحركة بـtransform (مسرَّعة بالكومبوزيتور) لا بـbackground-position (إعادة رسم كل فريم). */
  .lp-grid-floor {
    position: absolute; left: -50%; right: -50%; bottom: -12%; height: 58%;
    transform: rotateX(63deg);
    transform-origin: top center;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 28%, #000 62%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 28%, #000 62%, transparent);
    pointer-events: none;
  }
  .lp-grid-floor::before {
    content: ''; position: absolute; left: 0; right: 0; top: -46px; bottom: -46px;
    background-image:
      linear-gradient(rgba(249,115,22,0.13) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.13) 1px, transparent 1px);
    background-size: 46px 46px;
    animation: gridMove 1.7s linear infinite;
    will-change: transform;
  }
  @keyframes gridMove { from { transform: translateY(0) } to { transform: translateY(46px) } }
  /* بطاقات عائمة بعمق حول عنوان الـHero — تختفي على الشاشات الضيّقة */
  .lp-float-chip { position: absolute; pointer-events: none; }
  @media (max-width: 900px) { .lp-float-chip { display: none; } }
  /* fallback ثابت لتقليل الحركة */
  .lp-cinema-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; max-width: 1000px; width: 100%; }
  @media (max-width: 860px) { .lp-cinema-grid { grid-template-columns: 1fr; gap: 24px; } }
  /* أشعة ضوء دوّارة خلف التلفون (god rays بهوية amber/secondary/cyan) */
  .lp-rays {
    position: absolute; inset: 0; margin: auto; width: 780px; height: 780px; border-radius: 50%;
    background: conic-gradient(from 10deg,
      transparent 0deg 14deg,  rgba(249,115,22,0.08) 21deg 27deg, transparent 34deg 98deg,
      rgba(124,58,237,0.07) 106deg 112deg, transparent 119deg 192deg,
      rgba(249,115,22,0.06) 200deg 206deg, transparent 213deg 288deg,
      rgba(6,182,212,0.06) 296deg 302deg, transparent 309deg 360deg);
    animation: raysSpin 32s linear infinite; pointer-events: none;
  }
  @keyframes raysSpin { to { transform: rotate(360deg) } }
  /* غبار مضيء عائم */
  .lp-dust { position: absolute; border-radius: 50%; pointer-events: none; animation: dustFloat ease-in-out infinite; }
  @keyframes dustFloat { 0%,100% { transform: translateY(0); opacity: .15 } 50% { transform: translateY(-30px); opacity: .55 } }
  /* لوحات HUD الزجاجية للمشاهد */
  .lp-hud { position: absolute; inset-inline-start: clamp(16px, 5vw, 88px); top: 50%; margin-top: -120px; height: 240px; width: min(390px, 36vw); }
  .lp-mega-phone { position: relative; }
  @media (max-width: 860px) {
    .lp-hud { inset-inline: 14px; top: 132px; margin-top: 0; height: 196px; width: auto; text-align: center; }
    .lp-hud p { margin-inline: auto; }
    .lp-mega-phone { transform: scale(0.62); margin-top: 128px; }
  }
  /* حبيبات فيلم سينمائية فوق المسرح (بلا mix-blend — أرخص على الرندر البرمجي) */
  .lp-grain {
    position: absolute; inset: 0; z-index: 30; pointer-events: none; opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-grid-floor::before, .float, .glow-orb, .lp-rays, .lp-dust { animation: none !important; }
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
// يحاكي شاشات التطبيق الحقيقية. لما يُمرَّر له `p` (تقدّم سكرول الـMegaHero)
// تتبدّل شاشته مع كل مشهد لتطابق وصفه: أيام العمل ← الرواتب ← لوحة الأرباح.

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

// شاشة المشهد 1 — أيام العمل بأسلوب «تذكرة الشِفت» الحقيقي (WorkDayTicket):
// كعب تاريخ متدرّج + خط تثقيب + كعب أجر + ختم حالة — مُصغَّر لشاشة الموك.
const MINI_TICKETS = [
  { name: 'محمد ع.', day: 8, month: 'يونيو', type: 'كامل',   color: C.primary,            grad: `linear-gradient(160deg, ${C.primary}, ${C.gold})`,            TypeIcon: Sun,      amt: '₪450', state: 'approved' },
  { name: 'أحمد س.', day: 8, month: 'يونيو', type: 'نص يوم', color: C.warning,            grad: `linear-gradient(160deg, ${C.warning}, ${C.gold})`,            TypeIcon: CloudSun, amt: '₪225', state: 'pending'  },
  { name: 'خالد ر.', day: 7, month: 'يونيو', type: 'كامل',   color: C.primary,            grad: `linear-gradient(160deg, ${C.primary}, ${C.gold})`,            TypeIcon: Sun,      amt: '₪500', state: 'approved' },
  { name: 'يوسف م.', day: 7, month: 'يونيو', type: 'ساعات',  color: C.blue || '#3B82F6',  grad: `linear-gradient(160deg, ${C.blue || '#3B82F6'}, ${C.cyan})`,  TypeIcon: Clock,    amt: '₪380', state: 'approved' },
]
function WorkDaysScreen({ p }) {
  // القصة الحية: مع تقدّم السكرول داخل المشهد تتمّ الموافقة على اليوم المعلّق
  // قدام عين الزائر — الأزرار تختفي وختم «معتمد» يُطبع ببوب.
  const flipAt = sceneWin(0)[0] + SCENE_LEN * 0.5
  const btnOp = useTransform(p, [flipAt - 0.012, flipAt], [1, 0])
  const stampOp = useTransform(p, [flipAt, flipAt + 0.015], [0, 1])
  const stampScale = useTransform(p, [flipAt, flipAt + 0.022], [1.7, 1])
  return (
    <>
      <div style={{ padding: '12px 10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: C.text }}>أيام العمل</span>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <motion.span style={{ opacity: btnOp, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 7, fontWeight: 800, color: C.warning, background: `${C.warning}1a`, border: `1px solid ${C.warning}40`, borderRadius: 20, padding: '2px 7px' }}>
            <Hourglass size={7} strokeWidth={2.8} /> 1 بانتظار
          </motion.span>
          <motion.span style={{ opacity: stampOp, position: 'absolute', inset: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 7, fontWeight: 800, color: C.success, background: `${C.success}1a`, border: `1px solid ${C.success}40`, borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap' }}>
            <Check size={7} strokeWidth={2.8} /> الكل معتمد
          </motion.span>
        </span>
      </div>
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MINI_TICKETS.map((t, i) => {
          const { TypeIcon } = t
          const stColor = t.state === 'approved' ? C.success : C.warning
          return (
            <div key={i} style={{
              position: 'relative', display: 'flex', alignItems: 'stretch', minHeight: 46, borderRadius: 12, overflow: 'hidden',
              background: `linear-gradient(135deg, ${t.color}14, ${C.card} 55%)`,
              border: `1px solid ${t.color}33`, boxShadow: `0 5px 14px ${t.color}1c`,
            }}>
              {/* كعب التاريخ المتدرّج */}
              <div style={{ width: 32, flexShrink: 0, background: t.grad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <TypeIcon size={8} color="#fff" strokeWidth={2.2} style={{ opacity: 0.95, marginBottom: 1 }} />
                <div style={{ fontSize: 12.5, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{t.day}</div>
                <div style={{ fontSize: 5.5, fontWeight: 800, opacity: 0.95 }}>{t.month}</div>
              </div>
              {/* الوسط: الاسم + شريحة نوع اليوم */}
              <div style={{ flex: 1, minWidth: 0, padding: '5px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                <div style={{ fontSize: 8.5, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t.name}</div>
                <span style={{ alignSelf: 'flex-start', fontSize: 6, fontWeight: 800, color: t.color, background: `${t.color}1c`, border: `1px solid ${t.color}38`, borderRadius: 5, padding: '1px 5px' }}>{t.type}</span>
              </div>
              {/* خط التثقيب + الحفرتان */}
              <div style={{ width: 0, borderInlineStart: `1.5px dashed ${t.color}40`, margin: '6px 0', flexShrink: 0 }} />
              <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 44, top: -4, width: 8, height: 8, borderRadius: '50%', background: C.bg }} />
              <div aria-hidden style={{ position: 'absolute', insetInlineEnd: 44, bottom: -4, width: 8, height: 8, borderRadius: '50%', background: C.bg }} />
              {/* كعب الأجر + ختم الحالة / أزرار الموافقة */}
              <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 3px' }}>
                <div style={{ fontSize: 8.5, fontWeight: 900, color: t.color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{t.amt}</div>
                {t.state === 'approved' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 5.5, fontWeight: 800, color: stColor, background: `${stColor}1a`, border: `1px solid ${stColor}40`, borderRadius: 10, padding: '1px 5px' }}>
                    <Check size={6} strokeWidth={2.8} /> معتمد
                  </span>
                ) : (
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <motion.div style={{ opacity: btnOp, display: 'flex', gap: 3 }}>
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ width: 15, height: 15, borderRadius: 5, background: `${C.success}15`, border: `1px solid ${C.success}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={8} color={C.success} strokeWidth={2.8} />
                      </motion.div>
                      <div style={{ width: 15, height: 15, borderRadius: 5, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={8} color={C.accent} strokeWidth={2.8} />
                      </div>
                    </motion.div>
                    {/* ختم «معتمد» يُطبع ببوب لحظة الموافقة */}
                    <motion.span style={{ opacity: stampOp, scale: stampScale, position: 'absolute', inset: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 5.5, fontWeight: 800, color: C.success, background: `${C.success}1a`, border: `1px solid ${C.success}40`, borderRadius: 10, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                      <Check size={6} strokeWidth={2.8} /> معتمد
                    </motion.span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '7px 10px 10px' }}>
        <div style={{ background: `linear-gradient(135deg, ${C.primary}14, ${C.card} 70%)`, border: `1px solid ${C.primary}33`, borderRadius: 11, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 7, color: C.textDim }}>مسجّل هالأسبوع</span>
          <span style={{ fontSize: 8.5, fontWeight: 900, color: C.primary, fontVariantNumeric: 'tabular-nums' }}>12 يوم عمل</span>
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}><MiniNav active={2} /></div>
    </>
  )
}

// شاشة المشهد 2 — الرواتب بأسلوب شاشة الدفعات الحقيقي: أفاتار دائري متدرّج
// بحرف العامل + حبّة مبلغ ملوّنة + ترقيم مرجعي PAY- + شريط تقدّم متدرّج.
const MINI_PAYROLL = [
  { init: 'م', name: 'محمد ع.', sub: 'راتب نيسان · PAY-1042', amt: '₪4,250', color: C.success, status: 'مدفوع',    grad: GRAD.success },
  { init: 'أ', name: 'أحمد س.', sub: 'راتب نيسان · PAY-1043', amt: '₪3,800', color: C.warning, status: 'قيد الدفع', grad: GRAD.brand   },
  { init: 'خ', name: 'خالد ر.', sub: 'راتب نيسان · PAY-1044', amt: '₪5,100', color: C.success, status: 'مدفوع',    grad: GRAD.premium },
  { init: 'ي', name: 'يوسف م.', sub: 'سلفة · ADV-218',        amt: '₪600',   color: C.gold,    status: 'سلفة',     grad: GRAD.gold    },
]
function PayrollScreen({ p }) {
  // القصة الحية: شريط نسبة المدفوع يتعبّى من 4% لـ72% مع تقدّم السكرول والرقم يعدّ.
  const a2 = sceneWin(1)[0]
  const pctNum = useTransform(p, [a2 + FADE, a2 + SCENE_LEN * 0.6], [4, 72], { clamp: true })
  const pctText = useTransform(pctNum, (v) => `${Math.round(v)}%`)
  const pctWidth = useTransform(pctNum, (v) => `${v}%`)
  return (
    <>
      <div style={{ padding: '12px 10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: C.text }}>الرواتب والسلف</span>
        <span style={{ fontSize: 8.5, fontWeight: 900, color: C.cyan, fontVariantNumeric: 'tabular-nums' }}>₪13,750</span>
      </div>
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {MINI_PAYROLL.map((r, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 11, padding: '7px 9px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* أفاتار دائري متدرّج بحرف العامل (توقيع شاشة الدفعات) */}
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {r.init}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, fontWeight: 800, color: C.text }}>{r.name}</div>
              <div style={{ fontSize: 6.5, color: C.textDim, marginTop: 1 }}>{r.sub}</div>
            </div>
            {/* حبّة المبلغ الملوّنة (نمط owed pill) */}
            <div style={{ textAlign: 'center', padding: '3px 7px', borderRadius: 8, background: `${r.color}20`, border: `1px solid ${r.color}44` }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: r.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{r.amt}</div>
              <div style={{ fontSize: 5.5, fontWeight: 800, color: r.color, opacity: 0.85 }}>{r.status}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '7px 10px 10px' }}>
        <div style={{ background: C.card, borderRadius: 11, padding: '7px 10px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 7, color: C.textDim }}>نسبة المدفوع</span>
            <motion.span style={{ fontSize: 7, fontWeight: 800, color: C.success, fontVariantNumeric: 'tabular-nums' }}>{pctText}</motion.span>
          </div>
          <div style={{ height: 4, background: `${C.border}66`, borderRadius: 3, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', width: pctWidth, borderRadius: 3, background: GRAD.success }} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 'auto' }}><MiniNav active={3} /></div>
    </>
  )
}

// طبقة شاشة مشهد — تتراكب فوق لوحة التحكم وتظهر ضمن نافذة مشهدها فقط.
function SceneScreen({ p, win, children }) {
  const [a, b] = win
  const opacity = useTransform(p, [a, a + FADE, b - FADE, b], [0, 1, 1, 0])
  const yy = useTransform(p, [a, a + FADE, b - FADE, b], [10, 0, 0, -8])
  return (
    <motion.div style={{ position: 'absolute', inset: 0, opacity, y: yy, background: C.bg, display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {children}
    </motion.div>
  )
}

function PhoneMockup({ p }) {
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
      {/* منطقة الشاشة — لوحة التحكم + شاشات المشاهد المتراكبة */}
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
      {/* شاشات المشاهد — تتبدّل مع وصف كل مشهد */}
      {p && <SceneScreen p={p} win={sceneWin(0)}><WorkDaysScreen p={p} /></SceneScreen>}
      {p && <SceneScreen p={p} win={sceneWin(1)}><PayrollScreen p={p} /></SceneScreen>}
      </div>
    </div>
  )
}

// ─── Mega Hero — التلفون هو البطل ─────────────────────────────────────────────
// قسم 460vh مثبّت: التلفون بالمنتصف من أول ثانية (دخول درامي بزخم + أشعة ضوء
// دوّارة + غبار مضيء)، العنوان يطير للخلف مع أول سكرول، وبعدها 3 مشاهد تلفّ
// حول التلفون بلوحات HUD زجاجية وشرائح طايرة ونقاط تقدّم.
const STORY = [
  {
    Icon: CalendarDays, color: C.primary,
    title: 'سجّل أيام الشغل بلمسة',
    desc:  'كل يوم عمل لكل عامل — موافقة أو رفض فوري. بلا دفاتر، بلا واتساب ضايع، بلا نسيان.',
    chip:  { Icon: CheckCircle2, color: C.success, text: 'يوم عمل — تمت الموافقة' },
  },
  {
    Icon: Wallet, color: C.secondary,
    title: 'الرواتب والسلف محسوبة لحالها',
    desc:  'ساعات إضافية، سلف، خصومات — الحساب جاهز قبل ما تسأل، وكشف حساب لكل عامل.',
    chip:  { Icon: Wallet, color: C.cyan, text: '₪4,250 راتب — مدفوع' },
  },
  {
    Icon: TrendingUp, color: C.success,
    title: 'أرباحك قدامك لحظة بلحظة',
    desc:  'صافي الربح، نقد الجيب، وضريبة القيمة المضافة — كل شي محتاجه في شاشة واحدة.',
    chip:  { Icon: BarChart3, color: C.gold, text: '+18% صافي الربح هالشهر' },
  },
]
const N = STORY.length
const SCENE_START = 0.24                  // المشهد 0 (العنوان) يحتلّ p ∈ [0, 0.24)
const SCENE_LEN = (1 - SCENE_START) / N
const sceneWin = (i) => {
  const a = SCENE_START + i * SCENE_LEN
  return [a, a + SCENE_LEN]
}
const FADE = 0.05

// غبار مضيء بمواضع شبه عشوائية ثابتة
const DUST = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 83 + 7) % 100}%`,
  top: `${(i * 47 + 11) % 88 + 4}%`,
  size: 3 + (i % 3),
  dur: 5 + (i % 5),
  delay: (i % 7) * 0.8,
  color: [C.primary, C.secondary, C.cyan][i % 3],
}))

// لوحة HUD زجاجية للمشهد i — تدخل بدوران وتخرج للجهة الثانية ضمن نافذتها.
function HudPanel({ i, p, story }) {
  const [a, b] = sceneWin(i)
  const opacity = useTransform(p, [a, a + FADE, b - FADE, b], [0, 1, 1, i === N - 1 ? 1 : 0])
  const x = useTransform(p, [a, a + FADE, b - FADE, b], [-54, 0, 0, i === N - 1 ? 0 : 54])
  const rotateY = useTransform(p, [a, a + FADE, b - FADE, b], [30, 0, 0, i === N - 1 ? 0 : -22])
  return (
    <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity, x, rotateY, transformPerspective: 900 }}>
      <div style={{
        background: 'rgba(13,15,28,0.6)', backdropFilter: 'blur(14px)',
        border: `1px solid ${story.color}33`, borderRadius: 20, padding: '20px 22px',
        boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 40px ${story.color}14`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <IconChip icon={story.Icon} color={story.color} size={38} radius={11} iconSize={18} strokeWidth={2.2} />
          <span style={{ fontSize: 11, fontWeight: 800, color: story.color, letterSpacing: '0.1em' }}>{`0${i + 1} / 0${N}`}</span>
        </div>
        <h3 style={{ fontSize: 'clamp(19px,2.6vw,26px)', fontWeight: 900, color: C.text, lineHeight: 1.35, marginBottom: 9 }}>
          {story.title}
        </h3>
        <p style={{ fontSize: 13.5, color: C.textDim, lineHeight: 1.75, maxWidth: 400 }}>{story.desc}</p>
      </div>
    </motion.div>
  )
}

// شريحة طايرة حول التلفون ضمن نافذة المشهد i.
function StoryChip({ i, p, chip, pos }) {
  const [a, b] = sceneWin(i)
  const opacity = useTransform(p, [a, a + FADE, b - FADE, b], [0, 1, 1, 0])
  const yy = useTransform(p, [a, a + FADE, b - FADE, b], [50, 0, 0, -36])
  const scale = useTransform(p, [a, a + FADE, b - FADE, b], [0.8, 1, 1, 0.9])
  const { Icon, color, text } = chip
  return (
    <motion.div style={{ position: 'absolute', zIndex: 3, opacity, y: yy, scale, ...pos }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px',
        background: `linear-gradient(135deg, ${color}1f, ${C.card} 70%)`,
        border: `1px solid ${color}3a`, borderRadius: 14,
        boxShadow: `0 14px 40px rgba(0,0,0,0.55), 0 0 24px ${color}22`,
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1c`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} strokeWidth={2.4} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    </motion.div>
  )
}

// نقطة تقدّم المشهد i.
function StoryDot({ i, p, color }) {
  const [a, b] = sceneWin(i)
  const scale = useTransform(p, [a - 0.03, a + 0.06, b - 0.06, b + 0.03], [1, 1.5, 1.5, 1])
  const opacity = useTransform(p, [a - 0.03, a + 0.06, b - 0.06, b + 0.03], [0.3, 1, 1, 0.3])
  return <motion.div style={{ width: 9, height: 9, borderRadius: '50%', background: color, scale, opacity, boxShadow: `0 0 10px ${color}` }} />
}

const HEADLINE_WORDS = ['كل', 'يوم', 'شغل،', 'كل', 'دفعة،', '\n', 'كل', 'مصروف', '—']

function MegaHero() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 860
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.35 })

  // طبقة العنوان (المشهد 0) — تطير للخلف وتختفي مع أول سكرول
  const headOpacity = useTransform(p, [0, 0.13, 0.2], [1, 1, 0])
  const headY = useTransform(p, [0, 0.2], [0, -150])
  const headRotX = useTransform(p, [0, 0.2], [0, 30])
  const headVis = useTransform(p, (v) => (v < 0.22 ? 'visible' : 'hidden'))

  // التلفون — يبدأ منخفضاً وكبيراً، يصعد للمنتصف ثم يدور بين المشاهد
  const phoneY = useTransform(p, [0, 0.22], [isMobile ? '26vh' : '36vh', '0vh'])
  const phoneRotY = useTransform(p, [0, 0.22, 0.48, 0.74, 1], [-9, 0, -26, 24, -8])
  const phoneRotX = useTransform(p, [0, 0.22, 1], [13, 3, -4])
  const phoneScale = useTransform(p, [0, 0.22, 1], [1.05, 1, 0.95])

  // عناصر المشاهد (HUD/نقاط/عنوان مصغّر) تظهر بعد انتهاء المشهد 0
  const scenesOpacity = useTransform(p, [0.2, 0.27], [0, 1])

  // ميلان كامل المسرح يتبع الماوس + ضوء يتبع المؤشّر
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const lx = useMotionValue(-600)
  const ly = useMotionValue(-600)
  const tiltX = useSpring(useTransform(my, [-0.5, 0.5], [4.5, -4.5]), { stiffness: 140, damping: 18 })
  const tiltY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 140, damping: 18 })
  const slx = useSpring(lx, { stiffness: 110, damping: 22 })
  const sly = useSpring(ly, { stiffness: 110, damping: 22 })
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
    lx.set(e.clientX - r.left)
    ly.set(e.clientY - r.top)
  }
  const onLeave = () => { mx.set(0); my.set(0) }

  // ميلان فيزيائي بسرعة السكرول — التلفون يتمايل مع زخم السكرول
  const vel = useVelocity(p)
  const rotZ = useSpring(useTransform(vel, [-1.6, 1.6], [5, -5]), { stiffness: 120, damping: 20 })

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

  // fallback ثابت كامل لمن طلب تقليل الحركة (بلا تثبيت ولا مشاهد)
  if (reduce) {
    return (
      <section id="features" style={{ padding: '80px 24px 64px', direction: 'rtl', textAlign: 'center' }}>
        <div style={{ maxWidth: 740, margin: '0 auto 56px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.primary}1a`, border: `1px solid ${C.primary}40`, borderRadius: 100, padding: '6px 16px', marginBottom: 28, fontSize: 12, color: C.primary, fontWeight: 700 }}>
            <CircleDot size={10} strokeWidth={3} />
            التطبيق الأول للمقاول العربي في إسرائيل
          </div>
          <h1 style={{ fontSize: 'clamp(28px,6vw,56px)', fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 22, letterSpacing: '-0.02em' }}>
            كل يوم شغل، كل دفعة،<br />كل مصروف —<br />
            <span className="grad-text">محفوظ. مش في دماغك.</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px,2.5vw,19px)', color: C.textDim, lineHeight: 1.7, maxWidth: 580, margin: '0 auto 36px' }}>
            Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} className="lp-btn"
              style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 38px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
              جرّب مجاناً 14 يوم
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <h2 style={{ fontSize: 'clamp(20px,3.4vw,32px)', fontWeight: 900, color: C.text, marginBottom: 36 }}>
          كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
        </h2>
        <div className="lp-cinema-grid" style={{ margin: '0 auto', textAlign: 'start' }}>
          <div>
            {STORY.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
                <IconChip icon={s.Icon} color={s.color} size={40} radius={12} iconSize={19} strokeWidth={2.2} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 5 }}>{s.title}</div>
                  <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><PhoneMockup /></div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} style={{ position: 'relative', height: '460vh', direction: 'rtl' }}>
      {/* مرساة "شاهد كيف يعمل" — تهبط على المشهد الأول */}
      <div id="features" aria-hidden style={{ position: 'absolute', top: '30%' }} />

      <div onPointerMove={onMove} onPointerLeave={onLeave}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        {/* خلفية: توهّجات + أرضية الشبكة + غبار */}
        <div className="glow-orb" style={{ position: 'absolute', top: '-12%', right: '-6%', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div className="glow-orb" style={{ position: 'absolute', bottom: '-16%', left: '-8%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '1.5s' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, perspective: 620, overflow: 'hidden', pointerEvents: 'none' }}>
          <div className="lp-grid-floor" />
        </div>
        {DUST.map((d, i) => (
          <span key={i} className="lp-dust" style={{ left: d.left, top: d.top, width: d.size, height: d.size, background: d.color, boxShadow: `0 0 8px ${d.color}`, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
        ))}
        {/* ضوء يتبع المؤشّر (ديسكتوب) */}
        <motion.div aria-hidden style={{ position: 'absolute', top: -280, left: -280, x: slx, y: sly, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 1 }} />
        {/* حبيبات فيلم */}
        <div className="lp-grain" aria-hidden />

        {/* مسرح التلفون — البطل */}
        <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', y: phoneY, zIndex: 2, pointerEvents: 'none', perspective: 1300 }}>
          <div className="lp-rays" />
          {/* توهّج خلف التلفون (بلا blur — التدرّج الشعاعي ناعم أصلاً) */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, margin: 'auto', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 62%)' }} />
          {/* دخول درامي بزخم → دوران المشاهد → ميلان الماوس */}
          <motion.div initial={{ y: 280, opacity: 0, rotateX: 24, scale: 0.9 }} animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 55, damping: 15, delay: 0.2 }}>
            <motion.div style={{ rotateY: phoneRotY, rotateX: phoneRotX, rotateZ: rotZ, scale: phoneScale, transformStyle: 'preserve-3d' }}>
              <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}>
                <div className="lp-mega-phone">
                  <div style={{ position: 'relative', borderRadius: 42, overflow: 'hidden' }}>
                    <PhoneMockup p={p} />
                    <HolographicSheen duration={5} repeatDelay={2.2} opacity={0.22} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
          {/* شرائح المشاهد الطايرة */}
          <StoryChip i={0} p={p} chip={STORY[0].chip} pos={{ top: '26%', insetInlineEnd: 'max(8px, calc(50% - 252px))' }} />
          <StoryChip i={1} p={p} chip={STORY[1].chip} pos={{ top: '40%', insetInlineEnd: 'max(8px, calc(50% - 258px))' }} />
          <StoryChip i={2} p={p} chip={STORY[2].chip} pos={{ bottom: '22%', insetInlineEnd: 'max(8px, calc(50% - 262px))' }} />
        </motion.div>

        {/* طبقة العنوان — المشهد 0 */}
        <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'clamp(84px, 11vh, 124px)', textAlign: 'center', opacity: headOpacity, y: headY, rotateX: headRotX, transformPerspective: 1000, zIndex: 4, pointerEvents: 'none', visibility: headVis, padding: '0 20px' }}>
          <div style={{ maxWidth: 760, position: 'relative' }}>
            {/* بطاقات عائمة بعمق (ديسكتوب) */}
            <FloatChip icon={CheckCircle2} color={C.success} text="يوم عمل — تمت الموافقة"
              style={{ top: 96, insetInlineStart: -130 }} dur={3.4} />
            <FloatChip icon={Wallet} color={C.cyan} text="₪4,250 راتب مدفوع"
              style={{ top: 190, insetInlineEnd: -140 }} dur={4.1} delay={0.7} />
            <FloatChip icon={TrendingUp} color={C.gold} text="+18% صافي الربح"
              style={{ bottom: -10, insetInlineStart: -104 }} dur={3.8} delay={1.3} />

            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 18, rotateX: 30, transformPerspective: 800 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.primary}1a`, border: `1px solid ${C.primary}40`, borderRadius: 100, padding: '6px 16px', marginBottom: 'clamp(16px, 3vh, 30px)', fontSize: 12, color: C.primary, fontWeight: 700 }}>
              <CircleDot size={10} strokeWidth={3} />
              التطبيق الأول للمقاول العربي في إسرائيل
            </motion.div>

            {/* Headline — كلمة-كلمة من العمق */}
            <h1 style={{ fontSize: 'clamp(26px,5.2vw,50px)', fontWeight: 900, color: C.text, lineHeight: 1.16, marginBottom: 18, letterSpacing: '-0.02em', perspective: 900 }}>
              {HEADLINE_WORDS.map(word)}
              <br />
              <motion.span className="grad-text"
                initial={{ opacity: 0, rotateX: -88, y: 26, scale: 0.92 }}
                animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                transition={{ duration: 0.85, delay: gradDelay, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block', transformOrigin: 'bottom center' }}>
                محفوظ. مش في دماغك.
              </motion.span>
            </h1>

            {/* Sub */}
            <motion.p initial={{ opacity: 0, y: 24, rotateX: 18, transformPerspective: 900 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, delay: gradDelay + 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: 'clamp(14px,2.2vw,17px)', color: C.textDim, lineHeight: 1.65, marginBottom: 'clamp(18px, 3.4vh, 34px)', maxWidth: 560, marginInline: 'auto' }}>
              Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 24, rotateX: 18, transformPerspective: 900 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, delay: gradDelay + 0.24, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', pointerEvents: 'auto' }}>
              <Magnetic>
                <button onClick={() => navigate('/register')} className="lp-btn"
                  style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', padding: '14px 34px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  جرّب مجاناً 14 يوم
                  <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
              </Magnetic>
              <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '14px 26px', borderRadius: 16 }}>
                شاهد كيف يعمل
              </button>
            </motion.div>

            {/* Trust signals */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: gradDelay + 0.38 }}
              style={{ marginTop: 'clamp(14px, 2.6vh, 26px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
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
        </motion.div>

        {/* العنوان المصغّر للمشاهد */}
        <motion.div style={{ position: 'absolute', top: 'clamp(74px, 9.6vh, 94px)', left: 0, right: 0, textAlign: 'center', opacity: scenesOpacity, zIndex: 4, pointerEvents: 'none', padding: '0 18px' }}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 7, textTransform: 'uppercase' }}>قوة في جيبك</div>
          <h2 style={{ fontSize: 'clamp(19px,3vw,30px)', fontWeight: 900, color: C.text, lineHeight: 1.25 }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
        </motion.div>

        {/* لوحات HUD الزجاجية */}
        <motion.div className="lp-hud" style={{ opacity: scenesOpacity, zIndex: 5, pointerEvents: 'none' }}>
          {STORY.map((s, i) => <HudPanel key={i} i={i} p={p} story={s} />)}
        </motion.div>

        {/* نقاط التقدّم */}
        <motion.div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10, opacity: scenesOpacity, zIndex: 5, pointerEvents: 'none' }}>
          {STORY.map((s, i) => <StoryDot key={i} i={i} p={p} color={s.color} />)}
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

// ─── Features grid — باقي الميزات ─────────────────────────────────────────────
const FEATURES = [
  { Icon: CalendarDays, text: 'تسجيل أيام العمل بالموافقة والرفض'     },
  { Icon: Users,        text: 'متابعة الرواتب والسلف لكل عامل'         },
  { Icon: Receipt,      text: 'تتبع المصاريف واسترداد ضريبة القيمة المضافة' },
  { Icon: BarChart3,    text: 'تقارير PDF وExcel بلمسة'                 },
  { Icon: Shield,       text: 'فريق عمل مع صلاحيات مخصصة'              },
  { Icon: Bell,         text: 'إشعارات فورية لكل طلب وتغيير'            },
]
function FeaturesGrid() {
  return (
    <section style={{ padding: '24px 24px 80px', direction: 'rtl' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 14 }}>
          {FEATURES.map(({ Icon, text }, i) => (
            <Flip3D key={i} delay={i * 0.06} dir={i % 2 ? -1 : 1}>
              <PremiumCard color={C.primary} animate={false} padding="16px" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconChip icon={Icon} color={C.primary} size={34} radius={10} iconSize={16} strokeWidth={2} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{text}</span>
                </div>
              </PremiumCard>
            </Flip3D>
          ))}
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

// ─── الأسئلة الشائعة (FAQ) ─────────────────────────────────────────────────────
// محتوى مرئي حقيقي يستهدف استعلامات بحث المقاول العربي + يغذّي FAQPage JSON-LD
// (نتائج غنية في جوجل). الأسئلة مصدر الحقيقة هنا، والـschema يُبنى منها في Main.
export const FAQ_ITEMS = [
  {
    q: 'ما هو تطبيق Contractor Pro؟',
    a: 'Contractor Pro تطبيق إدارة مقاولات مصمّم للمقاول العربي في إسرائيل: يدير المشاريع والعمّال وأيام العمل، يحسب الرواتب والمصاريف والمقبوضات، ويحسب الضرائب الإسرائيلية (מע"מ + ضريبة الدخل + ביטוח לאומי) — كله من هاتفك.',
  },
  {
    q: 'كيف يحسب التطبيق ضريبة القيمة المضافة (מע"מ) وضريبة الدخل والبيتواح ليئومي؟',
    a: 'يحسب מע"מ تلقائياً على المدخولات ويخصمها على المصاريف حسب الفئة، ويقدّر ضريبة الدخل بالشرائح الإسرائيلية التصاعدية، ويحسب ביטוח לאומי بشريحتين (لا نسبة مسطّحة). يدعم עוסק פטור و עוסק מורשה و חברה.',
  },
  {
    q: 'هل أقدر أحسب رواتب العمّال وأتابع أيام العمل؟',
    a: 'نعم. سجّل أيام العمل (مفرد أو جماعي أو لمدى تواريخ)، واحسب الرواتب مع الإضافي تلقائياً، وتابع السلف والدفعات، وأرسل كشف الحساب للعامل عبر واتساب.',
  },
  {
    q: 'هل التطبيق مناسب للعوسك باتور (עוסק פטור)؟',
    a: 'نعم، يدعم עוסק פטור بالكامل بدون מע"מ، مع تنبيه عند الاقتراب من الحدّ السنوي (₪120,000)، كما يدعم עוסק מורשה و חברה بحساب מע"מ كامل.',
  },
  {
    q: 'هل في تجربة مجانية وكم سعر الاشتراك؟',
    a: 'نعم، تجربة مجانية 14 يوم بدون بطاقة ائتمان. بعدها الخطط: Starter بـ₪129 وPro بـ₪249 وBusiness بـ₪499 شهرياً، مع خصم على الاشتراك السنوي.',
  },
  {
    q: 'هل يعمل على الآيفون والأندرويد؟',
    a: 'نعم، يعمل على الآيفون والأندرويد والكمبيوتر كتطبيق ويب (PWA) تثبّته على شاشتك الرئيسية ويعمل حتى بدون إنترنت مؤقتاً، بالعربي والعبري والإنجليزي.',
  },
  {
    q: 'هل في بوّابة خاصة للعمّال؟',
    a: 'نعم، لكل عامل بوّابة ذاتية يشوف فيها كشف حسابه، يسجّل أيام عمله ومصاريفه وبضاعته، ويطلب سلفة أو راتب — وأنت تتحكّم بصلاحياته بالكامل.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم، بياناتك محمية بتشفير ونظام صلاحيات دقيق، مع دخول بالبصمة (Passkey) وقفل الجلسة وسجلّ تدقيق لكل العمليات. كل مقاول يرى بياناته فقط.',
  },
]

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section style={{ padding: '60px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <motion.h2 {...rise()} style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, marginBottom: 12, textAlign: 'center' }}>
          أسئلة شائعة
        </motion.h2>
        <motion.p {...rise(0.05)} style={{ fontSize: 15, color: C.textDim, marginBottom: 32, textAlign: 'center' }}>
          كل اللي بتحتاج تعرفه عن إدارة مقاولاتك.
        </motion.p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div key={i} {...rise(Math.min(i * 0.04, 0.2))}
                style={{ background: C.surface, border: `1px solid ${isOpen ? C.borderMid : C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="lp-btn"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'transparent', border: 'none', color: C.text, fontSize: 'clamp(14px,2.4vw,16px)', fontWeight: 800, cursor: 'pointer', padding: '18px 20px', textAlign: 'right' }}>
                  <span>{item.q}</span>
                  <span style={{ flexShrink: 0, color: C.primary, fontSize: 20, fontWeight: 400, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform .2s ease' }}>+</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8, padding: '0 20px 18px' }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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

  useSeo({
    path: '/',
    jsonLd: faqLd(FAQ_ITEMS),
  })
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
        <MegaHero />
        <StatsStrip />
        <PainPoints />
        <FeaturesGrid />
        <Testimonials />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
