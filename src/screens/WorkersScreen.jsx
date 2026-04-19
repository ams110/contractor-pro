import React, { useState } from 'react'
import { C, SPECS } from '../constants/index.js'
import { fmt, validateWorker } from '../lib/helpers.js'
import { Modal, Input, Btn, Card, Badge, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { setWorkerCredentials } from '../hooks/useWorkerPortal.js'

export default function WorkersScreen({ employees, workDays, payments, addEmployee, updateEmployee, deleteEmployee }) {
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  // بيانات دخول العامل
  const [credWorker, setCredWorker] = useState(null)
  const [credForm,   setCredForm]   = useState({ username: '', password: '', confirm: '' })
  const [credError,  setCredError]  = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const [credDone,   setCredDone]   = useState(false)

  // نسخ رابط البوابة
  const [copied, setCopied] = useState(false)

  function copyPortalLink() {
    const url = `${window.location.origin}${window.location.pathname}?portal`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openCreds(w) {
    setCredWorker(w)
    setCredForm({ username: '', password: '', confirm: '' })
    setCredError('')
    setCredDone(false)
  }

  async function saveCreds() {
    if (!credForm.username.trim()) return setCredError('اسم المستخدم مطلوب')
    if (credForm.password.length < 4) return setCredError('كلمة المرور 4 أحرف على الأقل')
    if (credForm.password !== credForm.confirm) return setCredError('كلمة المرور غير متطابقة')
    setCredSaving(true)
    setCredError('')
    try {
      await setWorkerCredentials(credWorker.id, credForm.username, credForm.password)
      setCredDone(true)
    } catch (e) {
      setCredError(e.message)
    } finally {
      setCredSaving(false)
    }
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
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={copyPortalLink}
            title="نسخ رابط بوابة العمال"
            style={{ padding:'7px 12px', borderRadius:10, border:`1px solid ${copied?C.success:C.border}`, background:copied?`${C.success}22`:'transparent', color:copied?C.success:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
            {copied ? '✓ تم النسخ' : '🔗 رابط البوابة'}
          </button>
          <Btn onClick={openNew}>+ جديد</Btn>
        </div>
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
                      <button onClick={() => openCreds(w)}
                        title="بيانات دخول العامل"
                        style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        🔑
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

      {/* فورم إضافة/تعديل عامل */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'تعديل عامل' : 'عامل جديد'}>
        <Input label="الاسم"             value={form.name}           onChange={f('name')}          required />
        <Input label="التلفون"           value={form.phone}          onChange={f('phone')}         type="tel" />
        <Input label="التخصص"           value={form.specialization}  onChange={f('specialization')} options={SPECS} />
        <Input label="الأجر اليومي (₪)" value={form.daily_rate}     onChange={f('daily_rate')}    type="number" min="1" required />
        {formError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {formError}</div>}
        <Btn onClick={save} full disabled={saving}>{saving ? 'جاري الحفظ...' : editing ? 'حفظ' : 'أضف العامل'}</Btn>
      </Modal>

      {/* فورم بيانات الدخول */}
      <Modal open={!!credWorker} onClose={() => setCredWorker(null)} title={`🔑 بيانات دخول ${credWorker?.name || ''}`}>
        {credDone ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.success, marginBottom:6 }}>تم الحفظ!</div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:16 }}>
              اسم المستخدم: <b style={{ color:C.primary }}>{credForm.username}</b>
            </div>
            <div style={{ padding:'10px 14px', background:`${C.border}33`, borderRadius:10, fontSize:12, color:C.textDim, marginBottom:16, textAlign:'right' }}>
              أرسل رابط البوابة وبيانات الدخول للعامل عبر واتساب:
              <br/><b style={{ color:C.text }}>رابط: </b>
              <span style={{ color:C.primary, fontSize:11 }}>{window.location.origin}{window.location.pathname}?portal</span>
            </div>
            <Btn onClick={() => setCredWorker(null)} full>إغلاق</Btn>
          </div>
        ) : (
          <>
            <div style={{ padding:'10px 12px', background:`${C.border}22`, borderRadius:10, marginBottom:14, fontSize:12, color:C.textDim }}>
              العامل سيستخدم هذه البيانات لتسجيل الدخول في بوابة العمال ومشاهدة راتبه
            </div>
            <Input label="اسم المستخدم" value={credForm.username}
              onChange={v => setCredForm(p => ({ ...p, username: v }))} required />
            <Input label="كلمة المرور (4 أحرف على الأقل)" value={credForm.password}
              onChange={v => setCredForm(p => ({ ...p, password: v }))} type="password" required />
            <Input label="تأكيد كلمة المرور" value={credForm.confirm}
              onChange={v => setCredForm(p => ({ ...p, confirm: v }))} type="password" required />
            {credError && <div style={{ fontSize:12, color:C.accent, marginBottom:12 }}>⚠ {credError}</div>}
            <Btn onClick={saveCreds} full disabled={credSaving}>
              {credSaving ? 'جاري الحفظ...' : '✓ حفظ بيانات الدخول'}
            </Btn>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteEmployee(confirmDel); setConfirmDel(null) }} message="حذف هالعامل؟" />
    </div>
  )
}
