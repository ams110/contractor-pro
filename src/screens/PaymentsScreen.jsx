import React, { useState } from 'react'
import { C, PAY_METHODS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validatePayment } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, Badge, EmptyState, ConfirmDialog } from '../components/index.jsx'

export default function PaymentsScreen({ payments, employees, workDays, addPayment, deletePayment }) {
  const [showForm,   setShowForm]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const emptyForm = { date: todayStr(), employee_id:'', amount:'', method:'' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function selectEmployee(emp) {
    const owed = calcOwed(emp.id)
    setForm(prev => ({ ...prev, employee_id: emp.id, amount: owed > 0 ? String(owed) : prev.amount }))
  }

  function calcOwed(empId) {
    const earned = workDays.filter(w => w.employee_id === empId).reduce((s, w) => s + w.amount, 0)
    const paid   = payments.filter(p => p.employee_id === empId).reduce((s, p) => s + p.amount, 0)
    return Math.max(0, earned - paid)
  }

  async function save() {
    const err = validatePayment(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      await addPayment({ ...form, amount: parseFloat(form.amount) })
      setForm(emptyForm)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const activeEmployees = employees.filter(emp => {
    const earned = workDays.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
    const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    return earned > 0 || paid > 0
  })

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>💰 الدفعات</div>
        <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ دفعة</Btn>
      </div>

      {/* ملخص لكل عامل */}
      {activeEmployees.length === 0
        ? <EmptyState icon="💰" text="ما في دفعات بعد" action="+ أضف دفعة" onAction={() => setShowForm(true)} />
        : activeEmployees.map(emp => {
            const earned = workDays.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
            const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
            const owed   = Math.max(0, earned - paid)
            return (
              <Card key={emp.id}>
                <div style={{ padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{emp.name}</div>
                    <Badge text={owed > 0 ? `متبقي ${fmt(owed)}₪` : 'مسدد ✓'} color={owed > 0 ? C.accent : C.success} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-around' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:C.textDim }}>مستحق</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:'monospace' }}>{fmt(earned)}₪</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:C.textDim }}>مدفوع</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.success, fontFamily:'monospace' }}>{fmt(paid)}₪</div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
      }

      {/* سجل الدفعات */}
      {payments.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:10 }}>سجل الدفعات</div>
          {[...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => {
            const emp = employees.find(e => e.id === p.employee_id)
            return (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:C.card, borderRadius:10, border:`1px solid ${C.border}`, marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{emp?.name || '?'}</div>
                  <div style={{ fontSize:11, color:C.textDim }}>{fmtDate(p.date)}{p.method ? ` • ${p.method}` : ''}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.success, fontFamily:'monospace' }}>{fmt(p.amount)}₪</div>
                  <button onClick={() => setConfirmDel(p.id)} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="دفعة جديدة">
        <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" />

        {/* اختيار العامل */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:5 }}>العامل *</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {employees.map(e => {
              const owed = calcOwed(e.id)
              return (
                <button key={e.id} onClick={() => selectEmployee(e)}
                  style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${form.employee_id===e.id?C.primary:C.border}`, background:form.employee_id===e.id?`${C.primary}22`:C.bg, color:form.employee_id===e.id?C.primary:C.textDim, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  {e.name}{owed > 0 ? ` (${fmt(owed)}₪)` : ''}
                </button>
              )
            })}
          </div>
        </div>

        <Input label="المبلغ (₪)" value={form.amount} onChange={f('amount')} type="number" min="0.01" required />
        <Input label="طريقة الدفع" value={form.method} onChange={f('method')} options={PAY_METHODS} />
        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving || !form.employee_id || !form.amount}>
          {saving ? 'جاري الحفظ...' : '✓ سجّل الدفعة'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deletePayment(confirmDel); setConfirmDel(null) }} message="حذف هالدفعة؟" />
    </div>
  )
}
