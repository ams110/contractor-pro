import React, { useState } from 'react'
import { C, GRAD, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, fmtDateFull, todayStr, calcSalary, validateWorkDay } from '../lib/helpers.js'
import { GlassCard, Modal, Input, Btn, Badge, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { exportWorkDaysToExcel } from '../lib/export.js'

const DAY_TYPE_COLOR = { 'كامل': C.primary, 'نص يوم': C.warning, 'ساعات': C.blue, 'مبلغ مسكر': C.orange, 'عطلة': C.textDim }
const DAY_ICONS = { 'كامل': '☀️', 'نص يوم': '🌤️', 'ساعات': '⏱️', 'مبلغ مسكر': '💵', 'عطلة': '🎉' }

export default function WorkDaysScreen({ workDays, employees, projects, addWorkDay, bulkAddWorkDays, updateWorkDay, bulkUpdateWorkDays, deleteWorkDay, approveWorkDay, rejectWorkDay, holidays = [] }) {
  const holidayDates = new Set((holidays || []).map(h => String(h.date).slice(0, 10)))
  const [showForm,    setShowForm]    = useState(false)
  const [editingDay,  setEditingDay]  = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [approving,   setApproving]   = useState(null)
  const [multiMode,   setMultiMode]   = useState(false)
  const [rangeMode,   setRangeMode]   = useState(false)
  const [dateFrom,    setDateFrom]    = useState(todayStr())
  const [dateTo,      setDateTo]      = useState(todayStr())
  const [multiEmps,   setMultiEmps]   = useState(new Set())
  const [showFilters,   setShowFilters]   = useState(false)
  const [filterEmp,     setFilterEmp]     = useState('')
  const [filterProj,    setFilterProj]    = useState('')
  const [filterMonth,   setFilterMonth]   = useState('')
  const [workerDetail,  setWorkerDetail]  = useState(null)
  const [openMonths,    setOpenMonths]    = useState(() => new Set([new Date().toISOString().slice(0, 7)]))
  const [openWorkers,   setOpenWorkers]   = useState(new Set())
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedDayIds, setSelectedDayIds] = useState(new Set())
  const [showBulkProj,   setShowBulkProj]   = useState(false)
  const [bulkProjId,     setBulkProjId]     = useState('')
  const [bulkSaving,     setBulkSaving]     = useState(false)
  const [bulkError,      setBulkError]      = useState('')
  const [rejectTarget,   setRejectTarget]   = useState(null)
  const [rejectReason,   setRejectReason]   = useState('')

  const emptyForm = { date: todayStr(), employee_id: '', project_id: '', day_type: 'كامل', hours: '8', customAmount: '' }
  const [form, setForm] = useState(emptyForm)
  const [holidayWorked,    setHolidayWorked]    = useState(false)  // عطلة: اشتغل أو ما اشتغل
  const [holidaySubType,   setHolidaySubType]   = useState('كامل') // نوع اليوم لما اشتغل بالعيد
  function f(key) { return v => setForm(prev => ({ ...prev, [key]: v })) }

  const activeEmps  = employees.filter(e => e.status === 'نشط')
  const activeProjs = projects.filter(p => p.status === 'نشط')

  const selectedEmp = form.employee_id ? employees.find(e => e.id === form.employee_id) : null
  const effectivePreviewType = (form.day_type === 'عطلة' && holidayWorked) ? holidaySubType : form.day_type
  const singlePreview = selectedEmp
    ? (effectivePreviewType === 'مبلغ مسكر' ? parseFloat(form.customAmount) || 0 : calcSalary(selectedEmp.daily_rate, effectivePreviewType, form.hours))
    : 0

  const multiPreviews = multiMode
    ? [...multiEmps].map(id => {
        const emp = employees.find(e => e.id === id)
        if (!emp) return null
        const amt = effectivePreviewType === 'مبلغ مسكر' ? parseFloat(form.customAmount) || 0 : calcSalary(emp.daily_rate, effectivePreviewType, form.hours)
        return { id, name: emp.name, amount: amt }
      }).filter(Boolean)
    : []
  const multiTotal = multiPreviews.reduce((s, x) => s + x.amount, 0)

  const pendingDays  = workDays.filter(wd => wd.status === 'pending')
  const approvedDays = workDays.filter(wd => wd.status !== 'pending')

  function setDayType(t) {
    const hours = t === 'كامل' ? '8' : t === 'نص يوم' ? '4' : form.hours
    setForm(prev => ({ ...prev, day_type: t, hours }))
    if (t !== 'عطلة') { setHolidayWorked(false); setHolidaySubType('كامل') }
  }

  function toggleMultiEmp(id) {
    setMultiEmps(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getDatesInRange(from, to) {
    const dates = []
    let cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  function openForm() {
    setFormError('')
    setEditingDay(null)
    setMultiEmps(new Set())
    setRangeMode(false)
    setDateFrom(todayStr())
    setDateTo(todayStr())
    setForm(emptyForm)
    setHolidayWorked(false)
    setHolidaySubType('كامل')
    setShowForm(true)
  }

  function openEditDay(wd) {
    setFormError('')
    setEditingDay(wd.id)
    setMultiMode(false)
    setMultiEmps(new Set())
    setForm({
      date:         wd.date,
      employee_id:  wd.employee_id,
      project_id:   wd.project_id,
      location:     wd.location || '',
      day_type:     wd.day_type,
      hours:        String(wd.hours || 8),
      customAmount: wd.day_type === 'مبلغ مسكر' ? String(wd.amount) : '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingDay(null)
    setMultiMode(false)
    setRangeMode(false)
    setDateFrom(todayStr())
    setDateTo(todayStr())
    setMultiEmps(new Set())
    setForm(emptyForm)
    setHolidayWorked(false)
    setHolidaySubType('كامل')
    setFormError('')
  }

  async function save() {
    const isHolidayOff = form.day_type === 'عطلة' && !holidayWorked
    const effectiveType = (form.day_type === 'عطلة' && holidayWorked) ? holidaySubType : form.day_type

    // ── وضع النطاق الزمني ─────────────────────────────────────────────────────
    if (rangeMode) {
      const workers = multiMode ? [...multiEmps] : (form.employee_id ? [form.employee_id] : [])
      if (workers.length === 0) return setFormError('اختر عامل واحد على الأقل')
      if (!form.project_id && !isHolidayOff) return setFormError('اختر المشروع')
      if (!dateFrom || !dateTo) return setFormError('حدد نطاق التاريخ')
      if (dateTo < dateFrom) return setFormError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
      if (effectiveType === 'مبلغ مسكر') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError('أدخل المبلغ المسكر')
      }
      const dates = getDatesInRange(dateFrom, dateTo)
      const entries = []
      for (const date of dates) {
        for (const empId of workers) {
          const dup = workDays.find(w => w.employee_id === empId && String(w.date).slice(0,10) === date && w.project_id === form.project_id)
          if (dup) continue
          const emp = employees.find(e => e.id === empId)
          const amount = effectiveType === 'مبلغ مسكر' ? parseFloat(form.customAmount) : calcSalary(emp.daily_rate, effectiveType, form.hours)
          entries.push({ date, employee_id: empId, project_id: form.project_id || null, location: form.location || undefined, day_type: effectiveType, hours: parseFloat(form.hours) || 8, amount })
        }
      }
      if (entries.length === 0) return setFormError('كل السجلات موجودة مسبقاً — لا يوجد جديد للحفظ')
      setSaving(true)
      try {
        await bulkAddWorkDays(entries)
        closeForm()
      } catch (e) { setFormError(e.message) }
      finally { setSaving(false) }
      return
    }

    if (multiMode) {
      if (multiEmps.size === 0) return setFormError('اختر عامل واحد على الأقل')
      if (!form.project_id && !isHolidayOff) return setFormError('اختر المشروع')
      if (effectiveType === 'مبلغ مسكر') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError('أدخل المبلغ المسكر')
      }
      const dupName = [...multiEmps].map(id => {
        const dup = workDays.find(w => w.employee_id === id && String(w.date).slice(0,10) === form.date && w.day_type === form.day_type && w.id !== editingDay)
        return dup ? employees.find(e => e.id === id)?.name : null
      }).filter(Boolean)
      if (dupName.length > 0) return setFormError(`${dupName.join('، ')} — عندهم ${form.day_type} بهاد التاريخ مسبقاً`)
      setSaving(true)
      try {
        await Promise.all([...multiEmps].map(empId => {
          const emp = employees.find(e => e.id === empId)
          const amount = effectiveType === 'مبلغ مسكر'
            ? parseFloat(form.customAmount)
            : calcSalary(emp.daily_rate, effectiveType, form.hours)
          return addWorkDay({ date: form.date, employee_id: empId, project_id: form.project_id || null, day_type: effectiveType, hours: parseFloat(form.hours) || 8, amount })
        }))
        closeForm()
      } catch (e) { setFormError(e.message) }
      finally { setSaving(false) }
    } else {
      const err = validateWorkDay(form)
      if (err) return setFormError(err)
      if (effectiveType === 'مبلغ مسكر' && form.day_type === 'عطلة') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError('أدخل المبلغ المسكر')
      }
      if (!selectedEmp) return setFormError('العامل غير موجود')
      const duplicate = workDays.find(w => w.employee_id === form.employee_id && String(w.date).slice(0,10) === form.date && w.day_type === form.day_type && w.id !== editingDay)
      if (duplicate) return setFormError(`${selectedEmp.name} عنده ${form.day_type} بتاريخ ${form.date} مسبقاً`)
      setSaving(true)
      try {
        const amount = effectiveType === 'مبلغ مسكر' ? parseFloat(form.customAmount) : calcSalary(selectedEmp.daily_rate, effectiveType, form.hours)
        const { customAmount: _skip, ...formData } = form
        const saveData = { ...formData, project_id: form.project_id || null, day_type: effectiveType, amount, hours: parseFloat(form.hours) || 8 }
        if (editingDay) {
          await updateWorkDay(editingDay, saveData)
        } else {
          await addWorkDay(saveData)
        }
        closeForm()
      } catch (e) { setFormError(e.message) }
      finally { setSaving(false) }
    }
  }

  async function handleApprove(id) { setApproving(id); try { await approveWorkDay(id) } finally { setApproving(null) } }
  async function confirmReject() {
    if (!rejectTarget) return
    setApproving(rejectTarget)
    try { await rejectWorkDay(rejectTarget, rejectReason) } finally { setApproving(null); setRejectTarget(null); setRejectReason('') }
  }

  function toggleDaySelect(id) {
    setSelectedDayIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitBulkMode() {
    setBulkSelectMode(false)
    setSelectedDayIds(new Set())
    setShowBulkProj(false)
    setBulkProjId('')
    setBulkError('')
  }

  async function applyBulkProject() {
    if (!bulkProjId) return setBulkError('اختر مشروعاً')
    setBulkSaving(true)
    setBulkError('')
    try {
      await bulkUpdateWorkDays([...selectedDayIds], { project_id: bulkProjId })
      exitBulkMode()
    } catch (e) { setBulkError(e.message) }
    finally { setBulkSaving(false) }
  }

  const hasFilter = filterEmp || filterProj || filterMonth

  const sorted = [...approvedDays]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .filter(wd => {
      if (filterEmp   && wd.employee_id !== filterEmp)                  return false
      if (filterProj  && wd.project_id  !== filterProj)                 return false
      if (filterMonth && !(wd.date || '').startsWith(filterMonth))      return false
      return true
    })

  return (
    <div className="fade-in" style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width:48, height:48, borderRadius:16, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:`0 6px 24px ${C.primary}44`, flexShrink:0 }}>📅</div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:C.text, letterSpacing:'-0.5px' }}>أيام العمل</div>
            <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{workDays.length} يوم مسجل</div>
          </div>
          {pendingDays.length > 0 && (
            <div style={{ background:GRAD.warm, borderRadius:24, padding:'4px 14px', fontSize:12, fontWeight:900, color:'#000', boxShadow:`0 4px 16px ${C.warning}55` }}>
              {pendingDays.length} معلق
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {workDays.length > 0 && (
            <button onClick={() => exportWorkDaysToExcel(workDays, employees, projects)}
              style={{ padding:'10px 16px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, backdropFilter:'blur(10px)' }}>
              📊 Excel
            </button>
          )}
          {approvedDays.length > 0 && (
            <button onClick={() => setShowFilters(v => !v)}
              style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${hasFilter ? C.secondary : C.border}`, background: hasFilter ? `${C.secondary}15` : 'rgba(255,255,255,0.04)', color: hasFilter ? C.secondary : C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              🔍 {hasFilter ? 'فلتر نشط' : 'فلتر'}
            </button>
          )}
          {approvedDays.length > 0 && (
            <button onClick={() => bulkSelectMode ? exitBulkMode() : setBulkSelectMode(true)}
              style={{ padding:'10px 14px', borderRadius:12, border:`1.5px solid ${bulkSelectMode ? C.primary : C.border}`, background: bulkSelectMode ? `${C.primary}15` : 'rgba(255,255,255,0.04)', color: bulkSelectMode ? C.primary : C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              ☑ {bulkSelectMode ? (selectedDayIds.size > 0 ? `${selectedDayIds.size} محدد` : 'تحديد') : 'تحديد'}
            </button>
          )}
          {!bulkSelectMode && <Btn onClick={openForm}>+ سجّل يوم</Btn>}
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      {showFilters && (
        <GlassCard style={{ marginBottom:20, padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:800, color:C.secondary }}>🔍 فلترة الأيام</span>
            {hasFilter && (
              <button onClick={() => { setFilterEmp(''); setFilterProj(''); setFilterMonth('') }}
                style={{ fontSize:11, color:C.accent, background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 10px', cursor:'pointer', fontWeight:700 }}>
                ✕ مسح الفلاتر
              </button>
            )}
          </div>

          {/* Employee chips */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>العامل</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <button onClick={() => setFilterEmp('')}
                style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${!filterEmp ? C.primary : C.border}`, background: !filterEmp ? `${C.primary}18` : 'transparent', color: !filterEmp ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                الكل
              </button>
              {employees.map(e => (
                <div key={e.id} style={{ display:'flex', gap:3 }}>
                  <button onClick={() => setFilterEmp(filterEmp === e.id ? '' : e.id)}
                    style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${filterEmp === e.id ? C.primary : C.border}`, background: filterEmp === e.id ? `${C.primary}18` : 'transparent', color: filterEmp === e.id ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {e.name}
                  </button>
                  <button onClick={() => setWorkerDetail(e.id)} title="إحصائيات العامل"
                    style={{ padding:'6px 10px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer' }}>
                    📊
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Project chips */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>المشروع</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <button onClick={() => setFilterProj('')}
                style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${!filterProj ? C.secondary : C.border}`, background: !filterProj ? `${C.secondary}18` : 'transparent', color: !filterProj ? C.secondary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                الكل
              </button>
              {projects.map(p => (
                <button key={p.id} onClick={() => setFilterProj(filterProj === p.id ? '' : p.id)}
                  style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${filterProj === p.id ? C.secondary : C.border}`, background: filterProj === p.id ? `${C.secondary}18` : 'transparent', color: filterProj === p.id ? C.secondary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Month picker */}
          <div>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>الشهر</div>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${filterMonth ? C.warning : C.border}`, background:'rgba(255,255,255,0.05)', color: filterMonth ? C.warning : C.textDim, fontSize:13, fontWeight:700, outline:'none', cursor:'pointer' }} />
          </div>
        </GlassCard>
      )}

      {/* ─── Pending Section ─── */}
      {pendingDays.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <SectionLabel color={C.warning} action={`${pendingDays.length} طلب`}>⏳ بانتظار موافقتك</SectionLabel>
          {pendingDays.map(wd => {
            const emp     = employees.find(x => x.id === wd.employee_id)
            const proj    = projects.find(x => x.id === wd.project_id)
            const busy    = approving === wd.id
            const holiday = holidayDates.has(String(wd.date).slice(0,10)) ? holidays.find(h => String(h.date).slice(0,10) === String(wd.date).slice(0,10)) : null
            return (
              <div key={wd.id} style={{ borderRadius:20, marginBottom:12, overflow:'hidden', background:C.surface, boxShadow:`0 0 0 1px ${C.warning}33, 0 8px 32px ${C.warning}18` }}>
                <div style={{ height:3, background:GRAD.warm }} />
                <div style={{ padding:'16px 18px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:6 }}>{emp?.name || '؟'}</div>
                      <div style={{ fontSize:12, color:C.textDim, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span>{fmtDateFull(wd.date)}</span>
                        <span style={{ opacity:0.3 }}>•</span>
                        <span>{proj?.name || '؟'}</span>
                        <span style={{ opacity:0.3 }}>•</span>
                        <span style={{ background:`${C.warning}22`, color:C.warning, padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:700, border:`1px solid ${C.warning}44` }}>{wd.day_type}</span>
                        {holiday && <span style={{ background:`${C.orange}22`, color:C.orange, padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:700, border:`1px solid ${C.orange}44` }}>🎉 {holiday.name}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:900, color:C.warning, fontFamily:'monospace', flexShrink:0, marginRight:8 }}>{fmt(wd.amount)}₪</div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => handleApprove(wd.id)} disabled={busy}
                      style={{ flex:1, padding:'12px 0', borderRadius:14, background: busy ? C.border : GRAD.success, border:'none', color: busy ? C.textDim : '#fff', fontSize:14, fontWeight:800, cursor: busy ? 'default' : 'pointer', boxShadow: busy ? 'none' : `0 4px 18px ${C.success}44`, transition:'all .2s' }}>
                      {busy ? '...' : '✓ موافقة'}
                    </button>
                    <button onClick={() => { setRejectTarget(wd.id); setRejectReason('') }} disabled={busy}
                      style={{ flex:1, padding:'12px 0', borderRadius:14, background: busy ? 'transparent' : `${C.accent}12`, border:`1.5px solid ${busy ? C.border : C.accent + '55'}`, color: busy ? C.textDim : C.accent, fontSize:14, fontWeight:800, cursor: busy ? 'default' : 'pointer', transition:'all .2s' }}>
                      {busy ? '...' : '✗ رفض'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Approved Days (grouped by month) ─── */}
      {sorted.length === 0 && pendingDays.length === 0
        ? <EmptyState icon="📅" text="ما في أيام عمل مسجلة" action="+ سجّل أول يوم" onAction={openForm} />
        : (() => {
            if (sorted.length === 0) return (
              <>
                {pendingDays.length > 0 && <SectionLabel color={C.primary}>الأيام الموافق عليها</SectionLabel>}
                <div style={{ textAlign:'center', padding:'32px 0', color:C.textDim, fontSize:13 }}>ما في نتائج للفلتر الحالي</div>
              </>
            )

            // group by month
            const byMonth = {}
            sorted.forEach(wd => {
              const m = (wd.date || '').slice(0, 7)
              if (!byMonth[m]) byMonth[m] = []
              byMonth[m].push(wd)
            })
            const monthEntries = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a))
            const currentMonth = new Date().toISOString().slice(0, 7)

            return (
              <>
                {pendingDays.length > 0 && <SectionLabel color={C.primary}>الأيام الموافق عليها</SectionLabel>}
                {bulkSelectMode && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'10px 14px', background:`${C.primary}10`, borderRadius:12, border:`1px solid ${C.primary}33` }}>
                    <span style={{ fontSize:12, color:C.primary, fontWeight:700 }}>☑ وضع التحديد — اضغط على الأيام لتحديدها</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setSelectedDayIds(new Set(sorted.map(d => d.id)))}
                        style={{ fontSize:11, fontWeight:700, color:C.primary, background:`${C.primary}18`, border:`1px solid ${C.primary}44`, borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>
                        الكل
                      </button>
                      {selectedDayIds.size > 0 && (
                        <button onClick={() => setSelectedDayIds(new Set())}
                          style={{ fontSize:11, fontWeight:700, color:C.textDim, background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>
                          إلغاء الكل
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {hasFilter && (
                  <div style={{ fontSize:12, color:C.textDim, marginBottom:12, padding:'8px 14px', background:`${C.secondary}10`, borderRadius:10, border:`1px solid ${C.secondary}22` }}>
                    عرض {sorted.length} من {approvedDays.length} يوم
                  </div>
                )}
                {monthEntries.map(([month, days]) => {
                  const workDaysOnly  = days.filter(d => d.day_type !== 'عطلة')
                  const holidayDays   = days.filter(d => d.day_type === 'عطلة')
                  const totalAmt  = days.reduce((s, d) => s + (d.amount || 0), 0)
                  const isOpen    = openMonths.has(month)
                  const isCurrent = month === currentMonth
                  const [y, m]    = month.split('-')
                  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
                  const monthLabel = `${MONTHS_AR[parseInt(m,10)-1]} ${y}`

                  return (
                    <div key={month} style={{ marginBottom:10 }}>
                      {/* Month header */}
                      <button
                        onClick={() => setOpenMonths(prev => {
                          const next = new Set(prev)
                          next.has(month) ? next.delete(month) : next.add(month)
                          return next
                        })}
                        style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderRadius: isOpen ? '16px 16px 0 0' : 16, background: isCurrent ? `${C.primary}12` : 'rgba(255,255,255,0.05)', border:`1.5px solid ${isCurrent ? C.primary + '44' : C.border}`, cursor:'pointer', transition:'all .2s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:15, fontWeight:800, color: isCurrent ? C.primary : C.text }}>{monthLabel}</span>
                          <span style={{ fontSize:11, color:C.textDim, background:'rgba(255,255,255,0.06)', padding:'2px 10px', borderRadius:20, fontWeight:600 }}>
                            {workDaysOnly.length} يوم{holidayDays.length > 0 ? ` · 🎉 ${holidayDays.length} عطلة` : ''}
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:16, fontWeight:900, color: isCurrent ? C.primary : C.success, fontFamily:'monospace' }}>{fmt(totalAmt)}₪</span>
                          <span style={{ fontSize:12, color:C.textDim, transition:'transform .2s', display:'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                        </div>
                      </button>

                      {/* Workers inside month */}
                      {isOpen && (() => {
                        const byWorker = {}
                        days.forEach(wd => {
                          const empId = wd.employee_id
                          if (!byWorker[empId]) byWorker[empId] = []
                          byWorker[empId].push(wd)
                        })
                        const workerEntries = Object.entries(byWorker)
                          .map(([empId, wdays]) => {
                            const emp = employees.find(e => e.id === empId)
                            return { empId, emp, wdays, total: wdays.reduce((s,d) => s+(d.amount||0),0) }
                          })
                          .sort((a,b) => b.total - a.total)

                        return (
                          <div style={{ border:`1.5px solid ${isCurrent ? C.primary + '33' : C.border}`, borderTop:'none', borderRadius:'0 0 16px 16px', overflow:'hidden' }}>
                            {workerEntries.map(({ empId, emp, wdays, total }, wi) => {
                              const workerKey  = `${month}-${empId}`
                              const workerOpen = openWorkers.has(workerKey)
                              const toggleWorker = () => setOpenWorkers(prev => {
                                const next = new Set(prev)
                                next.has(workerKey) ? next.delete(workerKey) : next.add(workerKey)
                                return next
                              })
                              return (
                                <div key={empId} style={{ borderBottom: wi < workerEntries.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                  {/* Worker row */}
                                  <button onClick={toggleWorker}
                                    style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', background: workerOpen ? 'rgba(255,255,255,0.05)' : 'transparent', border:'none', cursor:'pointer' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                      <div style={{ width:32, height:32, borderRadius:10, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#000', flexShrink:0 }}>
                                        {emp?.name?.[0] || '؟'}
                                      </div>
                                      <div style={{ textAlign:'right' }}>
                                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{emp?.name || '؟'}</div>
                                        <div style={{ fontSize:10, color:C.textDim, marginTop:1 }}>
                                          {wdays.filter(d => d.day_type !== 'عطلة').length} يوم{wdays.filter(d => d.day_type === 'عطلة').length > 0 ? ` · 🎉 ${wdays.filter(d => d.day_type === 'عطلة').length} عطلة` : ''}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                      <span style={{ fontSize:14, fontWeight:900, color:C.success, fontFamily:'monospace' }}>{fmt(total)}₪</span>
                                      <span style={{ fontSize:10, color:C.textDim, transition:'transform .2s', display:'inline-block', transform: workerOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                                    </div>
                                  </button>

                                  {/* Day rows */}
                                  {workerOpen && wdays.sort((a,b) => (b.date||'').localeCompare(a.date||'')).map((wd, idx) => {
                                    const proj      = projects.find(x => x.id === wd.project_id)
                                    const dayNum    = (wd.date || '').slice(8, 10)
                                    const pillColor = DAY_TYPE_COLOR[wd.day_type] || C.primary
                                    const holiday   = holidayDates.has(String(wd.date).slice(0,10)) ? holidays.find(h => String(h.date).slice(0,10) === String(wd.date).slice(0,10)) : null
                                    const isSel = bulkSelectMode && selectedDayIds.has(wd.id)
                                    return (
                                      <div key={wd.id}
                                        onClick={bulkSelectMode ? () => toggleDaySelect(wd.id) : undefined}
                                        style={{ padding:'10px 16px 10px 58px', display:'flex', justifyContent:'space-between', alignItems:'center', background: isSel ? `${C.primary}12` : holiday ? `${C.warning}08` : idx%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderTop:`1px solid ${C.border}`, cursor: bulkSelectMode ? 'pointer' : 'default', transition:'background .15s' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                          <div style={{ minWidth:36, height:40, borderRadius:10, background: isSel ? `${C.primary}25` : `${pillColor}15`, border:`1px solid ${isSel ? C.primary : pillColor}30`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, flexShrink:0 }}>
                                            <div style={{ fontSize:14, fontWeight:900, color: isSel ? C.primary : pillColor }}>{dayNum}</div>
                                            <div style={{ fontSize:8, color: isSel ? C.primary : pillColor, opacity:0.8 }}>{DAY_ICONS[wd.day_type]||'📅'}</div>
                                          </div>
                                          <div>
                                            <div style={{ fontSize:12, color:C.textDim }}>{fmtDateFull(wd.date)}</div>
                                            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' }}>
                                              <span style={{ fontSize:11, color:C.textDim }}>{proj?.name||'؟'}</span>
                                              {wd.location && <span style={{ fontSize:10, color:C.primary, background:`${C.primary}15`, padding:'1px 6px', borderRadius:5 }}>📍 {wd.location}</span>}
                                              <span style={{ fontSize:10, fontWeight:700, color:pillColor, background:`${pillColor}15`, padding:'1px 7px', borderRadius:6 }}>{wd.day_type}</span>
                                              {holiday && <span style={{ fontSize:10, fontWeight:700, color:C.warning, background:`${C.warning}18`, padding:'1px 7px', borderRadius:6, border:`1px solid ${C.warning}33` }}>🎉 {holiday.name}</span>}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                          <span style={{ fontSize:14, fontWeight:900, color: isSel ? C.primary : C.accent, fontFamily:'monospace' }}>{fmt(wd.amount)}₪</span>
                                          {bulkSelectMode ? (
                                            <div style={{ width:26, height:26, borderRadius:8, border:`2px solid ${isSel ? C.primary : C.border}`, background: isSel ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#000', flexShrink:0, transition:'all .15s' }}>
                                              {isSel && '✓'}
                                            </div>
                                          ) : (
                                            <>
                                              <button onClick={() => openEditDay(wd)} style={{ width:30, height:30, borderRadius:8, background:`${C.secondary}15`, border:`1px solid ${C.secondary}30`, color:C.secondary, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                                              <button onClick={() => setConfirmDel(wd.id)} style={{ width:30, height:30, borderRadius:8, background:`${C.accent}15`, border:`1px solid ${C.accent}30`, color:C.accent, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑️</button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </>
            )
          })()
      }

      {/* ─── Add Modal ─── */}
      <Modal open={showForm} onClose={closeForm} title={editingDay ? '✏️ تعديل يوم عمل' : 'تسجيل يوم عمل'}>
        {activeEmps.length === 0 || activeProjs.length === 0
          ? <div style={{ textAlign:'center', padding:32 }}>
              <div style={{ fontSize:44, marginBottom:14 }}>⚠️</div>
              <div style={{ fontSize:14, color:C.textDim, lineHeight:1.8 }}>لازم تضيف عمال ومشاريع أول!</div>
            </div>
          : <>
              {/* Toggles — hidden in edit mode */}
              {!editingDay && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
                  {/* Multi-worker toggle */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${multiMode ? C.secondary + '55' : C.border}` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: multiMode ? C.secondary : C.text }}>👥 عدة عمال</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>نفس المشروع لأكثر من عامل</div>
                    </div>
                    <button onClick={() => { setMultiMode(v => !v); setMultiEmps(new Set()); setForm(prev => ({ ...prev, employee_id: '' })) }}
                      style={{ width:48, height:26, borderRadius:13, background: multiMode ? C.secondary : C.border, border:'none', cursor:'pointer', position:'relative', transition:'all .25s', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left: multiMode ? 25 : 3, width:20, height:20, borderRadius:10, background:'#fff', transition:'all .25s', boxShadow:'0 2px 6px rgba(0,0,0,0.4)' }} />
                    </button>
                  </div>
                  {/* Date range toggle */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${rangeMode ? C.primary + '55' : C.border}` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: rangeMode ? C.primary : C.text }}>📅 نطاق تواريخ</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>من تاريخ إلى تاريخ دفعة واحدة</div>
                    </div>
                    <button onClick={() => setRangeMode(v => !v)}
                      style={{ width:48, height:26, borderRadius:13, background: rangeMode ? C.primary : C.border, border:'none', cursor:'pointer', position:'relative', transition:'all .25s', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left: rangeMode ? 25 : 3, width:20, height:20, borderRadius:10, background:'#fff', transition:'all .25s', boxShadow:'0 2px 6px rgba(0,0,0,0.4)' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Date inputs */}
              {rangeMode && !editingDay ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>من تاريخ</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      style={{ width:'100%', padding:'11px 12px', borderRadius:12, border:`1.5px solid ${C.primary}55`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>إلى تاريخ</label>
                    <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
                      style={{ width:'100%', padding:'11px 12px', borderRadius:12, border:`1.5px solid ${C.primary}55`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                  </div>
                </div>
              ) : (
                <Input label="التاريخ" value={form.date} onChange={f('date')} type="date" required />
              )}

              {/* Holiday indicator */}
              {(() => {
                const holiday = (holidays || []).find(h => String(h.date).slice(0, 10) === form.date)
                if (!holiday) return null
                return (
                  <div style={{ marginBottom:18, padding:'12px 16px', borderRadius:12, background:`${C.warning}18`, border:`1.5px solid ${C.warning}55`, display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:26 }}>🎉</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:C.warning }}>{holiday.name}</div>
                      <div style={{ fontSize:11, color:C.textDim }}>يوم عطلة رسمية</div>
                    </div>
                  </div>
                )
              })()}

              {/* Employee selector */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  {multiMode ? 'العمال (اختر أكثر من واحد)' : 'العامل'} <span style={{ color:C.accent }}>*</span>
                </label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {activeEmps.map(e => {
                    const sel = multiMode ? multiEmps.has(e.id) : form.employee_id === e.id
                    const color = multiMode ? C.secondary : C.primary
                    return (
                      <button key={e.id} onClick={() => multiMode ? toggleMultiEmp(e.id) : setForm(prev => ({ ...prev, employee_id: e.id }))}
                        style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.04)', color: sel ? color : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${color}33` : 'none' }}>
                        {multiMode && <span style={{ marginLeft:6 }}>{sel ? '☑' : '☐'}</span>}
                        {e.name}
                        <span style={{ fontSize:10, marginRight:5, opacity:0.7 }}>({e.daily_rate}₪)</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Project selector — مخفي لأيام العطلة بدون شغل */}
              {!(form.day_type === 'عطلة' && !holidayWorked) && <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>المشروع <span style={{ color:C.accent }}>*</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {activeProjs.map(p => {
                    const sel = form.project_id === p.id
                    return (
                      <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id, location: '' }))}
                        style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? C.secondary : C.border}`, background: sel ? `${C.secondary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.secondary : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${C.secondary}33` : 'none' }}>
                        {p.name}
                        {p.type === 'يومي' && (p.locations || []).length > 0 && <span style={{ fontSize:10, marginRight:4, opacity:0.7 }}>📍</span>}
                      </button>
                    )
                  })}
                </div>
              </div>}

              {/* Location picker — يومي projects only */}
              {(() => {
                const selProj = form.project_id ? projects.find(p => p.id === form.project_id) : null
                const locs = selProj?.locations || []
                if (selProj?.type !== 'يومي' || locs.length === 0) return null
                return (
                  <div style={{ marginBottom:18 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>📍 مكان العمل</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {locs.map(loc => {
                        const sel = form.location === loc
                        return (
                          <button key={loc} onClick={() => setForm(prev => ({ ...prev, location: sel ? '' : loc }))}
                            style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? C.primary : C.border}`, background: sel ? `${C.primary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.primary : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${C.primary}33` : 'none' }}>
                            📍 {loc}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Day type */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>نوع اليوم</label>
                <div style={{ display:'flex', gap:10 }}>
                  {DAY_TYPES.map(t => {
                    const sel   = form.day_type === t
                    const color = DAY_TYPE_COLOR[t] || C.primary
                    return (
                      <button key={t} onClick={() => setDayType(t)}
                        style={{ flex:1, padding:'14px 8px', borderRadius:16, border:`2px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', backdropFilter:'blur(10px)', color: sel ? color : C.textDim, fontSize:13, fontWeight:800, cursor:'pointer', transition:'all .25s', boxShadow: sel ? `0 6px 22px ${color}33` : 'none', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:22 }}>{DAY_ICONS[t]}</span>
                        <span>{t}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {(form.day_type === 'ساعات' || (form.day_type === 'عطلة' && holidayWorked && holidaySubType === 'ساعات')) && (
                <Input label="عدد الساعات" value={form.hours} onChange={f('hours')} type="number" min="0.5" max="24" />
              )}

              {form.day_type === 'عطلة' && (
                <div style={{ marginBottom:18 }}>
                  {/* خيار: اشتغل أو ما اشتغل */}
                  <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>العامل بالعيد</label>
                  <div style={{ display:'flex', gap:10, marginBottom: holidayWorked ? 14 : 0 }}>
                    {[{ v:false, label:'ما اشتغل', icon:'😴', desc:'0₪' }, { v:true, label:'اشتغل', icon:'💪', desc:'يُحسب المبلغ' }].map(opt => (
                      <button key={String(opt.v)} onClick={() => setHolidayWorked(opt.v)}
                        style={{ flex:1, padding:'14px 8px', borderRadius:14, border:`2px solid ${holidayWorked === opt.v ? C.warning : C.border}`, background: holidayWorked === opt.v ? `${C.warning}18` : 'rgba(255,255,255,0.03)', color: holidayWorked === opt.v ? C.warning : C.textDim, cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:22 }}>{opt.icon}</span>
                        <span style={{ fontSize:13, fontWeight:800 }}>{opt.label}</span>
                        <span style={{ fontSize:10, opacity:0.7 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* sub-selector للنوع لما اشتغل */}
                  {holidayWorked && (
                    <>
                      <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>نوع اليوم</label>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {['كامل','نص يوم','ساعات','مبلغ مسكر'].map(t => {
                          const sel = holidaySubType === t
                          const color = DAY_TYPE_COLOR[t] || C.primary
                          return (
                            <button key={t} onClick={() => { setHolidaySubType(t); setForm(prev => ({ ...prev, hours: t==='كامل'?'8':t==='نص يوم'?'4':prev.hours })) }}
                              style={{ flex:1, padding:'12px 6px', borderRadius:14, border:`2px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', color: sel ? color : C.textDim, fontSize:12, fontWeight:800, cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                              <span style={{ fontSize:18 }}>{DAY_ICONS[t]}</span>
                              <span>{t}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {(form.day_type === 'مبلغ مسكر' || (form.day_type === 'عطلة' && holidayWorked && holidaySubType === 'مبلغ مسكر')) && (
                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>المبلغ المسكر (₪) *</label>
                  <input type="number" value={form.customAmount} min="1" step="1" placeholder="0"
                    onChange={e => setForm(prev => ({ ...prev, customAmount: e.target.value }))}
                    style={{ width:'100%', padding:'14px 16px', borderRadius:14, border:`1.5px solid ${C.orange}77`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:22, fontWeight:900, boxSizing:'border-box', outline:'none', fontFamily:'monospace' }} />
                </div>
              )}

              {/* Preview */}
              {multiMode ? (
                multiEmps.size > 0 && form.project_id && (
                  <div style={{ padding:'16px 18px', borderRadius:16, marginBottom:18, background:`${C.secondary}0d`, border:`1.5px solid ${C.secondary}33` }}>
                    <div style={{ fontSize:11, color:C.textDim, marginBottom:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>المعاينة</div>
                    {multiPreviews.map(x => (
                      <div key={x.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, marginBottom:8, borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{x.name}</span>
                        <span style={{ fontSize:15, fontWeight:900, color:C.secondary, fontFamily:'monospace' }}>{fmt(x.amount)}₪</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                      <span style={{ fontSize:12, color:C.textDim, fontWeight:700 }}>المجموع ({multiEmps.size} عمال)</span>
                      <span style={{ fontSize:18, fontWeight:900, color:C.primary, fontFamily:'monospace' }}>{fmt(multiTotal)}₪</span>
                    </div>
                  </div>
                )
              ) : (
                selectedEmp && (
                  <div style={{ padding:'16px 20px', borderRadius:16, marginBottom:18, background:`${C.primary}0d`, border:`1.5px solid ${C.primary}33`, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:`0 4px 20px ${C.primary}18` }}>
                    <div>
                      <div style={{ fontSize:11, color:C.textDim, marginBottom:3 }}>المبلغ المحسوب</div>
                      <div style={{ fontSize:12, color:C.textDim }}>{selectedEmp.name} × {form.day_type}</div>
                    </div>
                    <div style={{ fontSize:26, fontWeight:900, color:C.primary, fontFamily:'monospace', letterSpacing:'-1px' }}>{fmt(singlePreview)}₪</div>
                  </div>
                )
              )}

              {/* Range mode summary */}
              {rangeMode && !editingDay && dateFrom && dateTo && dateTo >= dateFrom && (
                (() => {
                  const workers = multiMode ? [...multiEmps] : (form.employee_id ? [form.employee_id] : [])
                  const days = getDatesInRange(dateFrom, dateTo).length
                  const total = workers.length * days
                  if (total === 0) return null
                  return (
                    <div style={{ padding:'14px 16px', borderRadius:14, marginBottom:16, background:`${C.primary}0d`, border:`1.5px solid ${C.primary}33` }}>
                      <div style={{ fontSize:11, color:C.textDim, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>ملخص التسجيل</div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, color:C.text }}>📅 <b style={{ color:C.primary }}>{days}</b> يوم</span>
                        <span style={{ fontSize:13, color:C.text }}>👷 <b style={{ color:C.secondary }}>{workers.length}</b> عامل</span>
                        <span style={{ fontSize:13, color:C.text }}>📋 <b style={{ color:C.success }}>{total}</b> سجل سيُنشأ</span>
                      </div>
                      <div style={{ fontSize:10, color:C.textDim, marginTop:6 }}>السجلات المكررة ستُتجاهل تلقائياً</div>
                    </div>
                  )
                })()
              )}

              {formError && (
                <div style={{ fontSize:12, color:C.accent, marginBottom:16, padding:'12px 16px', borderRadius:12, background:`${C.accent}10`, border:`1px solid ${C.accent}33` }}>⚠ {formError}</div>
              )}

              <Btn onClick={save} full disabled={saving || (!rangeMode && !multiMode && (!form.employee_id || (!form.project_id && form.day_type !== 'عطلة'))) || (!rangeMode && multiMode && (multiEmps.size === 0 || (!form.project_id && form.day_type !== 'عطلة'))) || (rangeMode && !form.project_id && form.day_type !== 'عطلة')}>
                {saving ? 'جاري الحفظ...' : rangeMode
                  ? `✓ سجّل ${(multiMode ? multiEmps.size : (form.employee_id ? 1 : 0)) * (dateFrom && dateTo && dateTo >= dateFrom ? getDatesInRange(dateFrom, dateTo).length : 0)} سجل`
                  : multiMode ? `✓ سجّل لـ ${multiEmps.size || '...'} عمال` : '✓ سجّل اليوم'}
              </Btn>
            </>
        }
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteWorkDay(confirmDel); setConfirmDel(null) }} message="حذف هذا اليوم؟" />

      {/* ─── Reject with reason modal ─── */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason('') }} title="✗ رفض يوم العمل">
        <div style={{ fontSize:13, color:C.textDim, marginBottom:14 }}>سيصل سبب الرفض للعامل في بوابته</div>
        <Input label="سبب الرفض (اختياري)" value={rejectReason} onChange={v => setRejectReason(v)} />
        <Btn onClick={confirmReject} full style={{ background:`${C.accent}cc`, marginTop:4 }}>✗ تأكيد الرفض</Btn>
      </Modal>

      {/* ─── Worker detail panel ─── */}
      {workerDetail && (() => {
        const emp = employees.find(e => e.id === workerDetail)
        if (!emp) return null
        const empDays = workDays.filter(wd => wd.employee_id === workerDetail && wd.status === 'approved')
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        const totalAmt  = empDays.reduce((s, d) => s + (d.amount || 0), 0)
        const totalDays = empDays.length

        const byMonth = {}
        empDays.forEach(d => {
          const m = (d.date || '').slice(0, 7)
          if (!byMonth[m]) byMonth[m] = { days: 0, amount: 0 }
          byMonth[m].days++
          byMonth[m].amount += d.amount || 0
        })
        const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a))

        return (
          <div style={{ position:'fixed', inset:0, zIndex:9900, display:'flex', alignItems:'flex-end', justifyContent:'center', direction:'rtl' }}
            onClick={e => { if (e.target === e.currentTarget) setWorkerDetail(null) }}>
            <div onClick={() => setWorkerDetail(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)' }} />
            <div className="slide-up" style={{ position:'relative', width:'100%', maxWidth:430, background:C.bg, borderRadius:'20px 20px 0 0', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 -16px 60px rgba(0,0,0,0.7)', border:`1px solid ${C.border}`, borderBottom:'none' }}>

              {/* Header */}
              <div style={{ padding:'16px 18px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:900, color:C.text }}>📊 {emp.name}</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>
                    {totalDays} يوم عمل • {fmt(totalAmt)}₪ إجمالي
                  </div>
                </div>
                <button onClick={() => setWorkerDetail(null)} style={{ width:30, height:30, borderRadius:'50%', background:C.border, border:'none', cursor:'pointer', fontSize:14, color:C.text }}>✕</button>
              </div>

              <div style={{ overflowY:'auto', flex:1, padding:'14px 16px 30px' }}>

                {/* Summary stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                  {[
                    { label:'أيام معتمدة', value: totalDays, color: C.primary },
                    { label:'إجمالي مكتسب', value: fmt(totalAmt)+'₪', color: C.success },
                    { label:'معدل اليوم', value: fmt(emp.daily_rate)+'₪', color: C.warning },
                  ].map((s, i) => (
                    <div key={i} style={{ padding:'12px 10px', background:`${s.color}10`, border:`1px solid ${s.color}25`, borderRadius:14, textAlign:'center' }}>
                      <div style={{ fontSize:15, fontWeight:900, color:s.color, fontFamily:'monospace' }}>{s.value}</div>
                      <div style={{ fontSize:9, color:C.textDim, marginTop:3, fontWeight:600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Monthly breakdown */}
                {months.length > 0 && (
                  <>
                    <div style={{ fontSize:12, fontWeight:800, color:C.textDim, marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>ملخص شهري</div>
                    {months.map(([m, stat]) => (
                      <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:12, marginBottom:6 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{m}</div>
                        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:C.textDim }}>{stat.days} يوم</span>
                          <span style={{ fontSize:13, fontWeight:800, color:C.success, fontFamily:'monospace' }}>{fmt(stat.amount)}₪</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Recent days */}
                {empDays.length > 0 && (
                  <>
                    <div style={{ fontSize:12, fontWeight:800, color:C.textDim, margin:'16px 0 10px', letterSpacing:'0.04em', textTransform:'uppercase' }}>آخر الأيام</div>
                    {empDays.slice(0, 30).map(d => {
                      const proj = projects.find(p => p.id === d.project_id)
                      const tc = DAY_TYPE_COLOR[d.day_type] || C.primary
                      return (
                        <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:12, marginBottom:5 }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{fmtDateFull(d.date)}</div>
                            <div style={{ fontSize:11, color:C.textDim }}>{proj?.name || '؟'} • <span style={{ color:tc }}>{d.day_type}</span></div>
                          </div>
                          <span style={{ fontSize:13, fontWeight:800, color:tc, fontFamily:'monospace' }}>{fmt(d.amount)}₪</span>
                        </div>
                      )
                    })}
                  </>
                )}

                {empDays.length === 0 && (
                  <div style={{ textAlign:'center', padding:'32px 0', color:C.textDim, fontSize:13 }}>ما في أيام مسجلة لهذا العامل</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ─── Bulk Select Floating Bar ─── */}
      {bulkSelectMode && (
        <div style={{ position:'fixed', bottom:100, left:0, right:0, margin:'0 auto', width:'calc(100% - 32px)', maxWidth:398, background:C.surface, borderRadius:20, border:`1.5px solid ${selectedDayIds.size > 0 ? C.primary + '66' : C.border}`, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:60, boxShadow:`0 8px 32px rgba(0,0,0,0.5)`, transition:'border-color .2s' }}>
          <div style={{ fontSize:13, fontWeight:700, color: selectedDayIds.size > 0 ? C.primary : C.textDim }}>
            {selectedDayIds.size > 0 ? `${selectedDayIds.size} يوم محدد` : 'اضغط على أيام للتحديد'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {selectedDayIds.size > 0 && (
              <button onClick={() => setShowBulkProj(true)}
                style={{ padding:'10px 16px', borderRadius:12, background:GRAD.brand, border:'none', color:'#000', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                🗂 تعديل المشروع
              </button>
            )}
            <button onClick={exitBulkMode}
              style={{ padding:'10px 14px', borderRadius:12, background:'transparent', border:`1px solid ${C.border}`, color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ─── Bulk Project Picker ─── */}
      {showBulkProj && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowBulkProj(false); setBulkProjId(''); setBulkError('') } }}>
          <div className="slide-up" style={{ width:'100%', maxWidth:480, background:C.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 32px', border:`1px solid ${C.borderMid}`, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:C.text }}>🗂 تعديل المشروع</div>
                <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>تطبيق على {selectedDayIds.size} يوم محدد</div>
              </div>
              <button onClick={() => { setShowBulkProj(false); setBulkProjId(''); setBulkError('') }}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, color:C.textDim, fontSize:16, cursor:'pointer', padding:'4px 10px' }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              {projects.map(p => {
                const sel = bulkProjId === p.id
                return (
                  <button key={p.id} onClick={() => setBulkProjId(p.id)}
                    style={{ padding:'14px 16px', borderRadius:14, textAlign:'right', border:`1.5px solid ${sel ? C.primary : C.border}`, background: sel ? `${C.primary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.primary : C.text, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .15s' }}>
                    <span>{p.name}</span>
                    {sel && <span style={{ fontSize:16, color:C.primary }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {bulkError && (
              <div style={{ fontSize:11, color:C.accent, marginBottom:12, padding:'8px 12px', background:`${C.accent}12`, borderRadius:9 }}>
                ⚠ {bulkError}
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={applyBulkProject} disabled={!bulkProjId || bulkSaving}
                style={{ flex:1, padding:'14px', borderRadius:14, background: !bulkProjId || bulkSaving ? C.border : GRAD.brand, border:'none', color: !bulkProjId || bulkSaving ? C.textDim : '#000', fontSize:14, fontWeight:800, cursor: !bulkProjId || bulkSaving ? 'default' : 'pointer', transition:'all .2s' }}>
                {bulkSaving ? '⏳ جاري الحفظ...' : '✓ تطبيق'}
              </button>
              <button onClick={() => { setShowBulkProj(false); setBulkProjId(''); setBulkError('') }}
                style={{ padding:'14px 20px', borderRadius:14, background:'transparent', border:`1px solid ${C.border}`, color:C.textDim, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
