import React, { useState } from 'react'
import { CalendarDays, BarChart2, Search, ClipboardList, Clock, Gift, Pencil, Trash2, AlertTriangle, Users, MapPin, X, CheckSquare, Square, Sun, CloudSun, DollarSign, Star, Zap, BedDouble, HardHat, Check, ChevronDown, Plus, CheckCircle2, XCircle, FolderInput, Loader2, Building2 } from 'lucide-react'
import { C, GRAD, DAY_TYPES } from '../constants/index.js'
import { fmt, fmtDate, fmtDateFull, todayStr, calcSalary, validateWorkDay } from '../lib/helpers.js'
import { tl, tEnum } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'
import { GlassCard, Modal, Input, Btn, Badge, SectionLabel, EmptyState, ConfirmDialog } from '../components/index.jsx'
import { PremiumCard, IconChip } from '../ui/Premium.jsx'
import WorkDayTicket from '../components/WorkDayTicket.jsx'
import WorkMonthHeader from '../components/WorkMonthHeader.jsx'
import WorkerMonthStrip from '../components/WorkerMonthStrip.jsx'

const DAY_TYPE_COLOR = { 'كامل': C.primary, 'نص يوم': C.warning, 'ساعات': C.blue, 'مبلغ مسكر': C.orange, 'عطلة': C.textDim }
const DAY_ICONS = { 'كامل': Sun, 'نص يوم': CloudSun, 'ساعات': Clock, 'مبلغ مسكر': DollarSign, 'عطلة': Star }
function DayIcon({ type, size = 18 }) {
  const Icon = DAY_ICONS[type]
  return Icon ? <Icon size={size} strokeWidth={1.8} /> : null
}

// ─── شريحة وسم صغيرة (مكان / نوع يوم / عطلة) ──────────────────────────────────
function MetaTag({ icon: Icon, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 7, border: `1px solid ${color}28` }}>
      {Icon && <Icon size={10} color={color} strokeWidth={2.3} />}
      {label}
    </span>
  )
}

export default function WorkDaysScreen({ workDays, employees, projects, addWorkDay, bulkAddWorkDays, updateWorkDay, bulkUpdateWorkDays, deleteWorkDay, approveWorkDay, rejectWorkDay, holidays = [] }) {
  const language = useAppStore(s => s.language)
  const holidayDates = new Set((holidays || []).map(h => String(h.date).slice(0, 10)))
  const [showForm,    setShowForm]    = useState(false)
  const [editingDay,  setEditingDay]  = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [formError,   setFormError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [approving,   setApproving]   = useState(null)
  const [multiMode,   setMultiMode]   = useState(false)
  const [rangeMode,   setRangeMode]   = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false) // طيّ مفاتيح «عدة عمال/نطاق» — الافتراضي يوم مفرد بسيط (تقليل حِمل أول نظرة)
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

  const emptyForm = { date: todayStr(), employee_id: '', project_id: '', location: '', day_type: 'كامل', hours: '8', customAmount: '' }
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
      if (workers.length === 0) return setFormError(tl(language, 'اختر عامل واحد على الأقل', 'בחר עובד אחד לפחות', 'Select at least one worker'))
      if (!form.project_id && !isHolidayOff) return setFormError(tl(language, 'اختر المشروع', 'בחר פרויקט', 'Select a project'))
      if (!dateFrom || !dateTo) return setFormError(tl(language, 'حدد نطاق التاريخ', 'הגדר טווח תאריכים', 'Set the date range'))
      if (dateTo < dateFrom) return setFormError(tl(language, 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה', 'End date must be after start date'))
      if (effectiveType === 'مبلغ مسكر') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError(tl(language, 'أدخل المبلغ المسكر', 'הזן את הסכום הקבוע', 'Enter the fixed amount'))
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
      if (entries.length === 0) return setFormError(tl(language, 'كل السجلات موجودة مسبقاً — لا يوجد جديد للحفظ', 'כל הרשומות כבר קיימות — אין חדש לשמירה', 'All records already exist — nothing new to save'))
      setSaving(true)
      try {
        await bulkAddWorkDays(entries)
        closeForm()
      } catch (e) { setFormError(e.message) }
      finally { setSaving(false) }
      return
    }

    if (multiMode) {
      if (multiEmps.size === 0) return setFormError(tl(language, 'اختر عامل واحد على الأقل', 'בחר עובד אחד לפחות', 'Select at least one worker'))
      if (!form.project_id && !isHolidayOff) return setFormError(tl(language, 'اختر المشروع', 'בחר פרויקט', 'Select a project'))
      if (effectiveType === 'مبلغ مسكر') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError(tl(language, 'أدخل المبلغ المسكر', 'הזן את הסכום הקבוע', 'Enter the fixed amount'))
      }
      const dupName = [...multiEmps].map(id => {
        const dup = workDays.find(w => w.employee_id === id && String(w.date).slice(0,10) === form.date && w.day_type === form.day_type && w.id !== editingDay)
        return dup ? employees.find(e => e.id === id)?.name : null
      }).filter(Boolean)
      if (dupName.length > 0) return setFormError(tl(language, `${dupName.join('، ')} — عندهم ${tEnum(form.day_type, language)} بهاد التاريخ مسبقاً`, `${dupName.join(', ')} — כבר יש להם ${tEnum(form.day_type, language)} בתאריך זה`, `${dupName.join(', ')} — already have ${tEnum(form.day_type, language)} on this date`))
      setSaving(true)
      try {
        await Promise.all([...multiEmps].map(empId => {
          const emp = employees.find(e => e.id === empId)
          const amount = effectiveType === 'مبلغ مسكر'
            ? parseFloat(form.customAmount)
            : calcSalary(emp.daily_rate, effectiveType, form.hours)
          return addWorkDay({ date: form.date, employee_id: empId, project_id: form.project_id || null, location: form.location || undefined, day_type: effectiveType, hours: parseFloat(form.hours) || 8, amount })
        }))
        closeForm()
      } catch (e) { setFormError(e.message) }
      finally { setSaving(false) }
    } else {
      const err = validateWorkDay(form)
      if (err) return setFormError(err)
      if (effectiveType === 'مبلغ مسكر' && form.day_type === 'عطلة') {
        const a = parseFloat(form.customAmount)
        if (!a || a <= 0) return setFormError(tl(language, 'أدخل المبلغ المسكر', 'הזן את הסכום הקבוע', 'Enter the fixed amount'))
      }
      if (!selectedEmp) return setFormError(tl(language, 'العامل غير موجود', 'העובד לא נמצא', 'Worker not found'))
      const duplicate = workDays.find(w => w.employee_id === form.employee_id && String(w.date).slice(0,10) === form.date && w.day_type === form.day_type && w.id !== editingDay)
      if (duplicate) return setFormError(tl(language, `${selectedEmp.name} عنده ${tEnum(form.day_type, language)} بتاريخ ${form.date} مسبقاً`, `ל${selectedEmp.name} כבר יש ${tEnum(form.day_type, language)} בתאריך ${form.date}`, `${selectedEmp.name} already has ${tEnum(form.day_type, language)} on ${form.date}`))
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
    if (!bulkProjId) return setBulkError(tl(language, 'اختر مشروعاً', 'בחר פרויקט', 'Select a project'))
    setBulkSaving(true)
    setBulkError('')
    try {
      await bulkUpdateWorkDays([...selectedDayIds], { project_id: bulkProjId })
      exitBulkMode()
    } catch (e) { setBulkError(e.message) }
    finally { setBulkSaving(false) }
  }

  async function bulkApproveSelected() {
    if (!selectedDayIds.size) return
    setBulkSaving(true)
    try {
      await bulkUpdateWorkDays([...selectedDayIds], { status: 'approved' })
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
          <IconChip icon={CalendarDays} tone="brand" size={46} radius={14} iconSize={23} />
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:C.text, letterSpacing:'-0.5px' }}>{tl(language, 'أيام العمل', 'ימי עבודה', 'Work days')}</div>
            <div style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{workDays.length} {tl(language, 'يوم مسجل', 'ימים רשומים', 'days logged')}</div>
          </div>
          {pendingDays.length > 0 && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:`${C.warning}18`, borderRadius:24, padding:'5px 13px', fontSize:12, fontWeight:900, color:C.warning, border:`1px solid ${C.warning}40` }}>
              <Clock size={12} strokeWidth={2.5} /> {pendingDays.length} {tl(language, 'معلق', 'ממתין', 'pending')}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          {!bulkSelectMode && (
            <button onClick={openForm}
              style={{ padding:'9px 16px', borderRadius:12, border:'none', background:GRAD.brand, color:'#000', fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
              <Plus size={13} strokeWidth={2.5} /> {tl(language, 'سجّل يوم', 'רשום יום', 'Log day')}
            </button>
          )}
          {approvedDays.length > 0 && (
            <button onClick={() => bulkSelectMode ? exitBulkMode() : setBulkSelectMode(true)}
              style={{ padding:'9px 12px', borderRadius:12, border:`1.5px solid ${bulkSelectMode ? C.primary : C.border}`, background: bulkSelectMode ? `${C.primary}15` : 'rgba(255,255,255,0.04)', color: bulkSelectMode ? C.primary : C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <CheckSquare size={13} strokeWidth={2} /> {bulkSelectMode ? (selectedDayIds.size > 0 ? `${selectedDayIds.size} ${tl(language, 'محدد', 'נבחרו', 'selected')}` : tl(language, 'تحديد', 'בחירה', 'Select')) : tl(language, 'تحديد', 'בחירה', 'Select')}
            </button>
          )}
          {approvedDays.length > 0 && (
            <button onClick={() => setShowFilters(v => !v)}
              style={{ padding:'9px 12px', borderRadius:12, border:`1.5px solid ${hasFilter ? C.secondary : C.border}`, background: hasFilter ? `${C.secondary}15` : 'rgba(255,255,255,0.04)', color: hasFilter ? C.secondary : C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <Search size={13} strokeWidth={2} /> {hasFilter ? tl(language, 'فلتر نشط', 'סינון פעיל', 'Filter on') : tl(language, 'فلتر', 'סינון', 'Filter')}
            </button>
          )}
          {workDays.length > 0 && (
            <button onClick={async () => { const m = await import('../lib/export.js'); m.exportWorkDaysToExcel(workDays, employees, projects) }}
              style={{ padding:'9px 12px', borderRadius:12, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.05)', color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, backdropFilter:'blur(10px)' }}>
              <BarChart2 size={13} strokeWidth={2} /> Excel
            </button>
          )}
        </div>
      </div>

      {/* ─── Today's Attendance ─── */}
      {(() => {
        const today = todayStr()
        const todayDays = workDays.filter(wd => String(wd.date).slice(0, 10) === today)
        if (todayDays.length === 0 && employees.filter(e => e.status === 'نشط').length === 0) return null
        const presentIds = new Set(todayDays.map(wd => wd.employee_id))
        const activeEmpsToday = employees.filter(e => e.status === 'نشط')
        const approvedToday = todayDays.filter(wd => wd.status === 'approved').length
        const pendingToday  = todayDays.filter(wd => wd.status === 'pending').length
        const absentCount   = activeEmpsToday.filter(e => !presentIds.has(e.id)).length
        return (
          <PremiumCard tone="brand" glow={false} radius={14} padding="12px 14px" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.text, display:'flex', alignItems:'center', gap:7 }}><IconChip icon={ClipboardList} tone="brand" size={24} radius={8} iconSize={13} /> {tl(language, 'الحضور اليوم', 'נוכחות היום', 'Today\'s attendance')}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{new Date().toLocaleDateString(language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'ar-EG', { weekday:'long', day:'numeric', month:'long' })}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: todayDays.length > 0 ? 10 : 0 }}>
              {[
                { label: tl(language, 'موافق عليه', 'מאושר', 'Approved'), count: approvedToday, color: C.success },
                { label: tl(language, 'معلق',       'ממתין', 'Pending'),  count: pendingToday,  color: C.warning },
                { label: tl(language, 'غائب',       'נעדר',  'Absent'),   count: absentCount,   color: C.accent  },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: `${s.color}15`, border: `1px solid ${s.color}33` }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.count} {s.label}</span>
                </div>
              ))}
            </div>
            {todayDays.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {todayDays.slice(0, 8).map(wd => {
                  const emp = employees.find(e => e.id === wd.employee_id)
                  if (!emp) return null
                  const color = wd.status === 'approved' ? C.success : wd.status === 'pending' ? C.warning : C.textDim
                  return (
                    <span key={wd.id} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: `${color}18`, color, border: `1px solid ${color}33` }}>
                      {emp.name.split(' ')[0]}
                    </span>
                  )
                })}
                {todayDays.length > 8 && <span style={{ fontSize: 10, color: C.textDim, padding: '3px 6px' }}>+{todayDays.length - 8}</span>}
              </div>
            )}
          </PremiumCard>
        )
      })()}

      {/* ─── Filter Bar ─── */}
      {showFilters && (
        <GlassCard style={{ marginBottom:20, padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:12, fontWeight:800, color:C.secondary, display:'flex', alignItems:'center', gap:6 }}><Search size={13} strokeWidth={2} /> {tl(language, 'فلترة الأيام', 'סינון ימים', 'Filter days')}</span>
            {hasFilter && (
              <button onClick={() => { setFilterEmp(''); setFilterProj(''); setFilterMonth('') }}
                style={{ fontSize:11, color:C.accent, background:`${C.accent}15`, border:`1px solid ${C.accent}33`, borderRadius:8, padding:'4px 10px', cursor:'pointer', fontWeight:700, display:'inline-flex', alignItems:'center', gap:4 }}>
                <X size={12} strokeWidth={2.5} /> {tl(language, 'مسح الفلاتر', 'נקה סינון', 'Clear filters')}
              </button>
            )}
          </div>

          {/* Employee chips */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>{tl(language, 'العامل', 'עובד', 'Worker')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <button onClick={() => setFilterEmp('')}
                style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${!filterEmp ? C.primary : C.border}`, background: !filterEmp ? `${C.primary}18` : 'transparent', color: !filterEmp ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {tl(language, 'الكل', 'הכל', 'All')}
              </button>
              {employees.map(e => (
                <div key={e.id} style={{ display:'flex', gap:3 }}>
                  <button onClick={() => setFilterEmp(filterEmp === e.id ? '' : e.id)}
                    style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${filterEmp === e.id ? C.primary : C.border}`, background: filterEmp === e.id ? `${C.primary}18` : 'transparent', color: filterEmp === e.id ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {e.name}
                  </button>
                  <button onClick={() => setWorkerDetail(e.id)} title={tl(language, 'إحصائيات العامل', 'סטטיסטיקת עובד', 'Worker stats')}
                    style={{ padding:'6px 10px', borderRadius:10, border:`1px solid ${C.border}`, background:'transparent', color:C.textDim, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <BarChart2 size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Project chips */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>{tl(language, 'المشروع', 'פרויקט', 'Project')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <button onClick={() => setFilterProj('')}
                style={{ padding:'6px 14px', borderRadius:10, border:`1.5px solid ${!filterProj ? C.secondary : C.border}`, background: !filterProj ? `${C.secondary}18` : 'transparent', color: !filterProj ? C.secondary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                {tl(language, 'الكل', 'הכל', 'All')}
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
            <div style={{ fontSize:10, color:C.textDim, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>{tl(language, 'الشهر', 'חודש', 'Month')}</div>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${filterMonth ? C.warning : C.border}`, background:'rgba(255,255,255,0.05)', color: filterMonth ? C.warning : C.textDim, fontSize:13, fontWeight:700, outline:'none', cursor:'pointer' }} />
          </div>
        </GlassCard>
      )}

      {/* ─── Pending Section ─── */}
      {pendingDays.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <SectionLabel color={C.warning} action={`${pendingDays.length} ${tl(language, 'طلب', 'בקשות', 'requests')}`}><Clock size={13} strokeWidth={2} style={{ display:'inline', marginLeft:4 }} /> {tl(language, 'بانتظار موافقتك', 'ממתין לאישורך', 'Awaiting your approval')}</SectionLabel>
          {pendingDays.map(wd => {
            const emp     = employees.find(x => x.id === wd.employee_id)
            const proj    = projects.find(x => x.id === wd.project_id)
            const busy    = approving === wd.id
            const holiday = holidayDates.has(String(wd.date).slice(0,10)) ? holidays.find(h => String(h.date).slice(0,10) === String(wd.date).slice(0,10)) : null
            return (
              <div key={wd.id} style={{ marginBottom:12 }}>
                <WorkDayTicket
                  wd={wd}
                  lang={language}
                  name={emp?.name}
                  projectName={proj?.name}
                  holidayName={holiday?.name}
                  notchColor={C.bg}
                />
                <div style={{ display:'flex', gap:10, marginTop:8 }}>
                  <button onClick={() => handleApprove(wd.id)} disabled={busy}
                    style={{ flex:1, padding:'12px 0', borderRadius:14, background: busy ? C.border : GRAD.success, border:'none', color: busy ? C.textDim : '#fff', fontSize:14, fontWeight:800, cursor: busy ? 'default' : 'pointer', boxShadow: busy ? 'none' : `0 4px 18px ${C.success}44`, transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {busy ? '...' : <><CheckCircle2 size={16} strokeWidth={2.5} /> {tl(language, 'موافقة', 'אישור', 'Approve')}</>}
                  </button>
                  <button onClick={() => { setRejectTarget(wd.id); setRejectReason('') }} disabled={busy}
                    style={{ flex:1, padding:'12px 0', borderRadius:14, background: busy ? 'transparent' : `${C.accent}12`, border:`1.5px solid ${busy ? C.border : C.accent + '55'}`, color: busy ? C.textDim : C.accent, fontSize:14, fontWeight:800, cursor: busy ? 'default' : 'pointer', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {busy ? '...' : <><XCircle size={16} strokeWidth={2.5} /> {tl(language, 'رفض', 'דחייה', 'Reject')}</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Approved Days (grouped by month) ─── */}
      {sorted.length === 0 && pendingDays.length === 0
        ? <div style={{ textAlign:'center', padding:'52px 20px' }}>
            <IconChip icon={CalendarDays} tone="brand" size={56} radius={17} iconSize={28} style={{ margin:'0 auto 16px' }} />
            <div style={{ fontSize:14, color:C.textDim, marginBottom:22, lineHeight:1.7 }}>{tl(language, 'ما في أيام عمل مسجلة', 'אין ימי עבודה רשומים', 'No work days logged')}</div>
            <Btn onClick={openForm}>{tl(language, 'سجّل أول يوم', 'רשום יום ראשון', 'Log first day')}</Btn>
          </div>
        : (() => {
            if (sorted.length === 0) return (
              <>
                {pendingDays.length > 0 && <SectionLabel color={C.primary}>{tl(language, 'الأيام الموافق عليها', 'הימים המאושרים', 'Approved days')}</SectionLabel>}
                <div style={{ textAlign:'center', padding:'32px 0', color:C.textDim, fontSize:13 }}>{tl(language, 'ما في نتائج للفلتر الحالي', 'אין תוצאות לסינון הנוכחי', 'No results for the current filter')}</div>
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
            const totalsByMonth = Object.fromEntries(monthEntries.map(([mk, ds]) => [mk, ds.reduce((s, d) => s + (d.amount || 0), 0)]))

            return (
              <>
                {pendingDays.length > 0 && <SectionLabel color={C.primary}>{tl(language, 'الأيام الموافق عليها', 'הימים המאושרים', 'Approved days')}</SectionLabel>}
                {bulkSelectMode && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'10px 14px', background:`${C.primary}10`, borderRadius:12, border:`1px solid ${C.primary}33` }}>
                    <span style={{ fontSize:12, color:C.primary, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><CheckSquare size={13} strokeWidth={2} /> {tl(language, 'وضع التحديد — اضغط على الأيام لتحديدها', 'מצב בחירה — לחץ על הימים לבחירתם', 'Selection mode — tap days to select them')}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setSelectedDayIds(new Set(sorted.map(d => d.id)))}
                        style={{ fontSize:11, fontWeight:700, color:C.primary, background:`${C.primary}18`, border:`1px solid ${C.primary}44`, borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>
                        {tl(language, 'الكل', 'הכל', 'All')}
                      </button>
                      {selectedDayIds.size > 0 && (
                        <button onClick={() => setSelectedDayIds(new Set())}
                          style={{ fontSize:11, fontWeight:700, color:C.textDim, background:'transparent', border:`1px solid ${C.border}`, borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>
                          {tl(language, 'إلغاء الكل', 'בטל הכל', 'Clear all')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {hasFilter && (
                  <div style={{ fontSize:12, color:C.textDim, marginBottom:12, padding:'8px 14px', background:`${C.secondary}10`, borderRadius:10, border:`1px solid ${C.secondary}22` }}>
                    {tl(language, `عرض ${sorted.length} من ${approvedDays.length} يوم`, `מציג ${sorted.length} מתוך ${approvedDays.length} ימים`, `Showing ${sorted.length} of ${approvedDays.length} days`)}
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
                  const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
                  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
                  const monthLabel = `${tl(language, MONTHS_AR[parseInt(m,10)-1], MONTHS_HE[parseInt(m,10)-1], MONTHS_EN[parseInt(m,10)-1])} ${y}`
                  const workerCount = new Set(days.map(d => d.employee_id)).size
                  // مخطّط النشاط: مجموع الصرف لكل يوم من أيام الشهر
                  const daysInMonth = new Date(parseInt(y,10), parseInt(m,10), 0).getDate()
                  const bars = new Array(daysInMonth).fill(0)
                  days.forEach(d => { const dn = parseInt(String(d.date||'').slice(8,10),10); if (dn>=1 && dn<=daysInMonth) bars[dn-1] += (d.amount||0) })
                  // الاتجاه مقابل الشهر السابق
                  const prevKey = (() => { let yy=parseInt(y,10), mm=parseInt(m,10)-1; if(mm<1){mm=12;yy--} return `${yy}-${String(mm).padStart(2,'0')}` })()
                  const prevTotal = totalsByMonth[prevKey] || 0
                  const trendPct  = prevTotal > 0 ? Math.round((totalAmt - prevTotal) / prevTotal * 100) : null

                  return (
                    <div key={month} style={{ marginBottom:10 }}>
                      {/* Month header */}
                      <WorkMonthHeader
                        language={language}
                        label={monthLabel}
                        monthNum={parseInt(m,10)}
                        year={y}
                        total={totalAmt}
                        workDays={workDaysOnly.length}
                        holidays={holidayDays.length}
                        workerCount={workerCount}
                        isCurrent={isCurrent}
                        isOpen={isOpen}
                        trendPct={trendPct}
                        bars={bars}
                        onToggle={() => setOpenMonths(prev => {
                          const next = new Set(prev)
                          next.has(month) ? next.delete(month) : next.add(month)
                          return next
                        })}
                      />

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
                              const wkWorkDays = wdays.filter(d => d.day_type !== 'عطلة').length
                              const wkHolidays = wdays.filter(d => d.day_type === 'عطلة').length
                              const wkBars = new Array(daysInMonth).fill(0)
                              wdays.forEach(d => { const dn = parseInt(String(d.date||'').slice(8,10),10); if (dn>=1 && dn<=daysInMonth) wkBars[dn-1] += (d.amount||0) })
                              return (
                                <div key={empId} style={{ borderBottom: wi < workerEntries.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                  {/* Worker month strip */}
                                  <WorkerMonthStrip
                                    language={language}
                                    name={emp?.name || '؟'}
                                    rank={wi + 1}
                                    workDays={wkWorkDays}
                                    holidays={wkHolidays}
                                    total={total}
                                    bars={wkBars}
                                    isOpen={workerOpen}
                                    onToggle={toggleWorker}
                                    isLast
                                  />

                                  {/* Day tickets */}
                                  {workerOpen && (
                                    <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'11px 12px', background:C.bg }}>
                                      {wdays.sort((a,b) => (b.date||'').localeCompare(a.date||'')).map((wd, idx) => {
                                        const proj    = projects.find(x => x.id === wd.project_id)
                                        const holiday = holidayDates.has(String(wd.date).slice(0,10)) ? holidays.find(h => String(h.date).slice(0,10) === String(wd.date).slice(0,10)) : null
                                        const isSel   = bulkSelectMode && selectedDayIds.has(wd.id)
                                        const actions = bulkSelectMode ? (
                                          <div style={{ width:26, height:26, borderRadius:8, border:`2px solid ${isSel ? C.primary : C.border}`, background: isSel ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', flexShrink:0, transition:'all .15s' }}>
                                            {isSel && <Check size={13} strokeWidth={3} />}
                                          </div>
                                        ) : (
                                          <>
                                            <button onClick={(e) => { e.stopPropagation(); openEditDay(wd) }} style={{ width:30, height:30, borderRadius:8, background:`${C.secondary}15`, border:`1px solid ${C.secondary}30`, color:C.secondary, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Pencil size={12} strokeWidth={2} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(wd.id) }} style={{ width:30, height:30, borderRadius:8, background:`${C.accent}15`, border:`1px solid ${C.accent}30`, color:C.accent, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Trash2 size={12} strokeWidth={2} /></button>
                                          </>
                                        )
                                        return (
                                          <WorkDayTicket key={wd.id}
                                            wd={wd}
                                            lang={language}
                                            hideName
                                            projectName={proj?.name || '؟'}
                                            holidayName={holiday?.name}
                                            selected={isSel}
                                            onClick={bulkSelectMode ? () => toggleDaySelect(wd.id) : undefined}
                                            notchColor={C.bg}
                                            actions={actions}
                                            delay={Math.min(idx * 0.03, 0.2)}
                                          />
                                        )
                                      })}
                                    </div>
                                  )}
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
      <Modal open={showForm} onClose={closeForm} title={editingDay ? tl(language, 'تعديل يوم عمل', 'עריכת יום עבודה', 'Edit work day') : tl(language, 'تسجيل يوم عمل', 'רישום יום עבודה', 'Log work day')}
        action={activeEmps.length > 0 && activeProjs.length > 0
          ? <Btn onClick={save} full disabled={saving || (!rangeMode && !multiMode && (!form.employee_id || (!form.project_id && form.day_type !== 'عطلة'))) || (!rangeMode && multiMode && (multiEmps.size === 0 || (!form.project_id && form.day_type !== 'عطلة'))) || (rangeMode && !form.project_id && form.day_type !== 'عطلة')}>
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {saving ? <><Loader2 size={15} strokeWidth={2.5} style={{ animation:'spin .8s linear infinite' }} /> {tl(language, 'جاري الحفظ...', 'שומר...', 'Saving...')}</> : rangeMode
                  ? <><Check size={15} strokeWidth={2.8} /> {(() => { const n = (multiMode ? multiEmps.size : (form.employee_id ? 1 : 0)) * (dateFrom && dateTo && dateTo >= dateFrom ? getDatesInRange(dateFrom, dateTo).length : 0); return tl(language, `سجّل ${n} سجل`, `רשום ${n} רשומות`, `Log ${n} records`) })()}</>
                  : multiMode ? <><Check size={15} strokeWidth={2.8} /> {tl(language, `سجّل لـ ${multiEmps.size || '...'} عمال`, `רשום ל-${multiEmps.size || '...'} עובדים`, `Log for ${multiEmps.size || '...'} workers`)}</> : <><Check size={15} strokeWidth={2.8} /> {tl(language, 'سجّل اليوم', 'רשום יום', 'Log day')}</>}
              </span>
            </Btn>
          : null}
      >
        {activeEmps.length === 0 || activeProjs.length === 0
          ? <div style={{ textAlign:'center', padding:32 }}>
              <AlertTriangle size={44} style={{ color:C.warning, margin:'0 auto 14px', display:'block' }} />
              <div style={{ fontSize:14, color:C.textDim, lineHeight:1.8 }}>{tl(language, 'لازم تضيف عمال ومشاريع أول!', 'צריך להוסיף עובדים ופרויקטים קודם!', 'You need to add workers and projects first!')}</div>
            </div>
          : <>
              {/* زر «خيارات متقدمة» — يطوي المفاتيح فالنموذج الافتراضي = يوم مفرد بسيط */}
              {!editingDay && !showAdvanced && (
                <button onClick={() => setShowAdvanced(true)}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', marginBottom:18, padding:'12px 16px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:`1px dashed ${C.borderMid}`, color:C.textDim, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  <Users size={14} strokeWidth={2} />
                  {tl(language, 'عدة عمال أو نطاق تواريخ', 'מספר עובדים או טווח תאריכים', 'Multiple workers or date range')}
                  <ChevronDown size={15} style={{ marginInlineStart:'auto' }} />
                </button>
              )}
              {/* Toggles — hidden in edit mode + خلف «خيارات متقدمة» */}
              {!editingDay && showAdvanced && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
                  {/* Multi-worker toggle */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${multiMode ? C.secondary + '55' : C.border}` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: multiMode ? C.secondary : C.text, display:'flex', alignItems:'center', gap:6 }}><Users size={14} strokeWidth={2} /> {tl(language, 'عدة عمال', 'מספר עובדים', 'Multiple workers')}</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{tl(language, 'نفس المشروع لأكثر من عامل', 'אותו פרויקט ליותר מעובד אחד', 'Same project for several workers')}</div>
                    </div>
                    <button onClick={() => { setMultiMode(v => !v); setMultiEmps(new Set()); setForm(prev => ({ ...prev, employee_id: '' })) }}
                      style={{ width:48, height:26, borderRadius:13, background: multiMode ? C.secondary : C.border, border:'none', cursor:'pointer', position:'relative', transition:'all .25s', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:3, left: multiMode ? 25 : 3, width:20, height:20, borderRadius:10, background:'#fff', transition:'all .25s', boxShadow:'0 2px 6px rgba(0,0,0,0.4)' }} />
                    </button>
                  </div>
                  {/* Date range toggle */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${rangeMode ? C.primary + '55' : C.border}` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color: rangeMode ? C.primary : C.text, display:'flex', alignItems:'center', gap:6 }}><CalendarDays size={14} strokeWidth={2} /> {tl(language, 'نطاق تواريخ', 'טווח תאריכים', 'Date range')}</div>
                      <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{tl(language, 'من تاريخ إلى تاريخ دفعة واحدة', 'מתאריך עד תאריך בבת אחת', 'From date to date in one batch')}</div>
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
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'من تاريخ', 'מתאריך', 'From date')}</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      style={{ width:'100%', padding:'11px 12px', borderRadius:12, border:`1.5px solid ${C.primary}55`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'إلى تاريخ', 'עד תאריך', 'To date')}</label>
                    <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
                      style={{ width:'100%', padding:'11px 12px', borderRadius:12, border:`1.5px solid ${C.primary}55`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                  </div>
                </div>
              ) : (
                <Input label={tl(language, 'التاريخ', 'תאריך', 'Date')} value={form.date} onChange={f('date')} type="date" required />
              )}

              {/* Holiday indicator */}
              {(() => {
                const holiday = (holidays || []).find(h => String(h.date).slice(0, 10) === form.date)
                if (!holiday) return null
                return (
                  <div style={{ marginBottom:18, padding:'12px 16px', borderRadius:12, background:`${C.warning}18`, border:`1.5px solid ${C.warning}55`, display:'flex', alignItems:'center', gap:12 }}>
                    <Gift size={26} style={{ color:C.warning, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:C.warning }}>{holiday.name}</div>
                      <div style={{ fontSize:11, color:C.textDim }}>{tl(language, 'يوم عطلة رسمية', 'יום חג רשמי', 'Official holiday')}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Employee selector */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>
                  {multiMode ? tl(language, 'العمال (اختر أكثر من واحد)', 'עובדים (בחר יותר מאחד)', 'Workers (select more than one)') : tl(language, 'العامل', 'עובד', 'Worker')} <span style={{ color:C.accent }}>*</span>
                </label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {activeEmps.map(e => {
                    const sel = multiMode ? multiEmps.has(e.id) : form.employee_id === e.id
                    const color = multiMode ? C.secondary : C.primary
                    return (
                      <button key={e.id} onClick={() => multiMode ? toggleMultiEmp(e.id) : setForm(prev => ({ ...prev, employee_id: e.id }))}
                        style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.04)', color: sel ? color : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${color}33` : 'none' }}>
                        {multiMode && <span style={{ marginLeft:6, display:'inline-flex', alignItems:'center' }}>{sel ? <CheckSquare size={13} strokeWidth={2} /> : <Square size={13} strokeWidth={2} />}</span>}
                        {e.name}
                        <span style={{ fontSize:10, marginRight:5, opacity:0.7 }}>({e.daily_rate}₪)</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Project selector — مخفي لأيام العطلة بدون شغل */}
              {!(form.day_type === 'عطلة' && !holidayWorked) && <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'المشروع', 'פרויקט', 'Project')} <span style={{ color:C.accent }}>*</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {activeProjs.map(p => {
                    const sel = form.project_id === p.id
                    return (
                      <button key={p.id} onClick={() => setForm(prev => ({ ...prev, project_id: p.id, location: '' }))}
                        style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? C.secondary : C.border}`, background: sel ? `${C.secondary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.secondary : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${C.secondary}33` : 'none' }}>
                        {p.name}
                        {p.type === 'يومي' && (p.locations || []).length > 0 && <MapPin size={10} strokeWidth={2} style={{ marginRight:4, opacity:0.7, display:'inline' }} />}
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
                    <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'flex', alignItems:'center', gap:5, marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}><MapPin size={11} strokeWidth={2} /> {tl(language, 'مكان العمل', 'מקום העבודה', 'Work site')}</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {locs.map(loc => {
                        const sel = form.location === loc
                        return (
                          <button key={loc} onClick={() => setForm(prev => ({ ...prev, location: sel ? '' : loc }))}
                            style={{ padding:'10px 16px', borderRadius:12, border:`1.5px solid ${sel ? C.primary : C.border}`, background: sel ? `${C.primary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.primary : C.textDim, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s', boxShadow: sel ? `0 4px 18px ${C.primary}33` : 'none', display:'flex', alignItems:'center', gap:5 }}>
                            <MapPin size={11} strokeWidth={2} /> {loc}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Day type */}
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'نوع اليوم', 'סוג היום', 'Day type')}</label>
                <div style={{ display:'flex', gap:10 }}>
                  {DAY_TYPES.map(t => {
                    const sel   = form.day_type === t
                    const color = DAY_TYPE_COLOR[t] || C.primary
                    return (
                      <button key={t} onClick={() => setDayType(t)}
                        style={{ flex:1, padding:'14px 8px', borderRadius:16, border:`2px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', backdropFilter:'blur(10px)', color: sel ? color : C.textDim, fontSize:13, fontWeight:800, cursor:'pointer', transition:'all .25s', boxShadow: sel ? `0 6px 22px ${color}33` : 'none', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                        <DayIcon type={t} size={20} />
                        <span>{tEnum(t, language)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {(form.day_type === 'ساعات' || (form.day_type === 'عطلة' && holidayWorked && holidaySubType === 'ساعات')) && (
                <Input label={tl(language, 'عدد الساعات', 'מספר שעות', 'Number of hours')} value={form.hours} onChange={f('hours')} type="number" min="0.5" max="24" />
              )}

              {form.day_type === 'عطلة' && (
                <div style={{ marginBottom:18 }}>
                  {/* خيار: اشتغل أو ما اشتغل */}
                  <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'العامل بالعيد', 'העובד בחג', 'Worker on holiday')}</label>
                  <div style={{ display:'flex', gap:10, marginBottom: holidayWorked ? 14 : 0 }}>
                    {[{ v:false, label:tl(language, 'ما اشتغل', 'לא עבד', 'Did not work'), Icon:BedDouble, desc:'0₪' }, { v:true, label:tl(language, 'اشتغل', 'עבד', 'Worked'), Icon:Zap, desc:tl(language, 'يُحسب المبلغ', 'הסכום מחושב', 'Amount is calculated') }].map(opt => (
                      <button key={String(opt.v)} onClick={() => setHolidayWorked(opt.v)}
                        style={{ flex:1, padding:'14px 8px', borderRadius:14, border:`2px solid ${holidayWorked === opt.v ? C.warning : C.border}`, background: holidayWorked === opt.v ? `${C.warning}18` : 'rgba(255,255,255,0.03)', color: holidayWorked === opt.v ? C.warning : C.textDim, cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <opt.Icon size={22} strokeWidth={1.8} />
                        <span style={{ fontSize:13, fontWeight:800 }}>{opt.label}</span>
                        <span style={{ fontSize:10, opacity:0.7 }}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* sub-selector للنوع لما اشتغل */}
                  {holidayWorked && (
                    <>
                      <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'نوع اليوم', 'סוג היום', 'Day type')}</label>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {['كامل','نص يوم','ساعات','مبلغ مسكر'].map(t => {
                          const sel = holidaySubType === t
                          const color = DAY_TYPE_COLOR[t] || C.primary
                          return (
                            <button key={t} onClick={() => { setHolidaySubType(t); setForm(prev => ({ ...prev, hours: t==='كامل'?'8':t==='نص يوم'?'4':prev.hours })) }}
                              style={{ flex:1, padding:'12px 6px', borderRadius:14, border:`2px solid ${sel ? color : C.border}`, background: sel ? `${color}18` : 'rgba(255,255,255,0.03)', color: sel ? color : C.textDim, fontSize:12, fontWeight:800, cursor:'pointer', transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                              <DayIcon type={t} size={16} />
                              <span>{tEnum(t, language)}</span>
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
                  <label style={{ fontSize:11, fontWeight:700, color:C.textDim, display:'block', marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'المبلغ المسكر (₪) *', 'הסכום הקבוע (₪) *', 'Fixed amount (₪) *')}</label>
                  <input type="number" value={form.customAmount} min="1" step="1" placeholder="0"
                    onChange={e => setForm(prev => ({ ...prev, customAmount: e.target.value }))}
                    style={{ width:'100%', padding:'14px 16px', borderRadius:14, border:`1.5px solid ${C.orange}77`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:22, fontWeight:900, boxSizing:'border-box', outline:'none', fontFamily:'monospace' }} />
                </div>
              )}

              {/* Preview */}
              {multiMode ? (
                multiEmps.size > 0 && form.project_id && (
                  <div style={{ padding:'16px 18px', borderRadius:16, marginBottom:18, background:`${C.secondary}0d`, border:`1.5px solid ${C.secondary}33` }}>
                    <div style={{ fontSize:11, color:C.textDim, marginBottom:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{tl(language, 'المعاينة', 'תצוגה מקדימה', 'Preview')}</div>
                    {multiPreviews.map(x => (
                      <div key={x.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, marginBottom:8, borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{x.name}</span>
                        <span style={{ fontSize:15, fontWeight:900, color:C.secondary, fontFamily:'monospace' }}>{fmt(x.amount)}₪</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                      <span style={{ fontSize:12, color:C.textDim, fontWeight:700 }}>{tl(language, `المجموع (${multiEmps.size} عمال)`, `סך הכל (${multiEmps.size} עובדים)`, `Total (${multiEmps.size} workers)`)}</span>
                      <span style={{ fontSize:18, fontWeight:900, color:C.primary, fontFamily:'monospace' }}>{fmt(multiTotal)}₪</span>
                    </div>
                  </div>
                )
              ) : (
                selectedEmp && (
                  <div style={{ padding:'16px 20px', borderRadius:16, marginBottom:18, background:`${C.primary}0d`, border:`1.5px solid ${C.primary}33`, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:`0 4px 20px ${C.primary}18` }}>
                    <div>
                      <div style={{ fontSize:11, color:C.textDim, marginBottom:3 }}>{tl(language, 'المبلغ المحسوب', 'הסכום המחושב', 'Calculated amount')}</div>
                      <div style={{ fontSize:12, color:C.textDim }}>{selectedEmp.name} × {tEnum(form.day_type, language)}</div>
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
                      <div style={{ fontSize:11, color:C.textDim, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{tl(language, 'ملخص التسجيل', 'סיכום הרישום', 'Logging summary')}</div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, color:C.text, display:'flex', alignItems:'center', gap:4 }}><CalendarDays size={13} strokeWidth={2} style={{ color:C.primary }} /> <b style={{ color:C.primary }}>{days}</b> {tl(language, 'يوم', 'ימים', 'days')}</span>
                        <span style={{ fontSize:13, color:C.text, display:'flex', alignItems:'center', gap:4 }}><HardHat size={13} strokeWidth={2} style={{ color:C.secondary }} /> <b style={{ color:C.secondary }}>{workers.length}</b> {tl(language, 'عامل', 'עובדים', 'workers')}</span>
                        <span style={{ fontSize:13, color:C.text, display:'flex', alignItems:'center', gap:4 }}><ClipboardList size={13} strokeWidth={2} style={{ color:C.success }} /> <b style={{ color:C.success }}>{total}</b> {tl(language, 'سجل سيُنشأ', 'רשומות ייווצרו', 'records to create')}</span>
                      </div>
                      <div style={{ fontSize:10, color:C.textDim, marginTop:6 }}>{tl(language, 'السجلات المكررة ستُتجاهل تلقائياً', 'רשומות כפולות יתעלמו אוטומטית', 'Duplicate records are skipped automatically')}</div>
                    </div>
                  )
                })()
              )}

              {formError && (
                <div style={{ fontSize:12, color:C.accent, marginBottom:16, padding:'12px 16px', borderRadius:12, background:`${C.accent}10`, border:`1px solid ${C.accent}33`, display:'flex', alignItems:'center', gap:7 }}><AlertTriangle size={14} strokeWidth={2.3} style={{ flexShrink:0 }} /> {formError}</div>
              )}

            </>
        }
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={async () => { await deleteWorkDay(confirmDel); setConfirmDel(null) }} message={tl(language, 'حذف هذا اليوم؟', 'למחוק את היום הזה?', 'Delete this day?')} />

      {/* ─── Reject with reason modal ─── */}
      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason('') }} title={tl(language, 'رفض يوم العمل', 'דחיית יום עבודה', 'Reject work day')}
        action={<Btn onClick={confirmReject} full style={{ background:`${C.accent}cc` }}><span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}><XCircle size={15} strokeWidth={2.5} /> {tl(language, 'تأكيد الرفض', 'אישור הדחייה', 'Confirm rejection')}</span></Btn>}
      >
        <div style={{ fontSize:13, color:C.textDim, marginBottom:14 }}>{tl(language, 'سيصل سبب الرفض للعامل في بوابته', 'סיבת הדחייה תגיע לעובד בפורטל שלו', 'The rejection reason will reach the worker in their portal')}</div>
        <Input label={tl(language, 'سبب الرفض (اختياري)', 'סיבת הדחייה (אופציונלי)', 'Rejection reason (optional)')} value={rejectReason} onChange={v => setRejectReason(v)} />
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
            <div className="slide-up" style={{ position:'relative', width:'100%', maxWidth:430, background:C.bg, borderRadius:'20px 20px 0 0', maxHeight:'calc(85vh - 80px)', display:'flex', flexDirection:'column', boxShadow:'0 -16px 60px rgba(0,0,0,0.7)', border:`1px solid ${C.border}`, borderBottom:'none', marginBottom:'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))' }}>

              {/* Header */}
              <div style={{ padding:'16px 18px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <IconChip icon={HardHat} tone="brand" size={38} radius={11} />
                  <div>
                    <div style={{ fontSize:16, fontWeight:900, color:C.text }}>{emp.name}</div>
                    <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>
                      {totalDays} {tl(language, 'يوم عمل', 'ימי עבודה', 'work days')} • {fmt(totalAmt)}₪ {tl(language, 'إجمالي', 'סך הכל', 'total')}
                    </div>
                  </div>
                </div>
                <button onClick={() => setWorkerDetail(null)} style={{ width:30, height:30, borderRadius:'50%', background:C.border, border:'none', cursor:'pointer', color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13} strokeWidth={2.5} /></button>
              </div>

              <div style={{ overflowY:'auto', flex:1, padding:'14px 16px 30px' }}>

                {/* Summary stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                  {[
                    { label:tl(language, 'أيام معتمدة', 'ימים מאושרים', 'Approved days'), value: totalDays, color: C.primary },
                    { label:tl(language, 'إجمالي مكتسب', 'סך נצבר', 'Total earned'), value: fmt(totalAmt)+'₪', color: C.success },
                    { label:tl(language, 'معدل اليوم', 'תעריף יומי', 'Daily rate'), value: fmt(emp.daily_rate)+'₪', color: C.warning },
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
                    <div style={{ fontSize:12, fontWeight:800, color:C.textDim, marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'ملخص شهري', 'סיכום חודשי', 'Monthly summary')}</div>
                    {months.map(([m, stat]) => (
                      <div key={m} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:12, marginBottom:6 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{m}</div>
                        <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:C.textDim }}>{stat.days} {tl(language, 'يوم', 'ימים', 'days')}</span>
                          <span style={{ fontSize:13, fontWeight:800, color:C.success, fontFamily:'monospace' }}>{fmt(stat.amount)}₪</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Recent days */}
                {empDays.length > 0 && (
                  <>
                    <div style={{ fontSize:12, fontWeight:800, color:C.textDim, margin:'16px 0 10px', letterSpacing:'0.04em', textTransform:'uppercase' }}>{tl(language, 'آخر الأيام', 'הימים האחרונים', 'Recent days')}</div>
                    {empDays.slice(0, 30).map(d => {
                      const proj = projects.find(p => p.id === d.project_id)
                      const tc = DAY_TYPE_COLOR[d.day_type] || C.primary
                      return (
                        <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, borderRadius:12, marginBottom:5 }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{fmtDateFull(d.date)}</div>
                            <div style={{ fontSize:11, color:C.textDim }}>{proj?.name || '؟'} • <span style={{ color:tc }}>{tEnum(d.day_type, language)}</span></div>
                          </div>
                          <span style={{ fontSize:13, fontWeight:800, color:tc, fontFamily:'monospace' }}>{fmt(d.amount)}₪</span>
                        </div>
                      )
                    })}
                  </>
                )}

                {empDays.length === 0 && (
                  <div style={{ textAlign:'center', padding:'32px 0', color:C.textDim, fontSize:13 }}>{tl(language, 'ما في أيام مسجلة لهذا العامل', 'אין ימים רשומים לעובד זה', 'No days logged for this worker')}</div>
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
            {selectedDayIds.size > 0 ? tl(language, `${selectedDayIds.size} يوم محدد`, `${selectedDayIds.size} ימים נבחרו`, `${selectedDayIds.size} days selected`) : tl(language, 'اضغط على أيام للتحديد', 'לחץ על ימים לבחירה', 'Tap days to select')}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {selectedDayIds.size > 0 && (
              <>
                <button onClick={bulkApproveSelected} disabled={bulkSaving}
                  style={{ padding:'10px 14px', borderRadius:12, background:`${C.success}22`, border:`1px solid ${C.success}55`, color:C.success, fontSize:12, fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                  <CheckCircle2 size={14} strokeWidth={2.5} /> {tl(language, 'موافقة', 'אישור', 'Approve')}
                </button>
                <button onClick={() => setShowBulkProj(true)}
                  style={{ padding:'10px 14px', borderRadius:12, background:GRAD.brand, border:'none', color:'#000', fontSize:12, fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                  <FolderInput size={14} strokeWidth={2.5} /> {tl(language, 'مشروع', 'פרויקט', 'Project')}
                </button>
              </>
            )}
            <button onClick={exitBulkMode}
              style={{ padding:'10px 12px', borderRadius:12, background:'transparent', border:`1px solid ${C.border}`, color:C.textDim, fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center' }}>
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Bulk Project Picker ─── */}
      {showBulkProj && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowBulkProj(false); setBulkProjId(''); setBulkError('') } }}>
          <div className="slide-up" style={{ width:'100%', maxWidth:480, background:C.surface, borderRadius:'20px 20px 0 0', padding:'20px 20px 20px', border:`1px solid ${C.borderMid}`, maxHeight:'calc(80vh - 80px)', overflowY:'auto', marginBottom:'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <IconChip icon={FolderInput} tone="brand" size={34} radius={10} />
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{tl(language, 'تعديل المشروع', 'עריכת פרויקט', 'Edit project')}</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{tl(language, `تطبيق على ${selectedDayIds.size} يوم محدد`, `החל על ${selectedDayIds.size} ימים נבחרים`, `Apply to ${selectedDayIds.size} selected days`)}</div>
                </div>
              </div>
              <button onClick={() => { setShowBulkProj(false); setBulkProjId(''); setBulkError('') }}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, color:C.textDim, cursor:'pointer', padding:'7px', display:'inline-flex', alignItems:'center' }}><X size={15} strokeWidth={2.5} /></button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              {projects.map(p => {
                const sel = bulkProjId === p.id
                return (
                  <button key={p.id} onClick={() => setBulkProjId(p.id)}
                    style={{ padding:'14px 16px', borderRadius:14, textAlign:'right', border:`1.5px solid ${sel ? C.primary : C.border}`, background: sel ? `${C.primary}18` : 'rgba(255,255,255,0.04)', color: sel ? C.primary : C.text, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .15s' }}>
                    <span>{p.name}</span>
                    {sel && <Check size={16} strokeWidth={3} style={{ color:C.primary }} />}
                  </button>
                )
              })}
            </div>

            {bulkError && (
              <div style={{ fontSize:11, color:C.accent, marginBottom:12, padding:'8px 12px', background:`${C.accent}12`, borderRadius:9, display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={13} strokeWidth={2.3} style={{ flexShrink:0 }} /> {bulkError}
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={applyBulkProject} disabled={!bulkProjId || bulkSaving}
                style={{ flex:1, padding:'14px', borderRadius:14, background: !bulkProjId || bulkSaving ? C.border : GRAD.brand, border:'none', color: !bulkProjId || bulkSaving ? C.textDim : '#000', fontSize:14, fontWeight:800, cursor: !bulkProjId || bulkSaving ? 'default' : 'pointer', transition:'all .2s', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                {bulkSaving ? <><Loader2 size={15} strokeWidth={2.5} style={{ animation:'spin .8s linear infinite' }} /> {tl(language, 'جاري الحفظ...', 'שומר...', 'Saving...')}</> : <><Check size={15} strokeWidth={2.8} /> {tl(language, 'تطبيق', 'החל', 'Apply')}</>}
              </button>
              <button onClick={() => { setShowBulkProj(false); setBulkProjId(''); setBulkError('') }}
                style={{ padding:'14px 20px', borderRadius:14, background:'transparent', border:`1px solid ${C.border}`, color:C.textDim, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {tl(language, 'إلغاء', 'ביטול', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
