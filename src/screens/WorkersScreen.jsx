import React, { useState } from 'react'
import { C, GRAD, SPECS } from '../constants/index.js'
import { fmt, fmtDate, todayStr, validateWorker } from '../lib/helpers.js'
import { GlassCard, Card, StatCard, Modal, Input, Btn, Badge, EmptyState, ConfirmDialog, AnimatedNumber } from '../components/index.jsx'
import { setWorkerCredentials, resetWorkerPassword } from '../hooks/useWorkerPortal.js'
import WorkerStatsPanel from '../components/WorkerStatsPanel.jsx'
import { exportWorkerSalaryPDF } from '../lib/export.js'

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
]
const DEFAULT_PERMS = Object.fromEntries(PERM_LABELS.map(([k]) => [k, false]))

function fmtRelative(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'الآن'
  if (min < 60) return `منذ ${min} د`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `منذ ${hr} س`
  return `منذ ${Math.floor(hr / 24)} يوم`
}

const ACTION_AR    = { insert:'أضاف', update:'عدّل', delete:'حذف', view:'فتح' }
const ACTION_ICON  = { insert:'➕', update:'✏️', delete:'🗑️', view:'👁️' }
const ACTION_COLOR = { insert:C.success, update:C.primary, delete:C.accent, view:C.textDim }
const TBL_AR = { projects:'مشروع', employees:'عامل', expenses:'مصروف', payments:'دفعة', work_days:'يوم عمل', dashboard:'الرئيسية' }

export default function WorkersScreen({ employees, workDays, payments, advances = [], addAdvance, deleteAdvance, specs, addEmployee, updateEmployee, deleteEmployee, permissions, holidays, addHoliday, deleteHoliday, projects = [], teamMembers = [], inviteMember, updateMember, removeMember, blockMember, getActivity }) {
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

  // فريق العمل
  const [showTeam,        setShowTeam]        = useState(false)
  const [showInvite,      setShowInvite]       = useState(false)
  const [inviteEmail,     setInviteEmail]      = useState('')
  const [invitePerms,     setInvitePerms]      = useState(DEFAULT_PERMS)
  const [inviteProjects,  setInviteProjects]   = useState([])
  const [inviteEmps,      setInviteEmps]       = useState([])
  const [inviting,        setInviting]         = useState(false)
  const [inviteError,     setInviteError]      = useState('')
  const [editingMember,   setEditingMember]    = useState(null)
  const [editPerms,       setEditPerms]        = useState({})
  const [editProjects,    setEditProjects]     = useState([])
  const [editEmps,        setEditEmps]         = useState([])
  const [activityMember,  setActivityMember]   = useState(null)
  const [activityData,    setActivityData]     = useState([])
  const [activityLoading, setActivityLoading]  = useState(false)
  const [confirmBlock,    setConfirmBlock]     = useState(null)

  async function openActivity(m) {
    setActivityMember(m); setActivityLoading(true); setActivityData([])
    try { setActivityData(await getActivity(m.email)) } catch { /**/ }
    finally { setActivityLoading(false) }
  }

  function openEditMember(m) {
    setEditingMember(m.id)
    setEditPerms(Object.fromEntries(PERM_LABELS.map(([k]) => [k, !!m[k]])))
    setEditProjects(m.allowed_project_ids || [])
    setEditEmps(m.allowed_employee_ids || [])
  }

  function toggleArr(arr, setArr, id) {
    setArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function doInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return setInviteError('أدخل إيميل صحيح')
    setInviting(true)
    try {
      await inviteMember(inviteEmail.trim(), {
        ...invitePerms,
        allowed_project_ids:  inviteProjects,
        allowed_employee_ids: inviteEmps,
      })
      setShowInvite(false); setInviteEmail(''); setInvitePerms(DEFAULT_PERMS)
      setInviteProjects([]); setInviteEmps([]); setInviteError('')
    } catch (e) { setInviteError(e.message) }
    finally { setInviting(false) }
  }

  async function doUpdateMember(id) {
    await updateMember(id, { ...editPerms, allowed_project_ids: editProjects, allowed_employee_ids: editEmps })
    setEditingMember(null)
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: GRAD.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: `0 4px 16px #00DDB344`,
          }}>👷</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>العمال</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{employees.length} عامل مسجّل</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {permissions?.manageTeam !== false && teamMembers !== undefined && (
            <button onClick={() => setShowTeam(true)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 13px', borderRadius:12, border:`1px solid ${C.success}44`, background:`${C.success}12`, color:C.success, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              👥 الفريق {teamMembers.length > 0 && `(${teamMembers.length})`}
            </button>
          )}
          <button
            onClick={copyPortalLink}
            title="نسخ رابط بوابة العمال"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 13px', borderRadius: 12,
              border: `1px solid ${copied ? C.success + '66' : C.border}`,
              background: copied ? `${C.success}18` : 'rgba(255,255,255,0.04)',
              color: copied ? C.success : C.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all .2s',
              boxShadow: copied ? `0 0 16px ${C.success}33` : 'none',
            }}
          >
            <span>{copied ? '✓' : '🔗'}</span>
            <span>{copied ? 'تم النسخ' : 'رابط البوابة'}</span>
          </button>
          {permissions?.editWorkers !== false && (
            <Btn onClick={openNew}>+ جديد</Btn>
          )}
        </div>
      </div>

      {/* ── Summary Bar ── */}
      {employees.length > 0 && (
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
      {employees.length === 0
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
      }

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

      {/* ════ Team Panel ════ */}
      {showTeam && (
        <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowTeam(false) }}>
          <div style={{ width:'100%', maxWidth:440, background:C.surface, borderRadius:'24px 24px 0 0', border:`1px solid ${C.borderMid}`, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ height:4, background:GRAD.success, borderRadius:'24px 24px 0 0' }} />
            <div style={{ padding:'16px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text }}>👥 أعضاء الفريق</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setShowInvite(v => !v); setInviteError('') }}
                  style={{ padding:'6px 14px', borderRadius:10, background:`${C.success}20`, color:C.success, border:`1px solid ${C.success}44`, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  + دعوة
                </button>
                <button onClick={() => setShowTeam(false)}
                  style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`, color:C.text, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>

              {/* ── Invite Form ── */}
              {showInvite && (
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="إيميل الشخص المدعو"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, marginBottom:12, boxSizing:'border-box', outline:'none' }}
                  />
                  <div style={{ fontSize:11, color:C.textDim, marginBottom:8, fontWeight:700 }}>الصلاحيات:</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                    {PERM_LABELS.map(([key, label]) => (
                      <label key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.text, cursor:'pointer' }}>
                        <input type="checkbox" checked={!!invitePerms[key]} onChange={e => setInvitePerms(p => ({ ...p, [key]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                  {/* تحديد المشاريع المسموح بها */}
                  {invitePerms.can_view_projects && projects.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:C.primary, fontWeight:700, marginBottom:6 }}>📁 تحديد المشاريع (فارغ = الكل):</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {projects.map(p => (
                          <button key={p.id} onClick={() => toggleArr(inviteProjects, setInviteProjects, p.id)}
                            style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${inviteProjects.includes(p.id) ? C.primary : C.border}`, background: inviteProjects.includes(p.id) ? `${C.primary}22` : 'transparent', color: inviteProjects.includes(p.id) ? C.primary : C.textDim }}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* تحديد العمال المسموح بهم */}
                  {invitePerms.can_view_workers && employees.length > 0 && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:C.secondary, fontWeight:700, marginBottom:6 }}>👷 تحديد العمال (فارغ = الكل):</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {employees.map(emp => (
                          <button key={emp.id} onClick={() => toggleArr(inviteEmps, setInviteEmps, emp.id)}
                            style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${inviteEmps.includes(emp.id) ? C.secondary : C.border}`, background: inviteEmps.includes(emp.id) ? `${C.secondary}22` : 'transparent', color: inviteEmps.includes(emp.id) ? C.secondary : C.textDim }}>
                            {emp.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {inviteError && <div style={{ fontSize:11, color:C.accent, marginBottom:8 }}>{inviteError}</div>}
                  <Btn onClick={doInvite} full disabled={inviting}>{inviting ? '...' : 'إرسال الدعوة'}</Btn>
                </div>
              )}

              {/* ── Members List ── */}
              {teamMembers.length === 0
                ? <div style={{ textAlign:'center', padding:'24px 0', color:C.textDim, fontSize:13 }}>لا يوجد أعضاء بعد</div>
                : teamMembers.map(m => {
                  const blocked  = !!m.is_blocked
                  const lastSeen = fmtRelative(m.last_seen_at)
                  const isEditing = editingMember === m.id
                  return (
                    <div key={m.id} style={{ marginBottom:8, background: blocked ? `${C.accent}10` : 'rgba(255,255,255,0.04)', borderRadius:14, border:`1px solid ${blocked ? C.accent + '44' : C.border}`, overflow:'hidden' }}>
                      <div style={{ padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color: blocked ? C.accent : C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</div>
                          <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap', alignItems:'center' }}>
                            {blocked
                              ? <span style={{ fontSize:10, color:C.accent, fontWeight:700, background:`${C.accent}22`, padding:'2px 7px', borderRadius:5 }}>🚫 محجوب</span>
                              : m.status === 'active'
                                ? <span style={{ fontSize:10, color:C.success, fontWeight:700 }}>● نشط</span>
                                : <span style={{ fontSize:10, color:C.warning }}>⏳ في انتظار القبول</span>
                            }
                            {m.status === 'active' && (
                              <span style={{ fontSize:10, color:C.textDim }}>{lastSeen ? `🕐 ${lastSeen}` : '🕐 لم يدخل بعد'}</span>
                            )}
                          </div>
                          {/* عرض ملخص الصلاحيات */}
                          {!isEditing && m.status === 'active' && (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:5 }}>
                              {PERM_LABELS.filter(([k]) => m[k]).map(([k, label]) => (
                                <span key={k} style={{ fontSize:9, color:C.primary, background:`${C.primary}15`, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>{label}</span>
                              ))}
                              {m.allowed_project_ids?.length > 0 && (
                                <span style={{ fontSize:9, color:C.warning, background:`${C.warning}15`, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>
                                  {m.allowed_project_ids.length} مشروع محدد
                                </span>
                              )}
                              {m.allowed_employee_ids?.length > 0 && (
                                <span style={{ fontSize:9, color:C.secondary, background:`${C.secondary}15`, padding:'2px 6px', borderRadius:4, fontWeight:600 }}>
                                  {m.allowed_employee_ids.length} عامل محدد
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:4, flexShrink:0, marginRight:6 }}>
                          {m.status === 'active' && (
                            <button onClick={() => openActivity(m)} title="سجل النشاط"
                              style={{ background:'none', border:`1px solid ${C.primary}44`, borderRadius:8, cursor:'pointer', fontSize:13, padding:'4px 8px', color:C.primary }}>📋</button>
                          )}
                          {m.status === 'active' && (
                            <button onClick={() => setConfirmBlock({ id:m.id, email:m.email, blocked:!blocked })}
                              title={blocked ? 'رفع الحجب' : 'حجب الوصول'}
                              style={{ background:'none', border:`1px solid ${blocked ? C.success + '44' : C.accent + '44'}`, borderRadius:8, cursor:'pointer', fontSize:13, padding:'4px 8px', color: blocked ? C.success : C.accent }}>
                              {blocked ? '✅' : '🚫'}
                            </button>
                          )}
                          <button onClick={() => isEditing ? setEditingMember(null) : openEditMember(m)}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'4px' }}>
                            {isEditing ? '✕' : '✏️'}
                          </button>
                          <button onClick={() => removeMember(m.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'4px' }}>🗑️</button>
                        </div>
                      </div>

                      {/* ── Edit Permissions ── */}
                      {isEditing && (
                        <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${C.border}` }}>
                          <div style={{ paddingTop:10 }}>
                            <div style={{ fontSize:11, color:C.textDim, fontWeight:700, marginBottom:8 }}>الصلاحيات:</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:10 }}>
                              {PERM_LABELS.map(([key, label]) => (
                                <label key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.text, cursor:'pointer' }}>
                                  <input type="checkbox" checked={!!editPerms[key]} onChange={e => setEditPerms(p => ({ ...p, [key]: e.target.checked }))} />
                                  {label}
                                </label>
                              ))}
                            </div>

                            {/* تحديد المشاريع */}
                            {editPerms.can_view_projects && projects.length > 0 && (
                              <div style={{ marginBottom:10 }}>
                                <div style={{ fontSize:11, color:C.primary, fontWeight:700, marginBottom:6 }}>📁 المشاريع المسموح بها (فارغ = الكل):</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                  {projects.map(p => (
                                    <button key={p.id} onClick={() => toggleArr(editProjects, setEditProjects, p.id)}
                                      style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${editProjects.includes(p.id) ? C.primary : C.border}`, background: editProjects.includes(p.id) ? `${C.primary}22` : 'transparent', color: editProjects.includes(p.id) ? C.primary : C.textDim }}>
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* تحديد العمال */}
                            {editPerms.can_view_workers && employees.length > 0 && (
                              <div style={{ marginBottom:10 }}>
                                <div style={{ fontSize:11, color:C.secondary, fontWeight:700, marginBottom:6 }}>👷 العمال المسموح بهم (فارغ = الكل):</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                  {employees.map(emp => (
                                    <button key={emp.id} onClick={() => toggleArr(editEmps, setEditEmps, emp.id)}
                                      style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${editEmps.includes(emp.id) ? C.secondary : C.border}`, background: editEmps.includes(emp.id) ? `${C.secondary}22` : 'transparent', color: editEmps.includes(emp.id) ? C.secondary : C.textDim }}>
                                      {emp.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={{ display:'flex', gap:6 }}>
                              <Btn onClick={() => doUpdateMember(m.id)} full>حفظ</Btn>
                              <Btn onClick={() => setEditingMember(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Modal ── */}
      {activityMember && (
        <div style={{ position:'fixed', inset:0, zIndex:400, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setActivityMember(null) }}>
          <div style={{ width:'100%', maxWidth:440, background:C.surface, borderRadius:'24px 24px 0 0', border:`1px solid ${C.borderMid}`, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ height:4, background:GRAD.brand, borderRadius:'24px 24px 0 0' }} />
            <div style={{ padding:'16px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800 }}>📋 سجل النشاط</div>
                <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{activityMember.email}</div>
              </div>
              <button onClick={() => setActivityMember(null)}
                style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`, color:C.text, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
              {activityLoading
                ? <div style={{ textAlign:'center', padding:32, color:C.textDim, fontSize:13 }}>⏳ جاري التحميل...</div>
                : activityData.length === 0
                  ? <div style={{ textAlign:'center', padding:32, color:C.textDim, fontSize:13 }}>لا يوجد نشاط مسجّل بعد</div>
                  : activityData.map((a, i) => {
                      const ak = a.action?.toLowerCase()
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:`1px solid ${C.border}33` }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', background:`${ACTION_COLOR[ak] || C.textDim}18`, border:`1px solid ${ACTION_COLOR[ak] || C.textDim}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                            {ACTION_ICON[ak] || '•'}
                          </div>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:ACTION_COLOR[ak] || C.textDim }}>{ACTION_AR[ak] || a.action}</span>
                            <span style={{ fontSize:12, color:C.text }}> {TBL_AR[a.tbl] || a.tbl}</span>
                          </div>
                          <div style={{ fontSize:10, color:C.textDim, flexShrink:0 }}>{fmtRelative(a.created_at)}</div>
                        </div>
                      )
                    })
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Block ── */}
      {confirmBlock && (
        <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', padding:24 }}>
          <div style={{ background:C.surface, borderRadius:20, padding:24, maxWidth:320, width:'100%', border:`1px solid ${C.borderMid}` }}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>{confirmBlock.blocked ? '🚫' : '✅'}</div>
            <div style={{ fontSize:14, fontWeight:800, textAlign:'center', marginBottom:8 }}>
              {confirmBlock.blocked ? 'حجب الوصول' : 'رفع الحجب'}
            </div>
            <div style={{ fontSize:12, color:C.textDim, textAlign:'center', marginBottom:20 }}>
              {confirmBlock.blocked ? `سيُمنع ${confirmBlock.email} من الدخول فوراً` : `سيستعيد ${confirmBlock.email} صلاحياته`}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={async () => { await blockMember(confirmBlock.id, confirmBlock.blocked); setConfirmBlock(null) }} full
                style={{ background: confirmBlock.blocked ? GRAD.danger : GRAD.success }}>تأكيد</Btn>
              <Btn onClick={() => setConfirmBlock(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
