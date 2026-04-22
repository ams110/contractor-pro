import React, { useState } from 'react'
import { C, GRAD, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcSalary, validateWorkDay } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, Badge, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { exportWorkDaysToExcel } from '../lib/export.js'

export default function WorkDaysScreen({ workDays, employees, projects, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay }) {
  const [showForm,   setShowForm]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [approving,  setApproving]  = useState(null)

  const emptyForm = { date: todayStr(), employee_id: '', project_id: '', day_type: 'كامل', hours: '8', customAmount: '' }
  const [form, setForm] = useState(emptyForm)

  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  const activeEmps  = employees.filter(e => e.status === 'نشط')
  const activeProjs = projects.filter(p => p.status === 'نشط')
  const selectedEmp = form.employee_id ? employees.find(e => e.id === form.employee_id) : null
  const preview     = selectedEmp
    ? (form.day_type === 'مبلغ مسكر'
        ? parseFloat(form.customAmount) || 0
        : calcSalary(selectedEmp.daily_rate, form.day_type, form.hours))
    : 0

  const pendingDays  = workDays.filter(wd => wd.status === 'pending')
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
      const amount = form.day_type === 'مبلغ مسكر'
        ? parseFloat(form.customAmount)
        : calcSalary(selectedEmp.daily_rate, form.day_type, form.hours)
      const { customAmount: _skip, ...formData } = form
      await addWorkDay({ ...formData, amount, hours: parseFloat(form.hours) || 8 })
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

  const DAY_TYPE_COLOR = { 'كامل': C.primary, 'نص يوم': C.warning, 'ساعات': C.blue, 'مبلغ مسكر': C.orange }

  return (
    <div className="fade-in" style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: GRAD.brand,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 6px 24px ${C.primary}44`,
            flexShrink: 0,
          }}>📅</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: '-0.5px' }}>أيام العمل</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{workDays.length} يوم مسجل</div>
          </div>
          {pendingDays.length > 0 && (
            <div style={{
              background: GRAD.warm,
              borderRadius: 24, padding: '4px 14px',
              fontSize: 12, fontWeight: 900, color: '#000',
              boxShadow: `0 4px 16px ${C.warning}55`,
              letterSpacing: '0.01em',
            }}>
              {pendingDays.length} معلق
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {workDays.length > 0 && (
            <button
              onClick={() => exportWorkDaysToExcel(workDays, employees, projects)}
              style={{
                padding: '10px 16px', borderRadius: 12,
                border: `1px solid ${C.borderMid}`,
                background: 'rgba(255,255,255,0.05)',
                color: C.textDim, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(10px)',
                transition: 'all .2s',
              }}>
              📊 Excel
            </button>
          )}
          <Btn onClick={() => { setFormError(''); setShowForm(true) }}>+ سجّل يوم</Btn>
        </div>
      </div>

      {/* ─── Pending Section ─── */}
      {pendingDays.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel color={C.warning} action={`${pendingDays.length} طلب`}>
            ⏳ بانتظار موافقتك
          </SectionLabel>
          {pendingDays.map(wd => {
            const emp  = employees.find(x => x.id === wd.employee_id)
            const proj = projects.find(x => x.id === wd.project_id)
            const busy = approving === wd.id
            return (
              <div key={wd.id} style={{
                borderRadius: 20, marginBottom: 12, overflow: 'hidden',
                background: `${C.surface}`,
                boxShadow: `0 0 0 1px ${C.warning}33, 0 8px 32px ${C.warning}18`,
                position: 'relative',
              }}>
                {/* gradient warning top border */}
                <div style={{ height: 3, background: GRAD.warm }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                        {emp?.name || '؟'}
                      </div>
                      <div style={{ fontSize: 12, color: C.textDim, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>{fmtDate(wd.date)}</span>
                        <span style={{ opacity: 0.3 }}>•</span>
                        <span>{proj?.name || '؟'}</span>
                        <span style={{ opacity: 0.3 }}>•</span>
                        <span style={{
                          background: `${C.warning}22`, color: C.warning,
                          padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          border: `1px solid ${C.warning}44`,
                        }}>{wd.day_type}</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 900, color: C.warning,
                      fontFamily: 'monospace', letterSpacing: '-1px',
                      flexShrink: 0, marginRight: 8,
                    }}>{fmt(wd.amount)}₪</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleApprove(wd.id)} disabled={busy}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: 14,
                        background: busy ? C.border : GRAD.success,
                        border: 'none',
                        color: busy ? C.textDim : '#fff',
                        fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer',
                        boxShadow: busy ? 'none' : `0 4px 18px ${C.success}44`,
                        transition: 'all .2s',
                        letterSpacing: '0.02em',
                      }}>
                      {busy ? '...' : '✓ موافقة'}
                    </button>
                    <button
                      onClick={() => handleReject(wd.id)} disabled={busy}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: 14,
                        background: busy ? 'transparent' : `${C.accent}12`,
                        border: `1.5px solid ${busy ? C.border : C.accent + '55'}`,
                        color: busy ? C.textDim : C.accent,
                        fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer',
                        transition: 'all .2s',
                        letterSpacing: '0.02em',
                      }}>
                      {busy ? '...' : '✗ رفض'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Approved Days ─── */}
      {sorted.length === 0 && pendingDays.length === 0
        ? <EmptyState icon="📅" text="ما في أيام عمل مسجلة" action="+ سجّل أول يوم" onAction={() => setShowForm(true)} />
        : sorted.length > 0 && (
          <>
            {pendingDays.length > 0 && (
              <SectionLabel color={C.primary}>الأيام الموافق عليها</SectionLabel>
            )}
            {sorted.map(wd => {
              const emp   = employees.find(x => x.id === wd.employee_id)
              const proj  = projects.find(x => x.id === wd.project_id)
              const parts = fmtDate(wd.date).split('/')
              const pillColor = DAY_TYPE_COLOR[wd.day_type] || C.primary
              return (
                <GlassCard key={wd.id} style={{ marginBottom: 10, borderRadius: 18 }}>
                  <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Date pill */}
                      <div style={{
                        minWidth: 48, height: 52, borderRadius: 14,
                        background: `${pillColor}18`,
                        border: `1.5px solid ${pillColor}33`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 2,
                        flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: pillColor, lineHeight: 1 }}>{parts[0]}</div>
                        <div style={{ fontSize: 10, color: pillColor, opacity: 0.7, fontWeight: 700 }}>{parts[1]}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{emp?.name || '؟'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 12, color: C.textDim }}>{proj?.name || '؟'}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: pillColor, background: `${pillColor}18`,
                            padding: '2px 10px', borderRadius: 10,
                            border: `1px solid ${pillColor}30`,
                          }}>{wd.day_type}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        fontSize: 17, fontWeight: 900, color: C.accent,
                        fontFamily: 'monospace', letterSpacing: '-0.5px',
                      }}>{fmt(wd.amount)}₪</div>
                      <button
                        onClick={() => setConfirmDel(wd.id)}
                        style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: `${C.accent}15`, border: `1px solid ${C.accent}30`,
                          color: C.accent, fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .2s',
                        }}>🗑️</button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </>
        )
      }

      {/* ─── Add Modal ─── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="تسجيل يوم عمل">
        {activeEmps.length === 0 || activeProjs.length === 0
          ? <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
              <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>لازم تضيف عمال ومشاريع أول!</div>
            </div>
          : <>
              <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" required />

              {/* Employee selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  العامل <span style={{ color: C.accent }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeEmps.map(e => {
                    const sel = form.employee_id === e.id
                    return (
                      <button key={e.id} onClick={() => setForm(prev => ({ ...prev, employee_id: e.id }))}
                        style={{
                          padding: '10px 16px', borderRadius: 12,
                          border: `1.5px solid ${sel ? C.primary : C.border}`,
                          background: sel ? `${C.primary}18` : 'rgba(255,255,255,0.04)',
                          color: sel ? C.primary : C.textDim,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          transition: 'all .2s',
                          boxShadow: sel ? `0 4px 18px ${C.primary}33` : 'none',
                        }}>
                        {e.name}
                        <span style={{ fontSize: 10, marginRight: 5, opacity: 0.7 }}>({e.daily_rate}₪)</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Project selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  المشروع <span style={{ color: C.accent }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {activeProjs.map(p => {
                    const sel = form.project_id === p.id
                    return (
                      <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id }))}
                        style={{
                          padding: '10px 16px', borderRadius: 12,
                          border: `1.5px solid ${sel ? C.secondary : C.border}`,
                          background: sel ? `${C.secondary}18` : 'rgba(255,255,255,0.04)',
                          color: sel ? C.secondary : C.textDim,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          transition: 'all .2s',
                          boxShadow: sel ? `0 4px 18px ${C.secondary}33` : 'none',
                        }}>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Day type — 3 GlassCard toggle buttons */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>نوع اليوم</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {DAY_TYPES.map(t => {
                    const sel   = form.day_type === t
                    const color = DAY_TYPE_COLOR[t] || C.primary
                    const icons = { 'كامل': '☀️', 'نص يوم': '🌤️', 'ساعات': '⏱️', 'مبلغ مسكر': '💵' }
                    return (
                      <button key={t} onClick={() => setDayType(t)}
                        style={{
                          flex: 1, padding: '14px 8px', borderRadius: 16,
                          border: `2px solid ${sel ? color : C.border}`,
                          background: sel
                            ? `${color}18`
                            : 'rgba(255,255,255,0.03)',
                          backdropFilter: 'blur(10px)',
                          color: sel ? color : C.textDim,
                          fontSize: 13, fontWeight: 800, cursor: 'pointer',
                          transition: 'all .25s',
                          boxShadow: sel ? `0 6px 22px ${color}33` : 'none',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        }}>
                        <span style={{ fontSize: 22 }}>{icons[t]}</span>
                        <span>{t}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.day_type === 'ساعات' && (
                <Input label="عدد الساعات" value={form.hours} onChange={f('hours')} type="number" min="0.5" max="24" />
              )}

              {form.day_type === 'مبلغ مسكر' && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, display: 'block', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>المبلغ المسكر (₪) *</label>
                  <input
                    type="number" value={form.customAmount} min="1" step="1" placeholder="0"
                    onChange={e => setForm(prev => ({ ...prev, customAmount: e.target.value }))}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.orange}77`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 22, fontWeight: 900, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
              )}

              {/* Calculated amount preview */}
              {selectedEmp && (
                <div style={{
                  padding: '16px 20px', borderRadius: 16, marginBottom: 18,
                  background: `${C.primary}0d`,
                  border: `1.5px solid ${C.primary}33`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: `0 4px 20px ${C.primary}18`,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 3 }}>المبلغ المحسوب</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>{selectedEmp.name} × {form.day_type}</div>
                  </div>
                  <div style={{
                    fontSize: 26, fontWeight: 900, color: C.primary,
                    fontFamily: 'monospace', letterSpacing: '-1px',
                  }}>{fmt(preview)}₪</div>
                </div>
              )}

              {formError && (
                <div style={{
                  fontSize: 12, color: C.accent, marginBottom: 16,
                  padding: '12px 16px', borderRadius: 12,
                  background: `${C.accent}10`, border: `1px solid ${C.accent}33`,
                }}>⚠ {formError}</div>
              )}
              <Btn onClick={save} full disabled={saving || !form.employee_id || !form.project_id}>
                {saving ? 'جاري الحفظ...' : '✓ سجّل اليوم'}
              </Btn>
            </>
        }
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={async () => { await deleteWorkDay(confirmDel); setConfirmDel(null) }}
        message="حذف هذا اليوم؟"
      />
    </div>
  )
}
