import React, { useState } from 'react'
import { C, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcSalary, validateWorkDay } from '../lib/helpers.js'
import { Modal, Input, Btn, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { exportWorkDaysToExcel } from '../lib/export.js'

export default function WorkDaysScreen({ workDays, employees, projects, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay }) {
  const [showForm,   setShowForm]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [approving,  setApproving]  = useState(null)

  const emptyForm = { date: todayStr(), employee_id: '', project_id: '', day_type: 'كامل', hours: '8' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  const activeEmps  = employees.filter(e => e.status === 'نشط')
  const activeProjs = projects.filter(p => p.status === 'نشط')
  const selectedEmp = form.employee_id ? employees.find(e => e.id === form.employee_id) : null
  const preview     = selectedEmp ? calcSalary(selectedEmp.daily_rate, form.day_type, form.hours) : 0

  // الأيام المعلقة (من العمال)
  const pendingDays = workDays.filter(wd => wd.status === 'pending')
  // الأيام الموافق عليها
  const approvedDays = workDays.filter(wd => wd.status !== 'pending')

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

  async function handleApprove(id) {
    setApproving(id)
    try { await approveWorkDay(id) } finally { setApproving(null) }
  }

  async function handleReject(id) {
    setApproving(id)
    try { await rejectWorkDay(id) } finally { setApproving(null) }
  }

  const sorted = [...approvedDays].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>📅 أيام العمل</div>
          {pendingDays.length > 0 && (
            <div style={{ background: C.warning, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800, color: '#000' }}>
              {pendingDays.length} معلق
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {workDays.length > 0 && (
            <button onClick={() => exportWorkDaysToExcel(workDays, employees, projects)}
              style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer' }}>
              📊 Excel
            </button>
          )}
          <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ سجّل يوم</Btn>
        </div>
      </div>

      {/* ─── قسم الأيام المعلقة ─── */}
      {pendingDays.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.warning, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            ⏳ طلبات بانتظار موافقتك
          </div>
          {pendingDays.map(wd => {
            const emp  = employees.find(x => x.id === wd.employee_id)
            const proj = projects.find(x => x.id === wd.project_id)
            const busy = approving === wd.id
            return (
              <div key={wd.id} style={{ padding: '12px 14px', background: `${C.warning}11`, borderRadius: 12, border: `1px solid ${C.warning}44`, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{emp?.name || '?'}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(wd.date)} • {proj?.name || '?'} • {wd.day_type}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.warning, fontFamily: 'monospace' }}>{fmt(wd.amount)}₪</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => handleApprove(wd.id)} disabled={busy}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: busy ? C.border : C.success, border: 'none', color: busy ? C.textDim : '#000', fontSize: 13, fontWeight: 800, cursor: busy ? 'default' : 'pointer' }}>
                    {busy ? '...' : '✓ موافقة'}
                  </button>
                  <button onClick={() => handleReject(wd.id)} disabled={busy}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: busy ? C.border : `${C.accent}22`, border: `1px solid ${C.accent}55`, color: busy ? C.textDim : C.accent, fontSize: 13, fontWeight: 800, cursor: busy ? 'default' : 'pointer' }}>
                    {busy ? '...' : '✗ رفض'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── الأيام الموافق عليها ─── */}
      {sorted.length === 0 && pendingDays.length === 0
        ? <EmptyState icon="📅" text="ما في أيام عمل" action="+ سجّل أول يوم" onAction={() => setShowForm(true)} />
        : sorted.length > 0 && (
          <>
            {pendingDays.length > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 8 }}>الأيام الموافق عليها</div>
            )}
            {sorted.map(wd => {
              const emp  = employees.find(x => x.id === wd.employee_id)
              const proj = projects.find(x => x.id === wd.project_id)
              return (
                <div key={wd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'center', minWidth: 36 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{fmtDate(wd.date).split('/')[0]}</div>
                      <div style={{ fontSize: 9, color: C.textDim }}>{fmtDate(wd.date).split('/')[1]}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{emp?.name || '?'}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{proj?.name || '?'} • {wd.day_type}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: 'monospace' }}>{fmt(wd.amount)}₪</div>
                    <button onClick={() => setConfirmDel(wd.id)} style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </>
        )
      }

      <Modal open={showForm} onClose={() => setShowForm(false)} title="تسجيل يوم عمل">
        {activeEmps.length === 0 || activeProjs.length === 0
          ? <div style={{ textAlign: 'center', padding: 20, fontSize: 14, color: C.textDim }}>لازم تضيف عمال ومشاريع أول!</div>
          : <>
              <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" required />

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 5 }}>العامل *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeEmps.map(e => (
                    <button key={e.id} onClick={() => setForm(prev => ({ ...prev, employee_id: e.id }))}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.employee_id === e.id ? C.primary : C.border}`, background: form.employee_id === e.id ? `${C.primary}22` : C.bg, color: form.employee_id === e.id ? C.primary : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {e.name} ({e.daily_rate}₪)
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 5 }}>المشروع *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeProjs.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id }))}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.project_id === p.id ? C.primary : C.border}`, background: form.project_id === p.id ? `${C.primary}22` : C.bg, color: form.project_id === p.id ? C.primary : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 5 }}>نوع اليوم</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DAY_TYPES.map(t => (
                    <button key={t} onClick={() => setDayType(t)}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${form.day_type === t ? C.primary : C.border}`, background: form.day_type === t ? `${C.primary}22` : 'transparent', color: form.day_type === t ? C.primary : C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {form.day_type === 'ساعات' && (
                <Input label="عدد الساعات" value={form.hours} onChange={f('hours')} type="number" min="0.5" max="24" />
              )}

              {selectedEmp && (
                <div style={{ padding: 14, background: `${C.primary}15`, borderRadius: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: C.textDim }}>المبلغ المحسوب</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>{fmt(preview)}₪</span>
                </div>
              )}

              {formError && <div style={{ fontSize: 12, color: C.accent, marginBottom: 12 }}>⚠ {formError}</div>}
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
