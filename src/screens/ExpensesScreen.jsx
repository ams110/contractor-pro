import React, { useState } from 'react'
import { C, EXP_CATS, PAY_METHODS, VAT } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateExpense } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, EmptyState, TabBar, ConfirmDialog } from '../components/index.jsx'

const CAT_ICONS = { 'مواد':'🧱', 'عدد':'🔧', 'وقود':'⛽', 'إيجار':'🏗️', 'تأمين':'🛡️', 'أخرى':'📦' }

export default function ExpensesScreen({ expenses, projects, expCats, addExpense, deleteExpense, permissions }) {
  const [showForm,   setShowForm]   = useState(false)
  const [filter,     setFilter]     = useState('الكل')
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const emptyForm = { date: todayStr(), amount:'', category:'', project_id:'', vendor:'', payment_method:'' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  async function save() {
    const err = validateExpense(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      await addExpense({ ...form, amount: parseFloat(form.amount) })
      setForm(emptyForm)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total    = expenses.reduce((s, e) => s + e.amount, 0)
  const filtered = expenses.filter(e => filter === 'الكل' || e.category?.includes(filter))
  const sorted   = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>💸 المصاريف</div>
        {permissions?.addExpenses !== false && <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ مصروف</Btn>}
      </div>

      {/* إجمالي */}
      {expenses.length > 0 && (
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

      {sorted.length === 0
        ? <EmptyState icon="💸" text="ما في مصاريف" action="+ أضف مصروف" onAction={() => setShowForm(true)} />
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
                  <button onClick={() => setConfirmDel(ex.id)} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })
      }

      <Modal open={showForm} onClose={() => setShowForm(false)} title="مصروف جديد">
        <Input label="التاريخ"    value={form.date}           onChange={f('date')}           type="date" required />
        <Input label="المبلغ (₪)" value={form.amount}         onChange={f('amount')}         type="number" min="0.01" required />

        {/* معاينة الضريبة */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <div style={{ marginTop:-10, marginBottom:14, padding:'8px 12px', background:`${C.border}33`, borderRadius:8, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:C.textDim }}>بدون ضريبة: {fmt(Math.round(parseFloat(form.amount) / (1 + VAT)))}₪</span>
            <span style={{ fontSize:11, color:C.textDim }}>ضريبة: {fmt(Math.round(parseFloat(form.amount) - parseFloat(form.amount) / (1 + VAT)))}₪</span>
          </div>
        )}

        <Input label="التصنيف"       value={form.category}      onChange={f('category')}       options={expCats || EXP_CATS} required />

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

        <Input label="المحل"         value={form.vendor}        onChange={f('vendor')} />
        <Input label="طريقة الدفع"   value={form.payment_method}onChange={f('payment_method')} options={PAY_METHODS} />
        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving || !form.amount || !form.category}>
          {saving ? 'جاري الحفظ...' : '✓ أضف المصروف'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteExpense(confirmDel); setConfirmDel(null) }} message="حذف هالمصروف؟" />
    </div>
  )
}
