import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Users, ArrowLeft, Calendar, Banknote,
  TrendingUp, Phone, Star, BarChart3, CreditCard,
  Check, AlertTriangle, Trash2, ChevronRight,
} from 'lucide-react'
import { C, GRAD, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Worker avatar initials ───────────────────────────────────────────────────
function Avatar({ name, size = 42, color = C.primary }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: `${color}20`, border: `1.5px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.35, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{initials}</span>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, label, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px',
      background: active ? `${C.secondary}18` : 'transparent', border: `1px solid ${active ? C.secondary+'40' : 'transparent'}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', flex: 1,
    }}>
      <Icon size={15} color={active ? C.secondary : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.secondary : C.textDim, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

// ─── Add Worker Modal ─────────────────────────────────────────────────────────
function AddWorkerModal({ open, onClose, onSave, specs = [], language }) {
  const [form, setForm] = useState({ name: '', specialty: specs[0] || '', phone: '', daily_rate: '', notes: '' })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const dir = language === 'en' ? 'ltr' : 'rtl'

  function handleSave() {
    if (!form.name.trim()) return
    onSave({ ...form, daily_rate: Number(form.daily_rate) || 0 })
    setForm({ name: '', specialty: specs[0] || '', phone: '', daily_rate: '', notes: '' })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()} dir={dir}
            style={{ width: '100%', maxWidth: 500, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: '24px 24px 0 0', padding: '20px 18px 36px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 18 }}>
              {language === 'he' ? 'עובד חדש' : language === 'en' ? 'New Worker' : 'عامل جديد'}
            </div>

            {[
              { key: 'name', label: language === 'he' ? 'שם' : language === 'en' ? 'Name' : 'الاسم', type: 'text' },
              { key: 'phone', label: language === 'he' ? 'טלפון' : language === 'en' ? 'Phone' : 'الهاتف', type: 'tel' },
              { key: 'daily_rate', label: language === 'he' ? 'שכר יומי' : language === 'en' ? 'Daily Rate' : 'الأجر اليومي', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{label}</label>
                <input value={form[key]} onChange={f(key)} type={type}
                  style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}

            {specs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
                  {language === 'he' ? 'התמחות' : language === 'en' ? 'Specialty' : 'التخصص'}
                </label>
                <select value={form.specialty} onChange={f('specialty')}
                  style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {specs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'he' ? 'ביטול' : language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                style={{ flex: 2, padding: '12px', borderRadius: 14, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}>
                {language === 'he' ? 'שמור' : language === 'en' ? 'Save' : 'حفظ'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Worker Detail ────────────────────────────────────────────────────────────
function WorkerDetail({ worker, workDays, payments, advances, projects, onClose, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, addPayment, deletePayment, addAdvance, deleteAdvance, payMethods, permissions, language }) {
  const [tab, setTab] = useState('overview')
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const eid = worker.id
  const wWorkers = workDays.filter(w => w.employee_id === eid)
  const wPayments = payments.filter(p => p.employee_id === eid)
  const wAdvances = advances.filter(a => a.employee_id === eid)

  const totalEarned = wWorkers.reduce((s, w) => {
    const rate = w.daily_rate || 0
    if (w.day_type === 'נص יוم') return s + rate / 2
    if (w.day_type === 'ساعات') return s + (rate / 8) * (w.hours || 0)
    if (w.day_type === 'مبلغ مسكر') return s + (w.fixed_amount || rate)
    return s + rate
  }, 0)
  const totalPaid    = wPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalAdvances = wAdvances.reduce((s, a) => s + (a.amount || 0), 0)
  const balance = totalEarned - totalPaid - totalAdvances

  const TABS = [
    { id: 'overview', icon: BarChart3, label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'ملخص' },
    { id: 'workdays', icon: Calendar,  label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'payments', icon: Banknote,  label: language === 'he' ? 'שכר' : language === 'en' ? 'Salary' : 'رواتب' },
    { id: 'advances', icon: CreditCard, label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'سلف' },
  ]

  const colors = [C.secondary, C.primary, C.gold, C.cyan]

  return (
    <div dir={dir} style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}`, background: C.surface, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} color={C.textDim} style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </button>
        <Avatar name={worker.name} size={38} color={C.secondary} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{worker.name}</div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{worker.specialty || ''}</div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: balance >= 0 ? C.warning : C.success }}>
            {balance >= 0 ? language === 'he' ? 'חייב' : language === 'en' ? 'Owed' : 'مستحق' : language === 'he' ? 'دفعت زيادة' : language === 'en' ? 'Overpaid' : 'دفعت زيادة'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: balance >= 0 ? C.warning : C.success }}>₪{fmt(Math.abs(balance))}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'סה"כ הרוויח' : language === 'en' ? 'Total Earned' : 'إجمالي المستحق', value: `₪${fmt(totalEarned)}`, color: C.success },
                { label: language === 'he' ? 'שולם' : language === 'en' ? 'Paid' : 'المدفوع', value: `₪${fmt(totalPaid)}`, color: C.secondary },
                { label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'السلف', value: `₪${fmt(totalAdvances)}`, color: C.accent },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: wWorkers.length, color: C.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {worker.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                <Phone size={15} color={C.cyan} strokeWidth={2} />
                <span style={{ fontSize: 13, color: C.text, direction: 'ltr' }}>{worker.phone}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'workdays' && (
          <div>
            {wWorkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days' : 'لا توجد أيام عمل'}
              </div>
            ) : wWorkers.slice().reverse().map(wd => {
              const project = projects?.find(p => p.id === wd.project_id)
              return (
                <div key={wd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.secondary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={13} color={C.secondary} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDate(wd.date)}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{project?.name || ''} · {wd.day_type}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.secondary }}>₪{fmt(wd.daily_rate || 0)}</div>
                    {wd.status === 'pending' && <div style={{ fontSize: 9, color: C.warning, marginTop: 1 }}>{language === 'he' ? 'ממתין' : language === 'en' ? 'Pending' : 'معلق'}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            {wPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין תשלומים' : language === 'en' ? 'No payments' : 'لا توجد رواتب'}
              </div>
            ) : wPayments.slice().reverse().map(pay => (
              <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.success}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Banknote size={13} color={C.success} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{pay.method || ''}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.success }}>₪{fmt(pay.amount || 0)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'advances' && (
          <div>
            {wAdvances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין מקדמות' : language === 'en' ? 'No advances' : 'لا توجد سلف'}
              </div>
            ) : wAdvances.slice().reverse().map(adv => (
              <div key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={13} color={C.accent} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{adv.notes || (language === 'en' ? 'Advance' : language === 'he' ? 'מקדמה' : 'سلفة')}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(adv.date)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>-₪{fmt(adv.amount || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkersScreen({
  employees = [], workDays = [], payments = [], advances = [], expenses = [],
  projects = [],
  addEmployee, updateEmployee, deleteEmployee,
  addAdvance, deleteAdvance,
  addWorkDay, bulkAddWorkDays, updateWorkDay, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addPayment, updatePayment, deletePayment,
  specs = [], permissions, holidays = [], addHoliday, deleteHoliday,
  teamMembers = [], addMember, updateMember, removeMember, blockMember,
  resetMemberPassword, getActivity, teamLoadError, reloadTeam,
  payMethods = [], profile,
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const allSpecs = useMemo(() => ['all', ...new Set(employees.map(e => e.specialty).filter(Boolean))], [employees])

  const filtered = useMemo(() => {
    let list = employees
    if (search) list = list.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()) || e.specialty?.toLowerCase().includes(search.toLowerCase()))
    if (specFilter !== 'all') list = list.filter(e => e.specialty === specFilter)
    return list
  }, [employees, search, specFilter])

  // Per-worker stats
  const workerStats = useMemo(() => {
    const map = {}
    for (const e of employees) {
      const eid = e.id
      const wds = workDays.filter(w => w.employee_id === eid)
      const paid = payments.filter(p => p.employee_id === eid).reduce((s, p) => s + (p.amount || 0), 0)
      const adv  = advances.filter(a => a.employee_id === eid).reduce((s, a) => s + (a.amount || 0), 0)
      const earned = wds.reduce((s, w) => {
        const rate = w.daily_rate || 0
        if (w.day_type === 'נص יוم') return s + rate / 2
        if (w.day_type === 'ساعات') return s + (rate / 8) * (w.hours || 0)
        if (w.day_type === 'مبلغ مسكر') return s + (w.fixed_amount || rate)
        return s + rate
      }, 0)
      map[eid] = { earned, paid, adv, balance: earned - paid - adv, days: wds.length, pending: wds.filter(w => w.status === 'pending').length }
    }
    return map
  }, [employees, workDays, payments, advances])

  if (selected) {
    return (
      <WorkerDetail
        worker={selected}
        workDays={workDays} payments={payments} advances={advances} projects={projects}
        onClose={() => setSelected(null)}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        addPayment={addPayment} deletePayment={deletePayment}
        addAdvance={addAdvance} deleteAdvance={deleteAdvance}
        payMethods={payMethods} permissions={permissions} language={language}
      />
    )
  }

  const totalOwed = Object.values(workerStats).reduce((s, v) => s + Math.max(0, v.balance), 0)

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('workers.title')}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{employees.length} {language === 'he' ? 'עובדים' : language === 'en' ? 'workers' : 'عامل'}</div>
        </div>
        {permissions?.addWorkers !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' }}>
            <Plus size={15} strokeWidth={2.5} />
            {language === 'he' ? 'חדש' : language === 'en' ? 'New' : 'جديد'}
          </motion.button>
        )}
      </div>

      {/* Summary */}
      {employees.length > 0 && (
        <div className="grid-3" style={{ gap: 8, marginBottom: 16 }}>
          {[
            { label: language === 'he' ? 'עובדים' : language === 'en' ? 'Workers' : 'عمال', value: employees.length, color: C.secondary },
            { label: language === 'he' ? 'חייבים' : language === 'en' ? 'Owed' : 'مستحق', value: `₪${fmt(totalOwed)}`, color: C.warning, small: true },
            { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: workDays.length, color: C.primary },
          ].map(({ label, value, color, small }) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: small ? 12 : 18, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש עובד...' : language === 'en' ? 'Search workers...' : 'ابحث عن عامل...'}
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {/* Spec filter */}
      {allSpecs.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {allSpecs.map(s => (
            <button key={s} onClick={() => setSpecFilter(s)}
              style={{ padding: '5px 12px', borderRadius: 10, background: specFilter === s ? GRAD.premium : 'rgba(255,255,255,0.05)', border: `1px solid ${specFilter === s ? 'transparent' : C.border}`, color: specFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {s === 'all' ? (language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل') : s}
            </button>
          ))}
        </div>
      )}

      {/* Worker list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.secondary}18`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Users size={26} color={C.secondary} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('workers.empty')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((worker, i) => {
            const ws = workerStats[worker.id] || {}
            return (
              <motion.div key={worker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(worker)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: ws.balance > 0 ? 10 : 0 }}>
                  <Avatar name={worker.name} size={44} color={C.secondary} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{worker.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{worker.specialty || ''} {worker.phone ? `· ${worker.phone}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>
                      {language === 'he' ? 'מאזן' : language === 'en' ? 'Balance' : 'الرصيد'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: ws.balance > 0 ? C.warning : C.success }}>
                      ₪{fmt(Math.abs(ws.balance || 0))}
                    </div>
                  </div>
                </div>

                {(ws.days > 0 || ws.balance > 0) && (
                  <div className="grid-3" style={{ gap: 6 }}>
                    {[
                      { label: language === 'he' ? 'הרוויח' : language === 'en' ? 'Earned' : 'المستحق', value: `₪${fmt(ws.earned || 0)}`, color: C.success },
                      { label: language === 'he' ? 'שולם' : language === 'en' ? 'Paid' : 'المدفوع', value: `₪${fmt(ws.paid || 0)}`, color: C.secondary },
                      { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: ws.days || 0, color: C.primary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: C.card, borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {ws.pending > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                    <AlertTriangle size={11} color={C.warning} strokeWidth={2} />
                    <span style={{ fontSize: 10, color: C.warning, fontWeight: 700 }}>{ws.pending} {language === 'he' ? 'ממתינים' : language === 'en' ? 'pending' : 'بانتظار الموافقة'}</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <AddWorkerModal open={showAdd} onClose={() => setShowAdd(false)} onSave={addEmployee} specs={specs} language={language} />
    </div>
  )
}
