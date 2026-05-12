import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
      <div className="slide-up" style={{ position: 'relative', width: '100%', maxWidth: 430, maxHeight: '92vh', background: C.surface, borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', boxShadow: '0 -16px 60px rgba(0,0,0,0.7)', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: C.borderMid }} />
        </div>
        <div style={{ height: 1, background: GRAD.brand, margin: '10px 20px 0', borderRadius: 1, flexShrink: 0 }} />
        {/* Header */}
        <div style={{ padding: '14px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '50%', width: 32, height: 32, color: C.textDim, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>✕</button>
        </div>
        {/* Scrollable body */}
        <div style={{ padding: '0 20px 12px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {/* Sticky action footer — always visible above nav bar */}
        {action && (
          <div style={{ padding: '12px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
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
      {error && <div style={{ fontSize: 11, color: C.accent, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>⚠ {error}</div>}
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
          ? `0 2px 8px ${isPrimary ? '#00DDB322' : color + '22'}`
          : solid && !disabled
            ? `0 6px 24px ${isPrimary ? '#00DDB355' : color + '55'}, 0 1px 0 rgba(255,255,255,0.18) inset`
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
        boxShadow: active ? `0 4px 16px ${color}44` : 'none',
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
      <div style={{ background: GRAD.danger, color: '#fff', padding: '14px 18px', borderRadius: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 8px 32px #F43F5E55` }}>
        <span>⚠ {message}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', padding: '3px 8px', marginRight: 8 }}>✕</button>
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
        <span>✓ {message}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', padding: '3px 8px', marginRight: 8 }}>✕</button>
      </div>
    </div>
  )
}

/* ─── LoadingSpinner ─── */
export function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div style={{ position: 'absolute', inset: 0, border: `3px solid ${C.border}`, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 7, border: '2px solid transparent', borderTopColor: C.secondary, borderRadius: '50%', animation: 'spin .5s linear infinite reverse' }} />
      </div>
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
