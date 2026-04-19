import React, { useState } from 'react'
import { C, SPECS } from '../constants/index.js'
import { fmt, validateWorker } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, Badge, EmptyState, ConfirmDialog } from '../components/index.jsx'

export default function WorkersScreen({ employees, workDays, payments, addEmployee, updateEmployee, deleteEmployee }) {
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [copied,     setCopied]     = useState(null)

  function copyWorkerLink(emp) {
    const url = `${window.location.origin}${window.location.pathname}?worker=${emp.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(emp.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const emptyForm = { name:'', phone:'', specialization:'', daily_rate:'', status:'نشط' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function openNew() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }

  function openEdit(w) {
    setForm({ ...w, daily_rate: String(w.daily_rate) })
    setEditing(w.id)
    setFormError('')
    setShowForm(true)
  }

  async function save() {
    const err = validateWorker({ ...form, dailyRate: form.daily_rate })
    if (err) return setFormError(err)
    setSaving(true)
    try {
      const payload = { ...form, daily_rate: parseFloat(form.daily_rate) }
      if (editing) await updateEmployee(editing, payload)
      else         await addEmployee(payload)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalE = workDays.reduce((s, w) => s + w.amount, 0)
  const totalP = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>👷 العمال</div>
        <Btn onClick={openNew}>+ جديد</Btn>
      </div>

      {/* ملخص الرواتب */}
      {employees.length > 0 && (
        <Card>
          <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { label:'مستحق', value:`${fmt(totalE)}₪`, color:C.text    },
              { label:'مدفوع', value:`${fmt(totalP)}₪`, color:C.success },
              { label:'متبقي', value:`${fmt(Math.max(0, totalE-totalP))}₪`, color:totalE-totalP>0?C.accent:C.success },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontSize:10, color:C.textDim }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:s.color, fontFamily:'monospace' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {employees.length === 0
        ? <EmptyState icon="👷" text="ما في عمال بعد" action="+ أضف عامل" onAction={openNew} />
        : employees.map(w => {
            const earned = workDays.filter(wd => wd.employee_id === w.id).reduce((s, wd) => s + wd.amount, 0)
            const paid   = payments.filter(p  => p.employee_id  === w.id).reduce((s, p)  => s + p.amount,  0)
            const owed   = Math.max(0, earned - paid)
            return (
              <Card key={w.id}>
                <div style={{ padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:`${C.primary}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:C.primary }}>
                        {w.name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{w.name}</div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <Badge text={w.specialization || 'عام'} color={C.blue} />
                          <span style={{ fontSize:11, color:C.textDim }}>{w.daily_rate}₪/يوم</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      <button onClick={() => copyWorkerLink(w)}
                        title="نسخ رابط بوابة العامل"
                        style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${copied===w.id?C.success:C.border}`, background:copied===w.id?`${C.success}22`:'transparent', color:copied===w.id?C.success:C.textDim, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
                        {copied===w.id ? '✓ تم' : '🔗'}
                      </button>
                      <button onClick={() => openEdit(w)} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer' }}>✏️</button>
                      <button onClick={() => setConfirmDel(w.id)} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer' }}>🗑️</button>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[
                      { l:'مستحق', v:`${fmt(earned)}₪`, c:C.text },
                      { l:'مدفوع', v:`${fmt(paid)}₪`,   c:C.success },
                      { l:'متبقي', v:`${fmt(owed)}₪`,   c:owed>0?C.accent:C.success },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign:'center', padding:'5px 0', background:`${C.border}22`, borderRadius:8 }}>
                        <div style={{ fontSize:9,  color:C.textDim }}>{s.l}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })
      }

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'تعديل عامل' : 'عامل جديد'}>
        <Input label="الاسم"           value={form.name}          onChange={f('name')}          required />
        <Input label="التلفون"         value={form.phone}         onChange={f('phone')}         type="tel" />
        <Input label="التخصص"         value={form.specialization} onChange={f('specialization')} options={SPECS} />
        <Input label="الأجر اليومي (₪)" value={form.daily_rate}  onChange={f('daily_rate')}    type="number" min="1" required />
        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving}>{saving ? 'جاري الحفظ...' : editing ? 'حفظ' : 'أضف العامل'}</Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteEmployee(confirmDel); setConfirmDel(null) }} message="حذف هالعامل؟" />
    </div>
  )
}
