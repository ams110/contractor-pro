import React, { useState } from 'react'
import { C, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcSalary, validateWorkDay } from '../lib/helpers.js'
import { Modal, Input, Btn, EmptyState, ConfirmDialog } from '../components/index.jsx'

export default function WorkDaysScreen({ workDays, employees, projects, addWorkDay, deleteWorkDay }) {
  const [showForm,   setShowForm]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const emptyForm = { date: todayStr(), employee_id: '', project_id: '', day_type: 'كامل', hours: '8' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  const activeEmps  = employees.filter(e => e.status === 'نشط')
  const activeProjs = projects.filter(p => p.status === 'نشط')
  const selectedEmp = form.employee_id ? employees.find(e => e.id === form.employee_id) : null
  const preview     = selectedEmp ? calcSalary(selectedEmp.daily_rate, form.day_type, form.hours) : 0

  function setDayType(t) {
    const hours = t === 'كامل' ? '8' : t === 'نص يوم' ? '4' : form.hours
    setForm(prev => ({ ...prev, day_type: t, hours }))
  }

  async function save() {
    const err = validateWorkDay(form)
    if (err) return setFormError(err)
    if (!selectedEmp) return setFormError('العامل غير موجود')

    setSaving(true)
    try {
      const amount = calcSalary(selectedEmp.daily_rate, form.day_type, form.hours)
      await addWorkDay({ ...form, amount, hours: parseFloat(form.hours) || 8 })
      setForm(emptyForm)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const sorted = [...workDays].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>📅 أيام العمل</div>
        <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ سجّل يوم</Btn>
      </div>

      {sorted.length === 0
        ? <EmptyState icon="📅" text="ما في أيام عمل" action="+ سجّل أول يوم" onAction={() => setShowForm(true)} />
        : sorted.map(wd => {
            const emp  = employees.find(x => x.id === wd.employee_id)
            const proj = projects.find(x => x.id === wd.project_id)
            return (
              <div key={wd.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:C.card, borderRadius:12, border:`1px solid ${C.border}`, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ textAlign:'center', minWidth:36 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{fmtDate(wd.date).split('/')[0]}</div>
                    <div style={{ fontSize:9, color:C.textDim }}>{fmtDate(wd.date).split('/')[1]}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{emp?.name || '?'}</div>
                    <div style={{ fontSize:11, color:C.textDim }}>{proj?.name || '?'} • {wd.day_type}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:'monospace' }}>{fmt(wd.amount)}₪</div>
                  <button onClick={() => setConfirmDel(wd.id)} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })
      }

      <Modal open={showForm} onClose={() => setShowForm(false)} title="تسجيل يوم عمل">
        {activeEmps.length === 0 || activeProjs.length === 0
          ? <div style={{ textAlign:'center', padding:20, fontSize:14, color:C.textDim }}>لازم تضيف عمال ومشاريع أول!</div>
          : <>
              <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" required />

              {/* اختيار العامل */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:5 }}>العامل *</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {activeEmps.map(e => (
                    <button key={e.id} onClick={() => setForm(prev => ({ ...prev, employee_id: e.id }))}
                      style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${form.employee_id===e.id?C.primary:C.border}`, background:form.employee_id===e.id?`${C.primary}22`:C.bg, color:form.employee_id===e.id?C.primary:C.textDim, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      {e.name} ({e.daily_rate}₪)
                    </button>
                  ))}
                </div>
              </div>

              {/* اختيار المشروع */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:5 }}>المشروع *</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {activeProjs.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id }))}
                      style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${form.project_id===p.id?C.primary:C.border}`, background:form.project_id===p.id?`${C.primary}22`:C.bg, color:form.project_id===p.id?C.primary:C.textDim, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* نوع اليوم */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:5 }}>نوع اليوم</label>
                <div style={{ display:'flex', gap:8 }}>
                  {DAY_TYPES.map(t => (
                    <button key={t} onClick={() => setDayType(t)}
                      style={{ flex:1, padding:10, borderRadius:10, border:`2px solid ${form.day_type===t?C.primary:C.border}`, background:form.day_type===t?`${C.primary}22`:'transparent', color:form.day_type===t?C.primary:C.textDim, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {form.day_type === 'ساعات' && (
                <Input label="عدد الساعات" value={form.hours} onChange={f('hours')} type="number" min="0.5" max="24" />
              )}

              {/* معاينة المبلغ */}
              {selectedEmp && (
                <div style={{ padding:14, background:`${C.primary}15`, borderRadius:12, marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:C.textDim }}>المبلغ المحسوب</span>
                  <span style={{ fontSize:18, fontWeight:800, color:C.primary, fontFamily:'monospace' }}>{fmt(preview)}₪</span>
                </div>
              )}

              {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
              <Btn onClick={save} full disabled={saving || !form.employee_id || !form.project_id}>
                {saving ? 'جاري الحفظ...' : '✓ سجّل'}
              </Btn>
            </>
        }
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteWorkDay(confirmDel); setConfirmDel(null) }} message="حذف هذا اليوم؟" />
    </div>
  )
}
