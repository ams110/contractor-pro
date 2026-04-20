import React, { useState, useRef } from 'react'
import { C, EXP_CATS, PAY_METHODS, VAT } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateExpense } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, EmptyState, TabBar, ConfirmDialog } from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportExpensesToExcel } from '../lib/export.js'

const CAT_ICONS = { 'مواد':'🧱', 'عدد':'🔧', 'وقود':'⛽', 'إيجار':'🏗️', 'تأمين':'🛡️', 'أخرى':'📦' }

export default function ExpensesScreen({ expenses, projects, expCats, addExpense, deleteExpense, approveExpense, rejectExpense, employees, userId, permissions }) {
  const [showForm,    setShowForm]    = useState(false)
  const [filter,      setFilter]      = useState('الكل')
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview,     setPreview]     = useState('')
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), amount:'', category:'', project_id:'', vendor:'', payment_method:'' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function pickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function save() {
    const err = validateExpense(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      let receipt_url = ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      await addExpense({ ...form, amount: parseFloat(form.amount), receipt_url })
      setForm(emptyForm); setReceiptFile(null); setPreview('')
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const pendingExpenses = expenses.filter(e => e.status === 'pending')
  const approvedExpenses = expenses.filter(e => e.status !== 'pending')

  const total    = approvedExpenses.reduce((s, e) => s + e.amount, 0)
  const filtered = approvedExpenses.filter(e => filter === 'الكل' || e.category?.includes(filter))
  const sorted   = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>💸 المصاريف</div>
        <div style={{ display:'flex', gap:6 }}>
          {approvedExpenses.length > 0 && (
            <button onClick={() => exportExpensesToExcel(approvedExpenses, projects)}
              style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer' }}>
              📊 Excel
            </button>
          )}
          {permissions?.addExpenses !== false && <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ مصروف</Btn>}
        </div>
      </div>

      {/* مصاريف معلقة */}
      {pendingExpenses.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.warning }}>⏳ بانتظار الموافقة</div>
            <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#000' }}>{pendingExpenses.length}</div>
          </div>
          {pendingExpenses.map(ex => {
            const worker = employees?.find(e => e.id === ex.employee_id)
            const proj   = projects.find(p => p.id === ex.project_id)
            return (
              <div key={ex.id} style={{ padding: '12px 14px', background: `${C.warning}11`, borderRadius: 12, border: `1px solid ${C.warning}44`, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{ex.category}</div>
                    {worker && <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>👷 {worker.name}</div>}
                    <div style={{ fontSize: 11, color: C.textDim }}>{ex.vendor || ''}{proj ? ` • ${proj.name}` : ''} • {fmtDate(ex.date)}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, fontFamily: 'monospace' }}>{fmt(ex.amount)}₪</div>
                </div>

                {/* صورة/ملف الفاتورة */}
                {ex.receipt_url && (
                  <div style={{ marginBottom: 10 }}>
                    {ex.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <a href={ex.receipt_url} target="_blank" rel="noreferrer">
                        <img src={ex.receipt_url} alt="فاتورة" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
                      </a>
                    ) : (
                      <a href={ex.receipt_url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: `${C.border}33`, borderRadius: 10, textDecoration: 'none' }}>
                        <span style={{ fontSize: 20 }}>📄</span>
                        <span style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>عرض الفاتورة (PDF)</span>
                      </a>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveExpense(ex.id)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: `${C.success}22`, border: `1px solid ${C.success}55`, color: C.success, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ✓ موافقة
                  </button>
                  <button onClick={() => rejectExpense(ex.id)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: `${C.accent}22`, border: `1px solid ${C.accent}55`, color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ✗ رفض
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* إجمالي */}
      {approvedExpenses.length > 0 && (
        <Card>
          <div style={{ padding:14, display:'flex', justifyContent:'space-around' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.textDim }}>شامل الضريبة</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.accent, fontFamily:'monospace' }}>{fmt(total)}₪</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.textDim }}>بدون ضريبة</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:'monospace' }}>{fmt(Math.round(total / (1 + VAT)))}₪</div>
            </div>
          </div>
        </Card>
      )}

      <TabBar tabs={['الكل','مواد','عدد','وقود']} active={filter} onChange={setFilter} />

      {sorted.length === 0 && pendingExpenses.length === 0
        ? <EmptyState icon="💸" text="ما في مصاريف" action="+ أضف مصروف" onAction={() => setShowForm(true)} />
        : sorted.length === 0 ? null
        : sorted.map(ex => {
            const proj = projects.find(p => p.id === ex.project_id)
            const ck   = Object.keys(CAT_ICONS).find(k => ex.category?.includes(k)) || 'أخرى'
            return (
              <div key={ex.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:C.card, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${C.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>
                    {CAT_ICONS[ck]}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{ex.category}</div>
                    <div style={{ fontSize:11, color:C.textDim }}>{ex.vendor || ''}{proj ? ` • ${proj.name}` : ''}</div>
                    <div style={{ fontSize:10, color:C.textMuted }}>{fmtDate(ex.date)}{ex.payment_method ? ` • ${ex.payment_method}` : ''}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.accent, fontFamily:'monospace' }}>{fmt(ex.amount)}₪</div>
                  {ex.receipt_url && (
                    <a href={ex.receipt_url} target="_blank" rel="noreferrer"
                      style={{ fontSize:16, textDecoration:'none' }} title="عرض الفاتورة">📎</a>
                  )}
                  <button onClick={() => setConfirmDel(ex.id)} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })
      }

      <Modal open={showForm} onClose={() => { setShowForm(false); setReceiptFile(null); setPreview('') }} title="مصروف جديد">
        <Input label="التاريخ"    value={form.date}   onChange={f('date')}   type="date" required />
        <Input label="المبلغ (₪)" value={form.amount} onChange={f('amount')} type="number" min="0.01" required />

        {/* معاينة الضريبة */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <div style={{ marginTop:-10, marginBottom:14, padding:'8px 12px', background:`${C.border}33`, borderRadius:8, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:C.textDim }}>بدون ضريبة: {fmt(Math.round(parseFloat(form.amount) / (1 + VAT)))}₪</span>
            <span style={{ fontSize:11, color:C.textDim }}>ضريبة: {fmt(Math.round(parseFloat(form.amount) - parseFloat(form.amount) / (1 + VAT)))}₪</span>
          </div>
        )}

        <Input label="التصنيف" value={form.category} onChange={f('category')} options={expCats || EXP_CATS} required />

        {/* اختيار المشروع */}
        {projects.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:5 }}>المشروع</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id }))}
                  style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${form.project_id===p.id?C.primary:C.border}`, background:form.project_id===p.id?`${C.primary}22`:'transparent', color:form.project_id===p.id?C.primary:C.textDim, fontSize:12, cursor:'pointer' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input label="المحل / المورّد" value={form.vendor}         onChange={f('vendor')} />
        <Input label="طريقة الدفع"    value={form.payment_method} onChange={f('payment_method')} options={PAY_METHODS} />

        {/* رفع الفاتورة */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6 }}>📎 فاتورة / إثبات الشراء (اختياري)</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={pickFile} />
          {preview
            ? <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
                <img src={preview} alt="فاتورة" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10, border:`1px solid ${C.border}` }} />
                <button onClick={() => { setReceiptFile(null); setPreview('') }}
                  style={{ position:'absolute', top:4, left:4, background:`${C.accent}cc`, border:'none', borderRadius:'50%', width:22, height:22, color:'#fff', cursor:'pointer', fontSize:12 }}>×</button>
              </div>
            : <button onClick={() => fileRef.current.click()}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:`2px dashed ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, cursor:'pointer' }}>
                📷 اضغط لرفع صورة الفاتورة
              </button>
          }
        </div>

        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving || !form.amount || !form.category}>
          {saving ? 'جاري الحفظ...' : '✓ أضف المصروف'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteExpense(confirmDel); setConfirmDel(null) }} message="حذف هالمصروف؟" />
    </div>
  )
}
