import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { C, GRAD, EXP_CATS, VAT, OSEK_PATUR_THRESHOLD } from '../constants/index.js'
import { fmt, fmtDate, todayStr, calcVATNet, calcBituachLeumi, calcBituachLeumiAnnual, estimateIncomeTax, pensionTaxSaving, isPaymentOverdue } from '../lib/helpers.js'
import { StatCard, GlassCard, AnimatedNumber } from '../components/index.jsx'

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

export default function DashboardScreen({ projects, employees, workDays, expenses, payments, clientReceipts, onNav, taxAdvances = [], addTaxAdvance, deleteTaxAdvance, pensionMonthly = 0, setPensionMonthly, taxEnabled = true, businessType = 'osek_moreh' }) {
  const [alertsExpanded, setAlertsExpanded] = useState(true)
  const [showTax,        setShowTax]        = useState(false)
  const [addingTax,      setAddingTax]      = useState(null)  // 'income_tax' | 'bituach_leumi' | null
  const [taxForm,        setTaxForm]        = useState({ amount: '', date: todayStr(), period: '', notes: '' })
  const [taxSaving,      setTaxSaving]      = useState(false)
  const pieColors = [C.primary, C.blue, C.purple, C.orange, C.pink, C.cyan]

  const totalLabor    = workDays.reduce((s, w) => s + (w.amount || 0), 0)
  const totalExp      = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalMaterials = expenses.filter(e => e.category === 'بضاعة').reduce((s, e) => s + (e.amount || 0), 0)
  const totalPaid     = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalReceived = (clientReceipts || []).reduce((s, r) => s + (r.amount || 0), 0)
  const totalContract = projects.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const totalPending  = totalContract - totalReceived
  const netProfit     = totalReceived - totalExp - totalLabor

  // ─── الضرائب الإسرائيلية ─────────────────────────────────────────────────
  // VAT لآخر شهرين
  const twoMonthsAgo = new Date(); twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)
  const twoMonthsAgoStr = twoMonthsAgo.toISOString().slice(0, 10)
  const vatData = calcVATNet(clientReceipts || [], expenses, twoMonthsAgoStr, todayStr())

  // عتبة עוסק פטור: إيراد السنة الحالية
  const thisYear    = new Date().getFullYear().toString()
  const yearRevenue = (clientReceipts || [])
    .filter(r => (r.date || '').startsWith(thisYear))
    .reduce((s, r) => s + (r.amount || 0), 0)
  const thresholdPct = Math.min(100, Math.round((yearRevenue / OSEK_PATUR_THRESHOLD) * 100))

  // متوسط الربح الشهري (لعرض التقدير الشهري فقط)
  const monthsData = {}
  ;(clientReceipts || []).forEach(r => { const m = (r.date || '').slice(0,7); if (m) monthsData[m] = (monthsData[m] || 0) + r.amount })
  const recentMonths = Object.keys(monthsData).sort().slice(-3)
  const avgMonthlyRevenue = recentMonths.length
    ? recentMonths.reduce((s, m) => s + monthsData[m], 0) / recentMonths.length : 0
  const activeExpMonths = new Set(expenses.map(e => (e.date||'').slice(0,7))).size
  const avgMonthlyExpenses = totalExp / Math.max(1, activeExpMonths)
  const avgMonthlyNet = avgMonthlyRevenue - avgMonthlyExpenses
  // للعرض الشهري فقط (في الـ hint)
  const bituachMonthly = calcBituachLeumi(Math.max(0, avgMonthlyNet))

  // ─── أفضل مشروع هذا الشهر ─────────────────────────────────────────────────
  const thisMonth = todayStr().slice(0, 7)
  const bestProject = projects
    .map(p => {
      const received = (clientReceipts || []).filter(r => r.project_id === p.id && (r.date||'').startsWith(thisMonth)).reduce((s,r) => s+r.amount, 0)
      const labor    = workDays.filter(w => w.project_id === p.id).reduce((s,w) => s+w.amount, 0)
      const exp      = expenses.filter(e => e.project_id === p.id).reduce((s,e) => s+e.amount, 0)
      const profit   = received - labor - exp
      const margin   = received > 0 ? Math.round((profit / received) * 100) : null
      return { ...p, profit, margin, received }
    })
    .filter(p => p.received > 0 && p.margin !== null)
    .sort((a, b) => b.margin - a.margin)[0]

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
  const overdueClients = projects
    .filter(p => p.status === 'نشط' || p.status === 'مكتمل')
    .map(p => {
      const result = isPaymentOverdue(p, clientReceipts || [])
      return result ? { ...p, ...result } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.daysSince - a.daysSince)

  const expByCat = EXP_CATS
    .map(cat => ({
      name:  cat.split(' / ')[0].split(' ')[0],
      value: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
    }))
    .filter(e => e.value > 0)

  // ─── بناء التنبيهات ──────────────────────────────────────────────────────
  const alerts = []

  // عمال مديونية قديمة (أكثر من 14 يوم من آخر يوم عمل)
  const today = new Date(todayStr())
  employees.forEach(emp => {
    const earned = workDays.filter(w => w.employee_id === emp.id).reduce((s, w) => s + w.amount, 0)
    const paid   = payments.filter(p => p.employee_id === emp.id).reduce((s, p) => s + p.amount, 0)
    const owed   = earned - paid
    if (owed <= 0) return

    const lastDay = workDays
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
  projects.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const spent = workDays.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0)
               + expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    const pct   = spent / p.price
    if (pct >= 1) {
      alerts.push({ text: `${p.name} - تجاوز الميزانية كاملاً!`, color: C.accent, icon: '🚨', nav: 'projects', urgent: true })
    } else if (pct >= 0.9) {
      alerts.push({ text: `${p.name} - وصل 90% من الميزانية`, color: C.warning, icon: '⚠️', nav: 'projects', urgent: false })
    }
  })

  // مشاريع نشطة بدون تحصيل من العميل
  projects.filter(p => p.status === 'نشط' && p.price > 0).forEach(p => {
    const received = (clientReceipts || []).filter(r => r.project_id === p.id).reduce((s, r) => s + r.amount, 0)
    if (received === 0) {
      alerts.push({ text: `${p.name} - ما في مقبوضات من العميل بعد`, color: C.blue, icon: '💵', nav: 'projects', urgent: false })
    }
  })

  // إجمالي رواتب معلقة
  const totalOwed = totalLabor - totalPaid
  if (totalOwed > 0 && !alerts.some(a => a.nav === 'payments' && a.urgent)) {
    alerts.push({ text: `إجمالي رواتب معلقة: ${fmt(totalOwed)}₪`, color: C.warning, icon: '⚠️', nav: 'payments', urgent: false })
  }

  // مشاريع تجاوزت تاريخ الانتهاء
  const today2 = todayStr()
  projects.filter(p => p.status === 'نشط' && p.end_date && p.end_date < today2).forEach(p => {
    const days = Math.floor((new Date(today2) - new Date(p.end_date)) / 86400000)
    alerts.push({ text: `${p.name} — تجاوزت تاريخ الانتهاء بـ ${days} يوم`, color: C.accent, icon: '⏰', nav: 'projects', urgent: true })
  })

  // ترحيب للمستخدم الجديد
  if (!projects.length && !employees.length) {
    alerts.push({ text: 'ابدأ بإضافة مشاريع وعمال!', color: C.primary, icon: '💡', nav: 'projects', urgent: false })
  }

  const urgentCount = alerts.filter(a => a.urgent).length


  return (
    <div className="fade-in" style={{ padding:16 }}>

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
              { l:'إجمالي المقبوض', v:`${fmt(totalReceived)}₪`, c:C.success },
              { l:'صافي الربح',     v:`${fmt(netProfit)}₪`,     c:netProfit >= 0 ? C.primary : C.accent },
              { l:'للتحصيل',        v:`${fmt(Math.max(0,totalPending))}₪`, c:C.warning },
            ].map(s => (
              <div key={s.l} style={{ textAlign:'center', padding:'10px 4px', background:'rgba(255,255,255,0.04)', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:9, color:C.textDim, marginBottom:4, fontWeight:600 }}>{s.l}</div>
                <div style={{ fontSize:13, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── إحصائيات ─── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="💰" label="المقبوض من العملاء" value={`${fmt(totalReceived)}₪`} color={C.success} />
        <StatCard icon="💸" label="إجمالي التكاليف"    value={`${fmt(totalExp + totalLabor)}₪`} color={C.accent} />
        <StatCard icon="📈" label="صافي الربح"          value={`${fmt(netProfit)}₪`}  color={netProfit >= 0 ? C.primary : C.accent} />
        <StatCard icon="⏳" label="متبقي للتحصيل"      value={`${fmt(Math.max(0, totalPending))}₪`} color={totalPending > 0 ? C.warning : C.success} />
        {totalMaterials > 0 && (
          <StatCard icon="🧱" label="إجمالي البضاعة" value={`${fmt(totalMaterials)}₪`} color={C.orange} />
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

      {/* ─── قسم الضرائب ─── */}
      {taxEnabled && <div style={{ marginBottom:16 }}>
        <button onClick={() => setShowTax(t => !t)}
          style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 16px', background:`linear-gradient(90deg,${C.purple}18,${C.blue}10)`, borderRadius:14, border:`1px solid ${C.purple}44`, cursor:'pointer', marginBottom: showTax ? 10 : 0, transition:'all .2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:`${C.purple}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🇮🇱</div>
            <span style={{ fontSize:13, fontWeight:800, color:C.text }}>ملخص الضرائب الإسرائيلية</span>
          </div>
          <span style={{ fontSize:11, color:C.textDim, background:`${C.border}88`, borderRadius:8, padding:'3px 8px' }}>{showTax ? '▲ إخفاء' : '▼ عرض'}</span>
        </button>

        {showTax && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* نوع العيسك */}
            <div style={{ padding:'10px 14px', background:`${C.purple}12`, borderRadius:12, border:`1px solid ${C.purple}33`, fontSize:11, color:C.purple, fontWeight:700 }}>
              {businessType === 'osek_patur' ? '🏷️ עוסק פטור — معفى من الضريبة على القيمة المضافة' : '🏷️ עוסק מורשה — ملزم بـ מע"מ'}
            </div>

            {/* VAT — فقط لـ עוסק מורשה */}
            {businessType !== 'osek_patur' && <div style={{ padding:'14px', background:C.card, borderRadius:14, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.success},${C.primary})` }} />
              <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:12 }}>
                {'💳 מע"מ לתשלום'} <span style={{ fontSize:10, color:C.textDim, fontWeight:500 }}>(شهرين الأخيرين)</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { l:'VAT محصّل', v:`${fmt(vatData.vatOut)}₪`, c:C.success },
                  { l:'VAT مدفوع', v:`${fmt(vatData.vatIn)}₪`,  c:C.primary },
                  { l:'الصافي',    v:`${fmt(vatData.net)}₪`,    c:vatData.net > 0 ? C.accent : C.success },
                ].map(s => (
                  <div key={s.l} style={{ textAlign:'center', padding:'9px 4px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize:9, color:C.textDim, marginBottom:4, fontWeight:600 }}>{s.l}</div>
                    <div style={{ fontSize:13, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {vatData.net > 0 && (
                <div style={{ marginTop:10, padding:'8px 12px', background:`${C.accent}15`, borderRadius:10, fontSize:11, color:C.accent, fontWeight:600 }}>
                  {'⚠ يجب دفع '}{fmt(vatData.net)}{'₪ מע"מ للضريبة'}
                </div>
              )}
            </div>}

            {/* עוסק פטור — الحد السنوي يظهر دائماً */}
            <div style={{ padding:'14px', background:C.card, borderRadius:14, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.text }}>{'עוסק פטור'} — الحد السنوي</div>
                <div style={{ fontSize:11, color: thresholdPct >= 95 ? C.accent : thresholdPct >= 80 ? C.warning : C.textDim, fontWeight:700 }}>{thresholdPct}%</div>
              </div>
              <div style={{ height:10, background:`${C.border}66`, borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${thresholdPct}%`, borderRadius:5, background: thresholdPct >= 95 ? `linear-gradient(90deg,${C.accent},#FF8A80)` : thresholdPct >= 80 ? `linear-gradient(90deg,${C.warning},${C.orange})` : `linear-gradient(90deg,${C.success},${C.primary})`, transition:'width .6s cubic-bezier(0.34,1.56,0.64,1)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:C.textDim }}>
                <span>{fmt(yearRevenue)}₪</span><span>/ {fmt(OSEK_PATUR_THRESHOLD)}₪</span>
              </div>
              {thresholdPct >= 80 && (
                <div style={{ marginTop:8, padding:'8px 12px', background:`${thresholdPct >= 95 ? C.accent : C.warning}15`, borderRadius:10, fontSize:11, color: thresholdPct >= 95 ? C.accent : C.warning, fontWeight:600 }}>
                  {thresholdPct >= 95 ? '🚨 وصلت للحد! استشر محاسبك' : '⚠ اقتربت من الحد — تنبّه'}
                </div>
              )}
            </div>

            {/* פנסיה */}
            <div style={{ padding:'14px', background:C.card, borderRadius:14, border:`1px solid ${C.purple}55` }}>
              <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:4 }}>{'🏦 פנסיה'} — خصم من ضريبة الدخل</div>
              <div style={{ fontSize:9, color:C.textMuted, marginBottom:12 }}>حتى 16% من الدخل قابل للخصم (2024)</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <label style={{ fontSize:11, color:C.textDim, whiteSpace:'nowrap', fontWeight:600 }}>قسط شهري:</label>
                <input type="number" min="0" value={pensionMonthly || ''} onChange={e => setPensionMonthly && setPensionMonthly(e.target.value)} placeholder="0"
                  style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.surface, color:C.text, fontSize:14, fontWeight:700, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }} />
                <span style={{ fontSize:11, color:C.textDim }}>₪/شهر</span>
              </div>
              {pensionAnnual > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[
                    { l:'سنوياً',    v:`${fmt(pensionAnnual)}₪`, c:C.text },
                    { l:'معترف به', v:`${fmt(pensionActual)}₪`, c:pensionActual < pensionAnnual ? C.warning : C.success },
                    { l:'وفر ضريبي', v:`${fmt(pensionSaving)}₪`, c:C.success },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign:'center', padding:'9px 4px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize:9, color:C.textDim, marginBottom:4, fontWeight:600 }}>{s.l}</div>
                      <div style={{ fontSize:12, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              )}
              {pensionAnnual > 0 && pensionActual < pensionAnnual && (
                <div style={{ marginTop:8, padding:'8px 12px', background:`${C.warning}15`, borderRadius:10, fontSize:10, color:C.warning }}>
                  {'⚠ الحد المعترف به 16% من دخلك ('}{fmt(pensionMaxAllowed)}{'₪)'}
                </div>
              )}
              {pensionAnnual > 0 && pensionSaving > 0 && (
                <div style={{ marginTop:6, padding:'8px 12px', background:`${C.success}15`, borderRadius:10, fontSize:10, color:C.success, fontWeight:600 }}>
                  {'✓ الپنسيه توفّر لك '}{fmt(pensionSaving)}{'₪ من الضريبة'}
                </div>
              )}
              {!pensionMonthly && (
                <div style={{ padding:'8px 12px', background:`${C.blue}15`, borderRadius:10, fontSize:10, color:C.blue }}>
                  {'💡 لو بتدفع پنسيه، أدخل المبلغ وشوف كم بتوفر'}
                </div>
              )}
            </div>

            <TaxAdvanceBlock title="מס הכנסה — ضريبة الدخل" icon="📋" color={C.blue} estimate={itEstimate} paid={itPaidYear}
              records={taxAdvances.filter(a => a.type === 'income_tax' && (a.date||'').startsWith(thisYear))}
              onAdd={() => { setAddingTax('income_tax'); setTaxForm({ amount: '', date: todayStr(), period: todayStr().slice(0,7), notes: '' }) }}
              onDelete={deleteTaxAdvance} hint="شرائح 2024" />

            <TaxAdvanceBlock title="ביטוח לאומי + בריאות" icon="🏥" color={C.warning} estimate={blEstimate} paid={blPaidYear}
              records={taxAdvances.filter(a => a.type === 'bituach_leumi' && (a.date||'').startsWith(thisYear))}
              onAdd={() => { setAddingTax('bituach_leumi'); setTaxForm({ amount: '', date: todayStr(), period: todayStr().slice(0,7), notes: '' }) }}
              onDelete={deleteTaxAdvance} hint="9.82% / 16.23%" />
          </div>
        )}
      </div>}

      {/* ─── مودال مقدمة ضريبية ─── */}
      {addingTax && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setAddingTax(null)}>
          <div className="slide-up" style={{ width:'100%', maxWidth:430, background:C.surface, borderRadius:'28px 28px 0 0', padding:24, paddingBottom:36, boxShadow:'0 -12px 50px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
              <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:20 }}>
              {addingTax === 'income_tax' ? '📋 دفعة מס הכנסה' : '🏥 דפعة ביטוח לאומי'}
            </div>
            {[
              { label:'المبلغ (₪) *', key:'amount', type:'number', placeholder:'0' },
              { label:'التاريخ',      key:'date',   type:'date' },
              { label:'الفترة (2024-01)', key:'period', type:'text', placeholder:'YYYY-MM' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:C.textDim, display:'block', marginBottom:5, fontWeight:600 }}>{f.label}</label>
                <input type={f.type} value={taxForm[f.key]} placeholder={f.placeholder} min={f.type === 'number' ? 1 : undefined}
                  onChange={e => setTaxForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:`1.5px solid ${C.border}`, background:C.card, color:C.text, fontSize:15, fontWeight:700, boxSizing:'border-box', outline:'none' }} />
              </div>
            ))}
            <button onClick={saveTaxAdvance} disabled={taxSaving || !taxForm.amount}
              style={{ width:'100%', padding:14, borderRadius:14, background: !taxForm.amount ? C.border : `linear-gradient(135deg,${C.primary},#0EA5E9)`, border:'none', color: !taxForm.amount ? C.textDim : C.bg, fontSize:15, fontWeight:800, cursor: taxForm.amount ? 'pointer' : 'default', boxShadow: taxForm.amount ? `0 6px 20px ${C.primary}44` : 'none', transition:'all .2s' }}>
              {taxSaving ? 'جاري الحفظ...' : '✓ سجّل الدفعة'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
