import React from 'react'
import { C } from '../constants/index.js'

/* ─── Modal (Bottom Sheet) ─── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose} />
      <div className="slide-up" style={{ position:'relative', width:'100%', maxWidth:430, maxHeight:'88vh', background:C.surface, borderRadius:'24px 24px 0 0', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:17, fontWeight:800, color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ background:`${C.border}88`, border:'none', borderRadius:'50%', width:32, height:32, color:C.textDim, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:20, overflowY:'auto', maxHeight:'calc(88vh - 60px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Input ─── */
export function Input({ label, value, onChange, type = 'text', placeholder = '', options, required, error, min, max }) {
  const base = {
    width:'100%', padding:'12px 14px', background:C.bg,
    border:`1px solid ${error ? C.accent : C.border}`,
    borderRadius:12, color:C.text, fontSize:14, outline:'none',
    boxSizing:'border-box',
    direction: (type === 'number' || type === 'date' || type === 'tel') ? 'ltr' : 'rtl',
  }
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, color:C.textDim, marginBottom:5, display:'block' }}>
        {label} {required && <span style={{ color:C.accent }}>*</span>}
      </label>
      {options
        ? (
          <select value={value} onChange={e => onChange(e.target.value)} style={{ ...base, appearance:'auto' }}>
            <option value="">اختر...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type} value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            min={min} max={max}
            style={base}
          />
        )
      }
      {error && <div style={{ fontSize:11, color:C.accent, marginTop:4 }}>⚠ {error}</div>}
    </div>
  )
}

/* ─── Button ─── */
export function Btn({ children, onClick, color = C.primary, variant = 'solid', full, disabled }) {
  const solid = variant === 'solid'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:'12px 20px', borderRadius:12,
        border: solid ? 'none' : `1.5px solid ${color}`,
        background: solid ? color : 'transparent',
        color: solid ? C.bg : color,
        fontSize:14, fontWeight:700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : 'auto',
        transition:'all .2s',
      }}
    >
      {children}
    </button>
  )
}

/* ─── Card ─── */
export function Card({ children, style: st = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, cursor:onClick?'pointer':'default', transition:'all .2s', marginBottom:10, ...st }}
    >
      {children}
    </div>
  )
}

/* ─── StatCard ─── */
export function StatCard({ icon, label, value, color = C.primary }) {
  return (
    <Card>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:12, color:C.textDim }}>{label}</span>
          <span style={{ fontSize:18 }}>{icon}</span>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color, fontFamily:'monospace' }}>{value}</div>
      </div>
    </Card>
  )
}

/* ─── Badge ─── */
export function Badge({ text, color }) {
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, background:`${color}22`, color, border:`1px solid ${color}33` }}>
      {text}
    </span>
  )
}

/* ─── EmptyState ─── */
export function EmptyState({ icon, text, action, onAction }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, color:C.textDim, marginBottom:16 }}>{text}</div>
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
            padding:'7px 14px', borderRadius:20,
            border:`1px solid ${active === t ? C.primary : C.border}`,
            background: active === t ? `${C.primary}22` : 'transparent',
            color: active === t ? C.primary : C.textDim,
            fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
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
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div className="fade-in" style={{ position:'relative', background:C.surface, borderRadius:20, padding:24, maxWidth:320, width:'90%' }}>
        <div style={{ fontSize:15, color:C.text, marginBottom:20, textAlign:'center' }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn onClick={onClose}  variant="outline" color={C.textDim} full>إلغاء</Btn>
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
    <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', zIndex:300, maxWidth:380, width:'90%' }}>
      <div style={{ background:C.accent, color:'#fff', padding:'12px 16px', borderRadius:14, fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
        <span>⚠ {message}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:16, cursor:'pointer', marginRight:8 }}>✕</button>
      </div>
    </div>
  )
}

/* ─── LoadingSpinner ─── */
export function LoadingSpinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:40 }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTopColor:C.primary, borderRadius:'50%', animation:'spin .8s linear infinite' }} />
    </div>
  )
}
