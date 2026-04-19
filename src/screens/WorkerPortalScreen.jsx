import React, { useState } from 'react'
import { C, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcSalary } from '../lib/helpers.js'
import { useWorkerPortal } from '../hooks/useWorkerPortal.js'

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || C.text, fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function DayBadge({ type }) {
  const map = { 'كامل': { c: C.success, t: '● كامل' }, 'نص يوم': { c: C.warning, t: '◐ نص' }, 'ساعات': { c: C.blue, t: '⏱ ساعات' } }
  const b = map[type] || { c: C.textDim, t: type }
  return <span style={{ fontSize: 10, fontWeight: 700, color: b.c, background: `${b.c}22`, padding: '2px 7px', borderRadius: 8 }}>{b.t}</span>
}

export default function WorkerPortalScreen({ empId }) {
  const { worker, projects, workDays, loading, error, submitDay, earned, paid, owed } = useWorkerPortal(empId)

  const emptyForm = { date: todayStr(), day_type: 'كامل', hours: '8', project_id: '' }
  const [form,      setForm]      = useState(emptyForm)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [done,      setDone]      = useState(null)

  const todayLogged = workDays.some(d => d.date === todayStr())
  const preview     = worker ? calcSalary(worker.daily_rate, form.day_type, form.hours) : 0

  function setDayType(t) {
    const hours = t === 'كامل' ? '8' : t === 'نص يوم' ? '4' : form.hours
    setForm(prev => ({ ...prev, day_type: t, hours }))
  }

  async function save() {
    if (!form.date) return setFormError('اختر التاريخ')
    setSaving(true)
    setFormError('')
    try {
      const res = await submitDay(form)
      setDone(res.amount)
      setForm(emptyForm)
      setShowForm(false)
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>👷</div>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (error || !worker) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.accent, marginBottom: 8 }}>رابط غير صحيح</div>
        <div style={{ fontSize: 13, color: C.textDim }}>تواصل مع المقاول للحصول على رابطك الصحيح</div>
      </div>
    )
  }

  // ─── Success toast ───────────────────────────────────────────────────────
  if (done !== null) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم التسجيل!</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.primary, fontFamily: 'monospace', marginBottom: 24 }}>{fmt(done)}₪</div>
        <button onClick={() => setDone(null)}
          style={{ padding: '14px 40px', borderRadius: 16, background: C.primary, color: '#000', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          رجوع للبوابة
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}22, ${C.surface})`, padding: '28px 20px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: C.primary }}>
            {worker.name[0]}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textDim }}>أهلاً بك 👋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{worker.name}</div>
            {worker.specialization && (
              <div style={{ fontSize: 11, color: C.primary }}>{worker.specialization.split(',')[0]}</div>
            )}
          </div>
        </div>

        {/* ملخص مالي */}
        <div style={{ background: C.card, borderRadius: 16, padding: '12px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, border: `1px solid ${C.border}` }}>
          <Stat label="مستحق"  value={`${fmt(earned)}₪`}  color={C.text} />
          <Stat label="مدفوع"  value={`${fmt(paid)}₪`}    color={C.success} />
          <Stat label="متبقي"  value={`${fmt(owed)}₪`}    color={owed > 0 ? C.warning : C.success} />
        </div>
      </div>

      <div style={{ padding: 16, paddingBottom: 32 }}>

        {/* زر تسجيل اليوم */}
        {todayLogged ? (
          <div style={{ padding: '16px', background: `${C.success}15`, borderRadius: 16, border: `1px solid ${C.success}33`, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>تم تسجيل اليوم</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(todayStr())}</div>
          </div>
        ) : (
          <button onClick={() => { setShowForm(true); setFormError('') }}
            style={{ width: '100%', padding: '18px', borderRadius: 16, background: C.primary, border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#000' }}>سجّل يوم اليوم</span>
          </button>
        )}

        {/* فورم تسجيل اليوم */}
        {showForm && (
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>تسجيل يوم عمل</div>

            {/* التاريخ */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 5 }}>التاريخ</label>
              <input type="date" value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box' }} />
            </div>

            {/* نوع اليوم */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>نوع اليوم</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DAY_TYPES.map(t => (
                  <button key={t} onClick={() => setDayType(t)}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: 10, border: `2px solid ${form.day_type === t ? C.primary : C.border}`, background: form.day_type === t ? `${C.primary}22` : 'transparent', color: form.day_type === t ? C.primary : C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* الساعات */}
            {form.day_type === 'ساعات' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 5 }}>عدد الساعات</label>
                <input type="number" min="0.5" max="24" value={form.hours}
                  onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            )}

            {/* المشروع */}
            {projects.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع (اختياري)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {projects.map(p => (
                    <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: prev.project_id === p.id ? '' : p.id }))}
                      style={{ padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${form.project_id === p.id ? C.primary : C.border}`, background: form.project_id === p.id ? `${C.primary}22` : 'transparent', color: form.project_id === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* معاينة المبلغ */}
            <div style={{ padding: '12px 14px', background: `${C.primary}15`, borderRadius: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.textDim }}>المبلغ المحسوب</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(preview)}₪</span>
            </div>

            {formError && (
              <div style={{ fontSize: 12, color: C.accent, marginBottom: 12, padding: '8px 12px', background: `${C.accent}15`, borderRadius: 8 }}>⚠ {formError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 14, cursor: 'pointer' }}>
                إلغاء
              </button>
              <button onClick={save} disabled={saving}
                style={{ flex: 2, padding: 14, borderRadius: 12, background: saving ? C.border : C.primary, border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'جاري الحفظ...' : '✓ سجّل'}
              </button>
            </div>
          </div>
        )}

        {/* سجل الأيام */}
        {workDays.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>📋 سجل أيامك (آخر 60 يوم)</div>
            {workDays.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'center', minWidth: 36 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{fmtDate(d.date).split('/')[0]}</div>
                    <div style={{ fontSize: 9, color: C.textDim }}>{fmtDate(d.date).split('/')[1]}/{fmtDate(d.date).split('/')[2]?.slice(2)}</div>
                  </div>
                  <div>
                    <DayBadge type={d.day_type} />
                    {d.project_name && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{d.project_name}</div>}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.success, fontFamily: 'monospace' }}>{fmt(d.amount)}₪</div>
              </div>
            ))}
          </div>
        )}

        {workDays.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 14 }}>ما في أيام مسجّلة بعد</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, color: C.textMuted, fontSize: 11 }}>
          Contractor Pro 🏗️
        </div>
      </div>
    </div>
  )
}
