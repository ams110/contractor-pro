import React, { useState, useEffect } from 'react'
import { C, GRAD } from '../constants/index.js'
import { fmt, uid } from '../lib/helpers.js'

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadTracker(projectId) {
  try { return JSON.parse(localStorage.getItem(`tracker_${projectId}`)) || { sections: [] } } catch { return { sections: [] } }
}
function saveTracker(projectId, data) {
  localStorage.setItem(`tracker_${projectId}`, JSON.stringify(data))
}
function loadExtras(projectId) {
  try { return JSON.parse(localStorage.getItem(`extras_${projectId}`)) || [] } catch { return [] }
}
function saveExtras(projectId, items) {
  localStorage.setItem(`extras_${projectId}`, JSON.stringify(items))
}

// ─── constants ───────────────────────────────────────────────────────────────
const UNIT_STATUS = {
  pending:     { icon: '⬜', label: 'لم يبدأ', color: C.textDim  },
  in_progress: { icon: '🔄', label: 'جاري',    color: C.warning  },
  done:        { icon: '✅', label: 'منجز',    color: C.success  },
}
const STATUS_ORDER = ['pending', 'in_progress', 'done']

const EXTRA_STATUS = {
  pending:  { label: 'معلق',   color: C.warning },
  approved: { label: 'موافق',  color: C.success },
  done:     { label: 'منجز',   color: C.primary },
}
const EXTRA_STATUS_ORDER = ['pending', 'approved', 'done']

const UNITS_LIST = ['م', 'م²', 'م³', 'طن', 'كيس', 'قطعة', 'لتر', 'يوم', 'ساعة']

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = C.primary, height = 6 }) {
  const clamped = Math.min(100, Math.max(0, pct || 0))
  return (
    <div style={{ height, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${clamped}%`, background: clamped === 100 ? GRAD.success : GRAD.brand, borderRadius: 99, transition: 'width .5s ease' }} />
    </div>
  )
}

// ─── تبويب تتبع الأعمال ───────────────────────────────────────────────────────
function TrackingTab({ projectId }) {
  const [data,         setData]         = useState(() => loadTracker(projectId))
  const [addingSection, setAddingSection] = useState(false)
  const [sectionName,  setSectionName]  = useState('')
  const [expandedSecs, setExpandedSecs] = useState({})
  const [addingUnit,   setAddingUnit]   = useState(null)
  const [unitName,     setUnitName]     = useState('')
  const [editSec,      setEditSec]      = useState(null)
  const [editSecName,  setEditSecName]  = useState('')

  useEffect(() => { setData(loadTracker(projectId)) }, [projectId])

  function persist(next) { setData(next); saveTracker(projectId, next) }

  function addSection() {
    if (!sectionName.trim()) return
    const next = { ...data, sections: [...data.sections, { id: uid(), name: sectionName.trim(), units: [] }] }
    persist(next)
    setSectionName(''); setAddingSection(false)
  }

  function deleteSection(secId) {
    if (!window.confirm('حذف هذا القسم وكل وحداته؟')) return
    persist({ ...data, sections: data.sections.filter(s => s.id !== secId) })
  }

  function renameSection(secId) {
    if (!editSecName.trim()) return
    persist({ ...data, sections: data.sections.map(s => s.id === secId ? { ...s, name: editSecName.trim() } : s) })
    setEditSec(null); setEditSecName('')
  }

  function addUnit(secId) {
    if (!unitName.trim()) return
    persist({
      ...data,
      sections: data.sections.map(s => s.id !== secId ? s : {
        ...s, units: [...s.units, { id: uid(), name: unitName.trim(), status: 'pending' }]
      })
    })
    setUnitName(''); setAddingUnit(null)
  }

  function cycleUnit(secId, unitId) {
    persist({
      ...data,
      sections: data.sections.map(s => s.id !== secId ? s : {
        ...s, units: s.units.map(u => u.id !== unitId ? u : {
          ...u, status: STATUS_ORDER[(STATUS_ORDER.indexOf(u.status) + 1) % STATUS_ORDER.length]
        })
      })
    })
  }

  function deleteUnit(secId, unitId) {
    persist({
      ...data,
      sections: data.sections.map(s => s.id !== secId ? s : {
        ...s, units: s.units.filter(u => u.id !== unitId)
      })
    })
  }

  // حساب التقدم الكلي
  const allUnits  = data.sections.flatMap(s => s.units)
  const doneCount = allUnits.filter(u => u.status === 'done').length
  const totalPct  = allUnits.length ? Math.round(doneCount / allUnits.length * 100) : 0

  return (
    <div>
      {/* شريط التقدم الكلي */}
      {allUnits.length > 0 && (
        <div style={{ background: `${C.primary}12`, borderRadius: 14, border: `1px solid ${C.primary}33`, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDim }}>التقدم الكلي</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{totalPct}%</span>
          </div>
          <ProgressBar pct={totalPct} height={8} />
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 6 }}>
            {doneCount} منجز من {allUnits.length} وحدة
          </div>
        </div>
      )}

      {/* الأقسام */}
      {data.sections.map(sec => {
        const secDone = sec.units.filter(u => u.status === 'done').length
        const secPct  = sec.units.length ? Math.round(secDone / sec.units.length * 100) : 0
        const open    = expandedSecs[sec.id] !== false

        return (
          <div key={sec.id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 8, overflow: 'hidden' }}>
            {/* رأس القسم */}
            <div style={{ padding: '12px 14px' }}>
              {editSec === sec.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={editSecName} onChange={e => setEditSecName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSection(sec.id) }}
                    autoFocus
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.primary}66`, background: C.bg, color: C.text, fontSize: 13, outline: 'none' }} />
                  <button onClick={() => renameSection(sec.id)}
                    style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: C.primary, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                  <button onClick={() => setEditSec(null)}
                    style={{ padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setExpandedSecs(p => ({ ...p, [sec.id]: !open }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.textDim, padding: 0, flexShrink: 0 }}>
                    {open ? '▼' : '►'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{sec.name}</span>
                      <span style={{ fontSize: 10, color: C.textDim, background: C.surface, padding: '1px 7px', borderRadius: 6 }}>
                        {secDone}/{sec.units.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ProgressBar pct={secPct} height={5} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: secPct === 100 ? C.success : C.primary, fontFamily: 'monospace', flexShrink: 0 }}>{secPct}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setEditSec(sec.id); setEditSecName(sec.name) }}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 11, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteSection(sec.id)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 11, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              )}
            </div>

            {/* الوحدات */}
            {open && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px 12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: sec.units.length > 0 ? 10 : 0 }}>
                  {sec.units.map(u => {
                    const st = UNIT_STATUS[u.status]
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 10, background: `${st.color}15`, border: `1.5px solid ${st.color}44`, cursor: 'pointer' }}
                        onClick={() => cycleUnit(sec.id, u.id)}>
                        <span style={{ fontSize: 13 }}>{st.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{u.name}</span>
                        <button onClick={e => { e.stopPropagation(); deleteUnit(sec.id, u.id) }}
                          style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 10, cursor: 'pointer', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
                      </div>
                    )
                  })}
                </div>

                {addingUnit === sec.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={unitName} onChange={e => setUnitName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addUnit(sec.id) }}
                      placeholder="اسم الوحدة (مثال: بيت 1)"
                      autoFocus
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.primary}66`, background: C.bg, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                    <button onClick={() => addUnit(sec.id)}
                      style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: C.primary, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+</button>
                    <button onClick={() => setAddingUnit(null)}
                      style={{ padding: '8px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingUnit(sec.id); setUnitName('') }}
                    style={{ fontSize: 11, color: C.primary, background: `${C.primary}11`, border: `1px dashed ${C.primary}44`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
                    + وحدة
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* إضافة قسم */}
      {addingSection ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={sectionName} onChange={e => setSectionName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSection() }}
            placeholder="اسم القسم (مثال: مجراش 71)"
            autoFocus
            style={{ flex: 1, padding: '11px 14px', borderRadius: 11, border: `1px solid ${C.primary}66`, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={addSection}
            style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: GRAD.brand, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>+</button>
          <button onClick={() => setAddingSection(false)}
            style={{ padding: '11px 14px', borderRadius: 11, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <button onClick={() => setAddingSection(true)}
          style={{ width: '100%', marginTop: 6, padding: '12px 0', borderRadius: 13, border: `2px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ➕ إضافة قسم جديد
        </button>
      )}

      {data.sections.length === 0 && !addingSection && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.textDim }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📐</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>لا توجد أقسام بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف قسماً (مثال: مجراش، طابق، بلوك)</div>
        </div>
      )}
    </div>
  )
}

// ─── تبويب الزيادات ───────────────────────────────────────────────────────────
const EMPTY_EXTRA = { title: '', qty: '', unit: 'م', unitPrice: '', status: 'pending', notes: '' }

function ExtrasTab({ projectId }) {
  const [extras,       setExtras]       = useState(() => loadExtras(projectId))
  const [showForm,     setShowForm]     = useState(false)
  const [editingExtra, setEditingExtra] = useState(null)
  const [form,         setForm]         = useState(EMPTY_EXTRA)

  useEffect(() => { setExtras(loadExtras(projectId)); setShowForm(false); setEditingExtra(null) }, [projectId])

  function persist(items) { setExtras(items); saveExtras(projectId, items) }
  function setF(field, val) { setForm(p => ({ ...p, [field]: val })) }

  const isValid = form.title.trim() && parseFloat(form.qty) > 0 && parseFloat(form.unitPrice) >= 0

  function handleSave() {
    if (!isValid) return
    if (editingExtra) {
      persist(extras.map(e => e.id === editingExtra ? { ...form, id: editingExtra } : e))
      setEditingExtra(null)
    } else {
      persist([{ ...form, id: uid(), createdAt: new Date().toISOString() }, ...extras])
      setShowForm(false)
    }
    setForm(EMPTY_EXTRA)
  }

  function startEdit(extra) {
    setForm({ title: extra.title, qty: extra.qty, unit: extra.unit, unitPrice: extra.unitPrice, status: extra.status, notes: extra.notes || '' })
    setEditingExtra(extra.id)
    setShowForm(false)
  }

  function cycleStatus(id) {
    persist(extras.map(e => e.id !== id ? e : { ...e, status: EXTRA_STATUS_ORDER[(EXTRA_STATUS_ORDER.indexOf(e.status) + 1) % EXTRA_STATUS_ORDER.length] }))
  }

  const approvedTotal = extras.filter(e => e.status === 'approved' || e.status === 'done')
    .reduce((s, e) => s + (parseFloat(e.qty) || 0) * (parseFloat(e.unitPrice) || 0), 0)
  const grandTotal = extras.reduce((s, e) => s + (parseFloat(e.qty) || 0) * (parseFloat(e.unitPrice) || 0), 0)

  const ExtraFormEl = (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.borderMid}`, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>{editingExtra ? '✏️ تعديل الزيادة' : '➕ زيادة جديدة'}</div>

      <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="الوصف *"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 8 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>الكمية *</div>
          <input type="number" min="0" step="any" value={form.qty} onChange={e => setF('qty', e.target.value)} placeholder="0"
            style={{ width: '100%', padding: '9px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>الوحدة</div>
          <select value={form.unit} onChange={e => setF('unit', e.target.value)}
            style={{ width: '100%', padding: '9px 8px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
            {UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3, fontWeight: 600 }}>السعر (₪) *</div>
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setF('unitPrice', e.target.value)} placeholder="0"
            style={{ width: '100%', padding: '9px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
        </div>
      </div>

      {form.qty && form.unitPrice && (
        <div style={{ fontSize: 11, color: C.primary, fontWeight: 700, marginBottom: 8 }}>
          الإجمالي: {fmt((parseFloat(form.qty) || 0) * (parseFloat(form.unitPrice) || 0))}₪
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {Object.entries(EXTRA_STATUS).map(([key, s]) => (
          <button key={key} onClick={() => setF('status', key)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${form.status === key ? s.color : C.border}`, background: form.status === key ? `${s.color}22` : 'transparent', color: form.status === key ? s.color : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="ملاحظات (اختياري)" rows={2}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setShowForm(false); setEditingExtra(null); setForm(EMPTY_EXTRA) }}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          إلغاء
        </button>
        <button onClick={handleSave} disabled={!isValid}
          style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: isValid ? GRAD.brand : C.border, color: isValid ? '#000' : C.textDim, fontSize: 12, fontWeight: 800, cursor: isValid ? 'pointer' : 'default' }}>
          {editingExtra ? 'حفظ التعديل' : '+ إضافة'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* إجمالي */}
      {extras.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.borderMid}`, padding: '12px 16px', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: 3, background: GRAD.brand, margin: '-12px -16px 12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: `${C.success}12`, borderRadius: 10, border: `1px solid ${C.success}22` }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>معتمد</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>{fmt(approvedTotal)}₪</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: `${C.primary}12`, borderRadius: 10, border: `1px solid ${C.primary}22` }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 2, fontWeight: 600 }}>الإجمالي</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(grandTotal)}₪</div>
            </div>
          </div>
        </div>
      )}

      {(showForm && !editingExtra) && ExtraFormEl}
      {editingExtra && ExtraFormEl}

      {/* قائمة الزيادات */}
      {extras.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: C.textDim }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>لا توجد زيادات بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف أي أعمال خارج نطاق العقد</div>
        </div>
      ) : (
        extras.map(extra => {
          const s   = EXTRA_STATUS[extra.status] || EXTRA_STATUS.pending
          const tot = (parseFloat(extra.qty) || 0) * (parseFloat(extra.unitPrice) || 0)
          if (editingExtra === extra.id) return null
          return (
            <div key={extra.id} style={{ background: C.card, borderRadius: 13, border: `1px solid ${C.border}`, padding: '11px 13px', marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{extra.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'monospace' }}>
                    {extra.qty} {extra.unit} × {fmt(parseFloat(extra.unitPrice) || 0)}₪
                  </div>
                  {extra.notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, fontStyle: 'italic' }}>{extra.notes}</div>}
                </div>
                <div style={{ textAlign: 'left', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, fontFamily: 'monospace', marginBottom: 4 }}>{fmt(tot)}₪</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}22`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.color}33` }}>{s.label}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, paddingTop: 8, borderTop: `1px solid ${C.border}22` }}>
                <button onClick={() => cycleStatus(extra.id)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>⟳ الحالة</button>
                <button onClick={() => startEdit(extra)}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.primary}44`, background: `${C.primary}11`, color: C.primary, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✏️ تعديل</button>
                <button onClick={() => { if (window.confirm('حذف هذه الزيادة؟')) persist(extras.filter(e => e.id !== extra.id)) }}
                  style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${C.accent}44`, background: `${C.accent}11`, color: C.accent, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>🗑 حذف</button>
              </div>
            </div>
          )
        })
      )}

      {!showForm && !editingExtra && (
        <button onClick={() => { setShowForm(true); setForm(EMPTY_EXTRA) }}
          style={{ width: '100%', marginTop: 4, padding: '12px 0', borderRadius: 13, border: `2px dashed ${C.primary}44`, background: `${C.primary}08`, color: C.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ➕ زيادة جديدة
        </button>
      )}
    </div>
  )
}

// ─── الشاشة الرئيسية ──────────────────────────────────────────────────────────
export default function UnitTrackerScreen({ projects = [] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [tab,       setTab]       = useState('track')

  useEffect(() => { if (!projectId && projects.length) setProjectId(projects[0].id) }, [projects])

  const selectedProject = projects.find(p => p.id === projectId)

  const TABS = [
    { id: 'track',  label: '📐 تتبع الأعمال' },
    { id: 'extras', label: '➕ الزيادات' },
  ]

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl' }}>

      {/* عنوان */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
          متتبع الأعمال
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>تتبع تقدم الوحدات والزيادات لكل مشروع</div>
      </div>

      {/* اختيار المشروع */}
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
          <div>لا توجد مشاريع</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setProjectId(p.id)}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${projectId === p.id ? C.primary : C.border}`, background: projectId === p.id ? `${C.primary}22` : C.bg, color: projectId === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 13, padding: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all .2s',
                  background: tab === t.id ? GRAD.brand : 'transparent',
                  color:      tab === t.id ? '#000' : C.textDim,
                  boxShadow:  tab === t.id ? '0 4px 14px #00DDB344' : 'none',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'track'  && <TrackingTab projectId={projectId} key={`track-${projectId}`} />}
          {tab === 'extras' && <ExtrasTab   projectId={projectId} key={`extras-${projectId}`} />}
        </>
      )}
    </div>
  )
}
