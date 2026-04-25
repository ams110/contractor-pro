import React, { useState } from 'react'
import { C, GRAD, SPECS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateWorker } from '../lib/helpers.js'
import { GlassCard, Card, StatCard, Modal, Input, Btn, Badge, EmptyState, ConfirmDialog, AnimatedNumber } from '../components/index.jsx'
import { setWorkerCredentials, resetWorkerPassword } from '../hooks/useWorkerPortal.js'
import WorkerStatsPanel from '../components/WorkerStatsPanel.jsx'
import { exportWorkerSalaryPDF } from '../lib/export.js'

const PERM_LABELS = [
  ['can_view_projects',  'مشاهدة المشاريع'],
  ['can_edit_projects',  'إضافة/تعديل المشاريع'],
  ['can_view_workers',   'مشاهدة العمال'],
  ['can_edit_workers',   'إضافة/تعديل العمال'],
  ['can_view_expenses',  'مشاهدة المصاريف'],
  ['can_add_expenses',   'إضافة المصاريف'],
  ['can_view_payments',  'مشاهدة الرواتب'],
  ['can_add_payments',   'إضافة الرواتب'],
  ['can_delete',         'حذف السجلات'],
  ['can_manage_team',    'إدارة الفريق'],
  ['can_view_amounts',   'مشاهدة المبالغ'],
  ['can_view_activity',  'سجل النشاط'],
]
const ROLES = ['مشرف', 'محاسب', 'مساعد', 'عضو']
const DEFAULT_PERMS = Object.fromEntries(PERM_LABELS.map(([k]) => [k, k === 'can_view_amounts']))
const EMPTY_MEMBER = { displayName: '', username: '', password: '', role: 'عضو', expiresAt: '', perms: DEFAULT_PERMS }

function fmtRelative(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)   return 'الآن'
  if (min < 60)  return `منذ ${min} د`
  const hr = Math.floor(min / 60)
  if (hr  < 24)  return `منذ ${hr} س`
  return `منذ ${Math.floor(hr / 24)} يوم`
}

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

export default function WorkersScreen({ employees, workDays, payments, advances = [], addAdvance, deleteAdvance, specs, addEmployee, updateEmployee, deleteEmployee, permissions, holidays, addHoliday, deleteHoliday, teamMembers = [], addMember, updateMember, removeMember, blockMember, resetMemberPassword, teamLoadError, reloadTeam }) {
  const [tab,        setTab]        = useState('workers') // 'workers' | 'team'
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)

  // ── فريق العمل ──
  const [showAddMember,  setShowAddMember]  = useState(false)
  const [memberForm,     setMemberForm]     = useState(EMPTY_MEMBER)
  const [addingMember,   setAddingMember]   = useState(false)
  const [addMemberErr,   setAddMemberErr]   = useState('')
  const [editingMember,  setEditingMember]  = useState(null)
  const [editPerms,      setEditPerms]      = useState({})
  const [confirmBlock,   setConfirmBlock]   = useState(null)
  const [showResetPass,  setShowResetPass]  = useState(null)
  const [newPass,        setNewPass]        = useState('')
  const [resetPassSaving,setResetPassSaving]= useState(false)
  const [resetPassErr,   setResetPassErr]   = useState('')

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

  const totalE   = workDays.reduce((s, w) => s + w.amount, 0)
  const totalP   = payments.reduce((s, p) => s + p.amount, 0)
  const totalAdv = advances.reduce((s, a) => s + a.amount, 0)
  const totalOwed = Math.max(0, totalE - totalP - totalAdv)

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
          {tab === 'team' && permissions?.manageTeam && (
            <Btn onClick={() => { setShowAddMember(v => !v); setAddMemberErr(''); setMemberForm(EMPTY_MEMBER) }}>+ عضو جديد</Btn>
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

      {tab === 'team' && <TeamTab teamMembers={teamMembers} permissions={permissions} showAddMember={showAddMember} setShowAddMember={setShowAddMember} memberForm={memberForm} setMemberForm={setMemberForm} addingMember={addingMember} setAddingMember={setAddingMember} addMemberErr={addMemberErr} setAddMemberErr={setAddMemberErr} editingMember={editingMember} setEditingMember={setEditingMember} editPerms={editPerms} setEditPerms={setEditPerms} confirmBlock={confirmBlock} setConfirmBlock={setConfirmBlock} showResetPass={showResetPass} setShowResetPass={setShowResetPass} newPass={newPass} setNewPass={setNewPass} resetPassSaving={resetPassSaving} setResetPassSaving={setResetPassSaving} resetPassErr={resetPassErr} setResetPassErr={setResetPassErr} addMember={addMember} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} resetMemberPassword={resetMemberPassword} teamLoadError={teamLoadError} reloadTeam={reloadTeam} />}

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
                  <AnimatedNumber value={s.value} suffix="₪" />
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
            const earned = workDays.filter(wd => wd.employee_id === w.id).reduce((s, wd) => s + wd.amount, 0)
            const paid   = payments.filter(p  => p.employee_id  === w.id).reduce((s, p)  => s + p.amount,  0)
            const wAdv   = advances.filter(a  => a.employee_id  === w.id).reduce((s, a)  => s + a.amount,  0)
            const owed   = Math.max(0, earned - paid - wAdv)
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{w.name}</span>
                        {owed > 0 && (
                          <span style={{
                            fontSize: 11, fontWeight: 800,
                            background: GRAD.purple,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            {fmt(owed)}₪ متبقي
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
                      { l: 'مستحق', v: earned, c: C.text,    bg: 'rgba(248,250,252,0.05)' },
                      { l: 'مدفوع', v: paid,   c: C.success, bg: `${C.success}12` },
                      { l: 'سلف',   v: wAdv,   c: C.warning, bg: `${C.warning}12` },
                      { l: 'متبقي', v: owed,   c: owed > 0 ? C.accent : C.success, bg: owed > 0 ? `${C.accent}12` : `${C.success}12` },
                    ].map((s, i) => (
                      <div key={i} style={{
                        textAlign: 'center', padding: '7px 4px',
                        background: s.bg,
                        borderRadius: 10,
                        border: `1px solid ${s.c}22`,
                      }}>
                        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 3 }}>{s.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: s.c, fontFamily: 'monospace', letterSpacing: '-0.3px' }}>
                          {fmt(s.v)}₪
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

/* ══════════════════════════════════════════════════════
   TeamTab — إدارة أعضاء الفريق وصلاحياتهم
══════════════════════════════════════════════════════ */
function TeamTab({ teamMembers, permissions, showAddMember, setShowAddMember, memberForm, setMemberForm, addingMember, setAddingMember, addMemberErr, setAddMemberErr, editingMember, setEditingMember, editPerms, setEditPerms, confirmBlock, setConfirmBlock, showResetPass, setShowResetPass, newPass, setNewPass, resetPassSaving, setResetPassSaving, resetPassErr, setResetPassErr, addMember, updateMember, removeMember, blockMember, resetMemberPassword, teamLoadError, reloadTeam }) {

  if (!permissions?.manageTeam) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
        <div style={{ fontSize: 14, color: C.textDim }}>ليس لديك صلاحية إدارة الفريق</div>
      </div>
    )
  }

  return (
    <div>
      {/* خطأ تحميل */}
      {teamLoadError && (
        <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 12, background: '#ff444415', border: '1px solid #ff444444', fontSize: 11, color: '#ff4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>⚠ خطأ: {teamLoadError}</span>
          {reloadTeam && <button onClick={reloadTeam} style={{ background: 'none', border: '1px solid #ff444466', borderRadius: 8, color: '#ff4444', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>إعادة تحميل</button>}
        </div>
      )}
      {/* فورم إضافة عضو */}
      {showAddMember && (
        <GlassCard style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: 3, background: GRAD.success }} />
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.success, marginBottom: 12 }}>➕ عضو جديد</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>الاسم *</label>
                <input value={memberForm.displayName} onChange={e => setMemberForm(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="مثال: أبو محمد"
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>الدور</label>
                <select value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>اسم المستخدم *</label>
                <input value={memberForm.username} onChange={e => setMemberForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="abu_mohammad"
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none', direction: 'ltr' }} />
                <div style={{ fontSize: 9, color: C.textDim, marginTop: 3 }}>أحرف إنجليزية صغيرة، أرقام، أو _ فقط</div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>الباسورد * (6+)</label>
                <input type="password" value={memberForm.password} onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••"
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>⏰ تاريخ انتهاء الصلاحية (اختياري)</label>
              <input type="date" value={memberForm.expiresAt} onChange={e => setMemberForm(p => ({ ...p, expiresAt: e.target.value }))}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {/* الصلاحيات */}
            <div style={{ fontSize: 11, color: C.textDim, fontWeight: 700, marginBottom: 8 }}>🔐 الصلاحيات:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 12 }}>
              {PERM_LABELS.map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: memberForm.perms[key] ? C.text : C.textDim, cursor: 'pointer', padding: '5px 8px', borderRadius: 8, background: memberForm.perms[key] ? `${C.primary}12` : 'transparent', border: `1px solid ${memberForm.perms[key] ? C.primary + '44' : C.border}`, transition: 'all .15s' }}>
                  <input type="checkbox" checked={!!memberForm.perms[key]} onChange={e => setMemberForm(p => ({ ...p, perms: { ...p.perms, [key]: e.target.checked } }))} style={{ accentColor: C.primary }} />
                  {label}
                </label>
              ))}
            </div>

            {addMemberErr && <div style={{ fontSize: 11, color: C.accent, marginBottom: 8, padding: '8px 10px', background: `${C.accent}12`, borderRadius: 8 }}>⚠ {addMemberErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={async () => {
                if (!memberForm.displayName.trim()) return setAddMemberErr('أدخل الاسم')
                if (!memberForm.username.trim())    return setAddMemberErr('أدخل اسم المستخدم')
                if (!/^[a-z0-9_]{3,30}$/.test(memberForm.username)) return setAddMemberErr('اسم المستخدم: 3-30 حرف إنجليزي صغير أو أرقام أو _')
                if (memberForm.password.length < 6) return setAddMemberErr('الباسورد 6 أحرف على الأقل')
                setAddingMember(true); setAddMemberErr('')
                try {
                  await addMember({ displayName: memberForm.displayName, username: memberForm.username, password: memberForm.password, role: memberForm.role, expiresAt: memberForm.expiresAt || null, perms: memberForm.perms })
                  setShowAddMember(false)
                  setMemberForm(EMPTY_MEMBER)
                } catch (e) { setAddMemberErr(e.message) }
                finally { setAddingMember(false) }
              }} full disabled={addingMember}>{addingMember ? '⏳ جاري الإنشاء...' : '✓ إضافة العضو'}</Btn>
              <Btn onClick={() => setShowAddMember(false)} variant="outline" color={C.textDim} full>إلغاء</Btn>
            </div>
          </div>
        </GlassCard>
      )}

      {/* قائمة الأعضاء */}
      {teamMembers.length === 0 ? (
        <EmptyState icon="👥" text="لا يوجد أعضاء فريق بعد" action="+ أضف عضو" onAction={() => setShowAddMember(true)} />
      ) : teamMembers.map(m => {
        const blocked  = !!m.is_blocked
        const expired  = m.expires_at && new Date(m.expires_at) < new Date()
        const lastSeen = fmtRelative(m.last_seen_at)
        return (
          <GlassCard key={m.id} style={{ marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: 3, background: blocked ? GRAD.danger : expired ? GRAD.warm : GRAD.success }} />
            <div style={{ padding: '12px 14px' }}>
              {/* هوية العضو */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: blocked ? C.accent : C.text }}>{m.display_name || m.username}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                    {m.username && <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>@{m.username}</span>}
                    {m.role     && <span style={{ fontSize: 10, color: C.secondary, fontWeight: 700 }}>{m.role}</span>}
                    {blocked    && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, background: `${C.accent}22`, padding: '2px 7px', borderRadius: 6 }}>🚫 محجوب</span>}
                    {expired    && <span style={{ fontSize: 10, color: C.warning, fontWeight: 700, background: `${C.warning}22`, padding: '2px 7px', borderRadius: 6 }}>⏰ منتهي</span>}
                    {!blocked && !expired && <span style={{ fontSize: 10, color: C.success, fontWeight: 700 }}>● نشط</span>}
                    {lastSeen && <span style={{ fontSize: 10, color: C.textDim }}>🕐 {lastSeen}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => { setShowResetPass(m); setNewPass(''); setResetPassErr('') }} title="تغيير الباسورد"
                    style={{ background: 'none', border: `1px solid ${C.warning}44`, borderRadius: 9, cursor: 'pointer', fontSize: 13, padding: '5px 8px', color: C.warning }}>🔑</button>
                  <button onClick={() => setConfirmBlock({ id: m.id, email: m.email, blocked: !blocked })} title={blocked ? 'رفع الحجب' : 'حجب الوصول'}
                    style={{ background: 'none', border: `1px solid ${blocked ? C.success + '44' : C.accent + '44'}`, borderRadius: 9, cursor: 'pointer', fontSize: 13, padding: '5px 8px', color: blocked ? C.success : C.accent }}>
                    {blocked ? '✅' : '🚫'}
                  </button>
                  <button onClick={() => { setEditingMember(editingMember === m.id ? null : m.id); setEditPerms(Object.fromEntries(PERM_LABELS.map(([k]) => [k, m[k]]))) }}
                    style={{ background: 'none', border: `1px solid ${editingMember === m.id ? C.secondary + '44' : C.border}`, borderRadius: 9, cursor: 'pointer', fontSize: 13, padding: '5px 8px', color: editingMember === m.id ? C.secondary : C.textDim }}>✏️</button>
                  <button onClick={() => removeMember(m.id)}
                    style={{ background: 'none', border: `1px solid ${C.accent}33`, borderRadius: 9, cursor: 'pointer', fontSize: 13, padding: '5px 8px', color: C.accent }}>🗑️</button>
                </div>
              </div>

              {/* تعديل الصلاحيات */}
              {editingMember === m.id && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 8 }}>🔐 الصلاحيات:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
                    {PERM_LABELS.map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: editPerms[key] ? C.text : C.textDim, cursor: 'pointer', padding: '5px 8px', borderRadius: 8, background: editPerms[key] ? `${C.primary}12` : 'transparent', border: `1px solid ${editPerms[key] ? C.primary + '44' : C.border}`, transition: 'all .15s' }}>
                        <input type="checkbox" checked={!!editPerms[key]} onChange={e => setEditPerms(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: C.primary }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={async () => { await updateMember(m.id, editPerms); setEditingMember(null) }} full>✓ حفظ الصلاحيات</Btn>
                    <Btn onClick={() => setEditingMember(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )
      })}

      {/* Reset Password Modal */}
      {showResetPass && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowResetPass(null) }}>
          <div style={{ width: '100%', maxWidth: 360, background: C.surface, borderRadius: 20, padding: 20, border: `1px solid ${C.borderMid}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>🔑 تغيير الباسورد</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>{showResetPass.display_name || showResetPass.username}</div>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="الباسورد الجديد (6 أحرف+)"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
            {resetPassErr && <div style={{ fontSize: 11, color: C.accent, marginBottom: 8 }}>⚠ {resetPassErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={async () => {
                if (newPass.length < 6) return setResetPassErr('6 أحرف على الأقل')
                setResetPassSaving(true); setResetPassErr('')
                try { await resetMemberPassword(showResetPass.id, newPass); setShowResetPass(null) }
                catch (e) { setResetPassErr(e.message) }
                finally { setResetPassSaving(false) }
              }} full disabled={resetPassSaving}>{resetPassSaving ? '...' : '✓ حفظ'}</Btn>
              <Btn onClick={() => setShowResetPass(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Block */}
      {confirmBlock && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: 24 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', border: `1px solid ${C.borderMid}` }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>{confirmBlock.blocked ? '🚫' : '✅'}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textAlign: 'center', marginBottom: 8 }}>
              {confirmBlock.blocked ? 'حجب الوصول' : 'رفع الحجب'}
            </div>
            <div style={{ fontSize: 12, color: C.textDim, textAlign: 'center', marginBottom: 20 }}>
              {confirmBlock.blocked ? 'سيُمنع هذا العضو من الدخول فوراً' : 'سيستعيد العضو صلاحياته'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={async () => {
                try { await blockMember(confirmBlock.id, confirmBlock.blocked) }
                finally { setConfirmBlock(null) }
              }} full style={{ background: confirmBlock.blocked ? GRAD.danger : GRAD.success }}>تأكيد</Btn>
              <Btn onClick={() => setConfirmBlock(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
