import React, { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { C, EXP_CATS } from '../constants/index.js'
import { fmt, fmtDate, todayStr } from '../lib/helpers.js'
import { StatCard, Card } from '../components/index.jsx'

export default function DashboardScreen({ projects, employees, workDays, expenses, payments, clientReceipts, onNav }) {
  const pieColors = [C.primary, C.blue, C.purple, C.orange, C.pink, C.cyan]

  const totalLabor    = workDays.reduce((s, w) => s + (w.amount || 0), 0)
  const totalExp      = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalPaid     = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOwed     = totalLabor - totalPaid
  const totalReceived = (clientReceipts || []).reduce((s, r) => s + (r.amount || 0), 0)
  const totalContract = projects.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const totalPending  = totalContract - totalReceived
  const netProfit     = totalReceived - totalExp - totalLabor

  const expByCat = EXP_CATS
    .map(cat => ({ name: cat.split(' / ')[0].split(' ')[0], value: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0) }))
    .filter(e => e.value > 0)

  const alerts = []
  if (totalOwed > 0) alerts.push({ text: `رواتب معلقة: ${fmt(totalOwed)}₪`, color: C.warning, icon: '⚠️' })
  projects.filter(p => p.status === 'نشط').forEach(p => {
    const spent = workDays.filter(w => w.project_id === p.id).reduce((s, w) => s + w.amount, 0)
               + expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    if (p.price && spent > p.price * 0.9)
      alerts.push({ text: `${p.name} تجاوز 90% من الميزانية!`, color: C.accent, icon: '🔴' })
  })
  if (!projects.length && !employees.length)
    alerts.push({ text: 'ابدأ بإضافة مشاريع وعمال!', color: C.primary, icon: '💡' })

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:C.text }}>مرحبا 👋</div>
          <div style={{ fontSize:12, color:C.textDim }}>{fmtDate(todayStr())}</div>
        </div>
      </div>

      {/* إحصائيات */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        <StatCard icon="💰" label="المقبوض من العملاء" value={`${fmt(totalReceived)}₪`} color={C.success} />
        <StatCard icon="💸" label="إجمالي التكاليف"    value={`${fmt(totalExp + totalLabor)}₪`} color={C.accent} />
        <StatCard icon="📈" label="صافي الربح"          value={`${fmt(netProfit)}₪`}  color={netProfit >= 0 ? C.primary : C.accent} />
        <StatCard icon="⏳" label="متبقي للتحصيل"      value={`${fmt(Math.max(0, totalPending))}₪`} color={totalPending > 0 ? C.warning : C.success} />
      </div>

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

      {/* التنبيهات */}
      {alerts.length > 0 && (
        <div style={{ marginTop:16, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>⚠️ تنبيهات</div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:6, background:`${a.color}11`, borderRadius:12, border:`1px solid ${a.color}33` }}>
              <span>{a.icon}</span>
              <span style={{ fontSize:12, color:C.text }}>{a.text}</span>
            </div>
          ))}
        </div>
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
