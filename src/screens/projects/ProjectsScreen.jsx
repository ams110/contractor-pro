import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Building2, TrendingUp, TrendingDown, Clock,
  ChevronRight, X, Calendar, CreditCard, ReceiptText, Package,
  ClipboardList, Check, Trash2, Edit3, ArrowLeft, Filter,
  DollarSign, Banknote, BarChart3, FileText, AlertTriangle,
  ChevronDown, CheckCircle2, CircleDot,
} from 'lucide-react'
import { C, GRAD, PROJECT_STATUS, PROJECT_TYPES, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusColor(s) {
  const m = { 'نشط': C.success, 'مكتمل': C.secondary, 'ملغي': C.accent, 'عرض سعر': C.warning, 'موافق عليه': C.cyan }
  return m[s] || C.textDim
}

function calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments) {
  const pid = project.id
  const revenue  = clientReceipts.filter(r => r.project_id === pid).reduce((s, r) => s + (r.amount || 0), 0)
  const expTotal = expenses.filter(e => e.project_id === pid).reduce((s, e) => s + (e.amount || 0), 0)
  const wdList   = workDays.filter(w => w.project_id === pid)
  const wdCost   = wdList.reduce((s, w) => {
    const rate = w.daily_rate || 0
    if (w.day_type === 'נص יוم') return s + rate / 2
    if (w.day_type === 'ساعات') return s + (rate / 8) * (w.hours || 0)
    if (w.day_type === 'مبلغ مسكر') return s + (w.fixed_amount || rate)
    return s + rate
  }, 0)
  const profit = revenue - expTotal - wdCost
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : null
  return { revenue, expTotal, wdCost, profit, margin, wdCount: wdList.length, pending: wdList.filter(w => w.status === 'pending').length }
}

// ─── UI components ───────────────────────────────────────────────────────────
function TabBtn({ active, label, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 6px',
      background: active ? `${C.primary}15` : 'transparent', border: `1px solid ${active ? C.primary+'40' : 'transparent'}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', minWidth: 52, flex: 1,
    }}>
      <Icon size={16} color={active ? C.primary : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.primary : C.textDim, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

function SectionLabel({ children, color = C.textDim }) {
  return <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, marginTop: 2 }}>{children}</div>
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: color || C.text }}>{value}</span>
    </div>
  )
}

// ─── Add Project Modal ────────────────────────────────────────────────────────
function AddProjectModal({ open, onClose, onSave, language }) {
  const [form, setForm] = useState({ name: '', type: PROJECT_TYPES[0], status: 'نشط', budget: '', notes: '' })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const dir = language === 'en' ? 'ltr' : 'rtl'

  function handleSave() {
    if (!form.name.trim()) return
    onSave({ ...form, budget: Number(form.budget) || 0, date: todayStr() })
    setForm({ name: '', type: PROJECT_TYPES[0], status: 'نشط', budget: '', notes: '' })
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
            onClick={e => e.stopPropagation()}
            dir={dir}
            style={{ width: '100%', maxWidth: 500, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: '24px 24px 0 0', padding: '20px 18px 36px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 18 }}>
              {language === 'he' ? 'פרויקט חדש' : language === 'en' ? 'New Project' : 'مشروع جديد'}
            </div>

            {[
              { key: 'name', label: language === 'he' ? 'שם' : language === 'en' ? 'Name' : 'الاسم', type: 'text', required: true },
              { key: 'budget', label: language === 'he' ? 'תקציב' : language === 'en' ? 'Budget' : 'الميزانية', type: 'number' },
            ].map(({ key, label, type, required }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{label}</label>
                <input value={form[key]} onChange={f(key)} type={type}
                  style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
                {language === 'he' ? 'סוג' : language === 'en' ? 'Type' : 'النوع'}
              </label>
              <select value={form.type} onChange={f('type')}
                style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
                {language === 'he' ? 'הערות' : language === 'en' ? 'Notes' : 'ملاحظات'}
              </label>
              <textarea value={form.notes} onChange={f('notes')} rows={2}
                style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'he' ? 'ביטול' : language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                style={{ flex: 2, padding: '12px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(249,115,22,0.35)' }}>
                {language === 'he' ? 'שמור' : language === 'en' ? 'Save' : 'حفظ'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────
function ProjectDetail({ project, workDays, expenses, clientReceipts, employees, payments, onClose, onUpdate, onDelete, addReceipt, updateReceipt, deleteReceipt, addExpense, deleteExpense, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, expCats, payMethods, permissions, holidays, language }) {
  const [tab, setTab] = useState('overview')
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const pid = project.id
  const pWorkDays = workDays.filter(w => w.project_id === pid)
  const pExpenses = expenses.filter(e => e.project_id === pid)
  const pReceipts = clientReceipts.filter(r => r.project_id === pid)
  const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)

  const TABS = [
    { id: 'overview',  icon: BarChart3,    label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'نظرة عامة' },
    { id: 'workdays',  icon: Calendar,     label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'expenses',  icon: CreditCard,   label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف' },
    { id: 'receipts',  icon: ReceiptText,  label: language === 'he' ? 'קבלות' : language === 'en' ? 'Receipts' : 'قبضات' },
  ]

  return (
    <div dir={dir} style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}`, background: C.surface, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} color={C.textDim} style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
          <div style={{ fontSize: 10, color: statusColor(project.status), marginTop: 1, fontWeight: 700 }}>{project.status}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: stats.profit >= 0 ? C.success : C.accent }}>
          {stats.profit >= 0 ? '+' : ''}₪{fmt(stats.profit)}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'الإيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success },
                { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'المصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent },
                { label: language === 'he' ? 'שכר' : language === 'en' ? 'Labor' : 'أجور', value: `₪${fmt(stats.wdCost)}`, color: C.secondary },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: stats.wdCount, color: C.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            {stats.margin && (
              <div style={{ background: `${stats.profit >= 0 ? C.success : C.accent}12`, border: `1px solid ${stats.profit >= 0 ? C.success : C.accent}28`, borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'מרג\'ין' : language === 'en' ? 'Profit Margin' : 'هامش الربح'}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: stats.profit >= 0 ? C.success : C.accent }}>{stats.margin}%</span>
              </div>
            )}
          </div>
        )}

        {tab === 'workdays' && (
          <div>
            {pWorkDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days yet' : 'لا توجد أيام عمل'}
              </div>
            ) : pWorkDays.map(wd => {
              const emp = employees.find(e => e.id === wd.employee_id)
              return (
                <div key={wd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={14} color={C.primary} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{emp?.name || '—'}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(wd.date)} · {wd.day_type}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>₪{fmt(wd.daily_rate || 0)}</div>
                  {wd.status === 'pending' && permissions?.isOwner && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => approveWorkDay(wd.id)} style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: C.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'expenses' && (
          <div>
            {pExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין הוצאות' : language === 'en' ? 'No expenses yet' : 'لا توجد مصاريف'}
              </div>
            ) : pExpenses.map(exp => (
              <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={14} color={C.accent} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{exp.category || exp.description || '—'}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(exp.date)}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>₪{fmt(exp.amount || 0)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'receipts' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                {language === 'he' ? 'סה"כ' : language === 'en' ? 'Total Received' : 'إجمالي المقبوضات'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.success }}>₪{fmt(stats.revenue)}</div>
            </div>
            {pReceipts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין קבלות' : language === 'en' ? 'No receipts yet' : 'لا توجد قبضات'}
              </div>
            ) : pReceipts.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.success}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ReceiptText size={14} color={C.success} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.description || r.notes || (language === 'en' ? 'Receipt' : 'قبضة')}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(r.date)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.success }}>+₪{fmt(r.amount || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProjectsScreen({
  projects = [], workDays = [], expenses = [], clientReceipts = [],
  employees = [], payments = [], advances = [],
  addProject, updateProject, deleteProject,
  addReceipt, updateReceipt, deleteReceipt,
  addWorkDay, bulkAddWorkDays, updateWorkDay, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addExpense, deleteExpense, expCats = [],
  userId, permissions, payMethods = [], holidays = [],
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const statusFilters = ['all', 'نشط', 'مكتمل', 'عرض سعر', 'ملغي']
  const statusLabel = s => ({ all: language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل', 'نشط': language === 'he' ? 'פעיל' : language === 'en' ? 'Active' : 'نشط', 'مكتمل': language === 'he' ? 'הושלם' : language === 'en' ? 'Done' : 'مكتمل', 'عرض سعر': language === 'he' ? 'הצעת מחיר' : language === 'en' ? 'Quote' : 'عرض سعر', 'ملغي': language === 'he' ? 'בוטל' : language === 'en' ? 'Cancelled' : 'ملغي' })[s] || s

  const filtered = useMemo(() => {
    let list = projects
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter)
    return list
  }, [projects, search, statusFilter])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        workDays={workDays} expenses={expenses} clientReceipts={clientReceipts}
        employees={employees} payments={payments}
        onClose={() => setSelected(null)}
        onUpdate={updateProject} onDelete={deleteProject}
        addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt}
        addExpense={addExpense} deleteExpense={deleteExpense}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        expCats={expCats} payMethods={payMethods} permissions={permissions}
        holidays={holidays} language={language}
      />
    )
  }

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('projects.title')}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{projects.length} {language === 'he' ? 'פרויקטים' : language === 'en' ? 'projects' : 'مشروع'}</div>
        </div>
        {permissions?.addProjects !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(249,115,22,0.35)' }}>
            <Plus size={15} strokeWidth={2.5} />
            {language === 'he' ? 'חדש' : language === 'en' ? 'New' : 'جديد'}
          </motion.button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש פרויקט...' : language === 'en' ? 'Search projects...' : 'ابحث عن مشروع...'}
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '5px 12px', borderRadius: 10, background: statusFilter === s ? GRAD.primary : 'rgba(255,255,255,0.05)', border: `1px solid ${statusFilter === s ? 'transparent' : C.border}`, color: statusFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: language === 'he' ? 'פעילים' : language === 'en' ? 'Active' : 'نشطة', value: projects.filter(p => p.status === 'نشط').length, color: C.success },
            { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(clientReceipts.reduce((s, r) => s + (r.amount || 0), 0))}`, color: C.primary, small: true },
            { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف', value: `₪${fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}`, color: C.accent, small: true },
          ].map(({ label, value, color, small }) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: small ? 12 : 18, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Project list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.primary}18`, border: `1px solid ${C.primary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Building2 size={26} color={C.primary} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('projects.empty')}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>{language === 'he' ? 'הוסף את הפרויקט הראשון שלך' : language === 'en' ? 'Add your first project' : 'أضف مشروعك الأول'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((project, i) => {
            const stats = calcProjectStats(project, workDays, expenses, clientReceipts, employees, payments)
            const isProfit = stats.profit >= 0
            return (
              <motion.div key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(project)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>

                {/* Status indicator */}
                <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: 3, height: '100%', background: statusColor(project.status), borderRadius: '0 3px 3px 0' }} />

                <div style={{ paddingInlineStart: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(project.status), background: `${statusColor(project.status)}18`, padding: '2px 7px', borderRadius: 6 }}>{project.status || 'نشط'}</span>
                        {project.type && <span style={{ fontSize: 10, color: C.textDim }}>{project.type}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0, marginInlineStart: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: isProfit ? C.success : C.accent }}>
                        {isProfit ? '+' : ''}₪{fmt(stats.profit)}
                      </div>
                      {stats.margin && <div style={{ fontSize: 9, color: C.textDim }}>{stats.margin}%</div>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { label: language === 'he' ? 'הכנסות' : language === 'en' ? 'Revenue' : 'إيرادات', value: `₪${fmt(stats.revenue)}`, color: C.success },
                      { label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف', value: `₪${fmt(stats.expTotal)}`, color: C.accent },
                      { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: stats.wdCount, color: C.primary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: C.card, borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {stats.pending > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                      <AlertTriangle size={11} color={C.warning} strokeWidth={2} />
                      <span style={{ fontSize: 10, color: C.warning, fontWeight: 700 }}>{stats.pending} {language === 'he' ? 'ממתינים' : language === 'en' ? 'pending' : 'بانتظار الموافقة'}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AddProjectModal open={showAdd} onClose={() => setShowAdd(false)} onSave={addProject} language={language} />
    </div>
  )
}
