import React, { useState, useRef } from 'react'
import { C, GRAD, PAY_METHODS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validatePayment } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportPaymentsToExcel } from '../lib/export.js'

function fmtMonth(ym) {
  return new Date(ym + '-01').toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
}

function sendWhatsApp(phone, name, amount, date) {
  if (!phone) return
  const clean = phone.replace(/\D/g, '').replace(/^0/, '972')
  const msg   = `السلام عليكم ${name}،\nتم صرف راتبك بمبلغ ${fmt(amount)}₪ بتاريخ ${fmtDate(date)}.\nشكراً 🏗️`
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function PaymentsScreen({ payments, employees, workDays, expenses = [], projects = [], addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest, userId, permissions, payMethods }) {
  const methods = payMethods?.length ? payMethods : PAY_METHODS

  const currentMonth = todayStr().slice(0, 7)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [openMonths,  setOpenMonths]  = useState(new Set())

  const [showForm,    setShowForm]    = useState(false)
  const [editingId,   setEditingId]   = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview,     setPreview]     = useState('')
  const [approvingId,    setApprovingId]    = useState(null)
  const [approveProject, setApproveProject] = useState('')
  const [approvingSaving, setApprovingSaving] = useState(false)
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), employee_id:'', amount:'', method:'', project_id:'' }
  const [form, setForm] = useState(emptyForm)
  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function openEdit(p) {
    setEditingId(p.id)
    setForm({ date: p.date, employee_id: p.employee_id, amount: String(p.amount), method: p.method || '', project_id: p.project_id || '' })
    setFormError('')
    setReceiptFile(null)
    setPreview(p.receipt_url || '')
    setShowForm(true)
  }

  function calcOwed(empId) {
    const earned = workDays.filter(w => w.employee_id === empId && w.status === 'approved').reduce((s, w) => s + w.amount, 0)
    const wExp   = expenses.filter(e => e.employee_id === empId && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
    const paid   = payments.filter(p => p.employee_id === empId).reduce((s, p) => s + p.amount, 0)
    return Math.max(0, earned + wExp - paid)
  }

  function selectEmployee(emp) {
    const owed = calcOwed(emp.id)
    setForm(prev => ({ ...prev, employee_id: emp.id, amount: owed > 0 ? String(owed) : prev.amount }))
  }

  function pickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function save() {
    const err = validatePayment(form)
    if (err) return setFormError(err)
    setSaving(true)
    try {
      let receipt_url = preview && !receiptFile ? preview : ''
      if (receiptFile) receipt_url = await uploadReceipt(userId, receiptFile)
      const payload = { ...form, amount: parseFloat(form.amount), receipt_url, project_id: form.project_id || null }
      if (editingId) {
        await updatePayment(editingId, { date: payload.date, amount: payload.amount, method: payload.method, project_id: payload.project_id, receipt_url: payload.receipt_url })
      } else {
        await addPayment(payload)
      }
      setForm(emptyForm); setReceiptFile(null); setPreview(''); setShowForm(false); setEditingId(null)
    } catch (e) { setFormError(e.message) }
    finally     { setSaving(false) }
  }

  async function doApprove() {
    if (!approvingId) return
    setApprovingSaving(true)
    try { await approvePaymentRequest?.(approvingId, approveProject || null); setApprovingId(null); setApproveProject('') }
    catch (e) { alert(e.message) }
    finally { setApprovingSaving(false) }
  }

  const activeEmployees = employees.filter(emp => {
    const earned = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved').reduce((s, w) => s + w.amount, 0)
    const wExp   = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
    const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    return earned + wExp > 0 || paid > 0
  })

  const totalOwed = activeEmployees.reduce((s, e) => s + calcOwed(e.id), 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="fade-up" style={{ padding:16, paddingBottom:100 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, background:GRAD.success, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            💰 الدفعات
          </div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{payments.length} دفعة</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {payments.length > 0 && (
            <button onClick={() => exportPaymentsToExcel(payments, employees)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, fontSize:12, cursor:'pointer', fontWeight:600 }}>
              📊
            </button>
          )}
          {permissions?.addPayments !== false && (
            <button onClick={() => { setFormError(''); setEditingId(null); setForm(emptyForm); setPreview(''); setShowForm(true) }}
              style={{ padding:'10px 18px', borderRadius:14, background:GRAD.success, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontSize:13, boxShadow:`0 4px 16px ${C.success}44` }}>
              + دفعة
            </button>
          )}
        </div>
      </div>

      {/* ── ملخص الإجماليات ── */}
      {(totalOwed > 0 || totalPaid > 0) && (
        <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ height:3, background:GRAD.success }} />
          <div style={{ padding:'14px 16px', display:'flex', justifyContent:'space-around' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>مدفوع للعمال</div>
              <div style={{ fontSize:22, fontWeight:900, color:C.success, fontFamily:'monospace' }}>{fmt(totalPaid)}₪</div>
            </div>
            <div style={{ width:1, background:C.border }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:C.textDim, fontWeight:600, marginBottom:4 }}>رواتب معلقة</div>
              <div style={{ fontSize:22, fontWeight:900, color: totalOwed > 0 ? C.accent : C.success, fontFamily:'monospace' }}>{fmt(totalOwed)}₪</div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── بطاقات العمال ── */}
      {activeEmployees.length === 0
        ? <EmptyState icon="💰" text="ما في دفعات بعد" action="+ أضف دفعة" onAction={() => setShowForm(true)} />
        : (
          <>
            <SectionLabel color={C.primary} style={{ marginBottom:12 }}>العمال</SectionLabel>
            {activeEmployees.map(emp => {
              const earned = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved').reduce((s, w) => s + w.amount, 0)
              const wExp   = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
              const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
              const owed   = Math.max(0, earned + wExp - paid)
              const pct    = (earned + wExp) > 0 ? Math.min(100, Math.round((paid / (earned + wExp)) * 100)) : 100
              const grad   = owed > 0 ? GRAD.danger : GRAD.success

              return (
                <GlassCard key={emp.id}
                  onClick={() => { setSelectedEmp(emp); setOpenMonths(new Set([currentMonth])) }}
                  style={{ overflow:'hidden', marginBottom:10, cursor:'pointer' }}>
                  <div style={{ height:3, background:grad }} />
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      {/* Avatar + name */}
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:42, height:42, borderRadius:'50%', background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900, color:'#fff', flexShrink:0 }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{emp.name}</div>
                          <div style={{ fontSize:11, color:C.textDim }}>{emp.specialization || ''}</div>
                        </div>
                      </div>
                      {/* owed badge */}
                      <div style={{ textAlign:'center', padding:'6px 12px', borderRadius:12, background: owed > 0 ? `${C.accent}20` : `${C.success}20`, border:`1px solid ${owed > 0 ? C.accent : C.success}44` }}>
                        <div style={{ fontSize:14, fontWeight:900, color: owed > 0 ? C.accent : C.success, fontFamily:'monospace' }}>
                          {owed > 0 ? `${fmt(owed)}₪` : 'مسدد ✓'}
                        </div>
                        <div style={{ fontSize:9, color:C.textDim }}>{owed > 0 ? 'متبقي' : ''}</div>
                      </div>
                    </div>

                    {/* تفاصيل صغيرة */}
                    <div style={{ display:'flex', justifyContent:'space-around', marginBottom:10 }}>
                      {[
                        { l:'مستحق', v:`${fmt(earned + wExp)}₪`, c:C.text },
                        { l:'مدفوع', v:`${fmt(paid)}₪`,          c:C.success },
                        { l:'الراتب اليومي', v:`${fmt(emp.daily_rate || 0)}₪`, c:C.textDim },
                      ].map(s => (
                        <div key={s.l} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:9, color:C.textDim, fontWeight:600 }}>{s.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* شريط تقدم */}
                    <div style={{ height:6, background:`${C.border}66`, borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:grad, borderRadius:3, transition:'width .5s' }} />
                    </div>
                    <div style={{ fontSize:9, color:C.textDim, marginTop:4, textAlign:'center' }}>{pct}% مدفوع</div>
                  </div>
                </GlassCard>
              )
            })}
          </>
        )
      }

      {/* ── سجل الدفعات (timeline) ── */}
      {payments.length > 0 && (
        <div style={{ marginTop:8 }}>
          <SectionLabel color={C.success}>سجل الدفعات</SectionLabel>
          <div style={{ position:'relative', paddingRight:20 }}>
            {/* خط Timeline */}
            <div style={{ position:'absolute', top:8, right:7, bottom:8, width:2, background:`${C.border}88`, borderRadius:1 }} />

            {[...payments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((p, i) => {
              const emp = employees.find(e => e.id === p.employee_id)
              return (
                <div key={p.id} style={{ display:'flex', gap:12, marginBottom:10, position:'relative' }}>
                  {/* نقطة timeline */}
                  <div style={{ position:'absolute', right:-13, top:14, width:10, height:10, borderRadius:'50%', background:GRAD.success, border:`2px solid ${C.bg}`, flexShrink:0, zIndex:1 }} />

                  <GlassCard style={{ flex:1, marginBottom:0, overflow:'hidden' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px' }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{emp?.name || '?'}</div>
                        <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{fmtDate(p.date)}{p.method ? ` • ${p.method}` : ''}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ fontSize:16, fontWeight:900, color:C.success, fontFamily:'monospace' }}>{fmt(p.amount)}₪</div>
                        {p.receipt_url && (
                          <a href={p.receipt_url} target="_blank" rel="noreferrer" style={{ textDecoration:'none', fontSize:16 }}>📎</a>
                        )}
                        {emp?.phone && (
                          <button onClick={() => sendWhatsApp(emp.phone, emp.name, p.amount, p.date)}
                            style={{ background:`${C.success}15`, border:`1px solid ${C.success}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:13 }}>
                            💬
                          </button>
                        )}
                        {permissions?.addPayments !== false && (
                          <button onClick={() => openEdit(p)}
                            style={{ background:`${C.primary}15`, border:`1px solid ${C.primary}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:12 }}>
                            ✏️
                          </button>
                        )}
                        <button onClick={() => setConfirmDel(p.id)}
                          style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:12 }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal دفعة جديدة / تعديل ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingId(null) }} title={editingId ? 'تعديل الدفعة' : 'دفعة جديدة'}>
        <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" />

        {!editingId && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>العامل *</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {employees.map(e => {
                const owed = calcOwed(e.id)
                return (
                  <button key={e.id} onClick={() => selectEmployee(e)}
                    style={{ padding:'8px 14px', borderRadius:12, border:`1.5px solid ${form.employee_id===e.id ? C.primary : C.border}`, background:form.employee_id===e.id ? `${C.primary}22` : C.bg, color:form.employee_id===e.id ? C.primary : C.textDim, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                    {e.name}{owed > 0 ? ` (${fmt(owed)}₪)` : ''}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Input label="المبلغ (₪)" value={form.amount} onChange={f('amount')} type="number" min="0.01" required />
        <Input label="طريقة الدفع" value={form.method} onChange={f('method')} options={methods} />

        {form.method === 'تحويل بنكي' && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>📎 إثبات التحويل</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={pickFile} />
            {preview
              ? <div style={{ position:'relative' }}>
                  <img src={preview} alt="إثبات" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12, border:`1px solid ${C.border}` }} />
                  <button onClick={() => { setReceiptFile(null); setPreview('') }}
                    style={{ position:'absolute', top:6, left:6, background:`${C.accent}dd`, border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', fontSize:14 }}>×</button>
                </div>
              : <button onClick={() => fileRef.current.click()}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:`2px dashed ${C.border}`, background:'transparent', color:C.textDim, fontSize:12, cursor:'pointer' }}>
                  📷 اضغط لرفع صورة الإثبات
                </button>
            }
          </div>
        )}

        {formError && <div style={{ padding:'10px 12px', background:`${C.accent}18`, borderRadius:10, fontSize:12, color:C.accent, marginBottom:14, fontWeight:600 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving || (!editingId && !form.employee_id) || !form.amount}>
          {saving ? 'جاري الحفظ...' : editingId ? '✓ حفظ التعديل' : '✓ سجّل الدفعة'}
        </Btn>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deletePayment(confirmDel); setConfirmDel(null) }} message="حذف هالدفعة؟" />

      {/* ── سجل العامل المالي (modal) ── */}
      {selectedEmp && (() => {
        const emp = selectedEmp
        const empWorkDays = workDays.filter(w => w.employee_id === emp.id)
        const empPayments = payments.filter(p => p.employee_id === emp.id)
        const totalEarned = empWorkDays.reduce((s, w) => s + w.amount, 0)
        const totalPaid   = empPayments.reduce((s, p) => s + p.amount, 0)
        const totalOwedEmp = Math.max(0, totalEarned - totalPaid)
        const gradEmp = totalOwedEmp > 0 ? GRAD.danger : GRAD.success

        // بناء بيانات الأشهر مع رصيد تراكمي (من الأقدم للأحدث)
        const allMonthsAsc = [...new Set([
          ...empWorkDays.map(w => (w.date || '').slice(0, 7)),
          ...empPayments.map(p => (p.date || '').slice(0, 7)),
        ]).values()].filter(Boolean).sort((a, b) => a.localeCompare(b))

        let runningBalance = 0
        const monthDataAsc = allMonthsAsc.map(m => {
          const mEarned    = empWorkDays.filter(w => (w.date || '').startsWith(m)).reduce((s, w) => s + w.amount, 0)
          const mPaid      = empPayments.filter(p => (p.date || '').startsWith(m)).reduce((s, p) => s + p.amount, 0)
          const daysCount  = empWorkDays.filter(w => (w.date || '').startsWith(m)).length
          const paysCount  = empPayments.filter(p => (p.date || '').startsWith(m)).length
          runningBalance   = runningBalance + mEarned - mPaid
          return { m, mEarned, mPaid, daysCount, paysCount, balance: runningBalance }
        })
        // عرض من الأحدث للأقدم
        const monthDataDesc = [...monthDataAsc].reverse()

        function toggleMonth(m) {
          setOpenMonths(prev => {
            const next = new Set(prev)
            next.has(m) ? next.delete(m) : next.add(m)
            return next
          })
        }

        return (
          <div
            onClick={() => setSelectedEmp(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ background:C.surface, borderRadius:'20px 20px 0 0', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,0.5)' }}>

              {/* رأس الـ modal */}
              <div style={{ padding:'16px 16px 12px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', background:gradEmp, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff' }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize:16, fontWeight:900, color:C.text }}>{emp.name}</div>
                      <div style={{ fontSize:11, color:C.textDim }}>السجل المالي</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEmp(null)}
                    style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.06)', color:C.textDim, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    ×
                  </button>
                </div>
                {/* الإجماليات */}
                <div style={{ display:'flex', justifyContent:'space-around', background:`${C.border}33`, borderRadius:14, padding:'10px 8px' }}>
                  {[
                    { l:'المستحق الكلي', v:`${fmt(totalEarned)}₪`, c:C.text },
                    { l:'المدفوع الكلي', v:`${fmt(totalPaid)}₪`,   c:C.success },
                    { l:'المتبقي',       v: totalOwedEmp > 0 ? `${fmt(totalOwedEmp)}₪` : 'مسدد ✓', c: totalOwedEmp > 0 ? C.accent : C.success },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:C.textDim, fontWeight:600, marginBottom:2 }}>{s.l}</div>
                      <div style={{ fontSize:13, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* قائمة الأشهر */}
              <div style={{ overflowY:'auto', padding:'12px 16px 32px', flex:1 }}>
                {monthDataDesc.length === 0
                  ? <div style={{ textAlign:'center', color:C.textDim, padding:32, fontSize:13 }}>لا يوجد سجل مالي</div>
                  : monthDataDesc.map(({ m, mEarned, mPaid, daysCount, paysCount, balance }) => {
                      const isOpen = openMonths.has(m)
                      const mGrad  = balance > 0 ? GRAD.danger : GRAD.success

                      return (
                        <div key={m} style={{ marginBottom:8, borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}` }}>
                          {/* رأس الشهر */}
                          <button onClick={() => toggleMonth(m)}
                            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background: isOpen ? `${C.border}44` : 'transparent', border:'none', cursor:'pointer', gap:8 }}>
                            <div style={{ height:3, position:'absolute', top:0, left:0, right:0, background: mGrad }} />
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:14, fontWeight:800, color:C.text }}>{fmtMonth(m)}</span>
                              <span style={{ fontSize:10, color:C.textDim, background:`${C.border}66`, borderRadius:8, padding:'2px 8px' }}>
                                {daysCount > 0 ? `${daysCount} يوم` : ''}{daysCount > 0 && paysCount > 0 ? ' · ' : ''}{paysCount > 0 ? `${paysCount} دفعة` : ''}
                              </span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:13, fontWeight:900, color: balance > 0 ? C.accent : C.success, fontFamily:'monospace' }}>
                                {balance > 0 ? `${fmt(balance)}₪ باقي` : 'مسدد ✓'}
                              </span>
                              <span style={{ color:C.textDim, fontSize:12, transition:'transform .2s', display:'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </div>
                          </button>

                          {/* تفاصيل الشهر */}
                          {isOpen && (
                            <div style={{ padding:'10px 14px 14px', borderTop:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:8 }}>
                              {[
                                { l:'المستحق',         v:`${fmt(mEarned)}₪`, c:C.primary },
                                { l:'واصل',            v:`${fmt(mPaid)}₪`,   c:C.success },
                                { l:'الرصيد التراكمي', v: balance > 0 ? `${fmt(balance)}₪` : 'مسدد ✓', c: balance > 0 ? C.accent : C.success },
                              ].map(row => (
                                <div key={row.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:`${C.border}22`, borderRadius:10 }}>
                                  <span style={{ fontSize:13, color:C.textDim, fontWeight:600 }}>{row.l}</span>
                                  <span style={{ fontSize:15, fontWeight:900, color:row.c, fontFamily:'monospace' }}>{row.v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
