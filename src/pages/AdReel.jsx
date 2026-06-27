import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, ArrowLeft, MousePointerClick, HardHat } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { IDEAS, IDEAS_HE, SCREEN_MAP, Phone } from './AdStudio.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  AD REEL — نسخة فيديو ٩:١٦ من بوسترات AdStudio (هوك متحرّك → موبايل بشاشة
//  حقيقية → CTA). كابشن محروق للمشاهدة بلا صوت.
//
//  التايملاين كلّه دالّة نقيّة من الزمن tMs → نفس الإطار يُرسم بنفس الطريقة دائماً:
//   • وضع التشغيل (افتراضي): حلقة rAF تقدّم الزمن — للمعاينة بالمتصفّح.
//   • وضع seek (?seek=1): لا مؤقّتات؛ سكربت reel-shots.mjs يستدعي window.__seekTo(ms)
//     لكل إطار ثم يلتقط لقطة → فيديو ناعم تماماً بمعدّل إطارات ثابت (بلا تقطيع).
//
//  المسار: /adreel?idea=N&dur=11000[&seek=1]
// ═══════════════════════════════════════════════════════════════════════════

const STAGE = { w: 1080, h: 1920 }

const TONE = {
  brand:   { c: C.primary,   grad: GRAD.primary, glow: 'rgba(249,115,22,0.45)' },
  success: { c: C.success,   grad: GRAD.success, glow: 'rgba(34,197,94,0.45)'  },
  cyan:    { c: C.cyan,      grad: GRAD.cyan,    glow: 'rgba(6,182,212,0.45)'  },
  premium: { c: C.secondary, grad: GRAD.purple,  glow: 'rgba(124,58,237,0.45)' },
  gold:    { c: C.gold,      grad: GRAD.gold,    glow: 'rgba(217,119,6,0.45)'  },
  danger:  { c: C.accent,    grad: GRAD.danger,  glow: 'rgba(239,68,68,0.45)'  },
}

// ─── أدوات التايملاين (easing نقيّة) ──────────────────────────────────────────
const clamp01 = x => Math.max(0, Math.min(1, x))
const easeOutCubic = x => 1 - Math.pow(1 - x, 3)
const lerp = (a, b, p) => a + (b - a) * p
// تقدّم مقطع: من اللحظة s، مدّته d
const seg = (t, s, d, ease = easeOutCubic) => ease(clamp01((t - s) / d))

export default function AdReel() {
  const params = new URLSearchParams(window.location.search)
  const lang   = params.get('lang') === 'he' ? 'he' : 'ar'
  const he     = lang === 'he'
  const list   = he ? IDEAS_HE : IDEAS
  const i      = Number(params.get('idea') || 0)
  const idea   = list[i] || list[0]
  // الأفكار العبرية تحمل screen خاصّها؛ العربية تستعمل SCREEN_MAP حسب الفهرس
  const map    = idea.screen ? { s: idea.screen, f: idea.focus } : (SCREEN_MAP[i] || { s: 'dashboard' })
  const t       = TONE[idea.tone] || TONE.brand
  const dur     = Number(params.get('dur') || 11000)
  const seekMode = params.has('seek')
  // نصوص واجهة الريل حسب اللغة (CTA/تذييل/خط) — مطابقة لـPoster في AdStudio
  const L = he
    ? { cta: 'נסה 14 יום חינם', link: 'הקישור בביו', brand: 'כבלאן', tagline: 'ניהול קבלנות מהנייד', font: "'Heebo', system-ui, sans-serif" }
    : { cta: 'جرّب 14 يوم مجاناً', link: 'الرابط بالبايو', brand: null, tagline: 'إدارة مقاولاتك من جيبك', font: "'Noto Sans Arabic', system-ui, sans-serif" }

  const [tMs, setTMs] = useState(seekMode ? 0 : 0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (seekMode) {
      // يتحكّم به السكربت: يضبط الزمن لكل إطار ثم يلتقط
      window.__seekTo = (ms) => setTMs(ms)
      window.__seekReady = true
      return () => { delete window.__seekTo; window.__seekReady = false }
    }
    // وضع التشغيل: حلقة rAF للمعاينة
    const start = performance.now()
    window.__reelDone = false
    const loop = (now) => {
      const e = now - start
      setTMs(e)
      if (e >= dur) { window.__reelDone = true; return }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [seekMode, dur])

  // ─── حساب كل الحالات من tMs ─────────────────────────────────────────────────
  const badge = { o: seg(tMs, 250, 500), y: lerp(-18, 0, seg(tMs, 250, 500)) }
  const hookP = seg(tMs, 350, 650)
  const hook  = { o: hookP, y: lerp(26, 0, hookP), blur: lerp(8, 0, hookP) }
  const subO  = seg(tMs, 800, 600)
  // الموبايل: انزلاق صاعد ثم طفو لطيف (متّصل عند نهاية الانزلاق)
  const slideY = lerp(620, 0, seg(tMs, 600, 1300))
  const floatY = tMs > 1900 ? -12 * Math.sin((tMs - 1900) / 1000) : 0
  const phone = { o: seg(tMs, 600, 600), y: slideY + floatY }
  // CTA
  const ctaP = seg(tMs, 7600, 600)
  const cta  = { o: ctaP, y: lerp(40, 0, ctaP), pulse: tMs > 7600 ? 1 + 0.045 * Math.sin((tMs - 7600) / 240) : 1 }
  // توهّج نابض (دالّة جيبية = قابل للـseek)
  const glow = { o: 0.42 + 0.14 * Math.sin(tMs / 720), s: 1 + 0.06 * Math.sin(tMs / 720) }

  return (
    <div style={{
      width: STAGE.w, height: STAGE.h, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 70% at 80% -8%, ${t.c}24, transparent 52%), radial-gradient(100% 60% at -10% 108%, ${t.glow.replace('0.45', '0.16')}, transparent 48%), ${C.bg}`,
      fontFamily: L.font, direction: 'rtl', color: C.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '120px 72px 96px',
    }}>
      {/* شبكة خفيفة */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: '56px 56px', maskImage: 'radial-gradient(circle at 50% 32%, #000 28%, transparent 72%)', WebkitMaskImage: 'radial-gradient(circle at 50% 32%, #000 28%, transparent 72%)' }} />
      {/* توهّج نابض خلف الموبايل */}
      <div aria-hidden style={{ position: 'absolute', top: '40%', insetInline: 0, margin: 'auto', width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 66%)`, filter: 'blur(10px)', opacity: glow.o, transform: `scale(${glow.s})` }} />

      {/* الشارة */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 22px', borderRadius: 99, background: `${t.c}1a`, border: `1px solid ${t.c}44`, marginBottom: 30, opacity: badge.o, transform: `translateY(${badge.y}px)` }}>
        <Sparkles size={22} color={t.c} />
        <span style={{ fontSize: 22, fontWeight: 800, color: t.c }}>{idea.tag}</span>
      </div>

      {/* الهوك */}
      <h1 style={{ position: 'relative', textAlign: 'center', fontSize: 78, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.035em', margin: 0, maxWidth: 920, opacity: hook.o, transform: `translateY(${hook.y}px)`, filter: `blur(${hook.blur}px)` }}>
        {idea.kw}{' '}
        <span style={{ background: t.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{idea.head}</span>
      </h1>

      {/* الكابشن المحروق */}
      <p style={{ position: 'relative', textAlign: 'center', fontSize: 27, lineHeight: 1.55, color: C.textDim, fontWeight: 500, margin: '26px 0 0', maxWidth: 800, opacity: subO }}>
        {idea.sub}
      </p>

      {/* الموبايل */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginTop: 44, width: '100%', opacity: phone.o, transform: `translateY(${phone.y}px)` }}>
        <Phone screen={map.s} focus={map.f} scale={1.5} lang={he ? 'he' : undefined} />
      </div>

      {/* CTA السفلي */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: 30, opacity: cta.o, transform: `translateY(${cta.y}px)` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 38px', borderRadius: 20, background: GRAD.success, boxShadow: `0 16px 40px ${C.success}55`, transform: `scale(${cta.pulse})` }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: '#062b14' }}>{L.cta}</span>
          <ArrowLeft size={28} color="#062b14" strokeWidth={2.8} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: C.text }}>
          <MousePointerClick size={24} color={t.c} />
          <span style={{ fontSize: 24, fontWeight: 800 }}>{L.link}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${C.primary}55` }}>
            <HardHat size={30} color="#fff" strokeWidth={2.4} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {L.brand ? <span>{L.brand}</span> : <>Contractor <span style={{ color: C.primary }}>Pro</span></>}
            </div>
            <div style={{ fontSize: 15, color: C.textDim, fontWeight: 600 }}>{L.tagline}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
