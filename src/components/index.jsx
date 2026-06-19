import React, { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, X } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'

/* ─── AnimatedNumber ─── */
export function AnimatedNumber({ value, prefix = '', suffix = '', duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(0)
  const frameRef = useRef(null)
  useEffect(() => {
    const target = value || 0
    const from = startRef.current
    const t0 = performance.now()
    cancelAnimationFrame(frameRef.current)
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (target - from) * e))
      if (p < 1) frameRef.current = requestAnimationFrame(tick)
      else startRef.current = target
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])
  return <span>{prefix}{display.toLocaleString('en-US')}{suffix}</span>
}

/* ─── GlassCard ─── */
export function GlassCard({ children, style: st = {}, onClick, glow }) {
  const [hov, setHov] = useState(false)
  const [prs, setPrs] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPrs(false) }}
      onMouseDown={() => onClick && setPrs(true)}
      onMouseUp={() => setPrs(false)}
      onTouchStart={() => onClick && setPrs(true)}
      onTouchEnd={() => setPrs(false)}
      style={{
        background: hov && onClick ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${hov && onClick ? 'rgba(255,255,255,0.13)' : C.border}`,
        borderRadius: 20,
        cursor: onClick ? 'pointer' : 'default',
        transform: prs && onClick ? 'scale(0.975)' : hov && onClick ? 'translateY(-2px)' : 'none',
        boxShadow: hov && onClick
          ? '0 16px 48px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset'
          : glow ? `0 0 28px ${glow}33` : '0 2px 14px rgba(0,0,0,0.22)',
        transition: 'all .22s cubic-bezier(0.22,1,0.36,1)',
        marginBottom: 10,
        ...st,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Card (alias for GlassCard with slightly different defaults) ─── */
export function Card({ children, style: st = {}, onClick, glow, accent }) {
  return (
    <GlassCard style={{ marginBottom: 10, overflow: 'hidden', ...st }} onClick={onClick} glow={glow}>
      {accent && <div style={{ height: 3, background: accent, borderRadius: '20px 20px 0 0', marginBottom: 0 }} />}
      {children}
    </GlassCard>
  )
}

/* ─── StatCard ─── */
export function StatCard({ icon, label, value, color = C.primary, sub, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(145deg, ${color}0d 0%, rgba(255,255,255,0.03) 60%)`,
        border: `1px solid ${hov ? color + '44' : color + '1a'}`,
        borderRadius: 18,
        padding: '0 0 14px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transform: hov && onClick ? 'translateY(-3px)' : 'none',
        transition: 'all .25s',
        boxShadow: hov
          ? `0 10px 32px rgba(0,0,0,0.35), 0 0 0 1px ${color}33`
          : `0 2px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* top accent strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color} 0%, ${color}66 60%, transparent 100%)`, borderRadius: '18px 18px 0 0', marginBottom: 14 }} />
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, lineHeight: 1.4, maxWidth: '68%', letterSpacing: '0.02em' }}>{label}</div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${color}2a 0%, ${color}12 100%)`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: `0 4px 12px ${color}22` }}>{icon}</div>
        </div>
        <div style={{ fontSize: 23, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.5px', textShadow: `0 0 20px ${color}55` }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: C.textDim, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Modal (Bottom Sheet via Portal) ─── */
export function Modal({ open, onClose, title, children, action }) {
  if (!open) return null
  const sheet = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }} onClick={onClose} />
      <div className="slide-up" style={{ position: 'relative', width: '100%', maxWidth: 430, maxHeight: 'calc(92vh - 80px)', background: C.surface, borderRadius: 24, marginBottom: 'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))', display: 'flex', flexDirection: 'column', boxShadow: '0 -16px 60px rgba(0,0,0,0.7)', border: `1px solid ${C.border}` }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: C.borderMid }} />
        </div>
        <div style={{ height: 1, background: GRAD.brand, margin: '10px 20px 0', borderRadius: 1, flexShrink: 0 }} />
        {/* Header */}
        <div style={{ padding: '14px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '50%', width: 32, height: 32, color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}><X size={15} strokeWidth={2.4} /></button>
        </div>
        {/* Scrollable body */}
        <div style={{ padding: '0 20px 12px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {action && (
          <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
            {action}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

/* ─── Input ─── */
export function Input({ label, value, onChange, type = 'text', placeholder = '', options, required, error, min, max }) {
  const [focused, setFocused] = useState(false)
  const base = {
    width: '100%',
    padding: '13px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${error ? C.accent : focused ? C.primary : C.border}`,
    borderRadius: 14,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all .2s',
    direction: (type === 'number' || type === 'date' || type === 'tel') ? 'ltr' : 'rtl',
    boxShadow: focused ? `0 0 0 3px ${error ? C.accent : C.primary}1a` : 'none',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: focused ? C.primary : C.textDim, marginBottom: 6, display: 'block', transition: 'color .2s', letterSpacing: '0.03em' }}>
        {label}{required && <span style={{ color: C.accent }}> *</span>}
      </label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...base, appearance: 'auto' }}>
            <option value="">اختر...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} min={min} max={max} style={base} />
      }
      {error && <div style={{ fontSize: 11, color: C.accent, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} strokeWidth={2.2} /> {error}</div>}
    </div>
  )
}

/* ─── Btn ─── */
export function Btn({ children, onClick, color = C.primary, variant = 'solid', full, disabled }) {
  const [pressed, setPressed] = useState(false)
  const solid = variant === 'solid'
  const isPrimary = solid && color === C.primary
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{
        padding: '13px 24px', borderRadius: 15,
        border: solid ? 'none' : `1.5px solid ${color}55`,
        background: solid ? (isPrimary ? GRAD.brand : color) : `${color}12`,
        color: solid ? (isPrimary ? '#000' : '#fff') : color,
        fontSize: 14, fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        width: full ? '100%' : 'auto',
        transform: pressed && !disabled ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform .1s cubic-bezier(0.22,1,0.36,1), box-shadow .18s, opacity .2s',
        boxShadow: pressed && solid && !disabled
          ? `0 2px 8px ${isPrimary ? C.primary + '22' : color + '22'}`
          : solid && !disabled
            ? `0 6px 24px ${isPrimary ? C.primary + '55' : color + '55'}, 0 1px 0 rgba(255,255,255,0.18) inset`
            : 'none',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </button>
  )
}

/* ─── FilterChip ─── */
export function FilterChip({ label, active, onClick, color = C.primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 22,
        border: active ? 'none' : `1px solid rgba(255,255,255,0.07)`,
        background: active ? (color === C.primary ? GRAD.brand : color) : 'rgba(255,255,255,0.05)',
        color: active ? (color === C.primary ? '#000' : '#fff') : C.textDim,
        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        transform: active ? 'scale(1.02)' : 'scale(1)',
        transition: 'all .2s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: active ? `0 3px 14px ${color}44` : 'none',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

/* ─── TabBar ─── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
      {tabs.map(t => <FilterChip key={t} label={t} active={active === t} onClick={() => onChange(t)} />)}
    </div>
  )
}

/* ─── Badge ─── */
export function Badge({ text, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {text}
    </span>
  )
}

/* ─── SectionLabel ─── */
export function SectionLabel({ children, color = C.primary, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: `linear-gradient(180deg, ${color}, ${color}44)` }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{children}</span>
      </div>
      {action && (
        <button onClick={onAction} style={{ fontSize: 11, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 20, padding: '4px 12px', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}

/* ─── EmptyState ─── */
export function EmptyState({ icon, text, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '52px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14, color: C.textDim, marginBottom: 22, lineHeight: 1.7 }}>{text}</div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
    </div>
  )
}

/* ─── ConfirmDialog ─── */
export function ConfirmDialog({ open, onClose, onConfirm, message }) {
  if (!open) return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }} onClick={onClose} />
      <div className="fade-in" style={{ position: 'relative', background: C.surface, borderRadius: 24, padding: 28, maxWidth: 310, width: '90%', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, color: C.text, marginBottom: 24, textAlign: 'center', lineHeight: 1.7 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={onClose} variant="outline" color={C.textDim} full>إلغاء</Btn>
          <Btn onClick={onConfirm} color={C.accent} full>حذف</Btn>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── ErrorToast ─── */
export function ErrorToast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast-in" style={{ position: 'fixed', bottom: 'max(140px, calc(120px + env(safe-area-inset-bottom, 0px)))', left: '50%', transform: 'translateX(-50%)', zIndex: 300, maxWidth: 380, width: '90%' }}>
      <div style={{ background: GRAD.danger, color: '#fff', padding: '14px 18px', borderRadius: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 8px 32px ${C.accent}55` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={15} strokeWidth={2.4} /> {message}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: 4, marginRight: 8, display: 'flex' }}><X size={14} strokeWidth={2.5} /></button>
      </div>
    </div>
  )
}

/* ─── SuccessToast ─── */
export function SuccessToast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast-in" style={{ position: 'fixed', bottom: 'max(140px, calc(120px + env(safe-area-inset-bottom, 0px)))', left: '50%', transform: 'translateX(-50%)', zIndex: 300, maxWidth: 380, width: '90%' }}>
      <div style={{ background: GRAD.success, color: '#fff', padding: '14px 18px', borderRadius: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 8px 32px #22C55E55` }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={15} strokeWidth={2.6} /> {message}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: 4, marginRight: 8, display: 'flex' }}><X size={14} strokeWidth={2.5} /></button>
      </div>
    </div>
  )
}

/* ─── شعار شاكوش مرسوم (SVG مخصّص — منظر «إيموجي» مجسّم بألوان الهوية، بلا إيموجي) ─── */
// رأس فولاذي متدرّج + مقبض برتقالي (هوية)، فبياخد دفء شكل الإيموجي ويبقى متلوّناً
// ومتناسقاً ومتّسقاً عبر كل الأجهزة (بعكس غليف الإيموجي). يلتزم بقاعدة «أيقونات فقط».
export function HammerGlyph({ size = 44, glow = false }) {
  const u = useId().replace(/[:]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true"
      style={glow ? { filter: `drop-shadow(0 4px 10px ${C.primary}80)` } : undefined}>
      <defs>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset="0.5" stopColor="#94A3B8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      {/* المقبض */}
      <rect x="28" y="23" width="8" height="34" rx="4" fill={`url(#${u}w)`} />
      <rect x="30.4" y="26" width="1.7" height="28" rx="0.85" fill="#FFFFFF" opacity="0.22" />
      {/* العنق */}
      <rect x="27.5" y="19.5" width="9" height="6.5" rx="2" fill="#334155" />
      {/* رأس الشاكوش */}
      <rect x="13" y="10" width="38" height="13.5" rx="5" fill={`url(#${u}s)`} />
      {/* وجه الطرق (يمين، أعرض) */}
      <rect x="44" y="6.5" width="9.5" height="20" rx="3.5" fill={`url(#${u}s)`} />
      {/* لمعة علويّة */}
      <rect x="17" y="12" width="22" height="3" rx="1.5" fill="#FFFFFF" opacity="0.45" />
    </svg>
  )
}

/* ─── LoadingSpinner — شاكوش يدقّ (طابع المقاولات) ─── */
// شاكوش (SVG مخصّص) يتأرجح/يدقّ + توهّج نابض + ٣ نقاط متتابعة بألوان الهوية.
// CSS نقيّ ومستقلّ (يعمل حتى كـ Suspense fallback). يحترم prefers-reduced-motion.
export function LoadingSpinner({ size = 60, label }) {
  const dot = Math.max(5, Math.round(size * 0.1))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <style>{`
        @keyframes cpHmrTap  { 0%,26%{transform:rotate(-16deg)} 44%{transform:rotate(13deg)} 60%,100%{transform:rotate(-16deg)} }
        @keyframes cpHmrGlow { 0%,100%{opacity:.28;transform:translate(-50%,-50%) scale(.92)} 50%{opacity:.58;transform:translate(-50%,-50%) scale(1.12)} }
        @keyframes cpHmrDot  { 0%,75%,100%{opacity:.22;transform:scale(.75)} 38%{opacity:1;transform:scale(1)} }
        @media (prefers-reduced-motion: reduce){ .cp-hmr *{animation-duration:0s!important;animation-iteration-count:1!important} }
      `}</style>

      <div className="cp-hmr" style={{ position: 'relative', width: size, height: size }}>
        {/* توهّج نابض */}
        <div style={{ position: 'absolute', top: '52%', left: '50%', width: size * 0.95, height: size * 0.95, borderRadius: '50%', background: `radial-gradient(circle, ${C.primary}55, transparent 70%)`, animation: 'cpHmrGlow 1.05s ease-in-out infinite' }} />

        {/* الشاكوش يدقّ */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transformOrigin: '50% 86%', animation: 'cpHmrTap 1.05s cubic-bezier(.45,0,.25,1) infinite' }}>
            <HammerGlyph size={size * 0.74} glow />
          </div>
        </div>
      </div>

      {/* نقاط تحميل متتابعة */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[C.primary, C.gold, C.secondary].map((c, i) => (
          <span key={i} style={{ width: dot, height: dot, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}80`, animation: `cpHmrDot 1.05s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>

      {label && <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: '.02em' }}>{label}</div>}
    </div>
  )
}

/* ─── Skeleton ─── */
export function Skeleton({ height = 16, width = '100%', radius = 8, style: st = {} }) {
  return (
    <div style={{ height, width, borderRadius: radius, background: `linear-gradient(90deg, ${C.card} 0%, ${C.borderMid} 50%, ${C.card} 100%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', ...st }} />
  )
}

/* ─── PulseIndicator ─── */
export function PulseIndicator({ color = C.success, size = 8 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'ping 1.5s ease-out infinite' }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block' }} />
    </span>
  )
}

/* ─── AmountDisplay ─── */
export function AmountDisplay({ value, size = 18, positive = true }) {
  const color = positive ? C.success : C.accent
  return (
    <span style={{ fontSize: size, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
      {(value || 0).toLocaleString('en-US')}₪
    </span>
  )
}
