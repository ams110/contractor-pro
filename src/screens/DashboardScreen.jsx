import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, AlertOctagon,
  CalendarDays, CreditCard, Building2, Banknote, Users,
  ChevronLeft, ChevronDown, ChevronUp, Star, Clock,
  Wallet, BarChart3, ArrowUpRight, Info, Trophy,
} from 'lucide-react'
import { C, GRAD, EXP_CATS, VAT, OSEK_PATUR_THRESHOLD } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcVATNet, calcBituachLeumi, calcBituachLeumiAnnual, estimateIncomeTax, pensionTaxSaving, isPaymentOverdue } from '../lib/helpers.js'
import { StatCard as LegacyStatCard, AnimatedNumber } from '../components/index.jsx'
import { StatCard } from '../ui/index.js'
import TaxDashboard from '../components/TaxDashboard.jsx'

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = C.primary }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={color} strokeWidth={2.2} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}22, transparent)` }} />
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function CollapseSection({ icon: Icon, title, color = C.primary, gradient, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 14 }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: gradient || `linear-gradient(90deg, ${color}18, ${color}08)`, borderRadius: 14, border: `1px solid ${color}33`, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{title}</span>
        </div>
        {open ? <ChevronUp size={15} color={C.textDim} /> : <ChevronDown size={15} color={C.textDim} />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 10 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tax advance block ────────────────────────────────────────────────────────
function TaxAdvanceBlock({ title, icon: Icon, color, estimate, paid, records, onAdd, onDelete, hint }) {
  const [open, setOpen] = useState(false)
  const remaining = Math.max(0, estimate - paid)
  const pct = estimate > 0 ? Math.min(100, Math.round((paid / estimate) * 100)) : 0

  return (
    <div style={{ padding: '13px 14px', background: C.card, borderRadius: 14, border: `1px solid ${color}18` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={color} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{title}</div>
            {hint && <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{hint}</div>}
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onAdd} style={{ padding: '5px 12px', borderRadius: 9, border: `1px solid ${color}44`, background: `${color}15`, color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ دفعة</motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { l: 'تقدير السنة', v: `${fmt(estimate)}₪`, c: C.textDim },
          { l: 'مدفوع',       v: `${fmt(paid)}₪`,     c: C.success },
          { l: 'متبقي',       v: `${fmt(remaining)}₪`, c: remaining > 0 ? color : C.success },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {estimate > 0 && (
        <>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 3, background: pct >= 100 ? C.success : color }}
            />
          </div>
          <div style={{ fontSize: 9, color: C.textDim, textAlign: 'center', marginBottom: 8 }}>{pct}% مدفوع من التقدير</div>
        </>
      )}

      {records.length > 0 && (
        <button onClick={() => setOpen(o => !o)} style={{ fontSize: 10, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: open ? 8 : 0, fontFamily: 'inherit' }}>
          {open ? '▲ إخفاء السجل' : `▼ عرض ${records.length} دفعة`}
        </button>
      )}
      {open && [...records].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{fmt(r.amount)}₪</span>
            {r.period && <span style={{ fontSize: 10, color: C.textDim, marginRight: 6 }}>({r.period})</span>}
            <span style={{ fontSize: 10, color: C.textDim }}> · {r.date}</span>
          </div>
          <button onClick={() => onDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: 16, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardScreen({
  projects, employees, workDays, expenses, payments, clientReceipts, onNav, permissions,
  taxAdvances = [], addTaxAdvance, deleteTaxAdvance,
  pensionMonthly = 0, setPensionMonthly,
  taxEnabled = true, businessType = 'osek_moreh', taxModules = {},
}) {
  const [filterProjId, setFilterProjId] = useState(null)
  const [addingTax,    setAddingTax]    = useState(null)
  const [taxForm,      setTaxForm]      = useState({ amount: '', date: todayStr(), period: '', notes: '' })
  const [taxSaving,    setTaxSaving]    = useState(false)

  const pieColors = [C.primary, C.blue, C.purple, C.orange, C.pink, C.cyan]

  const _wr = filterProjId ? clientReceipts?.filter(r => r.project_id === filterProjId) : (clientReceipts || [])
  const _wd = filterProjId ? workDays.filter(w => w.project_id === filterProjId) : workDays
  const _ex = filterProjId ? expenses.filter(e => e.project_id === filterProjId) : expenses
  const _py = filterProjId ? payments.filter(p => p.project_id === filterProjId) : payments
  const _pr = filterProjId ? projects.filter(p => p.id === filterProjId) : projects

  const totalLabor    = _wd.reduce((s, w) => s + (w.amount || 0), 0)
  const totalExp      = _ex.reduce((s, e) => s + (e.amount || 0), 0)
  const totalMaterials= _ex.filter(e => e.category === 'بضاعة').reduce((s, e) => s + (e.amount || 0), 0)
  const totalPaid     = _py.reduce((s, p) => s + (p.amount || 0), 0)
  const totalReceived = _wr.reduce((s, r) => s + (r.amount || 0), 0)
  const totalContract = _pr.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const totalPending  = _pr.reduce((s, p) => {
    const price = parseFloat(p.price) || 0
    if (price === 0) return s
    const received = _wr.filter(r => r.project_id === p.id).reduce((sum, r) => sum + (r.amount || 0), 0)
    return s + Math.max(0, price - received)
  }, 0)
  const netProfit = totalReceived - totalExp - totalLabor

  const thisYear    = new Date().getFullYear().toString()
  const thisMonth   = todayStr().slice(0, 7)
  const today       = new Date(todayStr())

  const twoMonthsAgo = new Date(); twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
  const vatData = calcVATNet(_wr, _ex, twoMonthsAgo.toISOString().slice(0, 10), todayStr())

  const yearRevenue   = _wr.filter(r => (r.date || '').startsWith(thisYear)).reduce((s, r) => s + (r.amount || 0), 0)
  const thresholdPct  = Math.min(100, Math.round((yearRevenue / OSEK_PATUR_THRESHOLD) * 100))

  const monthsData = {}
  _wr.forEach(r => { const m = (r.date || '').slice(0, 7); if (m) monthsData[m] = (monthsData[m] || 0) + r.amount })
  const recentMonths      = Object.keys(monthsData).sort().slice(-3)
  const avgMonthlyRevenue = recentMonths.length ? recentMonths.reduce((s, m) => s + monthsData[m], 0) / recentMonths.length : 0

  const bestProject = _pr.map(p => {
    const received = _wr.filter(r => r.project_id === p.id && (r.date || '').startsWith(thisMonth)).reduce((s, r) => s + r.amount, 0)
    const labor    = _wd.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0)
    const exp      = _ex.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    const profit   = received - labor - exp
    const margin   = received > 0 ? Math.round((profit / received) * 100) : null
    return { ...p, profit, margin, received }
  }).filter(p => p.received > 0 && p.margin !== null).sort((a, b) => b.margin - a.margin)[0]

  const cashFlowData = (() => {
    const map = {}
    _wr.forEach(r => { const m = (r.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].income += r.amount || 0 } })
    _wd.filter(w => w.status === 'approved').forEach(w => { const m = (w.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].costs += w.amount || 0 } })
    _ex.forEach(e => { const m = (e.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].costs += e.amount || 0 } })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([m, d]) => ({ month: m.slice(5), income: Math.round(d.income), costs: Math.round(d.costs) }))
  })()

  const projectProfitability = _pr.map(p => {
    const rev    = _wr.filter(r => r.project_id === p.id).reduce((s, r) => s + (r.amount || 0), 0)
    const labor  = _wd.filter(w => w.project_id === p.id).reduce((s, w) => s + (w.amount || 0), 0)
    const exp    = _ex.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0)
    const profit = rev - labor - exp
    const margin = rev > 0 ? Math.round((profit / rev) * 100) : null
    return { id: p.id, name: p.name, rev, costs: labor + exp, profit, margin }
  }).filter(p => p.rev > 0 || p.costs > 0).sort((a, b) => (b.margin || 0) - (a.margin || 0))

  const monthlyComparison = (() => {
    const map = {}
    _wr.forEach(r => { const m = (r.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].income += r.amount || 0 } })
    _wd.filter(w => w.status === 'approved').forEach(w => { const m = (w.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].costs += w.amount || 0 } })
    _ex.forEach(e => { const m = (e.date || '').slice(0, 7); if (m) { if (!map[m]) map[m] = { income: 0, costs: 0 }; map[m].costs += e.amount || 0 } })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([m, d]) => ({ month: m, income: Math.round(d.income), costs: Math.round(d.costs), profit: Math.round(d.income - d.costs) }))
  })()

  const workerCosts = employees.map(emp => {
    const days   = _wd.filter(w => w.employee_id === emp.id && w.status === 'approved').length
    const earned = _wd.filter(w => w.employee_id === emp.id && w.status === 'approved').reduce((s, w) => s + (w.amount || 0), 0)
    const paid   = _py.filter(p => p.employee_id === emp.id).reduce((s, p) => s + (p.amount || 0), 0)
    return { id: emp.id, name: emp.name, days, earned, paid, owed: Math.max(0, earned - paid) }
  }).filter(w => w.earned > 0 || w.paid > 0).sort((a, b) => b.earned - a.earned)

  const annualNet           = Math.max(0, netProfit)
  const pensionAnnual       = (pensionMonthly || 0) * 12
  const pensionMaxAllowed   = Math.round(annualNet * 0.16)
  const pensionActual       = Math.min(pensionAnnual, pensionMaxAllowed)
  const itEstimate          = estimateIncomeTax(annualNet, pensionActual)
  const blEstimate          = calcBituachLeumiAnnual(annualNet)
  const itPaidYear          = taxAdvances.filter(a => a.type === 'income_tax'    && (a.date || '').startsWith(thisYear)).reduce((s, a) => s + a.amount, 0)
  const blPaidYear          = taxAdvances.filter(a => a.type === 'bituach_leumi' && (a.date || '').startsWith(thisYear)).reduce((s, a) => s + a.amount, 0)

  const overdueClients = _pr.filter(p => p.status === 'نشط' || p.status === 'مكتمل').map(p => {
    const result = isPaymentOverdue(p, _wr)
    return result ? { ...p, ...result } : null
  }).filter(Boolean).sort((a, b) => b.daysSince - a.daysSince)

  const expByCat = EXP_CATS.map(cat => ({
    name:  cat.split(' / ')[0].split(' ')[0],
    value: _ex.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(e => e.value > 0)

  // ─── Alerts ───────────────────────────────────────────────────────────────
  const alerts = []
  employees.forEach(emp => {
    const earned = _wd.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
    const paid   = _py.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    const owed   = earned - paid
    if (owed <= 0) return
    const lastDay = _wd.filter(w => w.employee_id === emp.id).map(w => new Date(w.date)).sort((a, b) => b - a)[0]
    if (lastDay) {
      const daysSince = Math.floor((today - lastDay) / 86400000)
      if (daysSince >= 14) alerts.push({ text: `${emp.name} - راتب متأخر ${daysSince} يوم (${fmt(owed)}₪)`, color: C.accent, urgent: true, nav: 'payments' })
    }
  })
  _pr.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const spent = _wd.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0) + _ex.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    const pct   = spent / p.price
    if (pct >= 1) alerts.push({ text: `${p.name} — تجاوز الميزانية كاملاً!`, color: C.accent, urgent: true, nav: 'projects' })
    else if (pct >= 0.9) alerts.push({ text: `${p.name} — وصل 90% من الميزانية`, color: C.warning, urgent: false, nav: 'projects' })
  })
  _pr.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const received = _wr.filter(r => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
    if (received === 0) alerts.push({ text: `${p.name} — ما في مقبوضات من العميل بعد`, color: C.blue, urgent: false, nav: 'projects' })
  })
  const totalOwed = totalLabor - totalPaid
  const showAmounts = permissions?.viewAmounts !== false
  const fmtA = (v) => showAmounts ? `${fmt(v)}₪` : '---'
  if (totalOwed > 0 && !alerts.some(a => a.nav === 'payments' && a.urgent))
    alerts.push({ text: `إجمالي رواتب معلقة: ${fmtA(totalOwed)}`, color: C.warning, urgent: false, nav: 'payments' })
  projects.filter(p => p.status === 'نشط' && p.end_date).forEach(p => {
    const daysLeft = Math.floor((new Date(p.end_date) - new Date(todayStr())) / 86400000)
    if (daysLeft < 0) alerts.push({ text: `${p.name} — تجاوزت تاريخ الانتهاء بـ ${-daysLeft} يوم`, color: C.accent, urgent: true, nav: 'projects' })
    else if (daysLeft <= 7) alerts.push({ text: `${p.name} — ينتهي خلال ${daysLeft === 0 ? 'اليوم' : `${daysLeft} يوم`}`, color: C.warning, urgent: false, nav: 'projects' })
  })
  if (totalReceived > 0) {
    const overallMargin = (netProfit / totalReceived) * 100
    if (overallMargin < 20 && overallMargin > -200)
      alerts.push({ text: `هامش الربح الإجمالي ${Math.round(overallMargin)}% — أقل من 20%`, color: overallMargin < 0 ? C.accent : C.warning, urgent: overallMargin < 0, nav: null })
  }
  if (!projects.length && !employees.length)
    alerts.push({ text: 'ابدأ بإضافة مشاريع وعمال!', color: C.primary, urgent: false, nav: 'projects' })

  const urgentCount = alerts.filter(a => a.urgent).length

  async function saveTaxAdvance() {
    if (!taxForm.amount || parseFloat(taxForm.amount) <= 0) return
    setTaxSaving(true)
    try {
      await addTaxAdvance({ type: addingTax, amount: parseFloat(taxForm.amount), date: taxForm.date, period: taxForm.period, notes: taxForm.notes })
      setAddingTax(null); setTaxForm({ amount: '', date: todayStr(), period: '', notes: '' })
    } catch { /* ignore */ }
    finally { setTaxSaving(false) }
  }

  // ─── Quick actions ────────────────────────────────────────────────────────
  const quickActions = [
    { Icon: CalendarDays, label: 'يوم عمل', nav: 'workdays', color: C.primary },
    { Icon: CreditCard,   label: 'مصروف',   nav: 'expenses', color: C.blue   },
    { Icon: Building2,    label: 'مشروع',   nav: 'projects', color: C.purple },
    { Icon: Banknote,     label: 'دفعة',    nav: 'payments', color: C.success },
  ]

  const tooltipStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: 16 }}
    >

      {/* ─── Project filter pills ─── */}
      {projects.length > 1 && (
        <div style={{ marginBottom: 16, overflowX: 'auto', display: 'flex', gap: 7, paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterProjId(null)}
            style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${filterProjId === null ? C.primary : 'rgba(255,255,255,0.08)'}`, background: filterProjId === null ? `${C.primary}20` : 'rgba(255,255,255,0.03)', color: filterProjId === null ? C.primary : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
          >الكل</button>
          {projects.filter(p => p.status !== 'ملغي').map(p => (
            <button key={p.id}
              onClick={() => setFilterProjId(p.id === filterProjId ? null : p.id)}
              style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${filterProjId === p.id ? C.primary : 'rgba(255,255,255,0.08)'}`, background: filterProjId === p.id ? `${C.primary}20` : 'rgba(255,255,255,0.03)', color: filterProjId === p.id ? C.primary : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >{p.name}</button>
          ))}
        </div>
      )}

      {/* ─── Hero card ─── */}
      <div style={{ marginBottom: 16, borderRadius: 22, background: 'linear-gradient(135deg, #13151E 0%, #1a1408 100%)', border: '1px solid rgba(245,158,11,0.15)', overflow: 'hidden', position: 'relative' }}>
        {/* ambient blobs */}
        <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ padding: '18px 18px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{fmtDate(todayStr())}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.01em' }}>مرحباً</div>
            </div>
            {urgentCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)', borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 800, color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <AlertOctagon size={12} strokeWidth={2.5} />
                {urgentCount} تنبيه عاجل
              </motion.div>
            )}
          </div>

          {/* 3 main stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { l: 'إجمالي المقبوض', v: fmtA(totalReceived),            c: C.success, Icon: TrendingUp  },
              { l: 'صافي الربح',     v: fmtA(netProfit),                c: netProfit >= 0 ? C.primary : C.accent, Icon: netProfit >= 0 ? TrendingUp : TrendingDown },
              { l: 'للتحصيل',        v: fmtA(Math.max(0, totalPending)), c: C.warning, Icon: Clock },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '10px 4px', background: `${s.c}0c`, borderRadius: 14, border: `1px solid ${s.c}22` }}>
                <s.Icon size={12} color={s.c} style={{ display: 'block', margin: '0 auto 5px' }} strokeWidth={2.5} />
                <div style={{ fontSize: 9, color: C.textDim, marginBottom: 3, fontWeight: 600, letterSpacing: '0.02em' }}>{s.l}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Stat cards bento 2x2 ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <StatCard label="مقبوض من العملاء" value={fmtA(totalReceived)}          icon={Wallet}      color={C.success} />
        <StatCard label="إجمالي التكاليف"   value={fmtA(totalExp + totalLabor)}  icon={CreditCard}  color={C.accent}  />
        <StatCard label="صافي الربح"         value={fmtA(netProfit)}              icon={TrendingUp}  color={netProfit >= 0 ? C.primary : C.accent} />
        <StatCard label="متبقي للتحصيل"     value={fmtA(Math.max(0,totalPending))} icon={Clock}    color={totalPending > 0 ? C.warning : C.success} />
        {totalMaterials > 0 && (
          <StatCard label="إجمالي البضاعة"  value={fmtA(totalMaterials)}          icon={BarChart3}   color={C.orange}  style={{ gridColumn: '1/-1' }} />
        )}
      </div>

      {/* ─── Quick actions ─── */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader icon={ArrowUpRight} title="إجراءات سريعة" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {quickActions.map(({ Icon, label, nav, color }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.92 }}
              onClick={() => onNav(nav)}
              style={{ padding: '12px 4px', borderRadius: 16, border: `1px solid ${color}28`, background: `${color}0f`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, color }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ─── Overdue clients ─── */}
      {overdueClients.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionHeader icon={AlertOctagon} title="عملاء متأخرون بالدفع" color={C.accent} />
          {overdueClients.map(p => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNav('projects')}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', background: `linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))`, borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8, cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.client_name || p.name}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{p.name} · {p.daysSince} يوم بدون دفعة</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.accent, fontFamily: 'monospace' }}>{fmt(p.balance)}₪</div>
                  <div style={{ fontSize: 9, color: C.accent, opacity: 0.7, textAlign: 'left' }}>مستحق</div>
                </div>
                <ChevronLeft size={14} color={C.accent} />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* ─── Best project ─── */}
      {bestProject && (
        <div style={{ marginBottom: 16, borderRadius: 18, background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(245,158,11,0.07))', border: '1px solid rgba(34,197,94,0.25)', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -15, left: -15, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Trophy size={13} color={C.success} strokeWidth={2.2} />
            <span style={{ fontSize: 10, color: C.success, fontWeight: 700, letterSpacing: '0.04em' }}>أفضل مشروع هذا الشهر</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{bestProject.name}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{bestProject.client_name || ''}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(34,197,94,0.15)', borderRadius: 14, padding: '8px 14px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.success, lineHeight: 1 }}>{bestProject.margin}%</div>
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>هامش ربح</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Alerts ─── */}
      {alerts.length > 0 && (
        <CollapseSection icon={AlertTriangle} title={`التنبيهات (${alerts.length})`} color={C.warning} defaultOpen={urgentCount > 0}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {alerts.map((a, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={() => a.nav && onNav(a.nav)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: `${a.color}0c`, borderRadius: 12, border: `1px solid ${a.color}28`, cursor: a.nav ? 'pointer' : 'default', textAlign: 'right', fontFamily: 'inherit' }}
              >
                {a.urgent
                  ? <AlertOctagon size={14} color={a.color} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  : <Info size={14} color={a.color} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                }
                <span style={{ fontSize: 12, color: C.text, flex: 1, lineHeight: 1.4 }}>{a.text}</span>
                {a.nav && <ChevronLeft size={13} color={a.color} style={{ opacity: 0.7, flexShrink: 0 }} />}
              </motion.button>
            ))}
          </div>
        </CollapseSection>
      )}

      {/* ─── Expense pie chart ─── */}
      {expByCat.length > 0 && (
        <CollapseSection icon={BarChart3} title="توزيع المصاريف" color={C.purple}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expByCat} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                    {expByCat.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={v => `${fmt(v)}₪`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px 14px', justifyContent: 'center' }}>
              {expByCat.map((e, i) => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.textDim, background: `${pieColors[i % pieColors.length]}14`, borderRadius: 20, padding: '3px 10px', border: `1px solid ${pieColors[i % pieColors.length]}28` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: pieColors[i % pieColors.length] }} />
                  {e.name} ({fmt(e.value)}₪)
                </div>
              ))}
            </div>
          </div>
        </CollapseSection>
      )}

      {/* ─── Cash flow ─── */}
      {cashFlowData.length >= 2 && (
        <CollapseSection icon={TrendingUp} title="التدفق النقدي الشهري" color={C.primary}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 8px' }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
                  <XAxis dataKey="month" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}K` : v} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => `${fmt(v)}₪`} />
                  <Legend wrapperStyle={{ fontSize: 10, color: C.textDim }} formatter={v => v === 'income' ? 'مقبوض' : 'تكاليف'} />
                  <Bar dataKey="income" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="costs"  fill={C.accent}  radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CollapseSection>
      )}

      {/* ─── Project profitability ─── */}
      {projectProfitability.length > 0 && showAmounts && (
        <CollapseSection icon={Building2} title="ربحية المشاريع" color={C.success}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 44px', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
              {['المشروع', 'مقبوض', 'تكاليف', 'هامش'].map(h => <div key={h} style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>{h}</div>)}
            </div>
            {projectProfitability.map((p, i) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 44px', padding: '10px 12px', borderBottom: i < projectProfitability.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.success, fontWeight: 700 }}>{fmt(p.rev)}₪</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.accent,  fontWeight: 700 }}>{fmt(p.costs)}₪</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: p.margin === null ? C.textDim : p.margin >= 20 ? C.success : p.margin >= 0 ? C.warning : C.accent, textAlign: 'center' }}>
                  {p.margin !== null ? `${p.margin}%` : '—'}
                </div>
              </div>
            ))}
          </div>
        </CollapseSection>
      )}

      {/* ─── Monthly comparison ─── */}
      {monthlyComparison.length >= 2 && showAmounts && (
        <CollapseSection icon={BarChart3} title="مقارنة شهرية" color={C.blue}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
              {['الشهر', 'مقبوض', 'تكاليف', 'صافي'].map(h => <div key={h} style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>{h}</div>)}
            </div>
            {monthlyComparison.map((m, i) => (
              <div key={m.month} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', padding: '10px 12px', borderBottom: i < monthlyComparison.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.success, fontWeight: 700 }}>{fmt(m.income)}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.accent,  fontWeight: 700 }}>{fmt(m.costs)}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: m.profit >= 0 ? C.primary : C.accent, fontWeight: 800 }}>{m.profit >= 0 ? '+' : ''}{fmt(m.profit)}</div>
              </div>
            ))}
          </div>
        </CollapseSection>
      )}

      {/* ─── Worker costs ─── */}
      {workerCosts.length > 0 && showAmounts && (
        <CollapseSection icon={Users} title="تكاليف العمال" color={C.orange}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 70px 70px 65px', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
              {['العامل', 'أيام', 'مستحق', 'مدفوع', 'متبقي'].map(h => <div key={h} style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>{h}</div>)}
            </div>
            {workerCosts.map((w, i) => (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 70px 70px 65px', padding: '10px 12px', borderBottom: i < workerCosts.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, textAlign: 'center' }}>{w.days}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.text,    fontWeight: 700 }}>{fmt(w.earned)}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.success, fontWeight: 700 }}>{fmt(w.paid)}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: w.owed > 0 ? C.warning : C.success, fontWeight: 800 }}>{fmt(w.owed)}</div>
              </div>
            ))}
          </div>
        </CollapseSection>
      )}

      {/* ─── Tax dashboard ─── */}
      {taxEnabled && (
        <CollapseSection icon={BarChart3} title="المحاسب الضريبي" color={C.purple}>
          <TaxDashboard
            employees={employees} payments={payments} clientReceipts={clientReceipts}
            expenses={expenses} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance}
            deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly}
            setPensionMonthly={setPensionMonthly} businessType={businessType}
            taxModules={taxModules} compact={false}
          />
        </CollapseSection>
      )}

    </motion.div>
  )
}
