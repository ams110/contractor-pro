import React, { useState, useEffect, useRef } from 'react'
import { C } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'

export default function SearchOverlay({ open, onClose, projects, employees, expenses, payments, workDays, onNav }) {
  const [q, setQ]           = useState('')
  const inputRef            = useRef()

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 80) }
  }, [open])

  if (!open) return null

  const lower = q.trim().toLowerCase()

  const results = lower.length < 2 ? [] : [
    ...projects.filter(p =>
      p.name?.toLowerCase().includes(lower) ||
      p.client_name?.toLowerCase().includes(lower)
    ).map(p => ({ type: 'project', icon: '🏗️', title: p.name, sub: p.client_name, nav: 'projects', id: p.id })),

    ...employees.filter(e =>
      e.name?.toLowerCase().includes(lower) ||
      e.specialization?.toLowerCase().includes(lower)
    ).map(e => ({ type: 'worker', icon: '👷', title: e.name, sub: `${e.daily_rate}₪/يوم`, nav: 'workers', id: e.id })),

    ...expenses.filter(e =>
      e.vendor?.toLowerCase().includes(lower) ||
      e.category?.toLowerCase().includes(lower)
    ).slice(0, 5).map(e => {
      const proj = projects.find(p => p.id === e.project_id)
      return { type: 'expense', icon: '💸', title: e.category, sub: `${fmtDate(e.date)}${proj ? ' • ' + proj.name : ''}`, amount: e.amount, nav: 'expenses', id: e.id }
    }),

    ...payments.filter(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      return emp?.name?.toLowerCase().includes(lower)
    }).slice(0, 5).map(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      return { type: 'payment', icon: '💰', title: emp?.name || '?', sub: fmtDate(p.date), amount: p.amount, nav: 'payments', id: p.id }
    }),
  ]

  const TYPE_LABEL = { project:'مشروع', worker:'عامل', expense:'مصروف', payment:'دفعة' }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{ position:'relative', margin:'0 auto', width:'100%', maxWidth:430, background:C.surface, borderRadius:'0 0 20px 20px', overflow:'hidden', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>

        {/* Search Input */}
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ابحث عن مشروع، عامل، مصروف..."
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:15, direction:'rtl' }}
          />
          {q && (
            <button onClick={() => setQ('')}
              style={{ background:'none', border:'none', color:C.textDim, fontSize:16, cursor:'pointer' }}>✕</button>
          )}
        </div>

        {/* Results */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {lower.length < 2 && (
            <div style={{ padding:'30px 20px', textAlign:'center', color:C.textDim, fontSize:13 }}>
              اكتب حرفين على الأقل للبحث
            </div>
          )}
          {lower.length >= 2 && results.length === 0 && (
            <div style={{ padding:'30px 20px', textAlign:'center', color:C.textDim, fontSize:13 }}>
              🔍 ما في نتائج لـ &ldquo;{q}&rdquo;
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => { onNav(r.nav); onClose() }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', borderBottom:`1px solid ${C.border}33`, cursor:'pointer', textAlign:'right' }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{r.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{r.title}</div>
                <div style={{ fontSize:11, color:C.textDim }}>{r.sub}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                {r.amount != null && (
                  <span style={{ fontSize:13, fontWeight:700, color:C.primary, fontFamily:'monospace' }}>{fmt(r.amount)}₪</span>
                )}
                <span style={{ fontSize:10, color:C.textMuted, background:`${C.border}55`, padding:'2px 7px', borderRadius:6 }}>
                  {TYPE_LABEL[r.type]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
