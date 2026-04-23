import React, { useState, useRef } from 'react'
import { C, GRAD, SPECS, PROJECT_TYPES, PROJECT_STATUS, PAY_METHODS as DEFAULT_PAY_METHODS } from '../constants/index.js'
import { fmt, fmtDate, validateProject, todayStr } from '../lib/helpers.js'
import {
  GlassCard, Card, Modal, Input, Btn, FilterChip,
  Badge, SectionLabel, EmptyState, ConfirmDialog, AnimatedNumber
} from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportProjectToPDF } from '../lib/export.js'

/* ─── helpers ─── */
function statusBorderColor(status) {
  if (status === 'نشط')    return C.success
  if (status === 'مكتمل') return C.secondary
  if (status === 'ملغي')   return C.accent
  return C.border
}

function statusBadgeColor(status) {
  if (status === 'نشط')       return C.success
  if (status === 'مكتمل')    return C.secondary
  if (status === 'ملغي')      return C.accent
  if (status === 'عرض سعر')  return C.warning
  if (status === 'موافق عليه') return C.blue
  return C.textDim
}

function marginColor(margin) {
  if (margin === null || margin === undefined) return C.textDim
  if (margin >= 30) return C.success
  if (margin >= 0)  return C.warning
  return C.accent
}

function marginGrad(margin) {
  if (margin === null || margin === undefined) return GRAD.brand
  if (margin >= 30) return GRAD.success
  if (margin >= 0)  return GRAD.warm
  return GRAD.danger
}

/* ─── ProgressBar ─── */
function ProgressBar({ pct, gradient }) {
  const clamped = Math.min(100, Math.max(0, pct || 0))
  return (
    <div style={{ position: 'relative', height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, height: '100%',
        width: `${clamped}%`,
        background: gradient || GRAD.success,
        borderRadius: 99,
        transition: 'width .6s ease',
        boxShadow: `0 0 8px ${C.success}55`,
      }} />
    </div>
  )
}

/* ─── MarginPill ─── */
function MarginPill({ margin }) {
  if (margin === null || margin === undefined) return null
  const color = marginColor(margin)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 9px', borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}33`,
      fontSize: 10, fontWeight: 800, color, fontFamily: 'monospace',
      letterSpacing: '0.02em',
    }}>
      {margin > 0 ? '+' : ''}{margin}%
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
export default function ProjectsScreen({ projects, workDays, expenses, clientReceipts, employees, addProject, updateProject, deleteProject, addReceipt, updateReceipt, deleteReceipt, userId, permissions, payMethods: dynamicPayMethods }) {
  const PAY_METHODS = (dynamicPayMethods && dynamicPayMethods.length > 0) ? dynamicPayMethods : DEFAULT_PAY_METHODS

  const [showForm,        setShowForm]        = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [editing,         setEditing]         = useState(null)
  const [filter,          setFilter]          = useState('الكل')
  const [detail,          setDetail]          = useState(null)
  const [confirmDel,      setConfirmDel]      = useState(null)
  const [confirmDelR,     setConfirmDelR]     = useState(null)
  const [formError,       setFormError]       = useState('')
  const [receiptError,    setReceiptError]    = useState('')
  const [saving,          setSaving]          = useState(false)
  const [receiptFile,     setReceiptFile]     = useState(null)
  const [receiptPreview,  setReceiptPreview]  = useState('')
  const [quickReceiptProjId,  setQuickReceiptProjId]  = useState(null)
  const [editingReceiptId,    setEditingReceiptId]    = useState(null)
  const [showMultiReceipt,    setShowMultiReceipt]    = useState(false)
  const [multiSelProjs,       setMultiSelProjs]       = useState(new Set())
  const [multiAmounts,        setMultiAmounts]        = useState({})
  const [multiGlobal,         setMultiGlobal]         = useState('')
  const [multiDate,           setMultiDate]           = useState(todayStr())
  const [multiMethod,         setMultiMethod]         = useState('كاش')
  const [multiPayer,          setMultiPayer]          = useState('')
  const [multiSaving,         setMultiSaving]         = useState(false)
  const [multiError,          setMultiError]          = useState('')
  const [multiReceiptFile,    setMultiReceiptFile]    = useState(null)
  const [multiReceiptPreview, setMultiReceiptPreview] = useState('')
  const receiptFileRef    = useRef()
  const multiReceiptRef   = useRef()

  const emptyForm    = { name:'', client_name:'', client_phone:'', type:'', price:'', status:'نشط', specialization:'', notes:'', start_date:'', end_date:'', locations:[] }
  const emptyReceipt = { amount:'', date: todayStr(), notes:'', payment_method:'كاش', payer_name:'' }
  const [form,        setForm]        = useState(emptyForm)
  const [receiptForm, setReceiptForm] = useState(emptyReceipt)
  const [newLocation, setNewLocation] = useState('')

  function f(key)  { return v => setForm(prev => ({ ...prev, [key]: v })) }
  function fr(key) { return v => setReceiptForm(prev => ({ ...prev, [key]: v })) }

  function openNew() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }

  function openEdit(p) {
    setForm({ ...p, price: String(p.price || ''), start_date: p.start_date || '', end_date: p.end_date || '', notes: p.notes || '', locations: p.locations || [] })
    setNewLocation('')
    setEditing(p.id)
    setFormError('')
    setShowForm(true)
    setDetail(null)
  }

  function openReceiptForm(projId) {
    setReceiptForm(emptyReceipt)
    setEditingReceiptId(null)
    setReceiptError('')
    if (projId) setQuickReceiptProjId(projId)
    setShowReceiptForm(true)
  }

  function closeReceiptForm() {
    setShowReceiptForm(false)
    setReceiptFile(null)
    setReceiptPreview('')
    setEditingReceiptId(null)
    setQuickReceiptProjId(null)
  }

  function openEditReceipt(r) {
    setReceiptForm({ amount: String(r.amount), date: r.date, notes: r.notes || '', payment_method: r.payment_method || 'كاش', payer_name: r.payer_name || '' })
    setEditingReceiptId(r.id)
    setReceiptError('')
    setShowReceiptForm(true)
  }

  async function save() {
    const err = validateProject(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0 }
      if (editing) await updateProject(editing, payload)
      else         await addProject(payload)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveReceipt() {
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0)
      return setReceiptError('أدخل المبلغ المقبوض')
    setSaving(true)
    try {
      let receipt_url = ''
      if (receiptFile && receiptForm.payment_method === 'تحويل بنكي') {
        receipt_url = await uploadReceipt(userId, receiptFile)
      }
      const payload = { ...receiptForm, amount: parseFloat(receiptForm.amount) }
      if (editingReceiptId) {
        await updateReceipt(editingReceiptId, payload)
      } else {
        await addReceipt({ ...payload, project_id: detail || quickReceiptProjId, receipt_url })
      }
      closeReceiptForm()
    } catch (e) {
      setReceiptError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    await deleteProject(confirmDel)
    setConfirmDel(null)
    setDetail(null)
  }

  async function confirmDeleteReceipt() {
    await deleteReceipt(confirmDelR)
    setConfirmDelR(null)
  }

  function openMultiReceipt() {
    setMultiSelProjs(new Set())
    setMultiAmounts({})
    setMultiGlobal('')
    setMultiDate(todayStr())
    setMultiMethod('كاش')
    setMultiPayer('')
    setMultiError('')
    setMultiReceiptFile(null)
    setMultiReceiptPreview('')
    setShowMultiReceipt(true)
  }

  function toggleMultiProj(id) {
    setMultiSelProjs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setMultiAmounts(a => { const n = { ...a }; delete n[id]; return n })
      } else {
        next.add(id)
      }
      return next
    })
  }

  function setMultiAmt(id, val) {
    setMultiAmounts(prev => ({ ...prev, [id]: val }))
  }

  function splitEqually() {
    const total = parseFloat(multiGlobal) || 0
    if (!total || multiSelProjs.size === 0) return
    const each = Math.round((total / multiSelProjs.size) * 100) / 100
    const next = {}
    multiSelProjs.forEach(id => { next[id] = String(each) })
    setMultiAmounts(next)
  }

  async function saveMultiReceipts() {
    if (multiSelProjs.size === 0) return setMultiError('اختر مشروع واحد على الأقل')
    if (!multiGlobal || parseFloat(multiGlobal) <= 0) return setMultiError('أدخل المبلغ الإجمالي للحوالة')
    const entries = [...multiSelProjs].map(id => ({
      id,
      amount: parseFloat(multiAmounts[id] || 0),
    }))
    if (entries.some(e => !e.amount || e.amount <= 0)) return setMultiError('وزّع المبلغ على كل مشروع محدد')
    const allocated = entries.reduce((s, e) => s + e.amount, 0)
    const total     = parseFloat(multiGlobal)
    if (Math.abs(allocated - total) > 0.01) return setMultiError(`الموزّع ${allocated.toLocaleString()}₪ ≠ الإجمالي ${total.toLocaleString()}₪`)
    setMultiSaving(true)
    try {
      let receipt_url = ''
      if (multiReceiptFile) {
        receipt_url = await uploadReceipt(userId, multiReceiptFile)
      }
      await Promise.all(entries.map(e =>
        addReceipt({ project_id: e.id, amount: e.amount, date: multiDate, payment_method: multiMethod, payer_name: multiPayer, notes: '', receipt_url })
      ))
      setShowMultiReceipt(false)
    } catch (err) {
      setMultiError(err.message)
    } finally {
      setMultiSaving(false)
    }
  }

  const [sortBy, setSortBy] = useState('date') // 'date' | 'profit'

  const filtered = projects
    .filter(p => filter === 'الكل' || p.status === filter)
    .map(p => {
      const labor    = workDays.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0)
      const exp      = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
      const received = (clientReceipts || []).filter(r => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
      const profit   = received - labor - exp
      const margin   = received > 0 ? Math.round((profit / received) * 100) : null
      return { ...p, _profit: profit, _margin: margin, _spent: labor + exp, _received: received }
    })
    .sort((a, b) => sortBy === 'profit'
      ? (b._margin ?? -999) - (a._margin ?? -999)
      : (b.created_at || '').localeCompare(a.created_at || ''))

  const proj = detail ? projects.find(p => p.id === detail) : null

  /* ════════════════════════════════════
     DETAIL VIEW
  ════════════════════════════════════ */
  if (proj) {
    const labor     = workDays.filter(w => w.project_id === proj.id).reduce((s, w) => s + (w.amount || 0), 0)
    const projExps  = expenses.filter(e => e.project_id === proj.id)
    const exps      = projExps.reduce((s, e) => s + (e.amount || 0), 0)
    const materials = projExps.filter(e => e.category === 'بضاعة').reduce((s, e) => s + (e.amount || 0), 0)
    const otherExps = exps - materials
    const receipts  = (clientReceipts || []).filter(r => r.project_id === proj.id)
    const received  = receipts.reduce((s, r) => s + (r.amount || 0), 0)
    const total     = labor + exps
    const profit    = received - total
    const pending  = (proj.price || 0) - received
    const margin   = received > 0 ? ((profit / received) * 100).toFixed(1) : 0
    const receivedPct = proj.price > 0 ? Math.round((received / proj.price) * 100) : 0

    return (
      <div className="fade-in" style={{ padding: '16px 16px 100px' }}>

        {/* ── Top nav bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button
            onClick={() => setDetail(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '8px 14px', color: C.primary,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ← رجوع
          </button>
          <button
            onClick={() => exportProjectToPDF({ project: proj, workDays, expenses, clientReceipts, employees: employees || [] })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${C.secondary}18`, border: `1px solid ${C.secondary}44`,
              borderRadius: 12, padding: '8px 14px', color: C.secondary,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            PDF تقرير
          </button>
        </div>

        {/* ── Project hero ── */}
        <GlassCard glow={statusBorderColor(proj.status)} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: 4, background: statusBorderColor(proj.status) === C.success ? GRAD.success : statusBorderColor(proj.status) === C.secondary ? GRAD.purple : GRAD.danger, borderRadius: '20px 20px 0 0' }} />
          <div style={{ padding: '18px 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 6 }}>{proj.name}</div>
                <div style={{ fontSize: 13, color: C.textDim }}>{proj.client_name}{proj.client_phone ? ` • ${proj.client_phone}` : ''}</div>
              </div>
              <Badge text={proj.status} color={statusBadgeColor(proj.status)} />
            </div>
            {proj.type && (
              <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, fontSize: 11, color: C.textDim }}>
                {proj.type}
              </div>
            )}
            {(proj.start_date || proj.end_date) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {proj.start_date && <div style={{ fontSize: 11, color: C.primary, background: `${C.primary}15`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.primary}33` }}>🗓 بدأ: {proj.start_date}</div>}
                {proj.end_date   && <div style={{ fontSize: 11, color: proj.end_date < todayStr() && proj.status === 'نشط' ? C.accent : C.warning, background: `${proj.end_date < todayStr() && proj.status === 'نشط' ? C.accent : C.warning}15`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${proj.end_date < todayStr() && proj.status === 'نشط' ? C.accent : C.warning}33` }}>⏰ ينتهي: {proj.end_date}</div>}
              </div>
            )}
            {proj.notes && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12, color: C.textDim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                📝 {proj.notes}
              </div>
            )}
            {proj.price > 0 && received >= 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: C.textDim }}>المقبوض من العقد</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>{receivedPct}%</span>
                </div>
                <ProgressBar pct={receivedPct} gradient={GRAD.success} />
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Financial summary ── */}
        <SectionLabel color={C.primary}>الملخص المالي</SectionLabel>
        <GlassCard style={{ marginBottom: 16 }}>
          <div style={{ padding: '16px 18px' }}>

            {/* Top 2-column stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'قيمة العقد',        value: fmt(proj.price),    suffix: '₪', color: C.text },
                { label: 'المقبوض',           value: fmt(received),      suffix: '₪', color: C.success },
                { label: 'المتبقي للتحصيل',   value: fmt(Math.max(0, pending)), suffix: '₪', color: pending > 0 ? C.warning : C.success },
                { label: 'صافي الربح',        value: fmt(Math.abs(profit)), suffix: '₪', color: profit >= 0 ? C.primary : C.accent, prefix: profit < 0 ? '-' : '' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 14,
                  background: `${item.color}0c`, border: `1px solid ${item.color}22`,
                }}>
                  <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>
                    {item.prefix || ''}{item.value}{item.suffix}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.border, margin: '4px 0 14px' }} />

            {/* Cost breakdown rows */}
            {[
              { label: '👷 تكلفة العمال',   value: `${fmt(labor)}₪`,     color: C.accent },
              { label: '🧱 البضاعة',         value: `${fmt(materials)}₪`, color: C.orange, hide: materials === 0 },
              { label: '📦 مصاريف أخرى',    value: `${fmt(otherExps)}₪`, color: C.accent, hide: materials === 0 && exps === 0 },
              { label: '💸 إجمالي التكاليف', value: `${fmt(total)}₪`,    color: C.accent, bold: true },
            ].filter(r => !r.hide).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderRadius: 10, marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: row.bold ? C.text : C.textDim, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 600, color: row.color, fontFamily: 'monospace' }}>{row.value}</span>
              </div>
            ))}

            {/* Profit margin pill */}
            {received > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 12, padding: '12px 16px',
                background: profit >= 0 ? `${C.primary}12` : `${C.accent}12`,
                border: `1px solid ${profit >= 0 ? C.primary : C.accent}30`,
                borderRadius: 14,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: profit >= 0 ? C.primary : C.accent }}>نسبة الربح</span>
                <span style={{
                  fontSize: 20, fontWeight: 900,
                  color: profit >= 0 ? C.primary : C.accent,
                  fontFamily: 'monospace',
                }}>
                  {margin}%
                </span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* ── Receipts section ── */}
        <SectionLabel
          color={C.success}
          action={permissions?.editProjects !== false ? '+ قبض' : undefined}
          onAction={openReceiptForm}
        >
          المقبوضات من العميل
        </SectionLabel>

        {receipts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 20px', color: C.textDim, fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: `1px dashed ${C.border}`, marginBottom: 16 }}>
            لم يُقبض شيء بعد
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {receipts.map((r, idx) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.border}`,
                borderRight: `3px solid ${C.success}`,
                borderRadius: 14, marginBottom: 8,
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.success, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                    {fmt(r.amount)}₪
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
                    {fmtDate(r.date)} • {r.payment_method}{r.payer_name ? ` • من: ${r.payer_name}` : ''}{r.notes ? ` • ${r.notes}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.receipt_url && (
                    <a href={r.receipt_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: `${C.secondary}18`, border: `1px solid ${C.secondary}33`, textDecoration: 'none', fontSize: 14 }}
                      title="عرض الإثبات"
                    >
                      📎
                    </a>
                  )}
                  <button onClick={() => setConfirmDelR(r.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 10,
                    background: `${C.accent}15`, border: `1px solid ${C.accent}33`,
                    color: C.accent, cursor: 'pointer', fontSize: 14,
                  }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Work locations breakdown — يومي projects only ── */}
        {proj.type === 'يومي' && (() => {
          const projDays = workDays.filter(w => w.project_id === proj.id && w.status === 'approved')
          if (projDays.length === 0) return null
          const byLoc = {}
          projDays.forEach(d => {
            const loc = d.location || '__none__'
            if (!byLoc[loc]) byLoc[loc] = []
            byLoc[loc].push(d)
          })
          const entries = Object.entries(byLoc)
          if (entries.length === 1 && entries[0][0] === '__none__') return null
          return (
            <>
              <SectionLabel color={C.primary}>📍 توزيع العمال حسب المكان</SectionLabel>
              <GlassCard style={{ marginBottom: 16 }}>
                <div style={{ padding: '14px 16px' }}>
                  {entries.map(([loc, days], i) => {
                    const total   = days.reduce((s, d) => s + (d.amount || 0), 0)
                    const empIds  = [...new Set(days.map(d => d.employee_id))]
                    const names   = empIds.map(id => (employees || []).find(e => e.id === id)?.name).filter(Boolean)
                    const isNone  = loc === '__none__'
                    return (
                      <div key={loc} style={{ marginBottom: i < entries.length - 1 ? 12 : 0, paddingBottom: i < entries.length - 1 ? 12 : 0, borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isNone ? C.textDim : C.primary }}>
                            {isNone ? '⬜ غير محدد' : `📍 ${loc}`}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>{fmt(total)}₪</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.textDim }}>
                          {days.length} يوم • {names.join('، ')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </>
          )
        })()}

        {/* ── Action buttons ── */}
        {(permissions?.editProjects !== false || permissions?.canDelete !== false) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {permissions?.editProjects !== false && (
              <Btn onClick={() => openEdit(proj)} variant="outline" color={C.secondary} full>
                تعديل المشروع
              </Btn>
            )}
            {permissions?.canDelete !== false && (
              <Btn onClick={() => setConfirmDel(proj.id)} variant="outline" color={C.accent} full>
                حذف
              </Btn>
            )}
          </div>
        )}

        {/* ── Receipt modal ── */}
        <Modal
          open={showReceiptForm}
          onClose={closeReceiptForm}
          title={editingReceiptId ? 'تعديل الدفعة المقبوضة' : quickReceiptProjId && !detail ? `💵 قبضة يوميات — ${projects.find(p=>p.id===quickReceiptProjId)?.name||''}` : 'تسجيل دفعة مقبوضة'}
        >
          <Input label="المبلغ المقبوض (₪)" value={receiptForm.amount} onChange={fr('amount')} type="number" min="0" required />
          <Input label="التاريخ"             value={receiptForm.date}   onChange={fr('date')}   type="date" required />
          <Input label="طريقة الدفع"         value={receiptForm.payment_method} onChange={fr('payment_method')} options={PAY_METHODS} />
          <Input label="اسم الدافع (من قبضت منه)" value={receiptForm.payer_name} onChange={fr('payer_name')} placeholder="مثال: أبو محمد" />
          <Input label="ملاحظات"             value={receiptForm.notes}  onChange={fr('notes')} />

          {receiptForm.payment_method === 'تحويل بنكي' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 8, letterSpacing: '0.03em' }}>
                إثبات التحويل
              </label>
              <input
                ref={receiptFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setReceiptFile(f); setReceiptPreview(URL.createObjectURL(f)) } }}
              />
              {receiptPreview ? (
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img src={receiptPreview} alt="إثبات" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 14, border: `1px solid ${C.border}` }} />
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview('') }}
                    style={{ position: 'absolute', top: 8, left: 8, background: `${C.accent}cc`, border: 'none', borderRadius: '50%', width: 26, height: 26, color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => receiptFileRef.current.click()}
                  style={{
                    width: '100%', padding: '18px', borderRadius: 14,
                    border: `2px dashed ${C.borderMid}`, background: 'rgba(255,255,255,0.02)',
                    color: C.textDim, fontSize: 13, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all .2s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span>اضغط لرفع صورة الإثبات</span>
                </button>
              )}
            </div>
          )}

          {receiptError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 12, marginBottom: 14 }}>
              ⚠ {receiptError}
            </div>
          )}
          <Btn onClick={saveReceipt} full disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ الدفعة'}
          </Btn>
        </Modal>

        <ConfirmDialog open={!!confirmDel}  onClose={() => setConfirmDel(null)}  onConfirm={confirmDelete}        message="متأكد بدك تحذف هالمشروع؟" />
        <ConfirmDialog open={!!confirmDelR} onClose={() => setConfirmDelR(null)} onConfirm={confirmDeleteReceipt} message="متأكد بدك تحذف هالدفعة؟" />
      </div>
    )
  }

  /* ════════════════════════════════════
     PROJECTS LIST
  ════════════════════════════════════ */
  return (
    <div className="fade-in" style={{ padding: '16px 16px 100px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>المشاريع</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{filtered.length} مشروع</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setSortBy(s => s === 'profit' ? 'date' : 'profit')}
            style={{
              padding: '9px 14px', borderRadius: 12,
              border: `1px solid ${sortBy === 'profit' ? C.success + '55' : C.border}`,
              background: sortBy === 'profit' ? `${C.success}12` : 'rgba(255,255,255,0.04)',
              color: sortBy === 'profit' ? C.success : C.textDim,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              transition: 'all .2s',
              whiteSpace: 'nowrap',
            }}
          >
            {sortBy === 'profit' ? 'الأكثر ربحاً' : 'الأحدث'}
          </button>
          {permissions?.editProjects !== false && (<>
            <button
              onClick={openMultiReceipt}
              style={{
                padding: '9px 13px', borderRadius: 12,
                border: `1px solid ${C.success}55`,
                background: `${C.success}12`,
                color: C.success, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              💵 قبض متعدد
            </button>
            <Btn onClick={openNew}>+ جديد</Btn>
          </>)}
        </div>
      </div>

      {/* ── Filter row ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
        {['الكل', 'نشط', 'مكتمل', 'عرض سعر'].map(tab => (
          <FilterChip
            key={tab}
            label={tab}
            active={filter === tab}
            onClick={() => setFilter(tab)}
            color={tab === 'نشط' ? C.success : tab === 'مكتمل' ? C.secondary : tab === 'عرض سعر' ? C.warning : C.primary}
          />
        ))}
      </div>

      {/* ── Project cards ── */}
      {filtered.length === 0 ? (
        <EmptyState icon="🏗️" text="ما في مشاريع بعد" action="+ أضف مشروع" onAction={openNew} />
      ) : (
        filtered.map(pr => {
          const borderColor = statusBorderColor(pr.status)
          const receivedPct = pr.price > 0 ? Math.round((pr._received / pr.price) * 100) : 0

          return (
            <div
              key={pr.id}
              onClick={() => setDetail(pr.id)}
              style={{
                display: 'flex', cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.border}`,
                borderRight: `4px solid ${borderColor}`,
                borderRadius: 16,
                marginBottom: 10,
                overflow: 'hidden',
                transition: 'all .22s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none' }}
            >
              {/* Left glow accent */}
              <div style={{ width: 0, position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
                  background: `${borderColor}44`,
                  filter: `blur(4px)`,
                }} />
              </div>

              <div style={{ flex: 1, padding: '14px 16px' }}>
                {/* Top row: name + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, flex: 1, paddingLeft: 10 }}>{pr.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Badge text={pr.status} color={statusBadgeColor(pr.status)} />
                  </div>
                </div>

                {/* Client name */}
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: pr.price > 0 ? 10 : 0 }}>
                  {pr.client_name}{pr.type ? ` • ${pr.type}` : ''}
                </div>

                {/* Progress bar (if price set) */}
                {pr.price > 0 && pr._received > 0 && (
                  <ProgressBar pct={receivedPct} gradient={GRAD.success} />
                )}

                {/* Bottom row: price + margin */}
                {pr.price > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>
                      {fmt(pr.price)}₪
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {pr._margin !== null && <MarginPill margin={pr._margin} />}
                      {pr._received > 0 && (
                        <span style={{ fontSize: 10, color: C.textDim }}>قُبض {receivedPct}%</span>
                      )}
                    </div>
                  </div>
                )}

                {/* قبضة اليوميات button — only for daily projects */}
                {pr.type === 'يومي' && permissions?.editProjects !== false && (
                  <button
                    onClick={e => { e.stopPropagation(); openReceiptForm(pr.id) }}
                    style={{ marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 10, background: `${C.success}18`, border: `1px solid ${C.success}44`, color: C.success, fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em' }}
                  >
                    💵 قبضة اليوميات
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* ── Add/Edit modal ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'تعديل مشروع' : 'مشروع جديد'}>
        <Input label="اسم المشروع"    value={form.name}           onChange={f('name')}           required />
        <Input label="اسم الزبون"     value={form.client_name}    onChange={f('client_name')} />
        <Input label="تلفون الزبون"   value={form.client_phone}   onChange={f('client_phone')}   type="tel" />
        <Input label="نوع المشروع"    value={form.type}           onChange={f('type')}           options={PROJECT_TYPES} required />
        <Input label="السعر (₪)"      value={form.price}          onChange={f('price')}          type="number" min="0" />
        <Input label="التخصص"         value={form.specialization} onChange={f('specialization')} options={SPECS} />
        <Input label="الحالة"         value={form.status}         onChange={f('status')}         options={PROJECT_STATUS} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Input label="تاريخ البدء"  value={form.start_date}     onChange={f('start_date')}     type="date" />
          <Input label="تاريخ الانتهاء" value={form.end_date}     onChange={f('end_date')}       type="date" />
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>ملاحظات / اتفاقيات</label>
          <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={3} placeholder="سجّل أي اتفاقيات أو ملاحظات مع الزبون..."
            style={{ width:'100%', padding:'10px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.05)', color:'#F8FAFC', fontSize:13, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.6 }} />
        </div>

        {/* أماكن العمل — للمشاريع اليومية فقط */}
        {form.type === 'يومي' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>📍 أماكن العمل</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {(form.locations || []).map((loc, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px 5px 6px', borderRadius:20, background:`${C.primary}18`, border:`1px solid ${C.primary}44` }}>
                  <span style={{ fontSize:12, color:C.primary, fontWeight:700 }}>{loc}</span>
                  <button onClick={() => setForm(p => ({ ...p, locations: p.locations.filter((_, j) => j !== i) }))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, fontSize:12, lineHeight:1, padding:0 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={newLocation} onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newLocation.trim()) { setForm(p => ({ ...p, locations: [...(p.locations||[]), newLocation.trim()] })); setNewLocation('') }}}
                placeholder="اسم المكان (مثال: شارع الملك، حي النور...)"
                style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:13, outline:'none' }} />
              <button
                onClick={() => { if (newLocation.trim()) { setForm(p => ({ ...p, locations: [...(p.locations||[]), newLocation.trim()] })); setNewLocation('') }}}
                style={{ padding:'10px 16px', borderRadius:10, background:`${C.primary}22`, border:`1px solid ${C.primary}44`, color:C.primary, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                + أضف
              </button>
            </div>
          </div>
        )}

        {formError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 12, marginBottom: 14 }}>
            ⚠ {formError}
          </div>
        )}
        <Btn onClick={save} full disabled={saving}>
          {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'أضف المشروع'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={confirmDelete} message="متأكد بدك تحذف هالمشروع؟" />

      {/* ── Multi-project receipt modal ── */}
      <Modal open={showMultiReceipt} onClose={() => setShowMultiReceipt(false)} title="💵 توزيع حوالة على مشاريع">

        {/* Step 1: Total amount received */}
        <div style={{ padding: '14px 16px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}30`, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 8, letterSpacing: '0.04em' }}>المبلغ الإجمالي للحوالة</div>
          <input
            type="number" min="0" value={multiGlobal}
            onChange={e => { setMultiGlobal(e.target.value); setMultiAmounts({}) }}
            placeholder="مثال: 20000"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${multiGlobal ? C.primary + '66' : C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 20, fontWeight: 900, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
          />
        </div>

        {/* Shared date + method + payer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          <Input label="التاريخ"      value={multiDate}   onChange={setMultiDate}   type="date" />
          <Input label="طريقة الدفع" value={multiMethod} onChange={setMultiMethod} options={PAY_METHODS} />
        </div>
        <Input label="اسم الدافع (اختياري)" value={multiPayer} onChange={setMultiPayer} placeholder="مثال: شركة الأمل" />

        {/* صورة الإيصال */}
        <div style={{ marginBottom: 14 }}>
          <input ref={multiReceiptRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              setMultiReceiptFile(f)
              if (f.type.startsWith('image/')) {
                const r = new FileReader()
                r.onload = ev => setMultiReceiptPreview(ev.target.result)
                r.readAsDataURL(f)
              } else {
                setMultiReceiptPreview('pdf')
              }
            }} />
          <button onClick={() => multiReceiptRef.current?.click()}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px dashed ${multiReceiptFile ? C.success + '88' : C.border}`, background: multiReceiptFile ? `${C.success}08` : 'transparent', color: multiReceiptFile ? C.success : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {multiReceiptFile ? `✓ ${multiReceiptFile.name}` : '📎 صورة الإيصال (اختياري)'}
          </button>
          {multiReceiptPreview && multiReceiptPreview !== 'pdf' && (
            <img src={multiReceiptPreview} alt="إيصال" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: `1px solid ${C.success}44` }} />
          )}
        </div>

        {/* Step 2: Select projects + distribute */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>اختر المشاريع ووزّع المبلغ</div>
          {multiSelProjs.size > 1 && parseFloat(multiGlobal) > 0 && (
            <button onClick={splitEqually}
              style={{ padding: '5px 12px', borderRadius: 8, background: `${C.secondary}18`, border: `1px solid ${C.secondary}44`, color: C.secondary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              ÷ تقسيم متساوي
            </button>
          )}
        </div>

        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {projects.filter(p => p.status === 'نشط' || p.status === 'عرض سعر').map(p => {
            const sel = multiSelProjs.has(p.id)
            const amt = parseFloat(multiAmounts[p.id] || 0)
            return (
              <div key={p.id}
                onClick={() => toggleMultiProj(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: sel ? `${C.success}10` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${sel ? C.success + '44' : C.border}`, transition: 'all .18s' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${sel ? C.success : C.borderMid}`, background: sel ? C.success : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 900 }}>
                  {sel ? '✓' : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  {p.client_name && <div style={{ fontSize: 11, color: C.textDim }}>{p.client_name}</div>}
                </div>
                {sel && (
                  <input
                    type="number" min="0"
                    value={multiAmounts[p.id] ?? ''}
                    onChange={e => { e.stopPropagation(); setMultiAmt(p.id, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    placeholder="₪"
                    style={{ width: 90, padding: '7px 10px', borderRadius: 10, border: `1px solid ${amt > 0 ? C.success + '66' : C.borderMid}`, background: 'rgba(255,255,255,0.07)', color: amt > 0 ? C.success : C.text, fontSize: 14, fontFamily: 'monospace', outline: 'none', textAlign: 'center', fontWeight: 800 }}
                  />
                )}
              </div>
            )
          })}
          {projects.filter(p => p.status === 'نشط' || p.status === 'عرض سعر').length === 0 && (
            <div style={{ textAlign: 'center', color: C.textDim, fontSize: 13, padding: '20px 0' }}>ما في مشاريع نشطة</div>
          )}
        </div>

        {/* Allocation summary */}
        {multiSelProjs.size > 0 && parseFloat(multiGlobal) > 0 && (() => {
          const total     = parseFloat(multiGlobal) || 0
          const allocated = [...multiSelProjs].reduce((s, id) => s + (parseFloat(multiAmounts[id] || 0)), 0)
          const remaining = total - allocated
          const ok        = Math.abs(remaining) < 0.01
          return (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: ok ? `${C.success}12` : `${C.warning}10`, border: `1px solid ${ok ? C.success + '40' : C.warning + '40'}`, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>إجمالي الحوالة</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: 'monospace' }}>{total.toLocaleString()}₪</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>الموزّع على المشاريع</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: allocated > 0 ? C.primary : C.textDim, fontFamily: 'monospace' }}>{allocated.toLocaleString()}₪</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: `1px solid ${ok ? C.success + '30' : C.warning + '30'}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ok ? C.success : C.warning }}>{ok ? '✓ تم توزيع المبلغ كاملاً' : 'متبقي للتوزيع'}</span>
                {!ok && <span style={{ fontSize: 14, fontWeight: 900, color: C.warning, fontFamily: 'monospace' }}>{Math.abs(remaining).toLocaleString()}₪</span>}
              </div>
            </div>
          )
        })()}

        {multiError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 12, marginBottom: 14 }}>
            ⚠ {multiError}
          </div>
        )}

        <Btn onClick={saveMultiReceipts} full disabled={multiSaving || multiSelProjs.size === 0}>
          {multiSaving ? 'جاري الحفظ...' : `✓ حفظ ${multiSelProjs.size > 0 ? multiSelProjs.size + ' دفعة' : 'الدفعات'}`}
        </Btn>
      </Modal>
    </div>
  )
}
