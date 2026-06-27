import React from 'react'
import { X, Lock, UserPlus, CalendarClock, FolderTree, AlertTriangle, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { Btn, GlassCard } from '../../components/index.jsx'
import { IconChip } from '../../ui/Premium.jsx'
import { PERM_LABELS, PRESET_ROLES, permLabel, tRole } from './teamConstants.js'
import { tl } from '../../lib/labels.js'

export function AddMemberModal({ manager, onSubmit, projects = [], language }) {
  const {
    showAddMember, closeAddMember,
    memberForm, setMemberForm,
    addingMember, addMemberErr, setAddMemberErr,
    addStep, setAddStep,
    handleRoleChange, togglePerm,
    addRestrictProjects, setAddRestrictProjects,
    addAllowedProjects, setAddAllowedProjects, toggleAddProject,
  } = manager

  if (!showAddMember) return null

  function nextStep() {
    setAddMemberErr('')
    if (!memberForm.displayName.trim()) return setAddMemberErr(tl(language, 'أدخل الاسم', 'הזן שם', 'Enter a name'))
    if (!memberForm.username.trim())    return setAddMemberErr(tl(language, 'أدخل اسم المستخدم', 'הזן שם משתמש', 'Enter a username'))
    if (!/^[a-z0-9_]{3,30}$/.test(memberForm.username))
      return setAddMemberErr(tl(language, 'اسم المستخدم: 3-30 حرف إنجليزي صغير أو أرقام أو _', 'שם משתמש: 3-30 אותיות אנגלית קטנות, ספרות או _', 'Username: 3-30 lowercase letters, digits or _'))
    if (memberForm.password.length < 6) return setAddMemberErr(tl(language, 'كلمة المرور 6 أحرف على الأقل', 'הסיסמה 6 תווים לפחות', 'Password at least 6 characters'))
    setAddStep(2)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) closeAddMember() }}
    >
      <div className="slide-up" style={{ width: '100%', maxWidth: 480, background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px 20px 20px', border: `1px solid ${C.borderMid}`, maxHeight: 'calc(92vh - 80px)', overflowY: 'auto', marginBottom: 'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconChip icon={UserPlus} tone="brand" size={36} radius={11} />
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{tl(language, 'عضو جديد', 'חבר חדש', 'New member')}</div>
          </div>
          <button onClick={closeAddMember} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, cursor: 'pointer', padding: '4px 10px', display:'flex', alignItems:'center' }}><X size={14} strokeWidth={2.5} /></button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[{ n: 1, label: tl(language, 'البيانات', 'פרטים', 'Details') }, { n: 2, label: tl(language, 'الصلاحيات', 'הרשאות', 'Permissions') }].map(s => (
            <div key={s.n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: addStep >= s.n ? GRAD.brand : 'rgba(255,255,255,0.08)',
                color: addStep >= s.n ? '#000' : C.textDim, flexShrink: 0,
              }}>{s.n}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: addStep >= s.n ? C.primary : C.textDim }}>{s.label}</div>
              {s.n < 2 && <div style={{ flex: 1, height: 1, background: addStep > s.n ? C.primary : C.border }} />}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Info ─── */}
        {addStep === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label={tl(language, 'الاسم *', 'שם *', 'Name *')}>
                <input
                  value={memberForm.displayName}
                  onChange={e => setMemberForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder={tl(language, 'مثال: أبو محمد', 'לדוגמה: אבו מוחמד', 'e.g. Abu Mohammad')}
                  style={inputStyle}
                />
              </Field>
              <Field label={tl(language, 'الدور', 'תפקיד', 'Role')}>
                <select
                  value={memberForm.selectedRole === 'مخصص' ? 'مخصص' : memberForm.selectedRole}
                  onChange={e => handleRoleChange(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {PRESET_ROLES.map(r => <option key={r} value={r}>{tRole(r, language)}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label={tl(language, 'اسم المستخدم *', 'שם משתמש *', 'Username *')} hint={tl(language, 'أحرف إنجليزية صغيرة، أرقام، أو _', 'אותיות אנגלית קטנות, ספרות או _', 'Lowercase letters, digits or _')}>
                <input
                  value={memberForm.username}
                  onChange={e => setMemberForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="abu_mohammad"
                  dir="ltr"
                  style={inputStyle}
                />
              </Field>
              <Field label={tl(language, 'كلمة المرور * (6+)', 'סיסמה * (6+)', 'Password * (6+)')}>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarClock size={11} strokeWidth={2.3} /> {tl(language, 'تاريخ انتهاء الصلاحية (اختياري)', 'תאריך תפוגה (אופציונלי)', 'Expiry date (optional)')}</span>}>
              <input
                type="date"
                value={memberForm.expiresAt}
                onChange={e => setMemberForm(f => ({ ...f, expiresAt: e.target.value }))}
                style={inputStyle}
              />
            </Field>

            {addMemberErr && <ErrorMsg msg={addMemberErr} />}
            <Btn onClick={nextStep} full style={{ marginTop: 14 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>{tl(language, 'التالي', 'הבא', 'Next')} <ChevronLeft size={14} strokeWidth={2.6} /> {tl(language, 'الصلاحيات', 'הרשאות', 'Permissions')}</span></Btn>
          </div>
        )}

        {/* ─── Step 2: Permissions ─── */}
        {addStep === 2 && (
          <div>
            {/* Role preset chips */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 8 }}>{tl(language, 'نموذج الصلاحيات', 'תבנית הרשאות', 'Permission preset')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRESET_ROLES.map(role => {
                  const active = memberForm.selectedRole === role
                  return (
                    <button key={role} onClick={() => handleRoleChange(role)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${active ? C.primary : C.border}`,
                      background: active ? `${C.primary}22` : 'transparent',
                      color: active ? C.primary : C.textDim, transition: 'all .15s',
                    }}>
                      {tRole(role, language)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Permission checkboxes */}
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 8, display:'flex', alignItems:'center', gap:4 }}><Lock size={10} strokeWidth={2} /> {tl(language, 'الصلاحيات التفصيلية', 'הרשאות מפורטות', 'Detailed permissions')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 14 }}>
              {PERM_LABELS.map(([key, label]) => {
                const on = !!memberForm.perms[key]
                return (
                  <label key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                    color: on ? C.text : C.textDim, cursor: 'pointer',
                    padding: '7px 9px', borderRadius: 9,
                    background: on ? `${C.primary}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${on ? C.primary + '44' : C.border}`,
                    transition: 'all .15s',
                  }}>
                    <input type="checkbox" checked={on} onChange={() => togglePerm(key)} style={{ accentColor: C.primary, cursor: 'pointer' }} />
                    {permLabel(label, language)}
                  </label>
                )
              })}
            </div>

            {/* Project access restriction */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={addRestrictProjects}
                  onChange={e => {
                    setAddRestrictProjects(e.target.checked)
                    if (!e.target.checked) setAddAllowedProjects([])
                  }}
                  style={{ accentColor: C.primary }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: addRestrictProjects ? C.text : C.textDim, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <FolderTree size={12} strokeWidth={2.3} /> {tl(language, 'تقييد المشاريع (يرى مشاريع محددة فقط)', 'הגבלת פרויקטים (רואה פרויקטים מסוימים בלבד)', 'Restrict projects (sees specific projects only)')}
                </span>
              </label>
              {addRestrictProjects && (
                projects.length === 0
                  ? <div style={{ fontSize: 11, color: C.textDim, padding: '6px 10px' }}>{tl(language, 'لا توجد مشاريع', 'אין פרויקטים', 'No projects')}</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {projects.map(proj => {
                        const sel = addAllowedProjects.includes(proj.id)
                        return (
                          <label key={proj.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                            borderRadius: 9, cursor: 'pointer', fontSize: 11,
                            background: sel ? `${C.primary}15` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${sel ? C.primary + '44' : C.border}`,
                            color: sel ? C.text : C.textDim,
                          }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleAddProject(proj.id)} style={{ accentColor: C.primary }} />
                            {proj.name}
                          </label>
                        )
                      })}
                    </div>
              )}
            </div>

            {addMemberErr && <ErrorMsg msg={addMemberErr} />}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => { setAddStep(1); setAddMemberErr('') }} variant="outline" color={C.textDim} full><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}><ChevronRight size={14} strokeWidth={2.6} /> {tl(language, 'رجوع', 'חזרה', 'Back')}</span></Btn>
              <Btn onClick={onSubmit} full disabled={addingMember}>
                {addingMember
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Loader2 size={14} strokeWidth={2.6} style={{ animation: 'spin .8s linear infinite' }} /> {tl(language, 'جاري الإنشاء...', 'יוצר...', 'Creating...')}</span>
                  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}><Check size={14} strokeWidth={2.6} /> {tl(language, 'إضافة العضو', 'הוספת חבר', 'Add member')}</span>}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 2 }}>
      <label style={{ fontSize: 10, color: C.textDim, display: 'block', marginBottom: 4, fontWeight: 700 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 9, color: C.textDim, marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div style={{ fontSize: 11, color: C.accent, padding: '8px 12px', background: `${C.accent}12`, borderRadius: 9, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
      <AlertTriangle size={12} strokeWidth={2.3} /> {msg}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 10px', borderRadius: 10,
  border: `1px solid rgba(255,255,255,0.1)`,
  background: 'rgba(255,255,255,0.05)', color: C.text,
  fontSize: 12, boxSizing: 'border-box', outline: 'none',
}
