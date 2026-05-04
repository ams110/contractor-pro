import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { C, GRAD, EXP_CATS, VAT, OSEK_PATUR_THRESHOLD } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcVATNet, calcBituachLeumi, calcBituachLeumiAnnual, estimateIncomeTax, pensionTaxSaving, isPaymentOverdue } from '../lib/helpers.js'
import { StatCard, GlassCard, AnimatedNumber } from '../components/index.jsx'
import TaxDashboard from '../components/TaxDashboard.jsx'

function TaxAdvanceBlock({ title, icon, color, estimate, paid, records, onAdd, onDelete, hint }) {
  const [open, setOpen] = useState(false)
  const remaining = Math.max(0, estimate - paid)
  const pct = estimate > 0 ? Math.min(100, Math.round((paid / estimate) * 100)) : 0
  return (
    <div style={{ padding:'12px 14px', background:C.card, borderRadius:12, border:`1px solid ${C.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{icon} {title}</div>
          {hint && <div style={{ fontSize:9, color:C.textMuted, marginTop:1 }}>{hint}</div>}
        </div>
        <button onClick={onAdd} style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${color}55`, background:`${color}15`, color, fontSize:11, fontWeight:700, cursor:'pointer' }}>+ دفعة</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
        {[
          { l:'تقدير السنة', v:`${fmt(estimate)}₪`, c:C.textDim },
          { l:'مدفوع',       v:`${fmt(paid)}₪`,     c:C.success },
          { l:'متبقي',       v:`${fmt(remaining)}₪`, c:remaining > 0 ? color : C.success },
        ].map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'7px 4px', background:`${C.border}33`, borderRadius:8 }}>
            <div style={{ fontSize:9, color:C.textDim }}>{s.l}</div>
            <div style={{ fontSize:12, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>
      {estimate > 0 && (
        <>
          <div style={{ height:6, background:`${C.border}66`, borderRadius:3, overflow:'hidden', marginBottom:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background:pct >= 100 ? C.success : color, transition:'width .4s' }} />
          </div>
          <div style={{ fontSize:9, color:C.textMuted, textAlign:'center', marginBottom:6 }}>{pct}% مدفوع من التقدير</div>
        </>
      )}
      {records.length > 0 && (
        <button onClick={() => setOpen(o => !o)}
          style={{ fontSize:10, color:C.textDim, background:'none', border:'none', cursor:'pointer', padding:0, marginBottom: open ? 6 : 0 }}>
          {open ? '▲ إخفاء السجل' : `▼ عرض ${records.length} دفعة مسجلة`}
        </button>
      )}
      {open && [...records].sort((a,b) => b.date.localeCompare(a.date)).map(r => (
        <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background:`${C.border}22`, borderRadius:8, marginBottom:4 }}>
          <div>
            <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{fmt(r.amount)}₪</span>
            {r.period && <span style={{ fontSize:10, color:C.textDim, marginRight:6 }}>({r.period})</span>}
            <span style={{ fontSize:10, color:C.textDim }}> • {r.date}</span>
          </div>
          <button onClick={() => onDelete(r.id)} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer', color:C.textDim }}>🗑️</button>
        </div>
      ))}
    </div>
  )
}

export default function DashboardScreen({ projects, employees, workDays, expenses, payments, clientReceipts, onNav, permissions, taxAdvances = [], addTaxAdvance, deleteTaxAdvance, pensionMonthly = 0, setPensionMonthly, taxEnabled = true, businessType = 'osek_moreh', taxModules = {} }) {
  const [filterProjId,      setFilterProjId]      = useState(null)
  const [alertsExpanded,    setAlertsExpanded]    = useState(true)
  const [showTax,           setShowTax]           = useState(false)
  const [addingTax,         setAddingTax]         = useState(null)
  const [taxForm,           setTaxForm]           = useState({ amount: '', date: todayStr(), period: '', notes: '' })
  const [taxSaving,         setTaxSaving]         = useState(false)
  const [showCashFlow,      setShowCashFlow]      = useState(false)
  const [showProfitability, setShowProfitability] = useState(false)
  const [showMonthly,       setShowMonthly]       = useState(false)
  const [showWorkerCost,    setShowWorkerCost]    = useState(false)
  const pieColors = [C.primary, C.blue, C.purple, C.orange, C.pink, C.cyan]

  // تصفية البيانات حسب المشروع المحدد
  const _wr = filterProjId ? clientReceipts?.filter(r => r.project_id === filterProjId) : (clientReceipts || [])
  const _wd = filterProjId ? workDays.filter(w => w.project_id === filterProjId) : workDays
  const _ex = filterProjId ? expenses.filter(e => e.project_id === filterProjId) : expenses
  const _py = filterProjId ? payments.filter(p => p.project_id === filterProjId) : payments
  const _pr = filterProjId ? projects.filter(p => p.id === filterProjId) : projects

  const totalLabor    = _wd.reduce((s, w) => s + (w.amount || 0), 0)
  const totalExp      = _ex.reduce((s, e) => s + (e.amount || 0), 0)
  const totalMaterials = _ex.filter(e => e.category === 'بضاعة').reduce((s, e) => s + (e.amount || 0), 0)
  const totalPaid     = _py.reduce((s, p) => s + (p.amount || 0), 0)
  const totalReceived = _wr.reduce((s, r) => s + (r.amount || 0), 0)
  const totalContract = _pr.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  // حساب المتبقي لكل مشروع على حدة لمنع مقبوضات اليوميات من إلغاء ديون المشاريع الثابتة
  const totalPending  = _pr.reduce((s, p) => {
    const price = parseFloat(p.price) || 0
    if (price === 0) return s
    const received = _wr.filter(r => r.project_id === p.id).reduce((sum, r) => sum + (r.amount || 0), 0)
    return s + Math.max(0, price - received)
  }, 0)
  const netProfit     = totalReceived - totalExp - totalLabor

  // ─── الضرائب الإسرائيلية ─────────────────────────────────────────────────
  // VAT لآخر شهرين
  const twoMonthsAgo = new Date(); twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
  const twoMonthsAgoStr = twoMonthsAgo.toISOString().slice(0, 10)
  const vatData = calcVATNet(_wr, _ex, twoMonthsAgoStr, todayStr())

  // عتبة עוסק פטור: إيراد السنة الحالية
  const thisYear    = new Date().getFullYear().toString()
  const yearRevenue = _wr
    .filter(r => (r.date || '').startsWith(thisYear))
    .reduce((s, r) => s + (r.amount || 0), 0)
  const thresholdPct = Math.min(100, Math.round((yearRevenue / OSEK_PATUR_THRESHOLD) * 100))

  // متوسط الربح الشهري (لعرض التقدير الشهري فقط)
  const monthsData = {}
  _wr.forEach(r => { const m = (r.date || '').slice(0,7); if (m) monthsData[m] = (monthsData[m] || 0) + r.amount })
  const recentMonths = Object.keys(monthsData).sort().slice(-3)
  const avgMonthlyRevenue = recentMonths.length
    ? recentMonths.reduce((s, m) => s + monthsData[m], 0) / recentMonths.length : 0
  const activeExpMonths = new Set(_ex.map(e => (e.date||'').slice(0,7))).size
  const avgMonthlyExpenses = totalExp / Math.max(1, activeExpMonths)
  const avgMonthlyNet = avgMonthlyRevenue - avgMonthlyExpenses
  // للعرض الشهري فقط (في الـ hint)
  const bituachMonthly = calcBituachLeumi(Math.max(0, avgMonthlyNet))

  // ─── أفضل مشروع هذا الشهر ─────────────────────────────────────────────────
  const thisMonth = todayStr().slice(0, 7)
  const bestProject = _pr
    .map(p => {
      const received = _wr.filter(r => r.project_id === p.id && (r.date||'').startsWith(thisMonth)).reduce((s,r) => s+r.amount, 0)
      const labor    = _wd.filter(w => w.project_id === p.id).reduce((s,w) => s+w.amount, 0)
      const exp      = _ex.filter(e => e.project_id === p.id).reduce((s,e) => s+e.amount, 0)
      const profit   = received - labor - exp
      const margin   = received > 0 ? Math.round((profit / received) * 100) : null
      return { ...p, profit, margin, received }
    })
    .filter(p => p.received > 0 && p.margin !== null)
    .sort((a, b) => b.margin - a.margin)[0]

  // ─── بيانات التقارير ─────────────────────────────────────────────────────

  // #79: التدفق النقدي الشهري (آخر 6 أشهر)
  const cashFlowData = (() => {
    const map = {}
    _wr.forEach(r => {
      const m = (r.date||'').slice(0,7)
      if (m) { if (!map[m]) map[m] = { income:0, costs:0 }; map[m].income += r.amount || 0 }
    })
    _wd.filter(w => w.status === 'approved').forEach(w => {
      const m = (w.date||'').slice(0,7)
      if (m) { if (!map[m]) map[m] = { income:0, costs:0 }; map[m].costs += w.amount || 0 }
    })
    _ex.forEach(e => {
      const m = (e.date||'').slice(0,7)
      if (m) { if (!map[m]) map[m] = { income:0, costs:0 }; map[m].costs += e.amount || 0 }
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
      .map(([m, d]) => ({ month: m.slice(5), income: Math.round(d.income), costs: Math.round(d.costs) }))
  })()

  // #75: ربحية المشاريع
  const projectProfitability = _pr.map(p => {
    const rev    = _wr.filter(r => r.project_id === p.id).reduce((s,r) => s+(r.amount||0), 0)
    const labor  = _wd.filter(w => w.project_id === p.id).reduce((s,w) => s+(w.amount||0), 0)
    const exp    = _ex.filter(e => e.project_id === p.id).reduce((s,e) => s+(e.amount||0), 0)
    const profit = rev - labor - exp
    const margin = rev > 0 ? Math.round((profit / rev) * 100) : null
    return { id:p.id, name:p.name, rev, costs: labor+exp, profit, margin }
  }).filter(p => p.rev > 0 || p.costs > 0).sort((a,b) => (b.margin||0) - (a.margin||0))

  // #76: مقارنة شهرية (آخر 6 أشهر)
  const monthlyComparison = (() => {
    const map = {}
    _wr.forEach(r => {
      const m = (r.date||'').slice(0,7); if (m) { if (!map[m]) map[m]={income:0,costs:0}; map[m].income += r.amount||0 }
    })
    _wd.filter(w => w.status==='approved').forEach(w => {
      const m = (w.date||'').slice(0,7); if (m) { if (!map[m]) map[m]={income:0,costs:0}; map[m].costs += w.amount||0 }
    })
    _ex.forEach(e => {
      const m = (e.date||'').slice(0,7); if (m) { if (!map[m]) map[m]={income:0,costs:0}; map[m].costs += e.amount||0 }
    })
    return Object.entries(map).sort(([a],[b]) => b.localeCompare(a)).slice(0,6)
      .map(([m, d]) => ({ month: m, income: Math.round(d.income), costs: Math.round(d.costs), profit: Math.round(d.income - d.costs) }))
  })()

  // #77: تكاليف العمال
  const workerCosts = employees.map(emp => {
    const days   = _wd.filter(w => w.employee_id === emp.id && w.status === 'approved').length
    const earned = _wd.filter(w => w.employee_id === emp.id && w.status === 'approved').reduce((s,w) => s+(w.amount||0), 0)
    const paid   = _py.filter(p => p.employee_id === emp.id).reduce((s,p) => s+(p.amount||0), 0)
    return { id:emp.id, name:emp.name, days, earned, paid, owed: Math.max(0, earned-paid) }
  }).filter(w => w.earned > 0 || w.paid > 0).sort((a,b) => b.earned - a.earned)

  // ─── پنسيه وضرائب ───────────────────────────────────────────────────────
  const annualNet       = Math.max(0, netProfit)
  const pensionAnnual   = (pensionMonthly || 0) * 12
  const pensionMaxAllowed = Math.round(annualNet * 0.16)           // حد 16%
  const pensionActual   = Math.min(pensionAnnual, pensionMaxAllowed) // المبلغ المعترف به
  const itWithPension   = estimateIncomeTax(annualNet, pensionActual) // مع خصم
  const itWithoutPension= estimateIncomeTax(annualNet, 0)             // بدون خصم
  const pensionSaving   = pensionTaxSaving(annualNet, pensionActual)  // الوفر
  const itEstimate      = itWithPension
  const blEstimate      = calcBituachLeumiAnnual(annualNet)

  const itPaidYear = taxAdvances.filter(a => a.type === 'income_tax'    && (a.date||'').startsWith(thisYear)).reduce((s, a) => s + a.amount, 0)
  const blPaidYear = taxAdvances.filter(a => a.type === 'bituach_leumi' && (a.date||'').startsWith(thisYear)).reduce((s, a) => s + a.amount, 0)

  async function saveTaxAdvance() {
    if (!taxForm.amount || parseFloat(taxForm.amount) <= 0) return
    setTaxSaving(true)
    try {
      await addTaxAdvance({ type: addingTax, amount: parseFloat(taxForm.amount), date: taxForm.date, period: taxForm.period, notes: taxForm.notes })
      setAddingTax(null); setTaxForm({ amount: '', date: todayStr(), period: '', notes: '' })
    } catch(e) { /* ignore */ }
    finally { setTaxSaving(false) }
  }

  // ─── عملاء متأخرون بالدفع ─────────────────────────────────────────────────
  const overdueClients = _pr
    .filter(p => p.status === 'نشط' || p.status === 'مكتمل')
    .map(p => {
      const result = isPaymentOverdue(p, _wr)
      return result ? { ...p, ...result } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.daysSince - a.daysSince)

  const expByCat = EXP_CATS
    .map(cat => ({
      name:  cat.split(' / ')[0].split(' ')[0],
      value: _ex.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
    }))
    .filter(e => e.value > 0)

  // ─── بناء التنبيهات ──────────────────────────────────────────────────────
  const alerts = []

  // عمال مديونية قديمة (أكثر من 14 يوم من آخر يوم عمل)
  const today = new Date(todayStr())
  employees.forEach(emp => {
    const earned = _wd.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
    const paid   = _py.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    const owed   = earned - paid
    if (owed <= 0) return

    const lastDay = _wd
      .filter(w => w.employee_id === emp.id)
      .map(w => new Date(w.date))
      .sort((a, b) => b - a)[0]

    if (lastDay) {
      const daysSince = Math.floor((today - lastDay) / 86400000)
      if (daysSince >= 14) {
        alerts.push({
          text:    `${emp.name} - راتب متأخر ${daysSince} يوم (${fmt(owed)}₪)`,
          color:   C.accent,
          icon:    '🔴',
          nav:     'payments',
          urgent:  true,
        })
      }
    }
  })

  // مشاريع تجاوزت الميزانية
  _pr.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const spent = _wd.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0)
               + _ex.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    const pct   = spent / p.price
    if (pct >= 1) {
      alerts.push({ text: `${p.name} - تجاوز الميزانية كاملاً!`, color: C.accent, icon: '🚨', nav: 'projects', urgent: true })
    } else if (pct >= 0.9) {
      alerts.push({ text: `${p.name} - وصل 90% من الميزانية`, color: C.warning, icon: '⚠️', nav: 'projects', urgent: false })
    }
  })

  // مشاريع نشطة بدون تحصيل من العميل
  _pr.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const received = _wr.filter(r => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
    if (received === 0) {
      alerts.push({ text: `${p.name} - ما في مقبوضات من العميل بعد`, color: C.blue, icon: '💵', nav: 'projects', urgent: false })
    }
  })

  // إجمالي رواتب معلقة
  const totalOwed = totalLabor - totalPaid
  const showAmounts = permissions?.viewAmounts !== false
  const fmtA = (v) => showAmounts ? `${fmt(v)}₪` : '---'
  if (totalOwed > 0 && !alerts.some(a => a.nav === 'payments' && a.urgent)) {
    alerts.push({ text: `إجمالي رواتب معلقة: ${fmtA(totalOwed)}`, color: C.warning, icon: '⚠️', nav: 'payments', urgent: false })
  }

  // مشاريع تجاوزت تاريخ الانتهاء أو تقترب منه
  const today2 = todayStr()
  projects.filter(p => p.status === 'نشط' && p.end_date).forEach(p => {
    const daysLeft = Math.floor((new Date(p.end_date) - new Date(today2)) / 86400000)
    if (daysLeft < 0) {
      alerts.push({ text: `${p.name} — تجاوزت تاريخ الانتهاء بـ ${-daysLeft} يوم`, color: C.accent, icon: '⏰', nav: 'projects', urgent: true })
    } else if (daysLeft <= 7) {
      alerts.push({ text: `${p.name} — ينتهي خلال ${daysLeft === 0 ? 'اليوم' : `${daysLeft} يوم`}`, color: C.warning, icon: '⏳', nav: 'projects', urgent: false })
    }
  })

  // #80: هامش الربح منخفض (< 20%)
  if (totalReceived > 0) {
    const overallMargin = (netProfit / totalReceived) * 100
    if (overallMargin < 20 && overallMargin > -200) {
      alerts.push({ text: `هامش الربح الإجمالي ${Math.round(overallMargin)}% — أقل من 20%`, color: overallMargin < 0 ? C.accent : C.warning, icon: overallMargin < 0 ? '🔴' : '📉', nav: null, urgent: overallMargin < 0 })
    }
  }

  // ترحيب للمستخدم الجديد
  if (!projects.length && !employees.length) {
    alerts.push({ text: 'ابدأ بإضافة مشاريع وعمال!', color: C.primary, icon: '💡', nav: 'projects', urgent: false })
  }

  const urgentCount = alerts.filter(a => a.urgent).length


  return (
    <div className="fade-in" style={{ padding:16 }}>

      {/* ─── فلتر المشاريع ─── */}
      {projects.length > 1 && (
        <div style={{ marginBottom:14, overflowX:'auto', display:'flex', gap:6, paddingBottom:4, scrollbarWidth:'none' }}>
          <button onClick={() => setFilterProjId(null)}
            style={{ flexShrink:0, padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filterProjId === null ? C.primary : C.border}`, background: filterProjId === null ? `${C.primary}22` : 'rgba(255,255,255,0.04)', color: filterProjId === null ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            الكل
          </button>
          {projects.filter(p => p.status !== 'ملغي').map(p => (
            <button key={p.id} onClick={() => setFilterProjId(p.id === filterProjId ? null : p.id)}
              style={{ flexShrink:0, padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filterProjId === p.id ? C.primary : C.border}`, background: filterProjId === p.id ? `${C.primary}22` : 'rgba(255,255,255,0.04)', color: filterProjId === p.id ? C.primary : C.textDim, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* ─── Hero ─── */}
      <div style={{ marginBottom:20, borderRadius:22, background:`linear-gradient(135deg, ${C.surface} 0%, #1e2d3d 100%)`, border:`1px solid ${C.border}`, overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', top:-30, left:-30, width:120, height:120, borderRadius:'50%', background:`${C.primary}0d`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-20, right:-20, width:90, height:90, borderRadius:'50%', background:`${C.blue}0d`, pointerEvents:'none' }} />
        <div style={{ padding:'18px 18px 14px', position:'relative' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:C.textDim, fontWeight:600, letterSpacing:'0.04em', marginBottom:3 }}>{fmtDate(todayStr())}</div>
              <div style={{ fontSize:22, fontWeight:900, color:C.text }}>{'مرحبا 👋'}</div>
            </div>
            {urgentCount > 0 && (
              <div style={{ background:`linear-gradient(135deg,${C.accent},#FF8A80)`, borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:800, color:'#fff', boxShadow:`0 4px 14px ${C.accent}55` }}>
                {urgentCount} تنبيه عاجل
              </div>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { l:'إجمالي المقبوض', v: fmtA(totalReceived),              c:C.success },
              { l:'صافي الربح',     v: fmtA(netProfit),                  c:netProfit >= 0 ? C.primary : C.accent },
              { l:'للتحصيل',        v: fmtA(Math.max(0,totalPending)),   c:C.warning },
            ].map(s => (
              <div key={s.l} style={{ textAlign:'center', padding:'10px 4px', background:`${s.c}0d`, borderRadius:12, border:`1px solid ${s.c}2a` }}>
                <div style={{ fontSize:9, color:C.textDim, marginBottom:4, fontWeight:700, letterSpacing:'0.02em' }}>{s.l}</div>
                <div style={{ fontSize:13, fontWeight:900, color:s.c, fontFamily:'monospace', textShadow:`0 0 12px ${s.c}55` }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── إحصائيات ─── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ height:1, flex:1, background:`linear-gradient(90deg, ${C.primary}44, transparent)` }} />
        <div style={{ fontSize:10, fontWeight:800, color:C.textDim, letterSpacing:'0.12em', textTransform:'uppercase' }}>الملخص المالي</div>
        <div style={{ height:1, flex:1, background:`linear-gradient(270deg, ${C.primary}44, transparent)` }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="💰" label="المقبوض من العملاء" value={fmtA(totalReceived)}              color={C.success} />
        <StatCard icon="💸" label="إجمالي التكاليف"    value={fmtA(totalExp + totalLabor)}       color={C.accent} />
        <StatCard icon="📈" label="صافي الربح"          value={fmtA(netProfit)}                   color={netProfit >= 0 ? C.primary : C.accent} />
        <StatCard icon="⏳" label="متبقي للتحصيل"      value={fmtA(Math.max(0, totalPending))}   color={totalPending > 0 ? C.warning : C.success} />
        {totalMaterials > 0 && (
          <StatCard icon="🧱" label="إجمالي البضاعة" value={fmtA(totalMaterials)} color={C.orange} />
        )}
      </div>

      {/* ─── أزرار سريعة ─── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
        {[
          { icon:'📅', label:'يوم عمل',  nav:'workdays', color:C.primary },
          { icon:'💸', label:'مصروف',    nav:'expenses', color:C.blue   },
          { icon:'🏗️', label:'مشروع',    nav:'projects', color:C.purple },
          { icon:'💵', label:'دفعة',     nav:'projects', color:C.success },
        ].map(a => (
          <button key={a.label} onClick={() => onNav(a.nav)}
            style={{ padding:'12px 4px', borderRadius:16, border:`1px solid ${a.color}33`, background:`${a.color}12`, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .2s' }}>
            <div style={{ width:38, height:38, borderRadius:12, background:`${a.color}22`, border:`1px solid ${a.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {a.icon}
            </div>
            <span style={{ fontSize:9, fontWeight:800, color:a.color }}>+ {a.label}</span>
          </button>
        ))}
      </div>

      {/* ─── عملاء متأخرون ─── */}
      {overdueClients.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${C.accent}22`, border:`1px solid ${C.accent}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🔴</div>
            <span style={{ fontSize:13, fontWeight:800, color:C.accent }}>عملاء متأخرون بالدفع</span>
          </div>
          {overdueClients.map(p => (
            <button key={p.id} onClick={() => onNav('projects')}
              style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:`linear-gradient(90deg,${C.accent}0f,${C.accent}08)`, borderRadius:14, border:`1px solid ${C.accent}44`, marginBottom:8, cursor:'pointer', textAlign:'right', transition:'all .2s' }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{p.client_name || p.name}</div>
                <div style={{ fontSize:10, color:C.textDim, marginTop:2 }}>{p.name} - {p.daysSince} يوم بدون دفعة</div>
              </div>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:C.accent, fontFamily:'monospace', textAlign:'left' }}>{fmt(p.balance)}₪</div>
                <div style={{ fontSize:9, color:C.accent, textAlign:'left', opacity:0.7 }}>مستحق</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── أفضل مشروع ─── */}
      {bestProject && (
        <div style={{ marginBottom:16, borderRadius:18, background:`linear-gradient(135deg,${C.success}18,${C.primary}10)`, border:`1px solid ${C.success}44`, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-10, left:-10, width:70, height:70, borderRadius:'50%', background:`${C.success}0f` }} />
          <div style={{ fontSize:10, color:C.success, fontWeight:700, letterSpacing:'0.04em', marginBottom:8 }}>{'⭐ أفضل مشروع هذا الشهر'}</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{bestProject.name}</div>
              <div style={{ fontSize:11, color:C.textDim, marginTop:2 }}>{bestProject.client_name || ''}</div>
            </div>
            <div style={{ textAlign:'center', background:`${C.success}20`, borderRadius:14, padding:'8px 14px', border:`1px solid ${C.success}44` }}>
              <div style={{ fontSize:24, fontWeight:900, color:C.success, lineHeight:1 }}>{bestProject.margin}%</div>
              <div style={{ fontSize:9, color:C.textDim, marginTop:2 }}>هامش ربح</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── التنبيهات ─── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setAlertsExpanded(e => !e)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:`linear-gradient(90deg,${C.warning}15,${C.warning}08)`, borderRadius:14, border:`1px solid ${C.warning}44`, marginBottom:6, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:`${C.warning}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>⚠️</div>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>التنبيهات</span>
              <span style={{ fontSize:11, background:`${C.warning}30`, color:C.warning, borderRadius:10, padding:'2px 8px', fontWeight:700 }}>{alerts.length}</span>
            </div>
            <span style={{ fontSize:11, color:C.textDim }}>{alertsExpanded ? '▲' : '▼'}</span>
          </button>
          {alertsExpanded && alerts.map((a, i) => (
            <button key={i} onClick={() => a.nav && onNav(a.nav)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', marginBottom:5, background:`${a.color}0f`, borderRadius:12, border:`1px solid ${a.color}33`, cursor:'pointer', textAlign:'right', transition:'all .2s' }}>
              <span style={{ fontSize:14 }}>{a.icon}</span>
              <span style={{ fontSize:12, color:C.text, flex:1, lineHeight:1.4 }}>{a.text}</span>
              {a.nav && <span style={{ fontSize:13, color:a.color, opacity:0.8 }}>{'‹'}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ─── رسم بياني ─── */}
      {expByCat.length > 0 && (
        <div style={{ marginBottom:16, background:C.card, borderRadius:18, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${C.purple}22`, border:`1px solid ${C.purple}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>📊</div>
              <span style={{ fontSize:14, fontWeight:800, color:C.text }}>توزيع المصاريف</span>
            </div>
          </div>
          <div style={{ height:180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expByCat} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                  {expByCat.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:12, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }} formatter={v => `${fmt(v)}₪`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 16px 14px', justifyContent:'center' }}>
            {expByCat.map((e, i) => (
              <div key={e.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:C.textDim, background:`${pieColors[i%pieColors.length]}15`, borderRadius:20, padding:'3px 10px', border:`1px solid ${pieColors[i%pieColors.length]}33` }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:pieColors[i % pieColors.length] }} />
                {e.name} ({fmt(e.value)}₪)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── #79: التدفق النقدي ─── */}
      {cashFlowData.length >= 2 && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setShowCashFlow(v => !v)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', background:`linear-gradient(90deg,${C.primary}18,${C.cyan}10)`, borderRadius:14, border:`1px solid ${C.primary}44`, cursor:'pointer', marginBottom: showCashFlow ? 10 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${C.primary}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📈</div>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>التدفق النقدي الشهري</span>
            </div>
            <span style={{ fontSize:11, color:C.textDim, background:`${C.border}88`, borderRadius:8, padding:'3px 8px' }}>{showCashFlow ? '▲ إخفاء' : '▼ عرض'}</span>
          </button>
          {showCashFlow && (
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:'14px 8px' }}>
              <div style={{ height:180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} margin={{ top:4, right:4, left:-16, bottom:0 }} barGap={2}>
                    <XAxis dataKey="month" tick={{ fill:C.textDim, fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:C.textDim, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}K` : v} />
                    <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:11 }} formatter={v => `${fmt(v)}₪`} />
                    <Legend wrapperStyle={{ fontSize:10, color:C.textDim }} formatter={v => v === 'income' ? 'مقبوض' : 'تكاليف'} />
                    <Bar dataKey="income" fill={C.primary} radius={[4,4,0,0]} maxBarSize={28} />
                    <Bar dataKey="costs"  fill={C.accent}  radius={[4,4,0,0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── #75: ربحية المشاريع ─── */}
      {projectProfitability.length > 0 && showAmounts && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setShowProfitability(v => !v)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', background:`linear-gradient(90deg,${C.success}18,${C.primary}10)`, borderRadius:14, border:`1px solid ${C.success}44`, cursor:'pointer', marginBottom: showProfitability ? 10 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${C.success}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏗️</div>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>ربحية المشاريع</span>
            </div>
            <span style={{ fontSize:11, color:C.textDim, background:`${C.border}88`, borderRadius:8, padding:'3px 8px' }}>{showProfitability ? '▲ إخفاء' : '▼ عرض'}</span>
          </button>
          {showProfitability && (
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 70px 44px', padding:'8px 12px', borderBottom:`1px solid ${C.border}` }}>
                {['المشروع','مقبوض','تكاليف','هامش'].map(h => <div key={h} style={{ fontSize:9, color:C.textDim, fontWeight:700 }}>{h}</div>)}
              </div>
              {projectProfitability.map((p, i) => (
                <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1fr 70px 70px 44px', padding:'10px 12px', borderBottom: i < projectProfitability.length-1 ? `1px solid ${C.border}33` : 'none', alignItems:'center' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingLeft:4 }}>{p.name}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.success, fontWeight:700 }}>{fmt(p.rev)}₪</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.accent,  fontWeight:700 }}>{fmt(p.costs)}₪</div>
                  <div style={{ fontSize:11, fontWeight:900, color: p.margin === null ? C.textDim : p.margin >= 20 ? C.success : p.margin >= 0 ? C.warning : C.accent, textAlign:'center' }}>
                    {p.margin !== null ? `${p.margin}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── #76: مقارنة شهرية ─── */}
      {monthlyComparison.length >= 2 && showAmounts && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setShowMonthly(v => !v)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', background:`linear-gradient(90deg,${C.blue}18,${C.purple}10)`, borderRadius:14, border:`1px solid ${C.blue}44`, cursor:'pointer', marginBottom: showMonthly ? 10 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${C.blue}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📅</div>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>مقارنة شهرية</span>
            </div>
            <span style={{ fontSize:11, color:C.textDim, background:`${C.border}88`, borderRadius:8, padding:'3px 8px' }}>{showMonthly ? '▲ إخفاء' : '▼ عرض'}</span>
          </button>
          {showMonthly && (
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr 1fr', padding:'8px 12px', borderBottom:`1px solid ${C.border}` }}>
                {['الشهر','مقبوض','تكاليف','صافي'].map(h => <div key={h} style={{ fontSize:9, color:C.textDim, fontWeight:700 }}>{h}</div>)}
              </div>
              {monthlyComparison.map((m, i) => (
                <div key={m.month} style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr 1fr', padding:'10px 12px', borderBottom: i < monthlyComparison.length-1 ? `1px solid ${C.border}33` : 'none', alignItems:'center' }}>
                  <div style={{ fontSize:10, color:C.textDim, fontWeight:600 }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.success, fontWeight:700 }}>{fmt(m.income)}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.accent,  fontWeight:700 }}>{fmt(m.costs)}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color: m.profit >= 0 ? C.primary : C.accent, fontWeight:800 }}>{m.profit >= 0 ? '+' : ''}{fmt(m.profit)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── #77: تكاليف العمال ─── */}
      {workerCosts.length > 0 && showAmounts && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setShowWorkerCost(v => !v)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', background:`linear-gradient(90deg,${C.orange}18,${C.warning}10)`, borderRadius:14, border:`1px solid ${C.orange}44`, cursor:'pointer', marginBottom: showWorkerCost ? 10 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${C.orange}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>👷</div>
              <span style={{ fontSize:13, fontWeight:800, color:C.text }}>تكاليف العمال</span>
            </div>
            <span style={{ fontSize:11, color:C.textDim, background:`${C.border}88`, borderRadius:8, padding:'3px 8px' }}>{showWorkerCost ? '▲ إخفاء' : '▼ عرض'}</span>
          </button>
          {showWorkerCost && (
            <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 70px 70px 65px', padding:'8px 12px', borderBottom:`1px solid ${C.border}` }}>
                {['العامل','أيام','مستحق','مدفوع','متبقي'].map(h => <div key={h} style={{ fontSize:9, color:C.textDim, fontWeight:700 }}>{h}</div>)}
              </div>
              {workerCosts.map((w, i) => (
                <div key={w.id} style={{ display:'grid', gridTemplateColumns:'1fr 40px 70px 70px 65px', padding:'10px 12px', borderBottom: i < workerCosts.length-1 ? `1px solid ${C.border}33` : 'none', alignItems:'center' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingLeft:4 }}>{w.name}</div>
                  <div style={{ fontSize:11, color:C.textDim, fontWeight:600, textAlign:'center' }}>{w.days}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.text,    fontWeight:700 }}>{fmt(w.earned)}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color:C.success,  fontWeight:700 }}>{fmt(w.paid)}</div>
                  <div style={{ fontSize:11, fontFamily:'monospace', color: w.owed > 0 ? C.warning : C.success, fontWeight:800 }}>{fmt(w.owed)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── المحاسب الضريبي ─── */}
      {taxEnabled && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'12px 16px', background:`linear-gradient(90deg,${C.purple}18,${C.blue}10)`, borderRadius:14, border:`1px solid ${C.purple}44` }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${C.purple}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🇮🇱</div>
            <span style={{ fontSize:13, fontWeight:800, color:C.text }}>المحاسب الضريبي</span>
          </div>
          <TaxDashboard
            employees={employees}
            payments={payments}
            clientReceipts={clientReceipts}
            expenses={expenses}
            taxAdvances={taxAdvances}
            addTaxAdvance={addTaxAdvance}
            deleteTaxAdvance={deleteTaxAdvance}
            pensionMonthly={pensionMonthly}
            setPensionMonthly={setPensionMonthly}
            businessType={businessType}
            taxModules={taxModules}
            compact={false}
          />
        </div>
      )}

    </div>
  )
}