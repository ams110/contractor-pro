import React, { useEffect, useRef, useState } from 'react'
import {
  HardHat, BarChart3, Users, CalendarDays, Receipt,
  CheckCircle2, ArrowLeft, Shield, Smartphone, TrendingUp,
  Menu, X, Building2, Wallet, Settings, LayoutDashboard,
  Bell, Search, CircleDot
} from 'lucide-react'
import { motion, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import { supabase } from '../lib/supabase.js'
import { navigate } from '../Router.jsx'

// نستعمل نفس توكنات الهوية (C/GRAD) ومكوّنات kit الفخامة (PremiumCard/IconChip)
// المستعملة في التطبيق — لا توكنات محليّة ولا بطاقات معاد بناؤها (CLAUDE.md §2.1/§19).
//
// طبقة السكرول 3D: كل المقاطع تتحرّك في عمق حقيقي (perspective + rotateX/rotateY)
// مربوطة بموضع السكرول عبر useScroll/useTransform، مع useSpring للنعومة،
// و useReducedMotion يطفّي كل الحركة لمن طلب تقليلها من نظامه.

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
  /* أرضية شبكة 3D بمنظور — تتحرّك للأمام بلا توقّف (روح synthwave بهوية amber) */
  .lp-grid-floor {
    position: absolute; left: -50%; right: -50%; bottom: -12%; height: 58%;
    background-image:
      linear-gradient(rgba(249,115,22,0.13) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.13) 1px, transparent 1px);
    background-size: 46px 46px;
    transform: rotateX(63deg);
    transform-origin: top center;
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 28%, #000 62%, transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 28%, #000 62%, transparent);
    animation: gridMove 1.7s linear infinite;
    pointer-events: none;
  }
  @keyframes gridMove { from { background-position-y: 0 } to { background-position-y: 46px } }
  /* بطاقات عائمة بعمق حول عنوان الـHero — تختفي على الشاشات الضيّقة */
  .lp-float-chip { position: absolute; pointer-events: none; }
  @media (max-width: 900px) { .lp-float-chip { display: none; } }
  /* مشهد السينما المثبّت (pinned scroll story) */
  .lp-cinema-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; max-width: 1000px; width: 100%; }
  .lp-caption-box { position: relative; min-height: 250px; }
  .lp-cinema-phone-wrap { position: relative; display: flex; justify-content: center; }
  @media (max-width: 860px) {
    .lp-cinema-grid  { grid-template-columns: 1fr; gap: 0; }
    .lp-caption-box  { min-height: 205px; text-align: center; }
    .lp-caption-box p { margin-inline: auto; }
    .lp-cinema-phone { transform: scale(0.7); margin: -24px 0 -95px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-grid-floor, .float, .glow-orb { animation: none !important; }
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
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1c`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} strokeWidth={2.4} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    </div>
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

// ─── Hero ─────────────────────────────────────────────────────────────────────
// سينمائي: أرضية شبكة 3D + عنوان ينكشف كلمة-كلمة بقلبة 3D + بطاقات عائمة بعمق
// + ميلان يتبع الماوس + خروج بالعمق مربوط بالسكرول + parallax للتوهّجات.
const HEADLINE_WORDS = ['كل', 'يوم', 'شغل،', 'كل', 'دفعة،', '\n', 'كل', 'مصروف', '—']

function Hero() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const p = useSpring(scrollYProgress, SPRING)
  const rotateX = useTransform(p, [0, 1], [0, 22])
  const scale = useTransform(p, [0, 1], [1, 0.88])
  const y = useTransform(p, [0, 1], [0, -90])
  const opacity = useTransform(p, [0, 0.8], [1, 0.1])
  const orb1Y = useTransform(p, [0, 1], [0, 180])
  const orb2Y = useTransform(p, [0, 1], [0, -140])
  const exit3d = reduce ? {} : { rotateX, scale, y, opacity, transformPerspective: 1100, transformStyle: 'preserve-3d' }

  // ميلان يتبع الماوس (داخل طبقة الخروج — يتركّبان فوق بعض)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const tiltX = useSpring(useTransform(my, [-0.5, 0.5], [4.5, -4.5]), { stiffness: 140, damping: 18 })
  const tiltY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 140, damping: 18 })
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => { mx.set(0); my.set(0) }
  const tilt3d = reduce ? {} : { rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }

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

  return (
    <section ref={ref} onPointerMove={reduce ? undefined : onMove} onPointerLeave={reduce ? undefined : onLeave}
      style={{ position: 'relative', overflow: 'hidden', padding: '96px 24px 110px', textAlign: 'center', direction: 'rtl' }}>
      {/* Ambient orbs — parallax بسرعات متعاكسة */}
      <motion.div className="glow-orb" style={{ position: 'absolute', top: '-8%', right: '-3%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 65%)', pointerEvents: 'none', y: reduce ? 0 : orb1Y }} />
      <motion.div className="glow-orb" style={{ position: 'absolute', bottom: '-12%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)', pointerEvents: 'none', animationDelay: '1.5s', y: reduce ? 0 : orb2Y }} />
      {/* أرضية الشبكة 3D */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, perspective: 620, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="lp-grid-floor" />
      </div>

      <motion.div style={{ maxWidth: 740, margin: '0 auto', position: 'relative', ...exit3d }}>
        <motion.div style={tilt3d}>
          {/* بطاقات عائمة بعمق (ديسكتوب) */}
          <FloatChip icon={CheckCircle2} color={C.success} text="يوم عمل — تمت الموافقة"
            style={{ top: 86, insetInlineStart: -120 }} dur={3.4} />
          <FloatChip icon={Wallet} color={C.cyan} text="₪4,250 راتب مدفوع"
            style={{ top: 210, insetInlineEnd: -130 }} dur={4.1} delay={0.7} />
          <FloatChip icon={TrendingUp} color={C.gold} text="+18% صافي الربح"
            style={{ bottom: 120, insetInlineStart: -96 }} dur={3.8} delay={1.3} />

          {/* Badge */}
          <motion.div initial={reduce ? false : { opacity: 0, y: 18, rotateX: 30, transformPerspective: 800 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.primary}1a`, border: `1px solid ${C.primary}40`, borderRadius: 100, padding: '6px 16px', marginBottom: 32, fontSize: 12, color: C.primary, fontWeight: 700 }}>
            <CircleDot size={10} strokeWidth={3} />
            التطبيق الأول للمقاول العربي في إسرائيل
          </motion.div>

          {/* Headline — كلمة-كلمة من العمق */}
          <h1 style={{ fontSize: 'clamp(28px,6vw,56px)', fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.02em', perspective: 900 }}>
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

          {/* Sub */}
          <motion.p initial={reduce ? false : { opacity: 0, y: 24, rotateX: 18, transformPerspective: 900 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, delay: gradDelay + 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize: 'clamp(15px,2.5vw,19px)', color: C.textDim, lineHeight: 1.7, marginBottom: 44, maxWidth: 580, margin: '0 auto 44px' }}>
            Contractor Pro يحفظ أيام العمل، يحسب الرواتب، يتابع المصاريف، ويحسب ضريبة القيمة المضافة — كل شي في جيبك.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={reduce ? false : { opacity: 0, y: 24, rotateX: 18, transformPerspective: 900 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6, delay: gradDelay + 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnetic>
              <button onClick={() => navigate('/register')} className="lp-btn"
                style={{ background: GRAD.brand, border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '16px 38px', borderRadius: 16, boxShadow: '0 8px 32px rgba(249,115,22,0.45)', display: 'flex', alignItems: 'center', gap: 8 }}>
                جرّب مجاناً 14 يوم
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            </Magnetic>
            <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) }} className="lp-btn"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: '16px 28px', borderRadius: 16 }}>
              شاهد كيف يعمل
            </button>
          </motion.div>
        </motion.div>

        {/* Trust signals */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: gradDelay + 0.38 }}
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
      </motion.div>
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

// ─── Cinema Showcase — مشهد سكرول مثبّت (pinned scroll story) ─────────────────
// قسم 320vh: الشاشة تثبت والسكرول يتحوّل لكاميرا — الموبايل يدور بالفراغ بين
// 3 مشاهد، والنصوص والبطاقات الجانبية تطير حواليه حسب موضع السكرول.
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
const FADE = 0.07

// عنوان/وصف المشهد i — يدخل بدوران من الجنب ويخرج للجهة الثانية ضمن نافذته.
function StoryCaption({ i, p, story }) {
  const a = i / N, b = (i + 1) / N
  const opacity = useTransform(p, [a, a + FADE, b - FADE, b], [i === 0 ? 1 : 0, 1, 1, i === N - 1 ? 1 : 0])
  const x = useTransform(p, [a, a + FADE, b - FADE, b], [i === 0 ? 0 : -64, 0, 0, i === N - 1 ? 0 : 64])
  const rotateY = useTransform(p, [a, a + FADE, b - FADE, b], [i === 0 ? 0 : 32, 0, 0, i === N - 1 ? 0 : -24])
  return (
    <motion.div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity, x, rotateY, transformPerspective: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, justifyContent: 'inherit' }}>
        <IconChip icon={story.Icon} color={story.color} size={40} radius={12} iconSize={19} strokeWidth={2.2} />
        <span style={{ fontSize: 11, fontWeight: 800, color: story.color, letterSpacing: '0.1em' }}>{`0${i + 1} / 0${N}`}</span>
      </div>
      <h3 style={{ fontSize: 'clamp(22px,3.4vw,34px)', fontWeight: 900, color: C.text, lineHeight: 1.3, marginBottom: 12 }}>
        {story.title}
      </h3>
      <p style={{ fontSize: 15, color: C.textDim, lineHeight: 1.8, maxWidth: 420 }}>{story.desc}</p>
    </motion.div>
  )
}

// شريحة جانبية تطير حول الموبايل ضمن نافذة المشهد i.
function StoryChip({ i, p, chip, pos }) {
  const a = i / N, b = (i + 1) / N
  const opacity = useTransform(p, [a, a + FADE, b - FADE, b], [0, 1, 1, 0])
  const yy = useTransform(p, [a, a + FADE, b - FADE, b], [50, 0, 0, -36])
  const scale = useTransform(p, [a, a + FADE, b - FADE, b], [0.8, 1, 1, 0.9])
  const { Icon, color, text } = chip
  return (
    <motion.div style={{ position: 'absolute', zIndex: 2, opacity, y: yy, scale, ...pos }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px',
        background: `linear-gradient(135deg, ${color}1f, ${C.card} 70%)`,
        border: `1px solid ${color}3a`, borderRadius: 14,
        boxShadow: `0 14px 40px rgba(0,0,0,0.55), 0 0 24px ${color}22`, backdropFilter: 'blur(8px)',
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
  const a = i / N, b = (i + 1) / N
  const scale = useTransform(p, [a - 0.03, a + 0.06, b - 0.06, b + 0.03], [1, 1.5, 1.5, 1])
  const opacity = useTransform(p, [a - 0.03, a + 0.06, b - 0.06, b + 0.03], [0.3, 1, 1, 0.3])
  return <motion.div style={{ width: 9, height: 9, borderRadius: '50%', background: color, scale, opacity, boxShadow: `0 0 10px ${color}` }} />
}

function CinemaShowcase() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.35 })
  const phoneRotY = useTransform(p, [0, 0.33, 0.66, 1], [26, -20, 20, -6])
  const phoneRotX = useTransform(p, [0, 0.5, 1], [10, 0, -6])
  const phoneScale = useTransform(p, [0, 0.1, 0.92, 1], [0.84, 1, 1, 0.95])

  // fallback ثابت لمن طلب تقليل الحركة
  if (reduce) {
    return (
      <section id="features" style={{ padding: '64px 24px', direction: 'rtl' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: C.text, textAlign: 'center', marginBottom: 40 }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
          <div className="lp-cinema-grid" style={{ margin: '0 auto' }}>
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
        </div>
      </section>
    )
  }

  return (
    <section id="features" ref={ref} style={{ position: 'relative', height: '320vh', direction: 'rtl' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '76px 24px 20px' }}>
        {/* توهّج خلفي */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, rgba(249,115,22,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* العنوان الثابت */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>قوة في جيبك</div>
          <h2 style={{ fontSize: 'clamp(20px,3.4vw,32px)', fontWeight: 900, color: C.text, lineHeight: 1.25 }}>
            كل شي محتاجه <span className="grad-text">في شاشة واحدة</span>
          </h2>
        </div>

        <div className="lp-cinema-grid">
          {/* المشاهد النصية المتبادلة */}
          <div className="lp-caption-box">
            {STORY.map((s, i) => <StoryCaption key={i} i={i} p={p} story={s} />)}
          </div>

          {/* الموبايل يدور بالفراغ + شرائح طايرة */}
          <div className="lp-cinema-phone-wrap" style={{ perspective: 1200 }}>
            <StoryChip i={0} p={p} chip={STORY[0].chip} pos={{ top: 70, insetInlineStart: 'max(0px, calc(50% - 240px))' }} />
            <StoryChip i={1} p={p} chip={STORY[1].chip} pos={{ top: 150, insetInlineEnd: 'max(0px, calc(50% - 245px))' }} />
            <StoryChip i={2} p={p} chip={STORY[2].chip} pos={{ bottom: 110, insetInlineStart: 'max(0px, calc(50% - 250px))' }} />
            <motion.div className="lp-cinema-phone" style={{ rotateY: phoneRotY, rotateX: phoneRotX, scale: phoneScale, transformStyle: 'preserve-3d' }}>
              <PhoneMockup />
            </motion.div>
          </div>
        </div>

        {/* نقاط التقدّم */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {STORY.map((s, i) => <StoryDot key={i} i={i} p={p} color={s.color} />)}
        </div>
      </div>
    </section>
  )
}

// ─── Features grid — باقي الميزات بعد المشهد السينمائي ───────────────────────
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLoggedIn(true)
    })
  }, [])

  return (
    <>
      <style>{css}</style>
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
        <ScrollProgress />
        <Navbar loggedIn={loggedIn} />
        <Hero />
        <StatsStrip />
        <PainPoints />
        <CinemaShowcase />
        <FeaturesGrid />
        <Testimonials />
        <PricingTeaser />
        <FinalCTA />
        <Footer />
      </div>
    </>
  )
}
