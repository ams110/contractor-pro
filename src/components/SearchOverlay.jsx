import React, { useState, useEffect, useRef } from 'react'
import { Building2, HardHat, CreditCard, Wallet, Search, X } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'
import { tl, tEnum } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

export default function SearchOverlay({ open, onClose, projects, employees, expenses, payments, workDays, onNav }) {
  const language            = useAppStore(s => s.language)
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
    ).map(p => ({ type: 'project', Icon: Building2, title: p.name, sub: p.client_name, nav: 'projects', id: p.id })),

    ...employees.filter(e =>
      e.name?.toLowerCase().includes(lower) ||
      e.specialization?.toLowerCase().includes(lower)
    ).map(e => ({ type: 'worker', Icon: HardHat, title: e.name, sub: `${e.daily_rate}₪/${tl(language, 'يوم', 'יום', 'day')}`, nav: 'workers', id: e.id })),

    ...expenses.filter(e =>
      e.vendor?.toLowerCase().includes(lower) ||
      e.category?.toLowerCase().includes(lower)
    ).slice(0, 5).map(e => {
      const proj = projects.find(p => p.id === e.project_id)
      return { type: 'expense', Icon: CreditCard, title: tEnum(e.category, language), sub: `${fmtDate(e.date)}${proj ? ' • ' + proj.name : ''}`, amount: e.amount, nav: 'expenses', id: e.id }
    }),

    ...payments.filter(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      return emp?.name?.toLowerCase().includes(lower)
    }).slice(0, 5).map(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      return { type: 'payment', Icon: Wallet, title: emp?.name || '?', sub: fmtDate(p.date), amount: p.amount, nav: 'payments', id: p.id }
    }),
  ]

  const TYPE_LABEL = {
    project: tl(language, 'مشروع', 'פרויקט', 'Project'),
    worker:  tl(language, 'عامل', 'עובד', 'Worker'),
    expense: tl(language, 'مصروف', 'הוצאה', 'Expense'),
    payment: tl(language, 'دفعة', 'תשלום', 'Payment'),
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{ position:'relative', margin:'0 auto', width:'100%', maxWidth:430, background:C.surface, borderRadius:'0 0 20px 20px', overflow:'hidden', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>

        {/* Search Input */}
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <Search size={18} style={{ color: C.textDim, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={tl(language, 'ابحث عن مشروع، عامل، مصروف...', 'חפש פרויקט, עובד, הוצאה...', 'Search project, worker, expense...')}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:C.text, fontSize:15, direction:'rtl' }}
          />
          {q && (
            <button onClick={() => setQ('')}
              style={{ background:'none', border:'none', color:C.textDim, cursor:'pointer', display:'flex', alignItems:'center' }}><X size={14} strokeWidth={2.5} /></button>
          )}
        </div>

        {/* Results */}
        <div style={{ overflowY:'auto', flex:1 }}>
          {lower.length < 2 && (
            <div style={{ padding:'30px 20px', textAlign:'center', color:C.textDim, fontSize:13 }}>
              {tl(language, 'اكتب حرفين على الأقل للبحث', 'הקלד לפחות שתי אותיות לחיפוש', 'Type at least two characters to search')}
            </div>
          )}
          {lower.length >= 2 && results.length === 0 && (
            <div style={{ padding:'30px 20px', textAlign:'center', color:C.textDim, fontSize:13 }}>
              {tl(language, 'ما في نتائج لـ', 'אין תוצאות עבור', 'No results for')} &ldquo;{q}&rdquo;
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={() => { onNav(r.nav); onClose() }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', borderBottom:`1px solid ${C.border}33`, cursor:'pointer', textAlign:'right' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`rgba(245,158,11,0.1)`, border:`1px solid rgba(245,158,11,0.2)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><r.Icon size={16} strokeWidth={2} style={{ color: C.primary }} /></div>
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
