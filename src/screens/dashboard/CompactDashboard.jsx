// ════════════════════════════════════════════════════════════════════════════
//  CompactDashboard.jsx — «لوحة مكثّفة» — واجهة بديلة كثيفة بالأرقام للمحترفين
//
//  بديل كامل عن DashboardScreen بنفس الـprops بالضبط: شبكة بلاطات إحصائية صغيرة
//  (نفس معادلات DashboardScreen حرفياً عبر دوال calculations النقيّة، فالأرقام
//  تتطابق مع اللوحة الافتراضية) + أزرار إجراء سريع + أفضل المشاريع + آخر الحركات.
//  حركة واحدة فقط (fade-in للشبكة كلّها) — وضع نفعي سريع بلا عدّادات أو سبرينغات.
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Gauge, Wallet, TrendingUp, HandCoins, Users, Building2, Clock,
  ArrowDownCircle, ArrowUpCircle, CalendarPlus, DollarSign, CreditCard,
  Trophy, Activity, ChevronLeft,
} from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { tl } from '../../lib/labels.js'
import { useAppStore } from '../../store/useAppStore.js'
import {
  calcEarned, calcPaid, calcAdvances, calcRevenue, calcProjectStats, calcMutabqi,
} from '../../lib/calculations.js'
import { IconChip } from '../../ui/Premium.jsx'

const MASK = '•••'

// مبلغ مضغوط: إشارة سالب صريحة «−» + أرقام جدوليّة — أو قناع لمن لا يملك الصلاحية
function money(v, show) {
  if (!show) return MASK
  return `${v < 0 ? '−' : ''}₪${fmt(Math.abs(v || 0))}`
}

// ─── بلاطة إحصائية صغيرة — كثافة قبل الفخامة ──────────────────────────────────
function Tile({ icon: Icon, label, value, color = C.text, dim, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4,
        cursor: onClick ? 'pointer' : 'default', minWidth: 0,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={12} color={dim ? C.textDim : color} strokeWidth={2.4} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 20, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── رأس قسم مصغّر ────────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, color = C.primary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '14px 2px 8px' }}>
      <Icon size={13} color={color} strokeWidth={2.5} />
      <span style={{ fontSize: 11.5, fontWeight: 900, color: C.text, letterSpacing: '-0.01em' }}>{title}</span>
    </div>
  )
}

export default function CompactDashboard({
  projects = [], employees = [], workDays = [], expenses = [],
  payments = [], advances = [], clientReceipts = [], onNav, permissions, soloMode = false,
}) {
  const { language } = useAppStore()
  const setPendingAction = useAppStore(s => s.setPendingAction)
  const L = (ar, he, en) => tl(language, ar, he, en)
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const showAmounts = permissions?.viewAmounts !== false

  // ── الإحصائيات — نفس معادلات DashboardScreen حرفياً (تطابق الأرقام) ─────────
  const stats = useMemo(() => {
    const workerCosts   = calcEarned(workDays.filter(w => w.status === 'approved'))
    const totalRevenue  = calcRevenue(clientReceipts)
    const totalExpenses = expenses.filter(e => !e.employee_id && e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)
    const totalPayments = calcPaid(payments)
    const totalAdvances = calcAdvances(advances)
    const totalWasel    = totalPayments + totalAdvances
    const netProfit     = totalRevenue - totalExpenses - workerCosts
    const activeCount   = projects.filter(p => p.status === 'نشط').length
    const pendingWD     = workDays.filter(w => w.status === 'pending').length
    const cashOnHand    = totalRevenue - (totalExpenses + totalWasel)

    // مستحق للعمال = مجموع المتبقّي لكل عامل (لا يقل عن صفر)
    const owedToWorkers = employees.reduce((s, emp) => {
      const wds  = workDays.filter(w => w.employee_id === emp.id && w.status === 'approved')
      const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
      const pays = payments.filter(p => p.employee_id === emp.id)
      const advs = advances.filter(a => a.employee_id === emp.id)
      return s + Math.max(0, calcMutabqi(wds, wExp, pays, advs))
    }, 0)

    // باقي لك عند العملاء = مجموع (قيمة العقد − المقبوض) للمشاريع التي لها سعر
    let owedByClients = 0
    projects.forEach(p => {
      const price = parseFloat(p.price) || 0
      if (price <= 0) return
      const received = clientReceipts.filter(r => r.project_id === p.id).reduce((s, r) => s + (r.amount || 0), 0)
      if (price - received > 0) owedByClients += price - received
    })

    return { totalRevenue, totalExpenses, netProfit, activeCount, pendingWD, cashOnHand, owedToWorkers, owedByClients }
  }, [projects, employees, workDays, expenses, payments, advances, clientReceipts])

  // ── أفضل المشاريع بالربح — نفس منطق اللوحة الافتراضية ───────────────────────
  const topProjects = useMemo(() => projects
    .filter(p => p.status === 'نشط' || p.status === 'مكتمل')
    .map(p => ({ project: p, profit: calcProjectStats(p.id, workDays, expenses, clientReceipts).profit }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 4), [projects, workDays, expenses, clientReceipts])

  // ── آخر الحركات — دمج مقبوضات/دفعات/مصاريف وترتيب تنازلي بالتاريخ ────────────
  const recent = useMemo(() => {
    const empName = id => employees.find(e => e.id === id)?.name
    const projName = id => projects.find(p => p.id === id)?.name
    const rows = [
      ...clientReceipts.map(r => ({
        key: `r_${r.id}`, date: r.date || '', color: C.success, sign: '+',
        label: projName(r.project_id) || L('قبضة من عميل', 'קבלה מלקוח', 'Client receipt'),
        amount: r.amount || 0,
      })),
      ...payments.map(p => ({
        key: `p_${p.id}`, date: p.date || '', color: C.gold, sign: '−',
        label: empName(p.employee_id) || L('دفعة راتب', 'תשלום שכר', 'Salary payment'),
        amount: p.amount || 0,
      })),
      ...expenses.map(e => ({
        key: `e_${e.id}`, date: e.date || '', color: C.accent, sign: '−',
        label: e.vendor || e.category || L('مصروف', 'הוצאה', 'Expense'),
        amount: e.amount || 0,
      })),
    ]
    return rows.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)).slice(0, 5)
  }, [clientReceipts, payments, expenses, employees, projects, language])

  // ── التاريخ بالرأس ───────────────────────────────────────────────────────────
  const todayLabel = useMemo(() => {
    const loc = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'ar'
    try { return new Date().toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }) }
    catch { return new Date().toISOString().slice(0, 10) }
  }, [language])

  // ── البلاطات (8، تنقص واحدة بوضع solo) ───────────────────────────────────────
  const cashPositive = stats.cashOnHand >= 0
  const tiles = [
    { icon: Wallet, label: L('نقد بالجيب', 'מזומן בכיס', 'Cash on hand'),
      value: money(stats.cashOnHand, showAmounts),
      color: showAmounts ? (cashPositive ? C.success : C.accent) : C.textDim, onClick: () => onNav?.('finance') },
    { icon: TrendingUp, label: L('صافي الربح', 'רווח נקי', 'Net profit'),
      value: money(stats.netProfit, showAmounts),
      color: showAmounts ? (stats.netProfit >= 0 ? C.text : C.accent) : C.textDim, onClick: () => onNav?.('finance') },
    ...(!soloMode ? [{ icon: HandCoins, label: L('مستحق للعمال', 'מגיע לעובדים', 'Owed to workers'),
      value: money(stats.owedToWorkers, showAmounts),
      color: showAmounts ? C.warning : C.textDim, onClick: () => onNav?.('workers') }] : []),
    { icon: Users, label: L('باقي عند العملاء', 'נותר אצל לקוחות', 'Owed by clients'),
      value: money(stats.owedByClients, showAmounts),
      color: showAmounts ? C.cyan : C.textDim, onClick: () => onNav?.('projects') },
    { icon: ArrowDownCircle, label: L('إيرادات', 'הכנסות', 'Revenue'),
      value: money(stats.totalRevenue, showAmounts),
      color: showAmounts ? C.text : C.textDim, onClick: () => onNav?.('finance') },
    { icon: ArrowUpCircle, label: L('مصاريف', 'הוצאות', 'Expenses'),
      value: money(stats.totalExpenses, showAmounts),
      color: showAmounts ? C.text : C.textDim, onClick: () => onNav?.('finance') },
    { icon: Building2, label: L('مشاريع نشطة', 'פרויקטים פעילים', 'Active projects'),
      value: String(stats.activeCount), color: C.text, dim: true, onClick: () => onNav?.('projects') },
    { icon: Clock, label: L('أيام بانتظار موافقة', 'ימים ממתינים לאישור', 'Days awaiting approval'),
      value: String(stats.pendingWD),
      color: stats.pendingWD > 0 ? C.warning : C.text, dim: stats.pendingWD === 0, onClick: () => onNav?.('workers') },
  ]

  // ── إجراءات سريعة — نفس آلية pendingAction القائمة ───────────────────────────
  const actions = [
    { key: 'day', icon: CalendarPlus, label: L('سجّل يوم', 'סמן יום', 'Log day'),
      primary: true, onClick: () => onNav?.('workers') },
    ...(showAmounts ? [{ key: 'receipt', icon: DollarSign, label: L('قبضة', 'קבלה', 'Receipt'), color: C.success,
      onClick: () => { setPendingAction({ type: 'add_receipt' }); onNav?.('finance') } }] : []),
    ...(permissions?.viewExpenses !== false ? [{ key: 'expense', icon: CreditCard, label: L('مصروف', 'הוצאה', 'Expense'), color: C.accent,
      onClick: () => { setPendingAction({ type: 'add_expense' }); onNav?.('finance') } }] : []),
  ]

  const numStyle = { fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }

  return (
    <motion.div dir={dir} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{ padding: '14px 14px 90px', maxWidth: 640, margin: '0 auto' }}>

      {/* ─── الرأس: عنوان صغير + التاريخ ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <IconChip icon={Gauge} color={C.primary} size={30} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>
            {L('لوحة مكثّفة', 'לוח מרוכז', 'Compact board')}
          </div>
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{todayLabel}</div>
        </div>
      </div>

      {/* ─── شبكة البلاطات 2×N ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tiles.map(t => <Tile key={t.label} {...t} />)}
      </div>

      {/* ─── إجراءات سريعة ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${actions.length}, 1fr)`, gap: 8, marginTop: 10 }}>
        {actions.map(a => (
          <button key={a.key} onClick={a.onClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              background: a.primary ? GRAD.primary : C.card,
              border: a.primary ? 'none' : `1px solid ${a.color ? `${a.color}2e` : C.border}`,
            }}>
            <a.icon size={14} color={a.primary ? '#fff' : (a.color || C.text)} strokeWidth={2.4} />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: a.primary ? '#fff' : C.text, whiteSpace: 'nowrap' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ─── أفضل المشاريع ─── */}
      {topProjects.length > 0 && (
        <>
          <SectionHead icon={Trophy} title={L('أفضل المشاريع', 'הפרויקטים המובילים', 'Top projects')} color={C.gold} />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {topProjects.map(({ project, profit }, i) => (
              <div key={project.id} onClick={() => onNav?.('projects')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, height: 40, padding: '0 12px', cursor: 'pointer',
                  borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                <span style={{ fontSize: 10, ...numStyle, color: C.textDim, width: 14, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {project.name}
                </span>
                <span style={{ fontSize: 12.5, ...numStyle, color: showAmounts ? (profit >= 0 ? C.success : C.accent) : C.textDim, flexShrink: 0 }}>
                  {money(profit, showAmounts)}
                </span>
                <ChevronLeft size={13} color={C.textDim} style={{ flexShrink: 0, transform: dir === 'ltr' ? 'rotate(180deg)' : 'none' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── آخر الحركات ─── */}
      {recent.length > 0 && (
        <>
          <SectionHead icon={Activity} title={L('آخر الحركات', 'תנועות אחרונות', 'Latest activity')} color={C.cyan} />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {recent.map((r, i) => (
              <div key={r.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, height: 38, padding: '0 12px',
                  borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0, boxShadow: `0 0 6px ${r.color}73` }} />
                <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.label}
                </span>
                <span style={{ fontSize: 9.5, color: C.textDim, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{r.date ? fmtDate(r.date) : ''}</span>
                <span style={{ fontSize: 12, ...numStyle, color: showAmounts ? r.color : C.textDim, flexShrink: 0, minWidth: 62, textAlign: 'end' }}>
                  {showAmounts ? `${r.sign}₪${fmt(r.amount)}` : MASK}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  )
}
