import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  CreditCard, Banknote, Calculator, TrendingDown, TrendingUp,
  Plus, Search, ReceiptText, DollarSign, Filter, Calendar,
  ArrowUpRight, ChevronRight, PieChart,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { C, GRAD, EXP_CATS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ active, label, icon: Icon, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 6px',
      background: active ? `${C.gold}18` : 'transparent',
      border: `1px solid ${active ? C.gold+'40' : 'transparent'}`,
      borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
    }}>
      <Icon size={16} color={active ? C.gold : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9.5, fontWeight: active ? 800 : 600, color: active ? C.gold : C.textDim }}>{label}</span>
      {badge > 0 && (
        <div style={{ position: 'absolute', top: 4, insetInlineEnd: 8, minWidth: 14, height: 14, borderRadius: 7, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff', padding: '0 3px' }}>{badge}</div>
      )}
    </button>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
function ExpensesTab({ expenses = [], projects = [], employees = [], expCats = [], addExpense, deleteExpense, userId, permissions, businessType, language }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const cats = useMemo(() => ['all', ...new Set(expenses.map(e => e.category).filter(Boolean))], [expenses])

  const filtered = useMemo(() => {
    let list = expenses
    if (search) list = list.filter(e => (e.category + e.description + e.notes).toLowerCase().includes(search.toLowerCase()))
    if (catFilter !== 'all') list = list.filter(e => e.category === catFilter)
    return list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [expenses, search, catFilter])

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div dir={dir}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.accent, letterSpacing: '-0.02em' }}>₪{fmt(total)}</div>
          <div style={{ fontSize: 10, color: C.textDim }}>{filtered.length} {language === 'he' ? 'פריטים' : language === 'en' ? 'items' : 'عنصر'}</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {(permissions?.addExpenses !== false) && (
            <motion.button whileTap={{ scale: 0.94 }}
              onClick={() => {/* Add expense inline */}}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, background: GRAD.danger, border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} strokeWidth={2.5} />
              {language === 'he' ? 'הוסף' : language === 'en' ? 'Add' : 'إضافة'}
            </motion.button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש הוצאה...' : language === 'en' ? 'Search expenses...' : 'ابحث...'}
          style={{ width: '100%', padding: '9px 11px 9px 32px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {cats.slice(0, 6).map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding: '4px 11px', borderRadius: 9, background: catFilter === c ? GRAD.danger : 'rgba(255,255,255,0.05)', border: `1px solid ${catFilter === c ? 'transparent' : C.border}`, color: catFilter === c ? '#fff' : C.textDim, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {c === 'all' ? (language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل') : c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim, fontSize: 13 }}>
          {language === 'he' ? 'אין הוצאות' : language === 'en' ? 'No expenses' : 'لا توجد مصاريف'}
        </div>
      ) : filtered.map(exp => {
        const project = projects.find(p => p.id === exp.project_id)
        return (
          <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={14} color={C.accent} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.category || exp.description || '—'}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{fmtDate(exp.date)} {project ? `· ${project.name}` : ''}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, flexShrink: 0 }}>-₪{fmt(exp.amount || 0)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ payments = [], employees = [], workDays = [], expenses = [], projects = [], addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest, userId, permissions, payMethods = [], language }) {
  const [search, setSearch] = useState('')
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const sorted = useMemo(() => payments.filter(p => !search || employees.find(e => e.id === p.employee_id)?.name?.toLowerCase().includes(search.toLowerCase())).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), [payments, employees, search])
  const total = sorted.reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div dir={dir}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.secondary, letterSpacing: '-0.02em' }}>₪{fmt(total)}</div>
        <div style={{ fontSize: 10, color: C.textDim }}>{sorted.length} {language === 'he' ? 'תשלומים' : language === 'en' ? 'payments' : 'دفعة'}</div>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש עובד...' : language === 'en' ? 'Search worker...' : 'ابحث عن عامل...'}
          style={{ width: '100%', padding: '9px 11px 9px 32px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
          {language === 'he' ? 'אין תשלומים' : language === 'en' ? 'No payments' : 'لا توجد رواتب'}
        </div>
      ) : sorted.map(pay => {
        const emp = employees.find(e => e.id === pay.employee_id)
        return (
          <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.secondary}18`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Banknote size={14} color={C.secondary} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{emp?.name || '—'}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)} · {pay.method || ''}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.secondary, flexShrink: 0 }}>₪{fmt(pay.amount || 0)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Accounting Tab ───────────────────────────────────────────────────────────
function AccountingTab({ expenses = [], payments = [], clientReceipts = [], employees = [], projects = [], taxAdvances = [], pensionMonthly, businessType, language }) {
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const totalRevenue  = clientReceipts.reduce((s, r) => s + (r.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const netProfit     = totalRevenue - totalExpenses - totalPayments

  // Monthly breakdown (last 6 months)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const rev = clientReceipts.filter(r => r.date?.startsWith(key)).reduce((s, r) => s + (r.amount || 0), 0)
    const exp = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
    const pay = payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + (p.amount || 0), 0)
    return { month: key.slice(5), rev, exp: exp + pay, profit: rev - exp - pay }
  })

  const Row = ({ label, value, color, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: bold ? C.text : C.textDim, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 900 : 600, color: color || C.text }}>{value}</span>
    </div>
  )

  return (
    <div dir={dir}>
      {/* P&L Summary */}
      <div style={{ background: netProfit >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${netProfit >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 18, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6 }}>
          {language === 'he' ? 'רווח נקי' : language === 'en' ? 'Net Profit' : 'صافي الربح'}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: netProfit >= 0 ? C.success : C.accent, letterSpacing: '-0.03em' }}>
          {netProfit >= 0 ? '+' : ''}₪{fmt(netProfit)}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', marginBottom: 16 }}>
        <Row label={language === 'he' ? 'סה"כ הכנסות' : language === 'en' ? 'Total Revenue' : 'إجمالي الإيرادات'} value={`₪${fmt(totalRevenue)}`} color={C.success} />
        <Row label={language === 'he' ? 'סה"כ הוצאות' : language === 'en' ? 'Total Expenses' : 'إجمالي المصاريف'} value={`-₪${fmt(totalExpenses)}`} color={C.accent} />
        <Row label={language === 'he' ? 'סה"כ שכר' : language === 'en' ? 'Total Salaries' : 'إجمالي الرواتب'} value={`-₪${fmt(totalPayments)}`} color={C.secondary} />
        <Row label={language === 'he' ? 'רווח נקי' : language === 'en' ? 'Net Profit' : 'صافي الربح'} value={`₪${fmt(netProfit)}`} color={netProfit >= 0 ? C.success : C.accent} bold />
      </div>

      {/* Monthly chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>
          {language === 'he' ? 'ביצועים חודשיים' : language === 'en' ? 'Monthly Performance' : 'الأداء الشهري'}
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }}
              formatter={v => [`₪${fmt(v)}`, '']}
            />
            <Bar dataKey="rev" fill={`${C.success}60`} radius={[4, 4, 0, 0]} />
            <Bar dataKey="exp" fill={`${C.accent}60`} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FinanceScreen({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], clientReceipts = [], advances = [],
  expCats = [], addExpense, deleteExpense, approveExpense, rejectExpense,
  addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest,
  taxAdvances = [], addTaxAdvance, deleteTaxAdvance,
  pensionMonthly, setPensionMonthly, businessType, setBusinessType,
  userId, permissions, payMethods = [],
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const [tab, setTab] = useState('accounting')

  const pendingExpenses = expenses.filter(e => e.status === 'pending').length
  const pendingPayments = payments.filter(p => p.status === 'pending').length

  const TABS = [
    { id: 'accounting', icon: Calculator, label: language === 'he' ? 'חשבונות' : language === 'en' ? 'Accounting' : 'محاسبة' },
    { id: 'expenses',   icon: CreditCard, label: language === 'he' ? 'הוצאות' : language === 'en' ? 'Expenses' : 'مصاريف', badge: pendingExpenses },
    { id: 'payments',   icon: Banknote,   label: language === 'he' ? 'שכר' : language === 'en' ? 'Salary' : 'رواتب', badge: pendingPayments },
  ]

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('finance.title')}</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
          {language === 'he' ? 'ניהול כספים ומעקב' : language === 'en' ? 'Financial management & tracking' : 'إدارة مالية متكاملة'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 6 }}>
        {TABS.map(t => (
          <Tab key={t.id} active={tab === t.id} label={t.label} icon={t.icon} badge={t.badge} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {tab === 'accounting' && (
        <AccountingTab
          expenses={expenses} payments={payments} clientReceipts={clientReceipts}
          employees={employees} projects={projects}
          taxAdvances={taxAdvances} pensionMonthly={pensionMonthly} businessType={businessType}
          language={language}
        />
      )}

      {tab === 'expenses' && (
        <ExpensesTab
          expenses={expenses} projects={projects} employees={employees}
          expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense}
          userId={userId} permissions={permissions} businessType={businessType}
          language={language}
        />
      )}

      {tab === 'payments' && (
        <PaymentsTab
          payments={payments} employees={employees} workDays={workDays}
          expenses={expenses} projects={projects}
          addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment}
          approvePaymentRequest={approvePaymentRequest} rejectPaymentRequest={rejectPaymentRequest}
          userId={userId} permissions={permissions} payMethods={payMethods}
          language={language}
        />
      )}
    </div>
  )
}
