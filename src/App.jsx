import React, { useState } from 'react'
import { C, NAV } from './constants/index.js'
import { useAuth }      from './hooks/useAuth.js'
import { useProjects }       from './hooks/useData.js'
import { useEmployees }      from './hooks/useData.js'
import { useWorkDays }       from './hooks/useData.js'
import { useExpenses }       from './hooks/useData.js'
import { usePayments }       from './hooks/useData.js'
import { useClientReceipts } from './hooks/useData.js'

import LoginScreen      from './screens/LoginScreen.jsx'
import WorkerPortalScreen from './screens/WorkerPortalScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import ProjectsScreen  from './screens/ProjectsScreen.jsx'
import WorkersScreen   from './screens/WorkersScreen.jsx'
import WorkDaysScreen  from './screens/WorkDaysScreen.jsx'
import ExpensesScreen  from './screens/ExpensesScreen.jsx'
import PaymentsScreen  from './screens/PaymentsScreen.jsx'
import SettingsScreen  from './screens/SettingsScreen.jsx'
import { LoadingSpinner } from './components/index.jsx'

// ─── Animations CSS ───────────────────────────────────────────────────────────
const globalCSS = `
  @keyframes fadeIn  { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0) } }
  @keyframes slideUp { from { transform:translateY(100%) }             to { transform:translateY(0) } }
  @keyframes spin    { to   { transform:rotate(360deg) } }
  .fade-in  { animation: fadeIn  .3s ease }
  .slide-up { animation: slideUp .35s ease }
`

export default function App() {
  // Worker portal: detect ?portal in URL
  const params = new URLSearchParams(window.location.search)
  if (params.has('portal') || params.has('worker')) {
    return (
      <>
        <style>{globalCSS}</style>
        <WorkerPortalScreen />
      </>
    )
  }

  const { user, loading: authLoading } = useAuth()
  const [screen, setScreen] = useState('dashboard')

  const uid = user?.id

  const { projects,       loading: pLoad,  addProject,    updateProject,    deleteProject   } = useProjects(uid)
  const { employees,      loading: eLoad,  addEmployee,   updateEmployee,   deleteEmployee  } = useEmployees(uid)
  const { workDays,       loading: wLoad,  addWorkDay,                      deleteWorkDay   } = useWorkDays(uid)
  const { expenses,       loading: xLoad,  addExpense,                      deleteExpense   } = useExpenses(uid)
  const { payments,       loading: pyLoad, addPayment,                      deletePayment   } = usePayments(uid)
  const { clientReceipts, loading: crLoad, addReceipt,                      deleteReceipt   } = useClientReceipts(uid)

  const dataLoading = pLoad || eLoad || wLoad || xLoad || pyLoad || crLoad

  // ─── شاشة التحميل الأولى ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <style>{globalCSS}</style>
        <div style={{ fontSize:64, marginBottom:16 }}>🏗️</div>
        <div style={{ fontSize:22, fontWeight:800, color:C.primary, marginBottom:8 }}>Contractor Pro</div>
        <LoadingSpinner />
      </div>
    )
  }

  // ─── تسجيل الدخول ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <style>{globalCSS}</style>
        <LoginScreen />
      </>
    )
  }

  // ─── الشاشة الحالية ──────────────────────────────────────────────────────
  function renderScreen() {
    const commonData = { projects, employees, workDays, expenses, payments, clientReceipts }
    switch (screen) {
      case 'dashboard': return <DashboardScreen {...commonData} onNav={setScreen} />
      case 'projects':  return <ProjectsScreen  projects={projects} workDays={workDays} expenses={expenses} clientReceipts={clientReceipts} addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} addReceipt={addReceipt} deleteReceipt={deleteReceipt} />
      case 'workers':   return <WorkersScreen   employees={employees} workDays={workDays} payments={payments} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} />
      case 'workdays':  return <WorkDaysScreen  workDays={workDays} employees={employees} projects={projects} addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay} />
      case 'expenses':  return <ExpensesScreen  expenses={expenses} projects={projects} addExpense={addExpense} deleteExpense={deleteExpense} />
      case 'payments':  return <PaymentsScreen  payments={payments} employees={employees} workDays={workDays} addPayment={addPayment} deletePayment={deletePayment} />
      case 'settings':  return <SettingsScreen  {...commonData} userId={uid} />
      default:          return <DashboardScreen {...commonData} onNav={setScreen} />
    }
  }

  return (
    <div style={{ maxWidth:430, margin:'0 auto', background:C.bg, minHeight:'100vh', fontFamily:"'Segoe UI',Tahoma,sans-serif", direction:'rtl', position:'relative' }}>
      <style>{globalCSS}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:`${C.bg}ee`, backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.border}`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>🏗️</span>
          <span style={{ fontSize:15, fontWeight:800, color:C.primary }}>Contractor Pro</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {dataLoading && <div style={{ width:14, height:14, border:`2px solid ${C.border}`, borderTopColor:C.primary, borderRadius:'50%', animation:'spin .8s linear infinite' }} />}
          <div style={{ fontSize:12, color:C.textDim }}>{NAV.find(n => n.id === screen)?.label}</div>
        </div>
      </div>

      {/* المحتوى */}
      <div style={{ paddingBottom:72 }}>
        {renderScreen()}
      </div>

      {/* شريط التنقل السفلي */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:`${C.surface}f5`, backdropFilter:'blur(12px)', borderTop:`1px solid ${C.border}`, padding:'4px 2px 6px', display:'flex', justifyContent:'space-around', zIndex:50 }}>
        {NAV.map(n => (
          <button
            key={n.id} onClick={() => setScreen(n.id)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, padding:'4px 2px', background:'none', border:'none', cursor:'pointer', minWidth:44 }}
          >
            <span style={{ fontSize:18, transform:screen===n.id?'scale(1.15)':'scale(1)', filter:screen===n.id?'none':'grayscale(0.6) opacity(0.5)', transition:'all .2s' }}>
              {n.icon}
            </span>
            <span style={{ fontSize:8, fontWeight:700, color:screen===n.id?C.primary:C.textMuted }}>{n.label}</span>
            {screen === n.id && <div style={{ width:4, height:4, borderRadius:'50%', background:C.primary, marginTop:1 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
