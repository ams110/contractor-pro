import { useId } from 'react'
import { Hammer } from 'lucide-react'
import { C } from '../constants/index.js'
import { HammerGlyph } from '../components/index.jsx'

// نسخة كلّها برتقالي من شكل الـ3D (رأس برتقالي بدل فولاذي)
function HammerMono({ size = 84 }) {
  const u = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ filter: `drop-shadow(0 4px 10px ${C.primary}80)` }}>
      <defs>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FDBA74" /><stop offset="1" stopColor="#EA580C" /></linearGradient>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FB923C" /><stop offset="1" stopColor="#9A3412" /></linearGradient>
      </defs>
      <rect x="28" y="23" width="8" height="34" rx="4" fill={`url(#${u}w)`} />
      <rect x="27.5" y="19.5" width="9" height="6.5" rx="2" fill="#9A3412" />
      <rect x="13" y="10" width="38" height="13.5" rx="5" fill={`url(#${u}h)`} />
      <rect x="44" y="6.5" width="9.5" height="20" rx="3.5" fill={`url(#${u}h)`} />
      <rect x="17" y="12" width="22" height="3" rx="1.5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  )
}

// مطرقة مسطّحة برتقالية بسيطة (نمط الشعار المصمت)
function HammerFlat({ size = 84 }) {
  const u = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ filter: `drop-shadow(0 4px 10px ${C.primary}80)` }}>
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FB923C" /><stop offset="1" stopColor="#DC2626" /></linearGradient></defs>
      <rect x="13" y="12" width="38" height="16" rx="7" fill={`url(#${u}g)`} />
      <rect x="29" y="26" width="6" height="28" rx="3" fill={`url(#${u}g)`} />
      <rect x="18" y="15" width="20" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.45" />
    </svg>
  )
}

// مخلب كلاسيكي (claw) silhouette مصمت
function HammerClaw({ size = 84 }) {
  const u = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ filter: `drop-shadow(0 4px 10px ${C.primary}80)` }}>
      <defs><linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FDBA74" /><stop offset="1" stopColor="#EA580C" /></linearGradient></defs>
      {/* المقبض */}
      <rect x="29" y="22" width="6.5" height="34" rx="3.25" fill={`url(#${u}g)`} />
      {/* الرأس: وجه يمين + مخلب يسار منحنٍ */}
      <path d="M40 9h6a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-6v-4l-2.5-2.5a2 2 0 0 0-1.4-.6h-7.6c-4 0-6-2.2-6.5-5.2-.5-3 1-5 3-6.4l2.2 3.4c-1 .7-1.4 1.6-1.2 2.6.2 1 .9 1.6 2.3 1.6H37l3 3z" fill={`url(#${u}g)`} />
      <rect x="40" y="11.5" width="8" height="3" rx="1.5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  )
}

const OPTIONS = [
  { n: 1, label: 'إيموجي 🔨', el: <div style={{ fontSize: 70, lineHeight: 1, filter: `drop-shadow(0 4px 12px ${C.primary}66)` }}>🔨</div> },
  { n: 2, label: 'خطّي (Lucide) برتقالي', el: <Hammer size={80} color={C.primary} strokeWidth={2.2} style={{ filter: `drop-shadow(0 4px 10px ${C.primary}70)` }} /> },
  { n: 3, label: '3D فولاذي + برتقالي (الحالي)', el: <HammerGlyph size={84} glow /> },
  { n: 4, label: '3D كلّه برتقالي', el: <HammerMono size={84} /> },
  { n: 5, label: 'مطرقة مسطّحة برتقالي', el: <HammerFlat size={84} /> },
  { n: 6, label: 'مخلب كلاسيكي مصمت', el: <HammerClaw size={84} /> },
]

export default function HammerPreview() {
  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: '#07080F', color: '#F8FAFC', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 18, fontWeight: 900, textAlign: 'center', marginBottom: 22 }}>اختر شكل الشاكوش — قول رقمه</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, maxWidth: 720, margin: '0 auto' }}>
        {OPTIONS.map(o => (
          <div key={o.n} style={{ background: '#12152A', border: '1px solid rgba(249,115,22,0.18)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minHeight: 168, justifyContent: 'center' }}>
            <div style={{ height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.el}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#F97316' }}>#{o.n}</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', textAlign: 'center' }}>{o.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
