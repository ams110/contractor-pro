import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart2, X, TrendingUp, CalendarDays, Plus, Check, Trash2 } from 'lucide-react'
import { C } from '../constants/index.js'
import { fmtDate, todayStr } from '../lib/helpers.js'
import { calcMustahaq, calcPaid, calcAdvances, calcMutabqi } from '../lib/calculations.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
                   'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const MONTHS_EN = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December']
const DAYS_AR   = ['أح','إث','ثل','أر','خم','جم','سب']
const DAYS_HE   = ['א','ב','ג','ד','ה','ו','ש']
const DAYS_EN   = ['Su','Mo','Tu','We','Th','Fr','Sa']

// القيمة المخزّنة تبقى عربية (canonical)؛ التسمية تُترجَم للعرض فقط.
const PRESET_HOLIDAYS = [
  { v: 'يوم كيبور',          he: 'יום כיפור',          en: 'Yom Kippur' },
  { v: 'رأس السنة العبرية',  he: 'ראש השנה',           en: 'Rosh Hashanah' },
  { v: 'عيد الأضحى',         he: 'עיד אל-אדחא',        en: 'Eid al-Adha' },
  { v: 'عيد الفطر',          he: 'עיד אל-פיטר',        en: 'Eid al-Fitr' },
  { v: 'المولد النبوي',      he: 'אל-מולד א-נבווי',    en: 'Mawlid' },
  { v: 'رأس السنة الميلادية', he: 'ראש השנה האזרחית',  en: 'New Year' },
  { v: 'عيد العمال',         he: 'יום העובד',          en: "Workers' Day" },
  { v: 'يوم الاستقلال',      he: 'יום העצמאות',        en: 'Independence Day' },
]

function pad(n) { return String(n).padStart(2, '0') }
function ym(year, month) { return `${year}-${pad(month + 1)}` }
function ds(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}` }

function MonthCalendar({ year, month, workDays, holidays }) {
  const language = useAppStore(s => s.language)
  const DAYS = language === 'he' ? DAYS_HE : language === 'en' ? DAYS_EN : DAYS_AR
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
        <span style={{ fontSize: 11, color: C.success, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, display: 'inline-block' }} />{worked} {tl(language, 'يوم عمل', 'ימי עבודה', 'work days')}</span>
        {pending  > 0 && <span style={{ fontSize: 11, color: C.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary, display: 'inline-block' }} />{pending} {tl(language, 'معلق', 'ממתין', 'pending')}</span>}
        {holCount > 0 && <span style={{ fontSize: 11, color: C.warning, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning, display: 'inline-block' }} />{holCount} {tl(language, 'إجازة', 'חופשה', 'holiday')}</span>}
        <span style={{ fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.textDim, display: 'inline-block', opacity: 0.5 }} />{tl(language, 'جمعة-سبت', 'שישי-שבת', 'Fri-Sat')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
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

export default function WorkerStatsPanel({ open, onClose, worker, workDays, payments = [], advances = [], expenses = [], holidays, addHoliday, deleteHoliday }) {
  const language = useAppStore(s => s.language)
  const MONTHS = language === 'he' ? MONTHS_HE : language === 'en' ? MONTHS_EN : MONTHS_AR
  const [year,       setYear]       = useState(new Date().getFullYear())
  const [openMonth,  setOpenMonth]  = useState(null)
  const [showAddHol, setShowAddHol] = useState(false)
  const [holForm,    setHolForm]    = useState({ name: '', date: todayStr() })
  const [saving,     setSaving]     = useState(false)

  if (!open || !worker) return null

  const myDays       = workDays.filter(w => w.employee_id === worker.id)
  const yearHolidays = holidays.filter(h => String(h.date).startsWith(String(year)))

  // Cumulative all-time stats
  const allApproved     = myDays.filter(w => w.status === 'approved')
  const totalDaysEver   = allApproved.length
  const wExp            = expenses.filter(e => e.employee_id === worker.id && e.status === 'approved')
  const wPays           = payments.filter(p => p.employee_id === worker.id)
  const wAdvs           = advances.filter(a => a.employee_id === worker.id)
  const totalEarnedEver = calcMustahaq(allApproved, wExp)
  const totalPaidEver   = calcPaid(wPays)
  const totalAdvEver    = calcAdvances(wAdvs)
  const totalOwedEver   = Math.max(0, calcMutabqi(allApproved, wExp, wPays, wAdvs))
  const projIds        = new Set(allApproved.map(w => w.project_id).filter(Boolean))
  const totalProjects  = projIds.size

  const monthStats = MONTHS.map((name, mi) => {
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

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, direction: 'rtl', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

      <div className="slide-up" style={{ position: 'relative', width: '100%', maxWidth: 430, background: C.bg, borderRadius: '20px 20px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -16px 60px rgba(0,0,0,0.7)', border: `1px solid rgba(255,255,255,0.07)`, borderBottom: 'none' }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 7 }}><BarChart2 size={16} strokeWidth={2} style={{ color: C.primary }} /> {worker.name}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>{yearTotal} {tl(language, `يوم عمل في ${year}`, `ימי עבודה ב-${year}`, `work days in ${year}`)}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: C.border, border: 'none', cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><X size={14} strokeWidth={2.5} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>

          {/* Cumulative Stats */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px', border: `1px solid ${C.border}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 10, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={12} strokeWidth={2} style={{ color: C.primary }} /> {tl(language, 'الإحصائيات الإجمالية (منذ البداية)', 'סטטיסטיקה כוללת (מההתחלה)', 'Total stats (all time)')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 6 }}>
              {[
                { l: tl(language, 'أيام العمل', 'ימי עבודה', 'Work days'), v: totalDaysEver, suffix: tl(language, 'يوم', 'יום', 'd'), c: C.primary },
                { l: tl(language, 'المشاريع', 'פרויקטים', 'Projects'),   v: totalProjects, suffix: tl(language, 'مشروع', 'פרויקט', ''), c: C.secondary },
                { l: tl(language, 'إجمالي مستحق', 'סה"כ זכאי', 'Total earned'), v: `${totalEarnedEver.toLocaleString()}₪`, c: C.text },
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, marginBottom: 3 }}>{s.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: s.c }}>
                    {typeof s.v === 'number' ? s.v : s.v}
                    {s.suffix && <span style={{ fontSize: 9, marginRight: 2, fontWeight: 500, color: C.textDim }}>{s.suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { l: tl(language, 'مجموع المدفوع', 'סה"כ שולם', 'Total paid'), v: `${totalPaidEver.toLocaleString()}₪`, c: C.success },
                { l: tl(language, 'المتبقي', 'יתרה', 'Remaining'),       v: `${totalOwedEver.toLocaleString()}₪`, c: totalOwedEver > 0 ? C.accent : C.success },
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'center', padding: '7px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textDim, fontWeight: 600, marginBottom: 3 }}>{s.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

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
                <div style={{ fontSize: 9, color: C.textDim, marginBottom: 6 }}>{tl(language, 'يوم', 'יום', 'days')}</div>
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
                {MONTHS[openMonth]} {year}
              </div>
              <MonthCalendar year={year} month={openMonth} workDays={myDays} holidays={yearHolidays} />
            </div>
          )}

          {/* Holidays Section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14} strokeWidth={2} style={{ color: C.warning }} /> {tl(language, 'الإجازات', 'חופשות', 'Holidays')} ({year})</div>
              <button onClick={() => setShowAddHol(v => !v)}
                style={{ padding: '6px 12px', borderRadius: 8, background: showAddHol ? `${C.accent}22` : `${C.primary}22`, border: `1px solid ${showAddHol ? C.accent : C.primary}55`, color: showAddHol ? C.accent : C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                {showAddHol ? <><X size={11} strokeWidth={2.5} /> {tl(language, 'إلغاء', 'ביטול', 'Cancel')}</> : <><Plus size={11} strokeWidth={2.5} /> {tl(language, 'أضف إجازة', 'הוסף חופשה', 'Add holiday')}</>}
              </button>
            </div>

            {/* Add Form */}
            {showAddHol && (
              <div style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>{tl(language, 'اختر اسماً جاهزاً أو اكتب:', 'בחר שם מוכן או כתוב:', 'Pick a preset or type:')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {PRESET_HOLIDAYS.map(h => (
                    <button key={h.v} onClick={() => setHolForm(p => ({ ...p, name: h.v }))}
                      style={{ padding: '5px 10px', borderRadius: 16, border: `1px solid ${holForm.name === h.v ? C.primary : C.border}`, background: holForm.name === h.v ? `${C.primary}22` : 'transparent', color: holForm.name === h.v ? C.primary : C.textDim, fontSize: 11, cursor: 'pointer' }}>
                      {tl(language, h.v, h.he, h.en)}
                    </button>
                  ))}
                </div>
                <input value={holForm.name} onChange={e => setHolForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={tl(language, 'اسم الإجازة...', 'שם החופשה...', 'Holiday name...')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
                <input type="date" value={holForm.date} onChange={e => setHolForm(p => ({ ...p, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
                <button onClick={handleAddHoliday} disabled={saving || !holForm.name}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: saving || !holForm.name ? C.border : C.warning, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: saving || !holForm.name ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <Check size={14} strokeWidth={2.5} /> {saving ? '...' : tl(language, 'أضف الإجازة', 'הוסף חופשה', 'Add holiday')}
                </button>
              </div>
            )}

            {/* Holiday List */}
            {yearHolidays.length === 0
              ? <div style={{ textAlign: 'center', padding: '16px 0', color: C.textDim, fontSize: 12 }}>{tl(language, `ما في إجازات مضافة لسنة ${year}`, `אין חופשות לשנת ${year}`, `No holidays added for ${year}`)}</div>
              : [...yearHolidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${C.warning}11`, borderRadius: 10, border: `1px solid ${C.warning}33`, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(h.date)}</div>
                  </div>
                  <button onClick={() => deleteHoliday(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex', fontFamily: 'inherit' }}><Trash2 size={14} strokeWidth={2} /></button>
                </div>
              ))
            }
          </div>

        </div>
      </div>
    </div>,
    document.body
  )
}
