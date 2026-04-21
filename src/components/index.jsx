import React, { useState, useEffect, useRef } from 'react'
import { C } from '../constants/index.js'

/* ─── Animated Number ─── */
export function AnimatedNumber({ value, prefix = '', suffix = '', duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const target = value || 0
    const from   = startRef.current
    const t0     = performance.now()
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

/* ─── Modal (Bottom Sheet) ─── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)' }} onClick={onClose} />
      <div className="slide-up" style={{ position:'relative', width:'100%', maxWidth:430, maxHeight:'90vh', background:C.surface, borderRadius:'28px 28px 0 0', overflow:'hidden', boxShadow:'0 -12px 50px rgba(0,0,0,0.6)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:2 }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
        </div>
        <div style={{ padding:'10px 20px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:17, fontWeight:800, color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ background:`${C.border}66`, border:'none', borderRadius:'50%', width:32, height:32, color:C.textDim, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>✕</button>
        </div>
        <div style={{ padding:20, overflowY:'auto', maxHeight:'calc(90vh - 80px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Input ─── */
export function Input({ label, value, onChange, type = 'text', placeholder = '', options, required, error, min, max }) {
  const [focused, setFocused] = useState(false)
  const base = {
    width:'100%', padding:'13px 14px',
    background: C.bg,
    border:`1.5px solid ${error ? C.accent : focused ? C.primary : C.border}`,
    borderRadius:14, color:C.text, fontSize:14, outline:'none',
    boxSizing:'border-box',
    transition:'border-color .2s, box-shadow .2s',
    direction: (type === 'number' || type === 'date' || type === 'tel') ? 'ltr' : 'rtl',
    boxShadow: focused ? `0 0 0 3px ${error ? C.accent : C.primary}22` : 'none',
  }
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, color: focused ? C.primary : C.textDim, marginBottom:5, display:'block', transition:'color .2s', fontWeight:600 }}>
        {label}{required && <span style={{ color:C.accent }}> *</span>}
      </label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ ...base, appearance:'auto' }}>
            <option value="">اختر...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={placeholder} min={min} max={max} style={base} />
      }
      {error && <div style={{ fontSize:11, color:C.accent, marginTop:4, display:'flex', alignItems:'center', gap:4 }}>⚠ {error}</div>}
    </div>
  )
}

/* ─── Button ─── */
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
        padding:'13px 22px', borderRadius:14,
        border: solid ? 'none' : `1.5px solid ${color}`,
        background: solid ? (isPrimary ? `linear-gradient(135deg, ${C.primary} 0%, #0EA5E9 100%)` : color) : 'transparent',
        color: solid ? (isPrimary ? C.bg : '#fff') : color,
        fontSize:14, fontWeight:700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : 'auto',
        transform: pressed && !disabled ? 'scale(0.96)' : 'scale(1)',
        transition:'transform .12s, box-shadow .2s',
        boxShadow: solid && !disabled ? `0 4px 16px ${color}44` : 'none',
        letterSpacing:'0.02em',
      }}
    >
      {children}
    </button>
  )
}

/* ─── Card ─── */
export function Card({ children, style: st = {}, onClick, glow, accent }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card,
        borderRadius:18,
        border:`1px solid ${hovered && onClick ? C.primary + '55' : C.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition:'all .25s',
        marginBottom:10,
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        boxShadow: hovered && onClick
          ? `0 10px 30px rgba(0,0,0,0.35)`
          : glow
            ? `0 0 22px ${glow}33`
            : 'none',
        position:'relative',
        overflow: accent ? 'hidden' : 'visible',
        ...st
      }}
    >
      {accent && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, ${accent}66)`, borderRadius:'18px 18px 0 0' }} />
      )}
      {children}
    </div>
  )
}

/* ─── StatCard ─── */
export function StatCard({ icon, label, value, color = C.primary, sub, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.card,
        borderRadius:18,
        border:`1px solid ${hovered && onClick ? color + '55' : C.border}`,
        padding:'16px',
        position:'relative',
        overflow:'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transform: hovered && onClick ? 'translateY(-2px)' : 'none',
        transition:'all .25s',
        boxShadow: hovered && onClick ? `0 8px 25px ${color}22` : 'none',
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${color}, ${color}44)`, borderRadius:'18px 18px 0 0' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:11, color:C.textDim, fontWeight:600, lineHeight:1.4 }}>{label}</div>
        <div style={{ width:36, height:36, borderRadius:10, background:`${color}20`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize:21, fontWeight:800, color, fontFamily:'monospace', letterSpacing:'-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.textMuted, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

/* ─── Badge ─── */
export function Badge({ text, color }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}33` }}>
      {text}
    </span>
  )
}

/* ─── EmptyState ─── */
export function EmptyState({ icon, text, action, onAction }) {
  return (
    <div style={{ textAlign:'center', padding:'52px 20px' }}>
      <div style={{ fontSize:52, marginBottom:14, opacity:0.6, filter:'grayscale(0.2)' }}>{icon}</div>
      <div style={{ fontSize:14, color:C.textDim, marginBottom:22, lineHeight:1.7 }}>{text}</div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
    </div>
  )
}

/* ─── TabBar ─── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
      {tabs.map(t => (
        <button
          key={t} onClick={() => onChange(t)}
          style={{
            padding:'8px 16px', borderRadius:22, border:'none',
            background: active === t ? C.primary : C.card,
            color: active === t ? C.bg : C.textDim,
            fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
            transition:'all .2s',
            boxShadow: active === t ? `0 4px 14px ${C.primary}44` : 'none',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

/* ─── ConfirmDialog ─── */
export function ConfirmDialog({ open, onClose, onConfirm, message }) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)' }} onClick={onClose} />
      <div className="fade-in" style={{ position:'relative', background:C.surface, borderRadius:24, padding:28, maxWidth:310, width:'90%', boxShadow:'0 24px 60px rgba(0,0,0,0.6)', border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:15, color:C.text, marginBottom:24, textAlign:'center', lineHeight:1.7 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn onClick={onClose} variant="outline" color={C.textDim} full>إلغاء</Btn>
          <Btn onClick={onConfirm} color={C.accent} full>حذف</Btn>
        </div>
      </div>
    </div>
  )
}

/* ─── ErrorToast ─── */
export function ErrorToast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast-in" style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', zIndex:300, maxWidth:380, width:'90%' }}>
      <div style={{ background:`linear-gradient(135deg, ${C.accent}, #FF8A80)`, color:'#fff', padding:'14px 18px', borderRadius:16, fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:`0 8px 30px ${C.accent}55` }}>
        <span>⚠ {message}</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer', padding:'3px 8px', marginRight:8 }}>✕</button>
      </div>
    </div>
  )
}

/* ─── SuccessToast ─── */
export function SuccessToast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast-in" style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', zIndex:300, maxWidth:380, width:'90%' }}>
      <div style={{ background:`linear-gradient(135deg, ${C.success}, #0EA5E9)`, color:'#fff', padding:'14px 18px', borderRadius:16, fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:`0 8px 30px ${C.success}55` }}>
        <span>✓ {message}</span>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer', padding:'3px 8px', marginRight:8 }}>✕</button>
      </div>
    </div>
  )
}

/* ─── LoadingSpinner ─── */
export function LoadingSpinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:40 }}>
      <div style={{ position:'relative', width:44, height:44 }}>
        <div style={{ position:'absolute', inset:0, border:`3px solid ${C.border}`, borderRadius:'50%' }} />
        <div style={{ position:'absolute', inset:0, border:`3px solid transparent`, borderTopColor:C.primary, borderRadius:'50%', animation:'spin .75s linear infinite' }} />
        <div style={{ position:'absolute', inset:7, border:`2px solid transparent`, borderTopColor:C.blue, borderRadius:'50%', animation:'spin .5s linear infinite reverse' }} />
      </div>
    </div>
  )
}

/* ─── Skeleton ─── */
export function Skeleton({ height = 16, width = '100%', radius = 8, style: st = {} }) {
  return (
    <div style={{ height, width, borderRadius:radius, background:`linear-gradient(90deg, ${C.card} 0%, ${C.border} 50%, ${C.card} 100%)`, backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', ...st }} />
  )
}

/* ─── PulseIndicator ─── */
export function PulseIndicator({ color = C.success, size = 8 }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:size, height:size }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:0.4, animation:'ping 1.5s ease-out infinite' }} />
      <span style={{ width:size, height:size, borderRadius:'50%', background:color, display:'inline-block' }} />
    </span>
  )
}

/* ─── GlowDivider ─── */
export function GlowDivider({ color = C.primary }) {
  return (
    <div style={{ height:1, margin:'16px 0', background:`linear-gradient(90deg, transparent, ${color}44, transparent)` }} />
  )
}

/* ─── SectionHeader ─── */
export function SectionHeader({ icon, title, action, onAction, color = C.primary }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:`${color}22`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
          {icon}
        </div>
        <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{title}</span>
      </div>
      {action && (
        <button onClick={onAction} style={{ fontSize:11, fontWeight:700, color, background:`${color}15`, border:`1px solid ${color}33`, borderRadius:20, padding:'4px 12px', cursor:'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}
