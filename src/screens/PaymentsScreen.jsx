import React, { useState, useRef } from 'react'
import { C, GRAD, PAY_METHODS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validatePayment } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { uploadReceipt } from '../lib/storage.js'
import { exportPaymentsToExcel } from '../lib/export.js'

function sendWhatsApp(phone, name, amount, date) {
  if (!phone) return
  const clean = phone.replace(/\D/g, '').replace(/^0/, '972')
  const msg   = `السلام عليكم ${name}،\nتم صرف راتبك بمبلغ ${fmt(amount)}₪ بتاريخ ${fmtDate(date)}.\nشكراً 🏗️`
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank')
}

export default function PaymentsScreen({ payments, employees, workDays, projects = [], addPayment, deletePayment, approvePaymentRequest, rejectPaymentRequest, userId, permissions }) {
  const [showForm,    setShowForm]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview,     setPreview]     = useState('')
  // لموافقة طلب عامل: نختار المشروع
  const [approvingId,    setApprovingId]    = useState(null)
  const [approveProject, setApproveProject] = useState('')
  const [approvingSaving, setApprovingSaving] = useState(false)
  const fileRef = useRef()

  const emptyForm = { date: todayStr(), employee_id:'', amount:'', method:'', project_id:'' }
  const [form, setForm] = useState(emptyForm)
  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  const approvedPayments = payments.filter(p => p.status !== 'pending')
  const pendingPayments  = payments.filter(p => p.status === 'pending')

  function calcOwed(empId) {
    const earned = workDays.filter(w => w.employee_id === empId).reduce((s, w) => s + w.amount, 0)
    const paid   = approvedPayments.filter(p => p.employee_id === empId).reduce((s, p) => s + p.amount, 0)
    return Math.max(0, earned - paid)
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
      let receipt_url = ''
      if (receiptFile && form.method === 'تحويل بنكي') receipt_url = await uploadReceipt(userId, receiptFile)
      await addPayment({ ...form, amount: parseFloat(form.amount), receipt_url, project_id: form.project_id || null })
      setForm(emptyForm); setReceiptFile(null); setPreview(''); setShowForm(false)
    } catch (e) { setFormError(e.message) }
    finally     { setSaving(false) }
  }

  async function doApprove() {
    if (!approvingId) return
    setApprovingSaving(true)
    try {
      await approvePaymentRequest?.(approvingId, approveProject || null)
      setApprovingId(null); setApproveProject('')
    } catch (e) { alert(e.message) }
    finally { setApprovingSaving(false) }
  }

  const activeEmployees = employees.filter(emp => {
    const earned = workDays.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
    const paid   = approvedPayments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    return earned > 0 || paid > 0
  })

  const totalOwed = activeEmployees.reduce((s, e) => s + calcOwed(e.id), 0)
  const totalPaid = approvedPayments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="fade-up" style={{ padding:16, paddingBottom:100 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, background:GRAD.success, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            💰 الدفعات
          </div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{approvedPayments.length} دفعة{pendingPayments.length > 0 ? ` • ${pendingPayments.length} معلق` : ''}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {approvedPayments.length > 0 && (
            <button onClick={() => exportPaymentsToExcel(approvedPayments, employees)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, fontSize:12, cursor:'pointer', fontWeight:600 }}>
              📊
            </button>
          )}
          {permissions?.addPayments !== false && (
            <button onClick={() => { setFormError(''); setShowForm(true) }}
              style={{ padding:'10px 18px', borderRadius:14, background:GRAD.success, color:'#fff', border:'none', cursor:'pointer', fontWeight:800, fontSize:13, boxShadow:`0 4px 16px ${C.success}44` }}>
              + دفعة
            </button>
          )}
        </div>
      </div>

      {/* ── طلبات الرواتب المعلقة من العمال ── */}
      {pendingPayments.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <SectionLabel color={C.warning}>⏳ طلبات رواتب من العمال ({pendingPayments.length})</SectionLabel>
          {pendingPayments.map(p => {
            const emp = employees.find(e => e.id === p.employee_id)
            return (
              <GlassCard key={p.id} style={{ overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:3, background:GRAD.warm }} />
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{emp?.name || '?'}</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{fmtDate(p.date)} • {p.method || 'كاش'}</div>
                      {p.notes && <div style={{ fontSize:11, color:C.primary, marginTop:2 }}>💬 {p.notes}</div>}
                      {p.project_name && <div style={{ fontSize:10, color:C.textDim, marginTop:2 }}>🏗️ {p.project_name}</div>}
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:C.warning, fontFamily:'monospace' }}>{fmt(p.amount)}₪</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setApprovingId(p.id); setApproveProject(p.project_id || '') }}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:GRAD.success, border:'none', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                      ✓ موافقة
                    </button>
                    <button onClick={() => rejectPaymentRequest?.(p.id)}
                      style={{ flex:1, padding:'9px 0', borderRadius:10, background:`${C.accent}20`, border:`1px solid ${C.accent}55`, color:C.accent, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      ✗ رفض
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

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
      {activeEmployees.length === 0 && pendingPayments.length === 0
        ? <EmptyState icon="💰" text="ما في دفعات بعد" action="+ أضف دفعة" onAction={() => setShowForm(true)} />
        : activeEmployees.length > 0 && (
          <>
            <SectionLabel color={C.primary} style={{ marginBottom:12 }}>العمال</SectionLabel>
            {activeEmployees.map(emp => {
              const earned = workDays.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
              const paid   = approvedPayments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
              const owed   = Math.max(0, earned - paid)
              const pct    = earned > 0 ? Math.min(100, Math.round((paid / earned) * 100)) : 100
              const grad   = owed > 0 ? GRAD.danger : GRAD.success
              return (
                <GlassCard key={emp.id} style={{ overflow:'hidden', marginBottom:10 }}>
                  <div style={{ height:3, background:grad }} />
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:42, height:42, borderRadius:'50%', background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900, color:'#fff', flexShrink:0 }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{emp.name}</div>
                          <div style={{ fontSize:11, color:C.textDim }}>{emp.specialization || ''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'center', padding:'6px 12px', borderRadius:12, background: owed > 0 ? `${C.accent}20` : `${C.success}20`, border:`1px solid ${owed > 0 ? C.accent : C.success}44` }}>
                        <div style={{ fontSize:14, fontWeight:900, color: owed > 0 ? C.accent : C.success, fontFamily:'monospace' }}>
                          {owed > 0 ? `${fmt(owed)}₪` : 'مسدد ✓'}
                        </div>
                        <div style={{ fontSize:9, color:C.textDim }}>{owed > 0 ? 'متبقي' : ''}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-around', marginBottom:10 }}>
                      {[
                        { l:'مستحق', v:`${fmt(earned)}₪`, c:C.text },
                        { l:'مدفوع', v:`${fmt(paid)}₪`,   c:C.success },
                        { l:'الراتب اليومي', v:`${fmt(emp.daily_rate || 0)}₪`, c:C.textDim },
                      ].map(s => (
                        <div key={s.l} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:9, color:C.textDim, fontWeight:600 }}>{s.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
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
      {approvedPayments.length > 0 && (
        <div style={{ marginTop:8 }}>
          <SectionLabel color={C.success}>سجل الدفعات</SectionLabel>
          <div style={{ position:'relative', paddingRight:20 }}>
            <div style={{ position:'absolute', top:8, right:7, bottom:8, width:2, background:`${C.border}88`, borderRadius:1 }} />
            {[...approvedPayments].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(p => {
              const emp  = employees.find(e => e.id === p.employee_id)
              const proj = projects.find(pr => pr.id === p.project_id)
              return (
                <div key={p.id} style={{ display:'flex', gap:12, marginBottom:10, position:'relative' }}>
                  <div style={{ position:'absolute', right:-13, top:14, width:10, height:10, borderRadius:'50%', background:GRAD.success, border:`2px solid ${C.bg}`, flexShrink:0, zIndex:1 }} />
                  <GlassCard style={{ flex:1, marginBottom:0, overflow:'hidden' }}>
                    <div style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{emp?.name || '?'}</div>
                          <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{fmtDate(p.date)}{p.method ? ` • ${p.method}` : ''}</div>
                          {proj && <div style={{ fontSize:10, color:C.primary, marginTop:2, fontWeight:600 }}>🏗️ {proj.name}</div>}
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
                          <button onClick={() => setConfirmDel(p.id)}
                            style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:12 }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modal دفعة جديدة ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="دفعة جديدة">
        <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" />

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

        <Input label="المبلغ (₪)" value={form.amount} onChange={f('amount')} type="number" min="0.01" required />
        <Input label="طريقة الدفع" value={form.method} onChange={f('method')} options={PAY_METHODS} />

        {/* اختيار المشروع */}
        {projects.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>🏗️ من مشروع (اختياري)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <button onClick={() => setForm(p => ({ ...p, project_id:'' }))}
                style={{ padding:'7px 12px', borderRadius:10, border:`1.5px solid ${!form.project_id ? C.primary : C.border}`, background:!form.project_id ? `${C.primary}22` : 'transparent', color:!form.project_id ? C.primary : C.textDim, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                بدون مشروع
              </button>
              {projects.map(pr => (
                <button key={pr.id} onClick={() => setForm(p => ({ ...p, project_id: pr.id }))}
                  style={{ padding:'7px 12px', borderRadius:10, border:`1.5px solid ${form.project_id===pr.id ? C.primary : C.border}`, background:form.project_id===pr.id ? `${C.primary}22` : 'transparent', color:form.project_id===pr.id ? C.primary : C.textDim, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {pr.name}
                </button>
              ))}
            </div>
            {form.project_id && (
              <div style={{ marginTop:8, fontSize:11, color:C.success, fontWeight:600 }}>
                ✓ سيُسجَّل كمصروف (رواتب عمال) على هذا المشروع
              </div>
            )}
          </div>
        )}

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
        <Btn onClick={save} full disabled={saving || !form.employee_id || !form.amount}>
          {saving ? 'جاري الحفظ...' : '✓ سجّل الدفعة'}
        </Btn>
      </Modal>

      {/* ── Modal الموافقة على طلب عامل ── */}
      <Modal open={!!approvingId} onClose={() => { setApprovingId(null); setApproveProject('') }} title="موافقة على طلب الراتب">
        {(() => {
          const pay = pendingPayments.find(p => p.id === approvingId)
          const emp = employees.find(e => e.id === pay?.employee_id)
          return pay ? (
            <>
              <div style={{ padding:'12px 14px', background:`${C.success}12`, borderRadius:12, marginBottom:16, border:`1px solid ${C.success}33` }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{emp?.name}</div>
                <div style={{ fontSize:20, fontWeight:900, color:C.success, fontFamily:'monospace', marginTop:4 }}>{fmt(pay.amount)}₪</div>
                {pay.notes && <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>💬 {pay.notes}</div>}
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>🏗️ من أي مشروع؟ (اختياري)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  <button onClick={() => setApproveProject('')}
                    style={{ padding:'7px 12px', borderRadius:10, border:`1.5px solid ${!approveProject ? C.primary : C.border}`, background:!approveProject ? `${C.primary}22` : 'transparent', color:!approveProject ? C.primary : C.textDim, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    بدون مشروع
                  </button>
                  {projects.map(pr => (
                    <button key={pr.id} onClick={() => setApproveProject(pr.id)}
                      style={{ padding:'7px 12px', borderRadius:10, border:`1.5px solid ${approveProject===pr.id ? C.primary : C.border}`, background:approveProject===pr.id ? `${C.primary}22` : 'transparent', color:approveProject===pr.id ? C.primary : C.textDim, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {pr.name}
                    </button>
                  ))}
                </div>
                {approveProject && (
                  <div style={{ marginTop:8, fontSize:11, color:C.success, fontWeight:600 }}>
                    ✓ سيُسجَّل كمصروف (رواتب عمال) على هذا المشروع
                  </div>
                )}
              </div>
              <Btn onClick={doApprove} full disabled={approvingSaving}>
                {approvingSaving ? 'جاري الحفظ...' : '✓ تأكيد الدفعة'}
              </Btn>
            </>
          ) : null
        })()}
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deletePayment(confirmDel); setConfirmDel(null) }} message="حذف هالدفعة؟" />
    </div>
  )
}
