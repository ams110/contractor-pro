import React, { useState } from 'react'
import { C } from '../constants/index.js'
import { fmtDate, todayStr } from '../lib/helpers.js'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAYS_AR   = ['أح','إث','ثل','أر','خم','جم','سب']

const PRESET_HOLIDAYS = [
  'يوم كيبور','رأس السنة العبرية','عيد الأضحى','عيد الفطر',
  'المولد النبوي','رأس السنة الميلادية','عيد العمال','يوم الاستقلال',
]

function pad(n) { return String(n).padStart(2, '0') }
function ym(year, month) { return `${year}-${pad(month + 1)}` }
function ds(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}` }

function MonthCalendar({ year, month, workDays, holidays }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()

  const workedSet  = new Set(workDays.filter(w => w.status === 'approved').map(w => String(w.date).slice(0, 10)))
  const pendingSet = new Set(workDays.filter(w => w.status === 'pending').map(w => String(w.date).slice(0, 10)))
  const holSet     = new Set(holidays.map(h => String(h.date).slice(0, 10)))

  const cells = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function style(d) {
    const date = ds(year, month, d)
    const dow  = new Date(year, month, d).getDay()
    if (holSet.has(date))     return { bg: `${C.warning}33`,  color: C.warning,  fw: 700 }
    if (workedSet.has(date))  return { bg: `${C.success}33`,  color: C.success,  fw: 700 }
    if (pendingSet.has(date)) return { bg: `${C.primary}22`,  color: C.primary,  fw: 700 }
    if (dow === 5 || dow === 6) return { bg: `${C.border}33`, color: C.textDim,  fw: 400 }
    return { bg: 'transparent', color: C.textMuted, fw: 400 }
  }

  const prefix   = ym(year, month)
  const worked   = workDays.filter(w => w.status === 'approved' && String(w.date).startsWith(prefix)).length
  const pending  = workDays.filter(w => w.status === 'pending'  && String(w.date).startsWith(prefix)).length
  const holCount = holidays.filter(h => String(h.date).startsWith(prefix)).length

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: C.success, fontWeight: 700 }}>🟢 {worked} يوم عمل</span>
        {pending  > 0 && <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>🔵 {pending} معلق</span>}
        {holCount > 0 && <span style={{ fontSize: 11, color: C.warning, fontWeight: 700 }}>🟡 {holCount} إجازة</span>}
        <span style={{ fontSize: 11, color: C.textDim }}>⚫ جمعة-سبت</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_AR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: C.textDim }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((d, i) => !d
          ? <div key={`e${i}`} />
          : <div key={d} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: style(d).bg, fontSize: 11, fontWeight: style(d).fw, color: style(d).color }}>
              {d}
            </div>
        )}
      </div>
    </>
  )
}

export default function WorkerStatsPanel({ open, onClose, worker, workDays, holidays, addHoliday, deleteHoliday }) {
  const [year,       setYear]       = useState(new Date().getFullYear())
  const [openMonth,  setOpenMonth]  = useState(null)
  const [showAddHol, setShowAddHol] = useState(false)
  const [holForm,    setHolForm]    = useState({ name: '', date: todayStr() })
  const [saving,     setSaving]     = useState(false)

  if (!open || !worker) return null

  const myDays       = workDays.filter(w => w.employee_id === worker.id)
  const yearHolidays = holidays.filter(h => String(h.date).startsWith(String(year)))

  const monthStats = MONTHS_AR.map((name, mi) => {
    const prefix  = ym(year, mi)
    const worked  = myDays.filter(w => w.status === 'approved' && String(w.date).startsWith(prefix)).length
    const pending = myDays.filter(w => w.status === 'pending'  && String(w.date).startsWith(prefix)).length
    const hols    = yearHolidays.filter(h => String(h.date).startsWith(prefix)).length
    return { name, worked, pending, hols }
  })

  const yearTotal = monthStats.reduce((s, m) => s + m.worked, 0)
  const maxDays   = Math.max(...monthStats.map(m => m.worked), 1)

  async function handleAddHoliday() {
    if (!holForm.name || !holForm.date) return
    setSaving(true)
    try {
      await addHoliday(holForm)
      setHolForm({ name: '', date: todayStr() })
      setShowAddHol(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, direction: 'rtl' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} />

      <div className="slide-up" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: C.bg, borderRadius: '20px 20px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>📊 {worker.name}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{yearTotal} يوم عمل في {year}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: C.border, border: 'none', cursor: 'pointer', fontSize: 14, color: C.text }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>

          {/* Year Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, borderRadius: 12, padding: '10px 16px', border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <button onClick={() => { setYear(y => y - 1); setOpenMonth(null) }}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.primary, lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{year}</span>
            <button onClick={() => { setYear(y => y + 1); setOpenMonth(null) }}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.primary, lineHeight: 1 }}>›</button>
          </div>

          {/* 12-Month Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {monthStats.map((m, mi) => (
              <button key={mi} onClick={() => setOpenMonth(openMonth === mi ? null : mi)}
                style={{ padding: '10px 6px', borderRadius: 12, border: `1.5px solid ${openMonth === mi ? C.primary : m.worked > 0 ? `${C.success}55` : C.border}`, background: openMonth === mi ? `${C.primary}15` : m.worked > 0 ? `${C.success}08` : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{m.name}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.worked > 0 ? C.success : C.textDim }}>{m.worked}</div>
                <div style={{ fontSize: 9, color: C.textDim, marginBottom: 6 }}>يوم</div>
                <div style={{ height: 3, borderRadius: 2, background: `${C.border}44`, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(m.worked / maxDays) * 100}%`, background: C.success, borderRadius: 2 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 5 }}>
                  {m.pending > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary }} />}
                  {m.hols    > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.warning }} />}
                </div>
              </button>
            ))}
          </div>

          {/* Expanded Month Calendar */}
          {openMonth !== null && (
            <div style={{ background: C.card, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                {MONTHS_AR[openMonth]} {year}
              </div>
              <MonthCalendar year={year} month={openMonth} workDays={myDays} holidays={yearHolidays} />
            </div>
          )}

          {/* Holidays Section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>🗓️ الإجازات ({year})</div>
              <button onClick={() => setShowAddHol(v => !v)}
                style={{ padding: '6px 12px', borderRadius: 8, background: showAddHol ? `${C.accent}22` : `${C.primary}22`, border: `1px solid ${showAddHol ? C.accent : C.primary}55`, color: showAddHol ? C.accent : C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {showAddHol ? '✕ إلغاء' : '+ أضف إجازة'}
              </button>
            </div>

            {/* Add Form */}
            {showAddHol && (
              <div style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>اختر اسماً جاهزاً أو اكتب:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {PRESET_HOLIDAYS.map(h => (
                    <button key={h} onClick={() => setHolForm(p => ({ ...p, name: h }))}
                      style={{ padding: '5px 10px', borderRadius: 16, border: `1px solid ${holForm.name === h ? C.primary : C.border}`, background: holForm.name === h ? `${C.primary}22` : 'transparent', color: holForm.name === h ? C.primary : C.textDim, fontSize: 11, cursor: 'pointer' }}>
                      {h}
                    </button>
                  ))}
                </div>
                <input value={holForm.name} onChange={e => setHolForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="اسم الإجازة..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
                <input type="date" value={holForm.date} onChange={e => setHolForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
                <button onClick={handleAddHoliday} disabled={saving || !holForm.name}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: saving || !holForm.name ? C.border : C.warning, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: saving || !holForm.name ? 'default' : 'pointer' }}>
                  {saving ? '...' : '✓ أضف الإجازة'}
                </button>
              </div>
            )}

            {/* Holiday List */}
            {yearHolidays.length === 0
              ? <div style={{ textAlign: 'center', padding: '16px 0', color: C.textDim, fontSize: 12 }}>ما في إجازات مضافة لسنة {year}</div>
              : [...yearHolidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${C.warning}11`, borderRadius: 10, border: `1px solid ${C.warning}33`, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(h.date)}</div>
                  </div>
                  <button onClick={() => deleteHoliday(h.id)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: C.textDim }}>🗑️</button>
                </div>
              ))
            }
          </div>

        </div>
      </div>
    </div>
  )
}
