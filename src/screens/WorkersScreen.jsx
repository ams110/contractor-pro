import React, { useState } from 'react'
import { C, GRAD, SPECS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateWorker } from '../lib/helpers.js'
import { GlassCard, Card, StatCard, Modal, Input, Btn, Badge, EmptyState, ConfirmDialog, AnimatedNumber } from '../components/index.jsx'
import { setWorkerCredentials, resetWorkerPassword } from '../hooks/useWorkerPortal.js'
import WorkerStatsPanel from '../components/WorkerStatsPanel.jsx'
import { exportWorkerSalaryPDF } from '../lib/export.js'
import TeamScreen from './team/TeamScreen.jsx'

/* ── tiny icon button helper ── */
function IconBtn({ icon, label, onClick, color = C.textDim, active, activeColor }) {
  const [hov, setHov] = useState(false)
  const col = (hov || active) ? (activeColor || color) : C.textDim
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '6px 8px', borderRadius: 10,
        border: `1px solid ${(hov || active) ? (activeColor || color) + '44' : C.border}`,
        background: (hov || active) ? `${activeColor || color}18` : 'transparent',
        color: col, fontSize: 14, cursor: 'pointer',
        transition: 'all .18s',
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: col, lineHeight: 1 }}>{label}</span>
    </button>
  )
}

export default function WorkersScreen({ employees, workDays, payments, advances = [], expenses = [], addAdvance, deleteAdvance, specs, addEmployee, updateEmployee, deleteEmployee, permissions, holidays, addHoliday, deleteHoliday, teamMembers = [], addMember, updateMember, removeMember, blockMember, resetMemberPassword, getActivity, teamLoadError, reloadTeam, projects = [], allowedProjectIds = null }) {
  // عرض جزئي: عضو فريق مقيّد بمشاريع معينة → قد تكون دفعات العمال تشمل مشاريع غير مرئية
  const isPartialView = !!allowedProjectIds
  const [tab,        setTab]        = useState('workers') // 'workers' | 'team'
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  // بيانات دخول العامل
  const [credWorker,   setCredWorker]   = useState(null)
  const [credForm,     setCredForm]     = useState({ username: '', password: '', confirm: '' })
  const [credError,    setCredError]    = useState('')
  const [credSaving,   setCredSaving]   = useState(false)
  const [credDone,     setCredDone]     = useState(false)
  const [credResetMode, setCredResetMode] = useState(false) // وضع إعادة تعيين كلمة المرور فقط

  // إحصائيات العامل
  const [statsWorker, setStatsWorker] = useState(null)

  // سلفة
  const [advWorker,  setAdvWorker]  = useState(null)
  const [advForm,    setAdvForm]    = useState({ amount: '', date: todayStr(), notes: '' })
  const [advError,   setAdvError]   = useState('')
  const [advSaving,  setAdvSaving]  = useState(false)
  const [advHistory, setAdvHistory] = useState(null)

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
    const hasCredentials = !!w.worker_username
    setCredForm({ username: w.worker_username || '', password: '', confirm: '' })
    setCredResetMode(hasCredentials)
    setCredError('')
    setCredDone(false)
  }

  async function saveCreds() {
    setCredSaving(true)
    setCredError('')
    try {
      if (credResetMode) {
        if (credForm.password.length < 4) return setCredError('كلمة المرور 4 أحرف على الأقل')
        if (credForm.password !== credForm.confirm) return setCredError('كلمة المرور غير متطابقة')
        await resetWorkerPassword(credWorker.id, credForm.password)
      } else {
        if (!credForm.username.trim()) return setCredError('اسم المستخدم مطلوب')
        if (credForm.password.length < 4) return setCredError('كلمة المرور 4 أحرف على الأقل')
        if (credForm.password !== credForm.confirm) return setCredError('كلمة المرور غير متطابقة')
        await setWorkerCredentials(credWorker.id, credForm.username, credForm.password)
      }
      setCredDone(true)
    } catch (e) {
      setCredError(e.message)
    } finally {
      setCredSaving(false)
    }
  }

  const emptyForm = { name:'', phone:'', specialization:'', daily_rate:'', status:'نشط', can_submit_expenses: true, can_request_payment: true }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  function openNew() { setForm(emptyForm); setEditing(null); setFormError(''); setShowForm(true) }

  function openEdit(w) {
    setForm({ ...w, daily_rate: String(w.daily_rate), can_submit_expenses: w.can_submit_expenses !== false, can_request_payment: w.can_request_payment !== false })
    setEditing(w.id)
    setFormError('')
    setShowForm(true)
  }

  function toggleSpec(spec) {
    const current = form.specialization ? form.specialization.split(',') : []
    const updated = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec]
    setForm(prev => ({ ...prev, specialization: updated.join(',') }))
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

  async function saveAdvance() {
    if (!advForm.amount || parseFloat(advForm.amount) <= 0) return setAdvError('أدخل مبلغ السلفة')
    setAdvSaving(true); setAdvError('')
    try {
      await addAdvance({ employee_id: advWorker.id, amount: parseFloat(advForm.amount), date: advForm.date, notes: advForm.notes })
      setAdvWorker(null); setAdvForm({ amount: '', date: todayStr(), notes: '' })
    } catch (e) {
      setAdvError(e.message)
    } finally {
      setAdvSaving(false)
    }
  }

  const totalE    = workDays.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0)
  const totalExp  = expenses.filter(e => e.employee_id && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
  const totalPRaw = payments.reduce((s, p) => s + p.amount, 0)
  // في العرض الجزئي: نحدّ المدفوع بما لا يتجاوز المكتسب المرئي لتجنّب مدفوع > مستحق
  const totalP    = isPartialView ? Math.min(totalPRaw, totalE + totalExp) : totalPRaw
  const totalAdv  = advances.reduce((s, a) => s + a.amount, 0)
  const totalOwed = Math.max(0, totalE + totalExp - totalP - totalAdv)

  const showAmounts = permissions?.viewAmounts !== false
  const fmtA = (v) => showAmounts ? `${fmt(v)}₪` : '---'

  return (
    <div className="fade-in" style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: `0 4px 16px #00DDB344` }}>
            {tab === 'team' ? '👥' : '👷'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>{tab === 'team' ? 'الفريق' : 'العمال'}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>
              {tab === 'team' ? `${teamMembers.length} عضو` : `${employees.length} عامل مسجّل`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tab === 'workers' && (
            <>
              <button onClick={copyPortalLink} title="نسخ رابط بوابة العمال"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 12, border: `1px solid ${copied ? C.success + '66' : C.border}`, background: copied ? `${C.success}18` : 'rgba(255,255,255,0.04)', color: copied ? C.success : C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
                <span>{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'تم النسخ' : 'رابط البوابة'}</span>
              </button>
              {permissions?.editWorkers !== false && <Btn onClick={openNew}>+ جديد</Btn>}
            </>
          )}
        </div>
      </div>

      {/* ── Tab Toggle ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, border: `1px solid ${C.border}` }}>
        {[{ id: 'workers', icon: '👷', label: 'عمال المشاريع' }, { id: 'team', icon: '👥', label: 'فريق العمل' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '9px 8px', borderRadius: 10, border: 'none', background: tab === t.id ? GRAD.brand : 'transparent', color: tab === t.id ? '#000' : C.textDim, fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <TeamScreen
          teamMembers={teamMembers}
          permissions={permissions}
          projects={projects}
          addMember={addMember}
          updateMember={updateMember}
          removeMember={removeMember}
          blockMember={blockMember}
          resetMemberPassword={resetMemberPassword}
          getActivity={getActivity}
          teamLoadError={teamLoadError}
          reloadTeam={reloadTeam}
        />
      )}

      {/* ── Summary Bar ── */}
      {tab === 'workers' && employees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'إجمالي مستحق', value: totalE,   grad: GRAD.brand,   glow: C.primary   },
            { label: 'إجمالي مدفوع', value: totalP,   grad: GRAD.success, glow: C.success   },
            { label: 'إجمالي متبقي', value: totalOwed, grad: totalOwed > 0 ? GRAD.purple : GRAD.success, glow: totalOwed > 0 ? C.accent : C.success },
          ].map((s, i) => (
            <GlassCard key={i} style={{ marginBottom: 0, borderRadius: 16 }}>
              <div style={{ padding: '12px 10px 10px' }}>
                <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 6, textAlign: 'center', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{
                  fontSize: 15, fontWeight: 900, fontFamily: 'monospace',
                  background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', textAlign: 'center', letterSpacing: '-0.5px',
                }}>
                  {showAmounts ? <AnimatedNumber value={s.value} suffix="₪" /> : '---'}
                </div>
              </div>
              <div style={{ height: 2, background: s.grad, borderRadius: '0 0 16px 16px' }} />
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Worker List ── */}
      {tab === 'workers' && (employees.length === 0
        ? <EmptyState icon="👷" text="ما في عمال بعد — أضف أول عامل الآن" action="+ أضف عامل" onAction={openNew} />
        : employees.map(w => {
            const earned   = workDays.filter(wd => wd.employee_id === w.id && wd.status === 'approved').reduce((s, wd) => s + wd.amount, 0)
            const paidRaw  = payments.filter(p  => p.employee_id  === w.id).reduce((s, p)  => s + p.amount,  0)
            const wAdv     = advances.filter(a  => a.employee_id  === w.id).reduce((s, a)  => s + a.amount,  0)
            const wExp     = expenses.filter(e  => e.employee_id  === w.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0)
            const visTotal = earned + wExp
            // في العرض الجزئي: العامل قد يكون مدفوعاً أكثر بسبب مشاريع غير مرئية → نحدّ العرض فقط
            const paid     = isPartialView ? Math.min(paidRaw, visTotal) : paidRaw
            const isShared = isPartialView && paidRaw > visTotal
            const owed     = Math.max(0, visTotal - paid - wAdv)
            const specs_ = w.specialization ? w.specialization.split(',').map(s => s.trim()).filter(Boolean) : []

            return (
              <GlassCard key={w.id} style={{ marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}>
                {/* top gradient accent bar */}
                <div style={{ height: 3, background: owed > 0 ? GRAD.purple : GRAD.brand }} />

                <div style={{ padding: '14px 16px 12px' }}>

                  {/* ── Worker Identity Row ── */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                      background: GRAD.brand,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 19, fontWeight: 900, color: '#000',
                      boxShadow: `0 4px 18px #00DDB344`,
                    }}>
                      {w.name[0]}
                    </div>

                    {/* Name + rate + specs */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{w.name}</span>
                        {owed > 0 && (
                          <span style={{
                            fontSize: 11, fontWeight: 800,
                            background: GRAD.purple,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            {fmtA(owed)} متبقي
                          </span>
                        )}
                        {isShared && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, borderRadius: 6, padding: '2px 6px' }}>
                            🔀 مشاريع متعددة
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>
                        {w.daily_rate}₪ / يوم
                        {w.phone ? <span style={{ marginRight: 8, color: C.textDim }}>{w.phone}</span> : null}
                      </div>
                      {specs_.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {specs_.map(s => (
                            <Badge key={s} text={s} color={C.secondary} />
                          ))}
                        </div>
                      )}
                      {specs_.length === 0 && <Badge text="عام" color={C.blue} />}
                    </div>
                  </div>

                  {/* ── Stats Mini Grid ── */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                    marginBottom: 12,
                  }}>
                    {[
                      { l: 'مستحق', v: visTotal, c: C.text,    bg: 'rgba(248,250,252,0.05)' },
                      { l: isShared ? 'مدفوع*' : 'مدفوع', v: paid, c: C.success, bg: `${C.success}12` },
                      { l: 'سلف',   v: wAdv,    c: C.warning, bg: `${C.warning}12` },
                      { l: 'متبقي', v: owed,    c: owed > 0 ? C.accent : C.success, bg: owed > 0 ? `${C.accent}12` : `${C.success}12` },
                    ].map((s, i) => (
                      <div key={i} style={{
                        textAlign: 'center', padding: '7px 4px',
                        background: s.bg,
                        borderRadius: 10,
                        border: `1px solid ${s.c}22`,
                      }}>
                        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 3 }}>{s.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.c, fontFamily: 'monospace', letterSpacing: '-0.3px' }}>
                          {fmtA(s.v)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Action Row ── */}
                  <div style={{
                    display: 'flex', gap: 5, flexWrap: 'wrap',
                    paddingTop: 10,
                    borderTop: `1px solid ${C.border}`,
                  }}>
                    {permissions?.editWorkers !== false && (
                      <IconBtn
                        icon="💵" label="سلفة"
                        color={C.warning} activeColor={C.warning}
                        onClick={() => { setAdvWorker(w); setAdvForm({ amount: '', date: todayStr(), notes: '' }); setAdvError('') }}
                      />
                    )}
                    <IconBtn icon="📋" label="سجل" onClick={() => setAdvHistory(w)} />
                    <IconBtn icon="📄" label="PDF" onClick={() => exportWorkerSalaryPDF({ worker: w, workDays, payments })} />
                    <IconBtn icon="📊" label="إحصاء" onClick={() => setStatsWorker(w)} color={C.blue} activeColor={C.blue} />
                    <IconBtn icon="🔑" label="بيانات" onClick={() => openCreds(w)} color={C.purple} activeColor={C.purple} />
                    {permissions?.editWorkers !== false && (
                      <IconBtn icon="✏️" label="تعديل" onClick={() => openEdit(w)} color={C.secondary} activeColor={C.secondary} />
                    )}
                    {permissions?.canDelete !== false && (
                      <IconBtn icon="🗑️" label="حذف" onClick={() => setConfirmDel(w.id)} color={C.accent} activeColor={C.accent} />
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })
      )}

      {/* ════════════════════════════════════
          Modal: إضافة / تعديل عامل
      ════════════════════════════════════ */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? '✏️ تعديل عامل' : '👷 عامل جديد'}>
        <Input label="الاسم"             value={form.name}       onChange={f('name')}       required />
        <Input label="التلفون"           value={form.phone}      onChange={f('phone')}      type="tel" />
        <Input label="الأجر اليومي (₪)" value={form.daily_rate} onChange={f('daily_rate')} type="number" min="1" required />

        {/* اختيار التخصصات */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 10, letterSpacing: '0.03em' }}>
            التخصصات <span style={{ fontWeight: 400 }}>(يمكن أكثر من واحد)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {(specs || SPECS).map(spec => {
              const selected = form.specialization?.split(',').map(s => s.trim()).includes(spec)
              return (
                <button key={spec} onClick={() => toggleSpec(spec)}
                  style={{
                    padding: '7px 13px', borderRadius: 22,
                    border: `1.5px solid ${selected ? C.primary : C.border}`,
                    background: selected ? `${C.primary}20` : 'transparent',
                    color: selected ? C.primary : C.textDim,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    transition: 'all .15s',
                    boxShadow: selected ? `0 0 12px ${C.primary}33` : 'none',
                  }}>
                  {selected ? '✓ ' : ''}{spec}
                </button>
              )
            })}
          </div>
        </div>

        {/* صلاحيات بوابة العامل */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 10, letterSpacing: '0.03em' }}>
            صلاحيات بوابة العمال
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'can_submit_expenses', label: '🧾 يسمح له بتسجيل مصاريف', color: C.warning },
              { key: 'can_request_payment', label: '💰 يسمح له بطلب راتب',     color: C.success },
            ].map(({ key, label, color }) => (
              <button key={key} onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${form[key] ? color + '55' : C.border}`,
                  background: form[key] ? `${color}12` : 'transparent',
                  transition: 'all .18s',
                }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: form[key] ? color : C.textDim }}>{label}</span>
                <div style={{
                  width: 38, height: 22, borderRadius: 11,
                  background: form[key] ? color : C.textMuted,
                  position: 'relative', transition: 'background .2s',
                  border: `1px solid ${form[key] ? color : C.border}`,
                }}>
                  <div style={{
                    position: 'absolute', top: 2,
                    left: form[key] ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                  }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {formError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 12, marginBottom: 14,
            background: `${C.accent}15`, border: `1px solid ${C.accent}44`,
            fontSize: 12, color: C.accent, fontWeight: 600,
          }}>
            ⚠ {formError}
          </div>
        )}
        <Btn onClick={save} full disabled={saving}>
          {saving ? 'جاري الحفظ...' : editing ? '✓ حفظ التعديلات' : '+ أضف العامل'}
        </Btn>
      </Modal>

      {/* ════════════════════════════════════
          Modal: بيانات الدخول
      ════════════════════════════════════ */}
      <Modal open={!!credWorker} onClose={() => setCredWorker(null)} title={`🔑 بيانات دخول ${credWorker?.name || ''}`}>
        {credDone ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: GRAD.success,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px',
              boxShadow: `0 8px 28px ${C.success}44`,
            }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم الحفظ بنجاح!</div>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 18 }}>
              اسم المستخدم: <b style={{ color: C.primary }}>{credForm.username}</b>
            </div>
            <GlassCard style={{ marginBottom: 18, borderRadius: 14 }}>
              <div style={{ padding: '12px 14px', fontSize: 12, color: C.textDim, textAlign: 'right', lineHeight: 1.8 }}>
                أرسل رابط البوابة وبيانات الدخول للعامل عبر واتساب:
                <div style={{ marginTop: 6 }}>
                  <b style={{ color: C.text }}>الرابط: </b>
                  <span style={{ color: C.primary, fontSize: 11, wordBreak: 'break-all' }}>
                    {window.location.origin}{window.location.pathname}?portal
                  </span>
                </div>
              </div>
            </GlassCard>
            <Btn onClick={() => setCredWorker(null)} full>إغلاق</Btn>
          </div>
        ) : (
          <>
            {/* وضع إعادة التعيين / الإنشاء الأول */}
            {credResetMode ? (
              <GlassCard style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ height: 3, background: GRAD.warm }} />
                <div style={{ padding: '11px 14px', fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
                  🔑 اسم المستخدم الحالي: <b style={{ color: C.primary }}>{credWorker?.worker_username}</b>
                  <br />سيتم تغيير كلمة المرور فقط — اسم المستخدم يبقى كما هو
                </div>
              </GlassCard>
            ) : (
              <GlassCard style={{ marginBottom: 16, borderRadius: 14 }}>
                <div style={{ padding: '11px 14px', fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
                  🔒 العامل سيستخدم هذه البيانات لتسجيل الدخول في بوابة العمال ومشاهدة راتبه
                </div>
              </GlassCard>
            )}

            {/* تبديل الوضع إذا كان لديه بيانات مسبقة */}
            {credWorker?.worker_username && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: true,  label: '🔄 تغيير كلمة المرور' },
                  { id: false, label: '✏️ تعديل كل البيانات' },
                ].map(opt => (
                  <button key={String(opt.id)} onClick={() => { setCredResetMode(opt.id); setCredError('') }}
                    style={{ flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${credResetMode === opt.id ? C.primary : C.border}`, background: credResetMode === opt.id ? `${C.primary}22` : 'transparent', color: credResetMode === opt.id ? C.primary : C.textDim, transition: 'all .2s' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {!credResetMode && (
              <Input label="اسم المستخدم" value={credForm.username}
                onChange={v => setCredForm(p => ({ ...p, username: v }))} required />
            )}
            <Input label="كلمة المرور الجديدة (4 أحرف على الأقل)" value={credForm.password}
              onChange={v => setCredForm(p => ({ ...p, password: v }))} type="password" required />
            <Input label="تأكيد كلمة المرور" value={credForm.confirm}
              onChange={v => setCredForm(p => ({ ...p, confirm: v }))} type="password" required />
            {credError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12, marginBottom: 14,
                background: `${C.accent}15`, border: `1px solid ${C.accent}44`,
                fontSize: 12, color: C.accent, fontWeight: 600,
              }}>
                ⚠ {credError}
              </div>
            )}
            <Btn onClick={saveCreds} full disabled={credSaving}>
              {credSaving ? 'جاري الحفظ...' : credResetMode ? '🔐 تعيين كلمة المرور الجديدة' : '✓ حفظ بيانات الدخول'}
            </Btn>
          </>
        )}
      </Modal>

      {/* ════════════════════════════════════
          Confirm Delete
      ════════════════════════════════════ */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deleteEmployee(confirmDel); setConfirmDel(null) }}
        message="حذف هذا العامل؟ لا يمكن التراجع عن هذا الإجراء."
      />

      {/* ════════════════════════════════════
          Modal: منح سلفة
      ════════════════════════════════════ */}
      <Modal open={!!advWorker} onClose={() => setAdvWorker(null)} title={`💵 سلفة لـ ${advWorker?.name || ''}`}>
        <GlassCard style={{ marginBottom: 16, borderRadius: 14 }}>
          <div style={{ padding: '11px 14px', fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
            💡 السلف تُخصم تلقائياً من الراتب المستحق للعامل
          </div>
        </GlassCard>
        <Input label="المبلغ (₪)" value={advForm.amount}
          onChange={v => setAdvForm(p => ({ ...p, amount: v }))} type="number" min="1" required />
        <Input label="التاريخ"    value={advForm.date}
          onChange={v => setAdvForm(p => ({ ...p, date: v }))}   type="date" required />
        <Input label="ملاحظات"   value={advForm.notes}
          onChange={v => setAdvForm(p => ({ ...p, notes: v }))} />
        {advError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 12, marginBottom: 14,
            background: `${C.accent}15`, border: `1px solid ${C.accent}44`,
            fontSize: 12, color: C.accent, fontWeight: 600,
          }}>
            ⚠ {advError}
          </div>
        )}
        <Btn onClick={saveAdvance} full disabled={advSaving} color={C.warning}>
          {advSaving ? 'جاري الحفظ...' : '✓ تسجيل السلفة'}
        </Btn>
      </Modal>

      {/* ════════════════════════════════════
          Modal: سجل السلف
      ════════════════════════════════════ */}
      <Modal open={!!advHistory} onClose={() => setAdvHistory(null)} title={`📋 سجل سلف ${advHistory?.name || ''}`}>
        {advances.filter(a => a.employee_id === advHistory?.id).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>📋</div>
            <div style={{ fontSize: 13, color: C.textDim }}>لا يوجد سلف مسجلة لهذا العامل</div>
          </div>
        ) : (
          <>
            {/* total */}
            <GlassCard style={{ marginBottom: 14, borderRadius: 14 }}>
              <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textDim, fontWeight: 700 }}>إجمالي السلف</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: C.warning, fontFamily: 'monospace' }}>
                  {fmt(advances.filter(a => a.employee_id === advHistory?.id).reduce((s, a) => s + a.amount, 0))}₪
                </span>
              </div>
            </GlassCard>
            {advances
              .filter(a => a.employee_id === advHistory?.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(a => (
                <GlassCard key={a.id} style={{ marginBottom: 8, borderRadius: 14 }}>
                  <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.warning, fontFamily: 'monospace' }}>
                        {fmt(a.amount)}₪
                      </div>
                      <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                        {fmtDate(a.date)}{a.notes ? ` — ${a.notes}` : ''}
                      </div>
                    </div>
                    {permissions?.canDelete !== false && (
                      <button
                        onClick={async () => { await deleteAdvance(a.id) }}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          border: `1px solid ${C.accent}44`,
                          background: `${C.accent}12`,
                          color: C.accent, fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .2s',
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </GlassCard>
              ))
            }
          </>
        )}
      </Modal>

      {/* ════════════════════════════════════
          Worker Stats Panel
      ════════════════════════════════════ */}
      <WorkerStatsPanel
        open={!!statsWorker}
        onClose={() => setStatsWorker(null)}
        worker={statsWorker}
        workDays={workDays}
        holidays={holidays || []}
        addHoliday={addHoliday}
        deleteHoliday={deleteHoliday}
      />
    </div>
  )
}

