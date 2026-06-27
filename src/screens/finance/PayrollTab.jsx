import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Users, ChevronDown, Check,
  Printer, Trash2, Calendar, Banknote,
  CheckCircle2, Clock, Search, ArrowRight,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { tl, tEnum } from '../../lib/labels.js'

// ─── helpers ──────────────────────────────────────────────────────────────────
const inp = (focus, key) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

// أول يوم الشهر الحالي
function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Print slip ───────────────────────────────────────────────────────────────
// هروب HTML لأي نص من إدخال المستخدم/العامل قبل حقنه في نافذة الطباعة (منع XSS)
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

function printSlip(slip, bizName, language) {
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const locale = language === 'he' ? 'he' : language === 'en' ? 'en' : 'ar'
  const win = window.open('', '_blank')
  win.document.write(`
    <html dir="${dir}">
    <head>
      <meta charset="utf-8"/>
      <title>${tl(language, 'قسيمة راتب', 'תלוש שכר', 'Pay slip')} — ${esc(slip.worker_name)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 32px; background: #fff; color: #111; }
        h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #666; margin-bottom: 24px; }
        .card { border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .label { color: #555; }
        .val { font-weight: 700; color: #111; }
        .net { background: #f59e0b; color: #fff; border-radius: 8px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 18px; font-weight: 900; }
        .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h1>${tl(language, 'قسيمة راتب', 'תלוש שכר', 'Pay slip')}</h1>
      <div class="sub">${esc(bizName)} &nbsp;·&nbsp; ${fmtDate(slip.period_start)} — ${fmtDate(slip.period_end)}</div>
      <div class="card">
        <div class="row"><span class="label">${tl(language, 'اسم العامل', 'שם העובד', 'Worker name')}</span><span class="val">${esc(slip.worker_name)}</span></div>
        ${slip.worker_spec ? `<div class="row"><span class="label">${tl(language, 'التخصص', 'התמחות', 'Specialty')}</span><span class="val">${esc(tEnum(slip.worker_spec, language))}</span></div>` : ''}
        ${slip.worker_daily_rate > 0 ? `<div class="row"><span class="label">${tl(language, 'أجر اليوم', 'שכר יומי', 'Daily rate')}</span><span class="val">₪${fmt(slip.worker_daily_rate)}</span></div>` : ''}
        <div class="row"><span class="label">${tl(language, 'أيام العمل', 'ימי עבודה', 'Work days')}</span><span class="val">${slip.work_days_count}</span></div>
        <div class="row"><span class="label">${tl(language, 'الراتب الأساسي', 'שכר בסיס', 'Base salary')}</span><span class="val">₪${fmt(slip.base_salary)}</span></div>
        ${slip.advances_paid > 0 ? `<div class="row"><span class="label">${tl(language, 'سلف مخصومة', 'מקדמות שנוכו', 'Advances deducted')}</span><span class="val" style="color:#ef4444">−₪${fmt(slip.advances_paid)}</span></div>` : ''}
        ${slip.deductions > 0 ? `<div class="row"><span class="label">${tl(language, 'خصومات', 'ניכויים', 'Deductions')}${slip.deduction_note ? ' (' + esc(slip.deduction_note) + ')' : ''}</span><span class="val" style="color:#ef4444">−₪${fmt(slip.deductions)}</span></div>` : ''}
      </div>
      <div class="net"><span>${tl(language, 'صافي الراتب', 'שכר נטו', 'Net pay')}</span><span>₪${fmt(slip.net_pay)}</span></div>
      ${slip.notes ? `<div style="margin-top:12px;font-size:12px;color:#555;">${tl(language, 'ملاحظة', 'הערה', 'Note')}: ${esc(slip.notes)}</div>` : ''}
      ${slip.paid_at ? `<div style="margin-top:8px;font-size:12px;color:#22c55e;font-weight:700;">✓ ${tl(language, 'تم الصرف بتاريخ', 'שולם בתאריך', 'Paid on')} ${fmtDate(slip.paid_at)}</div>` : ''}
      <div class="footer">${tl(language, 'تم الإنشاء بواسطة كبلان', 'נוצר באמצעות כבלאן', 'Generated by Kabblan')} &nbsp;·&nbsp; ${new Date().toLocaleDateString(locale)}</div>
    </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 400)
}

// ─── Slip Card ────────────────────────────────────────────────────────────────
function SlipCard({ slip, onMarkPaid, onDelete, onPrint, language }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const isPaid = !!slip.paid_at

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        background: C.surface,
        border: `1px solid ${isPaid ? '#22C55E22' : C.border}`,
        borderRadius: 16, padding: '14px',
        marginBottom: 8, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Paid strip */}
      {isPaid && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: '#22C55E', borderRadius: '0 16px 16px 0' }} />
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{slip.worker_name}</div>
          {slip.worker_spec && (
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{tEnum(slip.worker_spec, language)}</div>
          )}
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
            {fmtDate(slip.period_start)} — {fmtDate(slip.period_end)}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>
            ₪{fmt(slip.net_pay)}
          </div>
          <div style={{ fontSize: 9, color: C.textDim, textAlign: 'center', marginTop: 2 }}>{tl(language, 'صافي الراتب', 'שכר נטו', 'Net pay')}</div>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 20, color: C.textDim }}>
          {slip.work_days_count} {tl(language, 'يوم', 'יום', 'days')}
        </span>
        <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 20, color: C.textDim }}>
          {tl(language, 'أساسي', 'בסיס', 'Base')} ₪{fmt(slip.base_salary)}
        </span>
        {slip.advances_paid > 0 && (
          <span style={{ fontSize: 10, background: '#EF444412', padding: '3px 8px', borderRadius: 20, color: '#EF4444' }}>
            {tl(language, 'سلف', 'מקדמות', 'Advances')} −₪{fmt(slip.advances_paid)}
          </span>
        )}
        {slip.deductions > 0 && (
          <span style={{ fontSize: 10, background: '#EF444412', padding: '3px 8px', borderRadius: 20, color: '#EF4444' }}>
            {tl(language, 'خصم', 'ניכוי', 'Deduction')} −₪{fmt(slip.deductions)}
          </span>
        )}
        {isPaid && (
          <span style={{ fontSize: 10, background: '#22C55E12', padding: '3px 8px', borderRadius: 20, color: '#22C55E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Check size={11} strokeWidth={2.8} /> {tl(language, 'صُرف', 'שולם', 'Paid')} {fmtDate(slip.paid_at)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>

        {/* Mark paid */}
        {!isPaid && (
          <button
            onClick={() => onMarkPaid(slip.id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', background: '#22C55E15', border: '1px solid #22C55E40', borderRadius: 10, color: '#22C55E', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <CheckCircle2 size={13} /> {tl(language, 'تأكيد الصرف', 'אישור תשלום', 'Confirm payment')}
          </button>
        )}

        {/* Print */}
        <button
          onClick={() => onPrint(slip)}
          style={{ flex: isPaid ? 2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', background: `${C.primary}12`, border: `1px solid ${C.primary}30`, borderRadius: 10, color: C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Printer size={13} /> {tl(language, 'طباعة', 'הדפסה', 'Print')}
        </button>

        {/* Delete */}
        {!delConfirm ? (
          <button onClick={() => setDelConfirm(true)}
            style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: 'inherit' }}>
            <Trash2 size={13} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setDelConfirm(false)}
              style={{ padding: '5px 8px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.textDim, cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>{tl(language, 'لا', 'לא', 'No')}</button>
            <button onClick={() => onDelete(slip.id)}
              style={{ padding: '5px 8px', background: C.accent, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}>{tl(language, 'احذف', 'מחיקה', 'Delete')}</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Add Slip Sheet ───────────────────────────────────────────────────────────
function AddSlipSheet({ open, onClose, onSave, businessId, employees, userId, language }) {
  const { confirm: bioConfirm } = useBiometricConfirm()
  const [step,         setStep]         = useState(1) // 1=select worker, 2=fill slip
  const [selectedEmp,  setSelectedEmp]  = useState(null)
  const [search,       setSearch]       = useState('')
  const [form, setForm] = useState({
    period_start:    firstOfMonth(),
    period_end:      todayStr(),
    work_days_count: '',
    base_salary:     '',
    advances_paid:   '',
    deductions:      '',
    deduction_note:  '',
    notes:           '',
  })
  const [autoLoading, setAutoLoading] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [focus,       setFocus]       = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const net = useMemo(() => {
    const base = Number(form.base_salary) || 0
    const adv  = Number(form.advances_paid) || 0
    const ded  = Number(form.deductions) || 0
    return Math.max(0, base - adv - ded)
  }, [form.base_salary, form.advances_paid, form.deductions])

  function reset() {
    setStep(1); setSelectedEmp(null); setSearch('')
    setForm({ period_start: firstOfMonth(), period_end: todayStr(), work_days_count: '', base_salary: '', advances_paid: '', deductions: '', deduction_note: '', notes: '' })
    setSaving(false)
  }
  function handleClose() { reset(); onClose() }

  // ─── Auto-fetch from existing work_days + advances ────────────────────
  async function fetchWorkerData() {
    if (!selectedEmp) return
    setAutoLoading(true)
    try {
      // جلب أيام العمل في الفترة
      const { data: wdData } = await supabase
        .from('work_days')
        .select('amount, day_type')
        .eq('employee_id', selectedEmp.id)
        .gte('date', form.period_start)
        .lte('date', form.period_end)

      const daysCount  = wdData?.length ?? 0
      const baseSalary = (wdData ?? []).reduce((s, w) => s + Number(w.amount || 0), 0)

      // جلب السلف في الفترة
      const { data: advData } = await supabase
        .from('advances')
        .select('amount')
        .eq('employee_id', selectedEmp.id)
        .gte('date', form.period_start)
        .lte('date', form.period_end)

      const advTotal = (advData ?? []).reduce((s, a) => s + Number(a.amount || 0), 0)

      setForm(f => ({
        ...f,
        work_days_count: daysCount,
        base_salary:     baseSalary.toFixed(2),
        advances_paid:   advTotal > 0 ? advTotal.toFixed(2) : '',
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setAutoLoading(false)
    }
  }

  // أعد الجلب كلما تغيرت الفترة أو العامل
  useEffect(() => {
    if (step === 2 && selectedEmp) fetchWorkerData()
  }, [selectedEmp, form.period_start, form.period_end, step])

  async function handleSave() {
    if (!selectedEmp || !form.base_salary) return
    setSaving(true)
    try {
      const sig = await bioConfirm(`${tl(language, 'قسيمة راتب', 'תלוש שכר', 'Pay slip')}: ${selectedEmp.name} — ₪${Number(form.base_salary).toLocaleString()}`, 'payroll')
      if (!sig) { setSaving(false); return }
      await onSave({
        business_id:      businessId,
        user_id:          userId,
        worker_id:        selectedEmp.id,
        worker_name:      selectedEmp.name,
        worker_spec:      selectedEmp.specialization || null,
        worker_daily_rate: selectedEmp.daily_rate || 0,
        period_start:     form.period_start,
        period_end:       form.period_end,
        work_days_count:  Number(form.work_days_count) || 0,
        base_salary:      Number(form.base_salary) || 0,
        advances_paid:    Number(form.advances_paid) || 0,
        deductions:       Number(form.deductions) || 0,
        deduction_note:   form.deduction_note.trim() || null,
        net_pay:          net,
        notes:            form.notes.trim() || null,
      })
      handleClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const filteredEmps = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.specialization?.toLowerCase().includes(q)
    )
  }, [employees, search])

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom,0px)))',
              left: 0, right: 0, maxWidth: 480, margin: '0 auto',
              background: C.surface, border: `1px solid ${C.borderMid}`,
              borderRadius: 24, maxHeight: 'calc(90dvh - 80px)',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                  {step === 1 ? tl(language, 'اختر العامل', 'בחר עובד', 'Select worker') : `${tl(language, 'قسيمة', 'תלוש', 'Slip')}: ${selectedEmp?.name}`}
                </div>
                {step === 2 && (
                  <button onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: C.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRight size={12} strokeWidth={2.4} /> {tl(language, 'تغيير العامل', 'החלפת עובד', 'Change worker')}
                  </button>
                )}
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* ── Step 1: اختر العامل ── */}
            {step === 1 && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={13} color={C.textDim} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={tl(language, 'بحث بالاسم أو التخصص...', 'חיפוש לפי שם או התמחות...', 'Search by name or specialty...')}
                    style={{ width: '100%', padding: '10px 36px 10px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {filteredEmps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: C.textDim, fontSize: 12 }}>
                    {tl(language, 'لا يوجد عمال مطابقون', 'אין עובדים תואמים', 'No matching workers')}
                  </div>
                ) : (
                  filteredEmps.map(emp => (
                    <button key={emp.id}
                      onClick={() => { setSelectedEmp(emp); setStep(2) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', transition: 'border-color .15s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={16} color={C.primary} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{emp.name}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>
                          {emp.specialization && `${tEnum(emp.specialization, language)} · `}
                          {emp.daily_rate > 0 && `₪${fmt(emp.daily_rate)}/${tl(language, 'يوم', 'יום', 'day')}`}
                        </div>
                      </div>
                      <ChevronDown size={14} color={C.textDim} style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ── Step 2: تفاصيل القسيمة ── */}
            {step === 2 && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

                  {/* الفترة */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'من تاريخ', 'מתאריך', 'From date')}</div>
                      <input type="date" value={form.period_start} onChange={e => set('period_start', e.target.value)}
                        style={{ ...inp(focus, 'ps'), direction: 'ltr' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'إلى تاريخ', 'עד תאריך', 'To date')}</div>
                      <input type="date" value={form.period_end} onChange={e => set('period_end', e.target.value)}
                        style={{ ...inp(focus, 'pe'), direction: 'ltr' }} />
                    </div>
                  </div>

                  {/* Auto-loaded banner */}
                  {autoLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: `${C.primary}12`, border: `1px solid ${C.primary}30`, borderRadius: 10, marginBottom: 12, fontSize: 11, color: C.primary }}>
                      <Clock size={12} /> {tl(language, 'جاري جلب بيانات العامل...', 'מאחזר את נתוני העובד...', 'Fetching worker data...')}
                    </div>
                  )}

                  {/* أيام العمل */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'عدد أيام العمل', 'מספר ימי עבודה', 'Number of work days')}</div>
                    <input type="number" inputMode="decimal"
                      value={form.work_days_count} onChange={e => set('work_days_count', e.target.value)}
                      onFocus={() => setFocus('days')} onBlur={() => setFocus('')}
                      style={{ ...inp(focus, 'days'), direction: 'ltr', textAlign: 'left' }} />
                  </div>

                  {/* الراتب الأساسي */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                      {tl(language, 'الراتب الأساسي (₪)', 'שכר בסיס (₪)', 'Base salary (₪)')} <span style={{ color: C.accent }}>*</span>
                    </div>
                    <input type="number" inputMode="decimal" placeholder="0.00"
                      value={form.base_salary} onChange={e => set('base_salary', e.target.value)}
                      onFocus={() => setFocus('base')} onBlur={() => setFocus('')}
                      style={{ ...inp(focus, 'base'), fontSize: 18, fontWeight: 900, direction: 'ltr', textAlign: 'left', color: C.primary }} />
                  </div>

                  {/* السلف */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'سلف مخصومة (₪)', 'מקדמות שנוכו (₪)', 'Advances deducted (₪)')}</div>
                    <input type="number" inputMode="decimal" placeholder="0.00"
                      value={form.advances_paid} onChange={e => set('advances_paid', e.target.value)}
                      onFocus={() => setFocus('adv')} onBlur={() => setFocus('')}
                      style={{ ...inp(focus, 'adv'), direction: 'ltr', textAlign: 'left', color: '#EF4444' }} />
                  </div>

                  {/* الخصومات */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'خصومات أخرى (₪)', 'ניכויים אחרים (₪)', 'Other deductions (₪)')}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" inputMode="decimal" placeholder="0.00"
                        value={form.deductions} onChange={e => set('deductions', e.target.value)}
                        onFocus={() => setFocus('ded')} onBlur={() => setFocus('')}
                        style={{ ...inp(focus, 'ded'), direction: 'ltr', textAlign: 'left', color: '#EF4444' }} />
                      <input placeholder={tl(language, 'سبب الخصم', 'סיבת הניכוי', 'Deduction reason')}
                        value={form.deduction_note} onChange={e => set('deduction_note', e.target.value)}
                        onFocus={() => setFocus('dednote')} onBlur={() => setFocus('')}
                        style={{ ...inp(focus, 'dednote'), flex: 1.5 }} />
                    </div>
                  </div>

                  {/* ملاحظة */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'ملاحظة (اختياري)', 'הערה (אופציונלי)', 'Note (optional)')}</div>
                    <input value={form.notes} onChange={e => set('notes', e.target.value)}
                      placeholder={tl(language, 'أي تفاصيل إضافية...', 'פרטים נוספים...', 'Any additional details...')}
                      onFocus={() => setFocus('notes')} onBlur={() => setFocus('')}
                      style={inp(focus, 'notes')} />
                  </div>

                  {/* Net preview */}
                  <div style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}30`, borderRadius: 14, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>{tl(language, 'صافي الراتب', 'שכר נטו', 'Net pay')}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>
                      ₪{fmt(net)}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <button onClick={handleSave} disabled={!form.base_salary || saving}
                    style={{ width: '100%', padding: '13px', background: !form.base_salary || saving ? 'rgba(255,255,255,0.06)' : GRAD.warm, border: 'none', borderRadius: 14, color: !form.base_salary || saving ? C.textDim : '#fff', fontSize: 14, fontWeight: 800, cursor: !form.base_salary || saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {saving ? tl(language, 'جاري الحفظ...', 'שומר...', 'Saving...') : `${tl(language, 'حفظ القسيمة', 'שמירת התלוש', 'Save slip')} — ₪${fmt(net)}`}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── MAIN: PayrollTab ─────────────────────────────────────────────────────────
export default function PayrollTab({ employees = [], userId }) {
  const language = useAppStore(s => s.language)
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [slips,       setSlips]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [addOpen,     setAddOpen]     = useState(false)
  const [filterWorker, setFilterWorker] = useState('')
  const [filterPaid,   setFilterPaid]   = useState('')
  const [search,       setSearch]       = useState('')

  const bizId   = activeBusiness?.id
  const bizName = activeBusiness?.name ?? ''

  // ─── Load ──────────────────────────────────────────────────────────────
  async function load() {
    if (!bizId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payroll_slips')
        .select('*')
        .eq('business_id', bizId)
        .order('period_start', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setSlips(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bizId])

  // ─── Stats ─────────────────────────────────────────────────────────────
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const totalMonth = useMemo(() =>
    slips.filter(s => s.period_start?.startsWith(thisMonthKey))
         .reduce((sum, s) => sum + Number(s.net_pay), 0)
  , [slips, thisMonthKey])

  const unpaidCount = useMemo(() => slips.filter(s => !s.paid_at).length, [slips])

  const totalAll = useMemo(() => slips.reduce((sum, s) => sum + Number(s.net_pay), 0), [slips])

  // ─── Workers for filter ─────────────────────────────────────────────────
  const usedWorkers = useMemo(() => {
    const map = {}
    slips.forEach(s => { if (s.worker_id) map[s.worker_id] = s.worker_name })
    return Object.entries(map).map(([id, name]) => ({ id, name }))
  }, [slips])

  // ─── Filtered ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = slips
    if (filterWorker) res = res.filter(s => s.worker_id === filterWorker)
    if (filterPaid === 'paid')   res = res.filter(s => !!s.paid_at)
    if (filterPaid === 'unpaid') res = res.filter(s => !s.paid_at)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      res = res.filter(s => s.worker_name?.toLowerCase().includes(q))
    }
    return res
  }, [slips, filterWorker, filterPaid, search])

  // ─── Actions ───────────────────────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase
      .from('payroll_slips').insert(fields).select().single()
    if (error) throw error
    setSlips(prev => [data, ...prev])
    showToast(tl(language, 'تم حفظ القسيمة', 'התלוש נשמר', 'Slip saved'))
  }

  async function handleMarkPaid(id) {
    const slip = slips.find(s => s.id === id)
    const sig  = await bioConfirm(`${tl(language, 'تأكيد صرف', 'אישור תשלום', 'Confirm payment')}: ${slip?.worker_name || ''} — ₪${slip?.net_pay || 0}`, 'payroll')
    if (!sig) return
    const paid_at = todayStr()
    await supabase.from('payroll_slips').update({ paid_at }).eq('id', id)
    setSlips(prev => prev.map(s => s.id === id ? { ...s, paid_at } : s))
    showToast(tl(language, 'تم تأكيد الصرف', 'התשלום אושר', 'Payment confirmed'))
  }

  async function handleDelete(id) {
    const slip = slips.find(s => s.id === id)
    const sig  = await bioConfirm(`${tl(language, 'حذف قسيمة راتب', 'מחיקת תלוש שכר', 'Delete pay slip')}: ${slip?.worker_name || ''} — ₪${slip?.net_pay || 0}`, 'payroll')
    if (!sig) return
    await supabase.from('payroll_slips').delete().eq('id', id)
    setSlips(prev => prev.filter(s => s.id !== id))
    showToast(tl(language, 'تم الحذف', 'נמחק', 'Deleted'))
  }

  if (!activeBusiness) return null

  return (
    <div>
      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: `${C.primary}0F`, border: `1px solid ${C.primary}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>₪{fmt(totalMonth)}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'رواتب هذا الشهر', 'משכורות החודש', 'This month salaries')}</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, fontFamily: 'monospace' }}>₪{fmt(totalAll)}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'إجمالي كل الرواتب', 'סך כל המשכורות', 'All salaries total')}</div>
        </div>
        {unpaidCount > 0 && (
          <div style={{ flex: 1, background: `${C.accent}0F`, border: `1px solid ${C.accent}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{unpaidCount}</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'لم تُصرف بعد', 'טרם שולמו', 'Not yet paid')}</div>
          </div>
        )}
      </div>

      {/* ─── Search ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tl(language, 'بحث باسم العامل...', 'חיפוש לפי שם העובד...', 'Search by worker name...')}
          style={{ width: '100%', padding: '10px 36px 10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {usedWorkers.length > 1 && (
          <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterWorker ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">{tl(language, 'كل العمال', 'כל העובדים', 'All workers')}</option>
            {usedWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <select value={filterPaid} onChange={e => setFilterPaid(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterPaid ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">{tl(language, 'الكل', 'הכול', 'All')}</option>
          <option value="unpaid">{tl(language, 'لم تُصرف', 'טרם שולמו', 'Not paid')}</option>
          <option value="paid">{tl(language, 'مصروفة', 'שולמו', 'Paid')}</option>
        </select>
        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim }}>
          {filtered.length} {tl(language, 'قسيمة', 'תלושים', 'slips')}
        </div>
      </div>

      {/* ─── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>{tl(language, 'تحميل...', 'טוען...', 'Loading...')}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Banknote size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {filterWorker || filterPaid || search ? tl(language, 'لا توجد قسائم لهذا الفلتر', 'אין תלושים לסינון זה', 'No slips for this filter') : tl(language, 'لا توجد قسائم رواتب بعد', 'אין עדיין תלושי שכר', 'No pay slips yet')}
          </div>
          {!filterWorker && !filterPaid && !search && (
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, opacity: 0.7 }}>
              {tl(language, 'اضغط + لإنشاء أول قسيمة', 'לחץ + ליצירת התלוש הראשון', 'Tap + to create your first slip')}
            </div>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(slip => (
            <SlipCard
              key={slip.id}
              slip={slip}
              onMarkPaid={handleMarkPaid}
              onDelete={handleDelete}
              onPrint={s => printSlip(s, bizName, language)}
              language={language}
            />
          ))}
        </AnimatePresence>
      )}

      {/* ─── FAB ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom, 0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAddOpen(true)}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', background: GRAD.warm,
            border: 'none', borderRadius: 50,
            color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${C.primary}44`,
          }}>
          <Plus size={16} strokeWidth={2.5} />
          {tl(language, 'قسيمة راتب جديدة', 'תלוש שכר חדש', 'New pay slip')}
        </motion.button>
      </div>

      {/* Add sheet */}
      <AddSlipSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        businessId={bizId}
        employees={employees}
        userId={userId}
        language={language}
      />
    </div>
  )
}
