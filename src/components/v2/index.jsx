import React, { useState } from 'react'
import { T, G } from '../../constants/themeV2.js'

/* ─── Card ──────────────────────────────────────────────────────────── */
export function Card({ children, style: st = {}, onClick, accent, glow }) {
  const [prs, setPrs] = useState(false)
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPrs(false) }}
      onMouseDown={() => onClick && setPrs(true)}
      onMouseUp={() => setPrs(false)}
      onTouchStart={() => onClick && setPrs(true)}
      onTouchEnd={() => { setPrs(false) }}
      style={{
        background: hov && onClick ? T.cardHover : T.card,
        border: `1px solid ${hov && onClick ? T.borderHi : T.border}`,
        borderRadius: 14,
        cursor: onClick ? 'pointer' : 'default',
        transform: prs ? 'scale(0.978)' : hov && onClick ? 'translateY(-1px)' : 'none',
        boxShadow: hov && onClick
          ? `0 12px 40px rgba(0,0,0,0.5)${glow ? `, 0 0 20px ${glow}33` : ''}`
          : `0 2px 16px rgba(0,0,0,0.3)${glow ? `, 0 0 12px ${glow}22` : ''}`,
        transition: 'all .18s cubic-bezier(0.22,1,0.36,1)',
        overflow: 'hidden',
        marginBottom: 10,
        ...st,
      }}
    >
      {accent && <div style={{ height: 2, background: accent, borderRadius: '14px 14px 0 0' }} />}
      {children}
    </div>
  )
}

/* ─── StatCard ──────────────────────────────────────────────────────── */
export function StatCard({ icon, label, value, color = T.primary, sub, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.card,
        border: `1px solid ${hov ? color + '33' : T.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transform: hov && onClick ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${color}22` : '0 2px 12px rgba(0,0,0,0.25)',
        transition: 'all .2s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: color, borderRadius: '14px 14px 0 0', opacity: 0.9 }} />
      <div style={{ padding: '12px 14px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: T.textSub, fontWeight: 600, maxWidth: '68%', lineHeight: 1.4 }}>{label}</div>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Space Grotesk', monospace", letterSpacing: '-0.5px' }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Btn ───────────────────────────────────────────────────────────── */
export function Btn({ children, onClick, color = T.primary, variant = 'solid', full, disabled, size = 'md' }) {
  const [prs, setPrs] = useState(false)
  const solid = variant === 'solid'
  const isPrimary = color === T.primary
  const pad = size === 'sm' ? '8px 16px' : '12px 24px'
  const fs  = size === 'sm' ? 12 : 14
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setPrs(true)}
      onMouseUp={() => setPrs(false)}
      onTouchStart={() => setPrs(true)}
      onTouchEnd={() => setPrs(false)}
      style={{
        padding: pad, borderRadius: 10,
        border: solid ? 'none' : `1.5px solid ${color}55`,
        background: solid ? (isPrimary ? G.brand : color) : `${color}12`,
        color: solid ? '#fff' : color,
        fontSize: fs, fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        width: full ? '100%' : 'auto',
        transform: prs && !disabled ? 'scale(0.95)' : 'scale(1)',
        transition: 'all .1s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: prs ? 'none' : solid && !disabled ? `0 4px 20px ${color}44` : 'none',
        letterSpacing: '0.02em',
      }}
    >{children}</button>
  )
}

/* ─── Input ─────────────────────────────────────────────────────────── */
export function Input({ label, value, onChange, type = 'text', placeholder, required, options, min, max, step, error }) {
  const base = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1px solid ${error ? T.danger + '66' : T.border}`,
    background: T.surface, color: T.text, fontSize: 14,
    boxSizing: 'border-box', outline: 'none',
    transition: 'border-color .15s',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ fontSize: 11, color: T.textSub, display: 'block', marginBottom: 6, fontWeight: 700, letterSpacing: '0.03em' }}>
          {label}{required && <span style={{ color: T.danger, marginRight: 2 }}>*</span>}
        </label>
      )}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...base }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} min={min} max={max} step={step} style={{ ...base }} />
      )}
      {error && <div style={{ fontSize: 11, color: T.danger, marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  )
}

/* ─── Badge ─────────────────────────────────────────────────────────── */
export function Badge({ children, color = T.primary }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color, background: `${color}18`, border: `1px solid ${color}33`, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
      {children}
    </span>
  )
}

/* ─── SectionLabel ──────────────────────────────────────────────────── */
export function SectionLabel({ children, color = T.textSub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: T.textSub, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{children}</span>
      </div>
      {action && (
        <button onClick={onAction}
          style={{ fontSize: 11, fontWeight: 700, color, background: `${color}14`, border: `1px solid ${color}33`, padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}

/* ─── EmptyState ────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 20px', color: T.textMuted, background: T.surface, borderRadius: 14, border: `1px dashed ${T.border}` }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.textSub, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMuted }}>{sub}</div>}
    </div>
  )
}

/* ─── Chip ──────────────────────────────────────────────────────────── */
export function Chip({ children, active, onClick, color = T.primary }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 8,
      border: `1px solid ${active ? color + '55' : T.border}`,
      background: active ? `${color}18` : 'transparent',
      color: active ? color : T.textSub,
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      boxShadow: active ? `0 0 12px ${color}22` : 'none',
      transition: 'all .18s cubic-bezier(0.22,1,0.36,1)',
      transform: active ? 'scale(1.03)' : 'scale(1)',
    }}>
      {children}
    </button>
  )
}
