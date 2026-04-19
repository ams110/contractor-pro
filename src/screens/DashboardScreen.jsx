import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { C, EXP_CATS } from '../constants/index.js'
import { fmt, fmtDate, todayStr } from '../lib/helpers.js'
import { StatCard, Card } from '../components/index.jsx'

export default function DashboardScreen({ projects, employees, workDays, expenses, payments, clientReceipts, onNav }) {
  const [alertsExpanded, setAlertsExpanded] = useState(true)
  const pieColors = [C.primary, C.blue, C.purple, C.orange, C.pink, C.cyan]

  const totalLabor    = workDays.reduce((s, w) => s + (w.amount || 0), 0)
  const totalExp      = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalPaid     = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalReceived = (clientReceipts || []).reduce((s, r) => s + (r.amount || 0), 0)
  const totalContract = projects.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const totalPending  = totalContract - totalReceived
  const netProfit     = totalReceived - totalExp - totalLabor

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

  // ترحيب للمستخدم الجديد
  if (!projects.length && !employees.length) {
    alerts.push({ text: 'ابدأ بإضافة مشاريع وعمال!', color: C.primary, icon: '💡', nav: 'projects', urgent: false })
  }

  const urgentCount = alerts.filter(a => a.urgent).length

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:C.text }}>مرحبا 👋</div>
          <div style={{ fontSize:12, color:C.textDim }}>{fmtDate(todayStr())}</div>
        </div>
        {urgentCount > 0 && (
          <div style={{ background:C.accent, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:800, color:'#fff' }}>
            {urgentCount} تنبيه عاجل
          </div>
        )}
      </div>

      {/* إحصائيات */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="💰" label="المقبوض من العملاء" value={`${fmt(totalReceived)}₪`} color={C.success} />
        <StatCard icon="💸" label="إجمالي التكاليف"    value={`${fmt(totalExp + totalLabor)}₪`} color={C.accent} />
        <StatCard icon="📈" label="صافي الربح"          value={`${fmt(netProfit)}₪`}  color={netProfit >= 0 ? C.primary : C.accent} />
        <StatCard icon="⏳" label="متبقي للتحصيل"      value={`${fmt(Math.max(0, totalPending))}₪`} color={totalPending > 0 ? C.warning : C.success} />
      </div>

      {/* التنبيهات */}
      {alerts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setAlertsExpanded(e => !e)}
            style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:`${C.warning}11`, borderRadius:12, border:`1px solid ${C.warning}33`, marginBottom:4, cursor:'pointer' }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>⚠️ التنبيهات ({alerts.length})</span>
            <span style={{ fontSize:12, color:C.textDim }}>{alertsExpanded ? '▲ إخفاء' : '▼ عرض'}</span>
          </button>
          {alertsExpanded && alerts.map((a, i) => (
            <button key={i} onClick={() => a.nav && onNav(a.nav)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:4, background:`${a.color}11`, borderRadius:10, border:`1px solid ${a.color}33`, cursor:'pointer', textAlign:'right' }}>
              <span>{a.icon}</span>
              <span style={{ fontSize:12, color:C.text, flex:1 }}>{a.text}</span>
              {a.nav && <span style={{ fontSize:10, color:a.color }}>←</span>}
            </button>
          ))}
        </div>
      )}

      {/* رسم بياني للمصاريف */}
      {expByCat.length > 0 && (
        <Card>
          <div style={{ padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>📊 توزيع المصاريف</div>
            <div style={{ height:180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expByCat} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {expByCat.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:12 }}
                    formatter={v => `${fmt(v)}₪`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10, justifyContent:'center' }}>
              {expByCat.map((e, i) => (
                <div key={e.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:C.textDim }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:pieColors[i % pieColors.length] }} />
                  {`${e.name} (${fmt(e.value)}₪)`}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* أزرار الاختصارات */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:20 }}>
        {[
          { icon:'📅', label:'يوم عمل',  nav:'workdays', color:C.primary },
          { icon:'💸', label:'مصروف',    nav:'expenses', color:C.blue   },
          { icon:'🏗️', label:'مشروع',    nav:'projects', color:C.purple },
          { icon:'💵', label:'قبض دفعة', nav:'projects', color:C.success },
        ].map(a => (
          <button
            key={a.label} onClick={() => onNav(a.nav)}
            style={{ padding:'14px 8px', borderRadius:14, border:`2px solid ${a.color}`, background:`${a.color}12`, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}
          >
            <span style={{ fontSize:22 }}>{a.icon}</span>
            <span style={{ fontSize:11, fontWeight:700, color:a.color }}>+ {a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
