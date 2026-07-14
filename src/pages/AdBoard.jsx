import React from 'react'
import { HardHat, ArrowLeft, Building2, Users, HandCoins, Calculator, MousePointerClick } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { Phone } from './AdStudio.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  AD BOARD — سلايدات كاروسيل تيك توك (Photo Mode) بلغة «لوحة البراند» الداكنة:
//  خلايا مرقّمة، تايبوغرافي ضخم، شبكة هندسية خفيفة، وصور سينمائية (Higgsfield)
//  في public/adboard/. الشاشات داخل الموبايل حقيقية عبر /demoshot (لا AI للواجهة).
//
//  المسار: /adboard?slide=0..5           ← سلايد كاروسيل 1080×1920
//          /adboard?overlay=1            ← هوك شفّاف للتركيب فوق فيديو (ffmpeg)
//  الالتقاط: scripts/board-shots.mjs
//
//  مناطق تيك توك الآمنة (2026): النص الأساسي فوق ~480px من الأسفل وبعيد ~140px
//  عن اليمين — كل كتل النص هنا ملتزمة بذلك.
// ═══════════════════════════════════════════════════════════════════════════

const W = 1080, H = 1920
const FONT = "'Noto Sans Arabic', system-ui, sans-serif"

// رقم الخلية بأسلوب اللوحة (أعلى البطاقة، أرقام لاتينية خافتة)
function CellNo({ n }) {
  return (
    <span style={{ position: 'absolute', top: 54, insetInlineStart: 60, fontSize: 30, fontWeight: 700, color: 'rgba(248,250,252,0.28)', letterSpacing: '0.12em', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
      {String(n).padStart(2, '0')}
    </span>
  )
}

// شبكة هندسية خفيفة كخلفية (نفس نبرة خلية بناء اللوغو باللوحة)
function GridBg({ opacity = 0.5 }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, opacity, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(circle at 50% 40%, #000 30%, transparent 78%)', WebkitMaskImage: 'radial-gradient(circle at 50% 40%, #000 30%, transparent 78%)' }} />
  )
}

// تذييل البراند الموحّد (شريحة الخوذة + كبلان) — يبقى فوق المنطقة الآمنة السفلية
function BrandFoot({ light }) {
  return (
    <div style={{ position: 'absolute', bottom: 510, insetInline: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 62, height: 62, borderRadius: 18, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 28px ${C.primary}55` }}>
        <HardHat size={34} color="#fff" strokeWidth={2.4} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', color: C.text }}>كبلان</div>
        <div style={{ fontSize: 16, color: light ? 'rgba(248,250,252,0.75)' : C.textDim, fontWeight: 700, letterSpacing: '0.22em', direction: 'ltr' }}>KABBLAN</div>
      </div>
    </div>
  )
}

// قشرة السلايد المشتركة: خلفية داكنة + إطار خلية رفيع + وميض زاوية
// deco: خوذة مخطّطة خافتة أسفل السلايد (تملأ المنطقة الآمنة السفلية بلا نص مهم)
function Shell({ n, children, bg, glow = C.primary, deco }) {
  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: bg || C.bg, fontFamily: FONT, direction: 'rtl', color: C.text }}>
      {/* إطار الخلية الرفيع بأسلوب اللوحة */}
      <div aria-hidden style={{ position: 'absolute', inset: 28, border: '1px solid rgba(248,250,252,0.09)', borderRadius: 6, pointerEvents: 'none', zIndex: 3 }} />
      {/* وميض زاوية */}
      <div aria-hidden style={{ position: 'absolute', top: -140, insetInlineEnd: -140, width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${glow}30, transparent 70%)`, filter: 'blur(6px)' }} />
      {deco && (
        <div aria-hidden style={{ position: 'absolute', bottom: -120, insetInlineStart: -80, opacity: 0.09 }}>
          <HardHat size={520} color={C.primary} strokeWidth={1.1} />
        </div>
      )}
      <CellNo n={n} />
      {children}
    </div>
  )
}

// صورة سينمائية full-bleed + سكريم قراءة (topScrim: تغميق علوي أقوى لنص أعلى الصورة)
function Photo({ src, topScrim }) {
  return (
    <>
      <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${C.bg} 6%, rgba(7,8,15,0.72) 26%, transparent 55%), linear-gradient(to bottom, rgba(7,8,15,${topScrim ? 0.82 : 0.55}) ${topScrim ? '12%' : '0%'}, transparent ${topScrim ? '42%' : '22%'})` }} />
    </>
  )
}

const H1 = { margin: 0, fontWeight: 900, lineHeight: 1.14, letterSpacing: '-0.03em', color: C.text }
const GRAD_TXT = { background: GRAD.warm, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }

// ─── السلايدات الست ───────────────────────────────────────────────────────────
function Slide0() { // الهوك التايبوغرافي (بأسلوب خلية «Built to run the site.»)
  const chips = [
    { icon: Building2, t: 'مشاريع' }, { icon: Users, t: 'عمّال' },
    { icon: HandCoins, t: 'رواتب' }, { icon: Calculator, t: 'ضرائب' },
  ]
  return (
    <Shell n={1} deco>
      <GridBg />
      <div style={{ position: 'absolute', top: 360, insetInline: 84 }}>
        <div style={{ width: 74, height: 8, borderRadius: 99, background: GRAD.brand, marginBottom: 44 }} />
        <h1 style={{ ...H1, fontSize: 106 }}>مين ماسك<br /><span style={GRAD_TXT}>حسابات موقعك؟</span></h1>
        <p style={{ margin: '46px 0 0', fontSize: 37, lineHeight: 1.65, color: C.textDim, fontWeight: 600, maxWidth: 820 }}>
          الدفتر بيضيع، الإكسل بينسى، والمحاسب بيوصل آخر السنة.<br />اسحب وشوف. ←
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 60, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <span key={c.t} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 26px', borderRadius: 99, background: `${C.primary}16`, border: `1px solid ${C.primary}3a`, fontSize: 27, fontWeight: 800, color: C.text }}>
              <c.icon size={27} color={C.primary} />{c.t}
            </span>
          ))}
        </div>
      </div>
      <BrandFoot />
    </Shell>
  )
}

function Slide1() { // الخوذة السينمائية — النص بالمنطقة الداكنة العلوية (الخوذة بنص الصورة)
  return (
    <Shell n={2} glow="transparent">
      <Photo src="/adboard/helmet.jpg" topScrim />
      <div style={{ position: 'absolute', top: 170, insetInline: 84, textAlign: 'center', textShadow: '0 3px 26px rgba(0,0,0,0.8)' }}>
        <h1 style={{ ...H1, fontSize: 88 }}>الخوذة بتحمي راسك.<br /><span style={{ ...GRAD_TXT, filter: 'drop-shadow(0 3px 18px rgba(0,0,0,0.85))' }}>مين بيحمي فلوسك؟</span></h1>
        <p style={{ margin: '30px auto 0', fontSize: 33, lineHeight: 1.6, color: 'rgba(248,250,252,0.85)', fontWeight: 600, maxWidth: 720 }}>
          كل يوم عمل، كل سلفة، وكل شيكل — موثّق ومحسوب.
        </p>
      </div>
      <BrandFoot light />
    </Shell>
  )
}

function Slide2() { // شاشة العمّال الحقيقية داخل الموبايل
  return (
    <Shell n={3}>
      <GridBg />
      <div style={{ position: 'absolute', top: 150, insetInline: 70, textAlign: 'center' }}>
        <h1 style={{ ...H1, fontSize: 62 }}>كل عامل: أيامه، سلفه،<br /><span style={GRAD_TXT}>ومستحقّه محسوب لحاله.</span></h1>
        <p style={{ margin: '24px 0 0', fontSize: 31, color: C.textDim, fontWeight: 600 }}>بلا ورقة، بلا دفتر، بلا «كم بقيلي عندك؟»</p>
      </div>
      <div aria-hidden style={{ position: 'absolute', top: '48%', insetInline: 0, margin: 'auto', width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${C.primary}40 0%, transparent 66%)`, filter: 'blur(10px)' }} />
      <div style={{ position: 'absolute', top: 560, bottom: 470, insetInline: 0, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <Phone screen="workers" scale={1.45} />
      </div>
    </Shell>
  )
}

function Slide3() { // الرقم الضخم (بأسلوب خلية التايبوغرافي «KAB BLAN»)
  return (
    <Shell n={4} deco>
      <GridBg />
      <div style={{ position: 'absolute', top: 430, insetInline: 84 }}>
        <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: C.textDim }}>مستحق لعمّالك هالشهر:</p>
        <div style={{ margin: '26px 0 0', fontSize: 168, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...GRAD_TXT }}>₪38,200</div>
        <div style={{ width: '100%', height: 1, background: 'rgba(248,250,252,0.12)', margin: '54px 0' }} />
        <h1 style={{ ...H1, fontSize: 74 }}>بتعرفه بثانية.<br /><span style={{ color: C.textDim }}>مش بآخر الشهر لمّا يصير خلاف.</span></h1>
      </div>
      <BrandFoot />
    </Shell>
  )
}

function Slide4() { // الرافعة عند الغروب — شغلك ما بينام
  return (
    <Shell n={5} glow="transparent">
      <Photo src="/adboard/crane.jpg" />
      <div style={{ position: 'absolute', bottom: 640, insetInline: 84 }}>
        <h1 style={{ ...H1, fontSize: 104 }}>شغلك ما بينام.<br /><span style={GRAD_TXT}>حساباتك كمان.</span></h1>
        <p style={{ margin: '34px 0 0', fontSize: 34, lineHeight: 1.6, color: 'rgba(248,250,252,0.82)', fontWeight: 600 }}>
          توقّع السيولة، الضرائب، والأرباح — لحظة بلحظة من موبايلك.
        </p>
      </div>
      <BrandFoot light />
    </Shell>
  )
}

function Slide5() { // CTA (بأسلوب خلية اللوغو الافتتاحية باللوحة)
  return (
    <Shell n={6} deco>
      <GridBg opacity={0.65} />
      <div style={{ position: 'absolute', top: 360, insetInline: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 84px' }}>
        <div style={{ width: 210, height: 210, borderRadius: 52, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 30px 80px ${C.primary}66` }}>
          <HardHat size={118} color="#fff" strokeWidth={2.2} />
        </div>
        <h1 style={{ ...H1, fontSize: 118, marginTop: 64 }}>كبلان</h1>
        <p style={{ margin: '18px 0 0', fontSize: 34, color: C.textDim, fontWeight: 700, letterSpacing: '0.3em', direction: 'ltr' }}>KABBLAN</p>
        <p style={{ margin: '56px 0 0', fontSize: 40, fontWeight: 800, color: C.text, lineHeight: 1.6 }}>مقاولتك كلها — بجيبك.</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '30px 54px', borderRadius: 26, background: GRAD.success, boxShadow: `0 20px 54px ${C.success}55`, marginTop: 52 }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: '#062b14' }}>جرّب 14 يوم ببلاش</span>
          <ArrowLeft size={40} color="#062b14" strokeWidth={2.8} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 30, color: C.text }}>
          <MousePointerClick size={30} color={C.primary} />
          <span style={{ fontSize: 30, fontWeight: 800 }}>بلا بطاقة — الرابط بالبايو</span>
        </div>
      </div>
    </Shell>
  )
}

// ─── هوك شفّاف للتركيب فوق الفيديو السينمائي (ffmpeg overlay) ────────────────
function HookOverlay() {
  return (
    <div style={{ width: W, height: H, position: 'relative', background: 'transparent', fontFamily: FONT, direction: 'rtl', color: C.text }}>
      <div style={{ position: 'absolute', top: 300, insetInline: 84, textAlign: 'center', textShadow: '0 4px 34px rgba(0,0,0,0.85), 0 1px 8px rgba(0,0,0,0.9)' }}>
        <h1 style={{ ...H1, fontSize: 104 }}>الزبون بيدفع<br />بعد 70 يوم.</h1>
        <h1 style={{ ...H1, fontSize: 68, marginTop: 34, textShadow: 'none' }}>
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap', background: GRAD.brand, color: '#fff', padding: '10px 38px 20px', borderRadius: 22, boxShadow: '0 14px 44px rgba(0,0,0,0.55)' }}>المصاريف ما بتستنّى.</span>
        </h1>
      </div>
    </div>
  )
}

const SLIDES = [Slide0, Slide1, Slide2, Slide3, Slide4, Slide5]

export default function AdBoard() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('overlay')) return <HookOverlay />
  const i = Math.min(SLIDES.length - 1, Math.max(0, Number(params.get('slide') || 0)))
  const S = SLIDES[i]
  return <S />
}
