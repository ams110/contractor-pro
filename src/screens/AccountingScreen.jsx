import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { C } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'
import { calcVATReport } from '../hooks/useTaxEngine.js'

// ─── helpers ────────────────────────────────────────────────────────────────

function periodRange(period) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (period === 'month') {
    const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const to   = new Date(y, m + 1, 0).toISOString().split('T')[0]
    return { from, to, label: now.toLocaleString('ar', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'quarter') {
    const qStart = m - (m % 3)
    const from = `${y}-${String(qStart + 1).padStart(2, '0')}-01`
    const to   = new Date(y, qStart + 3, 0).toISOString().split('T')[0]
    return { from, to, label: `الربع ${Math.floor(m / 3) + 1} / ${y}` }
  }
  // year
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `سنة ${y}` }
}

function inRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to
}

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : ''
}

function last12Months() {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('ar', { month: 'short' }),
    })
  }
  return months
}

const PERIOD_TABS = [
  { id: 'month',   label: 'هذا الشهر' },
  { id: 'quarter', label: 'هذا الربع' },
  { id: 'year',    label: 'هذه السنة' },
]

// ─── sub-components ──────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color, small }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: small ? '14px 16px' : '18px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ color: C.textDim, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || C.text, fontSize: small ? 18 : 22, fontWeight: 800 }}>
        ₪{fmt(Math.round(value))}
      </div>
      {sub != null && (
        <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function CashFlowChart({ months, incomeByMonth, expensesByMonth }) {
  const allVals = months.flatMap(m => [incomeByMonth[m.key] || 0, expensesByMonth[m.key] || 0])
  const maxVal  = Math.max(...allVals, 1)
  const H = 120
  const barW = 10
  const gap = 4
  const groupW = barW * 2 + gap + 8
  const svgW = months.length * groupW + 24

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgW} height={H + 40} style={{ display: 'block', minWidth: svgW }}>
        {months.map((m, i) => {
          const inc = incomeByMonth[m.key] || 0
          const exp = expensesByMonth[m.key] || 0
          const x = 12 + i * groupW
          const incH = Math.max(2, (inc / maxVal) * H)
          const expH = Math.max(2, (exp / maxVal) * H)
          return (
            <g key={m.key}>
              {/* income bar */}
              <rect x={x} y={H - incH} width={barW} height={incH} rx={3}
                fill={C.success} fillOpacity={0.85} />
              {/* expense bar */}
              <rect x={x + barW + gap} y={H - expH} width={barW} height={expH} rx={3}
                fill={C.accent} fillOpacity={0.85} />
              {/* month label */}
              <text x={x + barW} y={H + 16} textAnchor="middle"
                fill={C.textDim} fontSize={9} fontFamily="inherit">
                {m.label}
              </text>
            </g>
          )
        })}
        {/* zero line */}
        <line x1={0} y1={H} x2={svgW} y2={H} stroke={C.border} strokeWidth={1} />
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: C.textDim }}>
        <span style={{ color: C.success }}>■</span> إيرادات
        <span style={{ color: C.accent,   marginRight: 4 }}>■</span> مصاريف + رواتب
      </div>
    </div>
  )
}

function PercentBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: C.textDim, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: C.text }}>₪{fmt(Math.round(value))} <span style={{ color: C.textDim }}>({pct}%)</span></span>
      </div>
      <div style={{ background: C.surface, borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color || C.primary, height: '100%',
          borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  )
}

// ─── export helper ───────────────────────────────────────────────────────────

function exportToExcel({ period, label, revenue, netRevenue, totalExpenses, workerCosts, netProfit,
  projects, expenses, clientReceipts, payments, vatReport }) {
  const wb = XLSX.utils.book_new()

  // P&L sheet
  const plRows = [
    { البند: 'الإيرادات (شاملة مع"מ)', القيمة: Math.round(revenue) },
    { البند: 'الإيرادات (بدون مع"מ)', القيمة: Math.round(netRevenue) },
    { البند: 'المصاريف', القيمة: Math.round(totalExpenses) },
    { البند: 'رواتب العمال', القيمة: Math.round(workerCosts) },
    { البند: 'صافي الربح', القيمة: Math.round(netProfit) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plRows), 'ربح وخسارة')

  // Projects sheet
  const projRows = projects.map(p => ({
    المشروع: p.name,
    'إيرادات ₪': Math.round(p.income),
    'مصاريف ₪': Math.round(p.exp),
    'صافي ₪':   Math.round(p.profit),
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), 'المشاريع')

  // Expenses sheet
  const expRows = expenses.map(e => ({
    التاريخ: e.date, الفئة: e.category || 'أخرى',
    'المبلغ ₪': e.amount, الملاحظات: e.notes || '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'المصاريف')

  // Receipts sheet
  const recRows = clientReceipts.map(r => ({
    التاريخ: r.date, 'المبلغ ₪': r.amount,
    'مع"מ ₪': r.vat_amount || 0, الملاحظات: r.notes || '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recRows), 'إيصالات العملاء')

  // VAT sheet
  const vatRows = [
    { البند: 'مع"מ محصّل من العملاء', القيمة: Math.round(vatReport.vatCollected) },
    { البند: 'مع"מ على المصاريف (قابل للخصم)', القيمة: Math.round(vatReport.vatDeductible) },
    { البند: 'صافي مع"מ المستحق', القيمة: Math.round(vatReport.vatDue) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vatRows), 'مع"מ')

  XLSX.writeFile(wb, `محاسبة-${label.replace(/\//g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function AccountingScreen({
  projects = [], employees = [], expenses = [], payments = [],
  clientReceipts = [], taxAdvances = [],
}) {
  const [period, setPeriod] = useState('month')
  const { from, to, label } = useMemo(() => periodRange(period), [period])

  // ── filtered data for selected period ──
  const filteredReceipts  = useMemo(() => clientReceipts.filter(r => r.date && inRange(r.date, from, to)), [clientReceipts, from, to])
  const filteredExpenses  = useMemo(() => expenses.filter(e => e.date && inRange(e.date, from, to)), [expenses, from, to])
  const filteredPayments  = useMemo(() => payments.filter(p => p.date && inRange(p.date, from, to)), [payments, from, to])

  // ── P&L ──
  const revenue      = useMemo(() => filteredReceipts.reduce((s, r) => s + (r.amount || 0), 0), [filteredReceipts])
  const vatCollected = useMemo(() => filteredReceipts.reduce((s, r) => s + (r.vat_amount || 0), 0), [filteredReceipts])
  const netRevenue   = revenue - vatCollected

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses])
  const workerCosts   = useMemo(() => filteredPayments.reduce((s, p) => s + (p.amount || 0), 0), [filteredPayments])
  const netProfit     = netRevenue - totalExpenses - workerCosts
  const margin        = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 100) : 0

  // ── VAT report ──
  const vatReport = useMemo(() => calcVATReport(filteredReceipts, filteredExpenses, from, to), [filteredReceipts, filteredExpenses, from, to])

  // ── 12-month cash flow ──
  const months12 = useMemo(() => last12Months(), [])
  const incomeByMonth   = useMemo(() => {
    const map = {}
    clientReceipts.forEach(r => { if (r.date) map[monthKey(r.date)] = (map[monthKey(r.date)] || 0) + (r.amount || 0) })
    return map
  }, [clientReceipts])
  const expensesByMonth = useMemo(() => {
    const map = {}
    expenses.forEach(e => { if (e.date) map[monthKey(e.date)] = (map[monthKey(e.date)] || 0) + (e.amount || 0) })
    payments.forEach(p => { if (p.date) map[monthKey(p.date)] = (map[monthKey(p.date)] || 0) + (p.amount || 0) })
    return map
  }, [expenses, payments])

  // ── expense by category ──
  const expByCategory = useMemo(() => {
    const map = {}
    filteredExpenses.forEach(e => {
      const cat = e.category || 'أخرى'
      map[cat] = (map[cat] || 0) + (e.amount || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filteredExpenses])

  // ── project profitability ──
  const projectsProfit = useMemo(() => {
    return projects.map(proj => {
      const income = clientReceipts
        .filter(r => r.project_id === proj.id && r.date && inRange(r.date, from, to))
        .reduce((s, r) => s + (r.amount || 0), 0)
      const exp = expenses
        .filter(e => e.project_id === proj.id && e.date && inRange(e.date, from, to))
        .reduce((s, e) => s + (e.amount || 0), 0)
      const profit = income - exp
      return { ...proj, income, exp, profit }
    }).filter(p => p.income > 0 || p.exp > 0).sort((a, b) => b.profit - a.profit)
  }, [projects, clientReceipts, expenses, from, to])

  // ── receivables ──
  const receivables = useMemo(() => {
    return projects.map(proj => {
      const received = clientReceipts
        .filter(r => r.project_id === proj.id)
        .reduce((s, r) => s + (r.amount || 0), 0)
      const budget = proj.budget || 0
      const outstanding = Math.max(0, budget - received)
      return { ...proj, received, outstanding }
    }).filter(p => p.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding)
  }, [projects, clientReceipts])

  const totalReceivables = useMemo(() => receivables.reduce((s, p) => s + p.outstanding, 0), [receivables])

  // ── tax advances in period ──
  const itPaid = useMemo(() => taxAdvances.filter(a => a.type === 'income_tax' && a.date && inRange(a.date, from, to)).reduce((s, a) => s + (a.amount || 0), 0), [taxAdvances, from, to])
  const blPaid = useMemo(() => taxAdvances.filter(a => a.type === 'bituach_leumi' && a.date && inRange(a.date, from, to)).reduce((s, a) => s + (a.amount || 0), 0), [taxAdvances, from, to])

  // ── cat colors ──
  const CAT_COLORS = [C.primary, C.secondary, C.warning, C.success, C.accent, '#A78BFA', '#FB923C']

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 14 }
  const sectionTitle = { color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 14 }

  return (
    <div style={{ padding: '16px 0', maxWidth: 700, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 800 }}>المحاسبة</div>
        <button onClick={() => exportToExcel({ period, label, revenue, netRevenue, totalExpenses, workerCosts, netProfit, projects: projectsProfit, expenses: filteredExpenses, clientReceipts: filteredReceipts, payments: filteredPayments, vatReport })}
          style={{ background: C.primary, color: '#000', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          تصدير Excel
        </button>
      </div>

      {/* ── period tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {PERIOD_TABS.map(t => (
          <button key={t.id} onClick={() => setPeriod(t.id)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: period === t.id ? C.primary : C.card,
              color: period === t.id ? '#000' : C.textDim }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── P&L cards ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <KPICard label={"إيرادات (شاملة מע\"מ)"} value={revenue} color={C.success} />
        <KPICard label={"إيرادات (בדون מע\"מ)"} value={netRevenue} color={C.primary} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <KPICard label="مصاريف" value={totalExpenses} color={C.warning} />
        <KPICard label="رواتب العمال" value={workerCosts} color={C.accent} />
      </div>
      <div style={{ ...card, background: netProfit >= 0 ? `${C.success}18` : `${C.accent}18`,
        border: `1px solid ${netProfit >= 0 ? C.success : C.accent}44`, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: C.textDim, fontSize: 12, marginBottom: 4 }}>صافي الربح — {label}</div>
            <div style={{ color: netProfit >= 0 ? C.success : C.accent, fontSize: 26, fontWeight: 800 }}>
              {netProfit < 0 ? '-' : ''}₪{fmt(Math.abs(Math.round(netProfit)))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800,
              color: margin >= 0 ? C.success : C.accent }}>{margin}%</div>
            <div style={{ color: C.textDim, fontSize: 11 }}>هامش الربح</div>
          </div>
        </div>
      </div>

      {/* ── cash flow chart ── */}
      <div style={card}>
        <div style={sectionTitle}>التدفق النقدي — 12 شهر</div>
        <CashFlowChart months={months12} incomeByMonth={incomeByMonth} expensesByMonth={expensesByMonth} />
      </div>

      {/* ── project profitability ── */}
      {projectsProfit.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>ربحية المشاريع</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.textDim }}>
                  <th style={{ textAlign: 'right', paddingBottom: 8, fontWeight: 600 }}>المشروع</th>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>إيرادات</th>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>مصاريف</th>
                  <th style={{ textAlign: 'left', paddingBottom: 8, fontWeight: 600 }}>صافي</th>
                </tr>
              </thead>
              <tbody>
                {projectsProfit.map(p => (
                  <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px 0', color: C.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ padding: '8px 0', color: C.success, paddingLeft: 8 }}>₪{fmt(Math.round(p.income))}</td>
                    <td style={{ padding: '8px 0', color: C.warning, paddingLeft: 8 }}>₪{fmt(Math.round(p.exp))}</td>
                    <td style={{ padding: '8px 0', color: p.profit >= 0 ? C.success : C.accent, paddingLeft: 8, fontWeight: 700 }}>
                      {p.profit < 0 ? '-' : ''}₪{fmt(Math.abs(Math.round(p.profit)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── expense categories ── */}
      {expByCategory.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>تفصيل المصاريف حسب الفئة</div>
          {expByCategory.map(([cat, val], i) => (
            <PercentBar key={cat} label={cat} value={val} total={totalExpenses}
              color={CAT_COLORS[i % CAT_COLORS.length]} />
          ))}
        </div>
      )}

      {/* ── receivables ── */}
      {receivables.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={sectionTitle}>مستحقات العملاء</div>
            <div style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>₪{fmt(Math.round(totalReceivables))}</div>
          </div>
          {receivables.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderTop: `1px solid ${C.border}`, fontSize: 12 }}>
              <div>
                <div style={{ color: C.text, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: C.textDim, marginTop: 2 }}>
                  استُلم ₪{fmt(Math.round(p.received))} من أصل ₪{fmt(p.budget || 0)}
                </div>
              </div>
              <div style={{ color: C.accent, fontWeight: 700 }}>₪{fmt(Math.round(p.outstanding))}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── VAT summary ── */}
      <div style={card}>
        <div style={sectionTitle}>ملخص מע"מ — {label}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <KPICard label='מע"מ محصّل من العملاء' value={vatReport.vatCollected} color={C.success} small />
          <KPICard label='מע"מ على مصاريف (خصم)' value={vatReport.vatDeductible} color={C.warning} small />
          <KPICard label='صافي מע"מ المستحق' value={vatReport.vatDue} color={vatReport.vatDue > 0 ? C.accent : C.success} small />
        </div>
      </div>

      {/* ── tax advances ── */}
      {(itPaid > 0 || blPaid > 0) && (
        <div style={card}>
          <div style={sectionTitle}>مقدمات ضريبية مدفوعة — {label}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {itPaid > 0 && <KPICard label='מס הכנסה مقدّم' value={itPaid} color={C.primary} small />}
            {blPaid > 0 && <KPICard label='ביטוח לאומי مقدّم' value={blPaid} color={C.secondary} small />}
          </div>
        </div>
      )}

      {/* ── empty state ── */}
      {filteredReceipts.length === 0 && filteredExpenses.length === 0 && filteredPayments.length === 0 && (
        <div style={{ textAlign: 'center', color: C.textDim, fontSize: 13, padding: 40 }}>
          لا توجد بيانات في هذه الفترة
        </div>
      )}

    </div>
  )
}
