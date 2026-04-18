import React, { useState } from 'react'
import { C, NAV } from './constants/index.js'
import { useAuth }      from './hooks/useAuth.js'
import { useProjects }       from './hooks/useData.js'
import { useEmployees }      from './hooks/useData.js'
import { useWorkDays }       from './hooks/useData.js'
import { useExpenses }       from './hooks/useData.js'
import { usePayments }       from './hooks/useData.js'
import { useClientReceipts } from './hooks/useData.js'
import { useSettings }       from './hooks/useSettings.js'
import { useProfile }        from './hooks/useProfile.js'
import { useTeam }           from './hooks/useTeam.js'

import LoginScreen    from './screens/LoginScreen.jsx'
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

function NoAccess() {
  return <div style={{ padding:40, textAlign:'center', color:'#888', fontSize:14 }}>🔒 ليس لديك صلاحية لعرض هذه الصفحة</div>
}

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const [screen, setScreen] = useState('dashboard')

  const uid = user?.id

  const { projects,       loading: pLoad,  addProject,    updateProject,    deleteProject   } = useProjects(uid)
  const { employees,      loading: eLoad,  addEmployee,   updateEmployee,   deleteEmployee  } = useEmployees(uid)
  const { workDays,       loading: wLoad,  addWorkDay,                      deleteWorkDay   } = useWorkDays(uid)
  const { expenses,       loading: xLoad,  addExpense,                      deleteExpense   } = useExpenses(uid)
  const { payments,       loading: pyLoad, addPayment,                      deletePayment   } = usePayments(uid)
  const { clientReceipts, loading: crLoad, addReceipt,                      deleteReceipt   } = useClientReceipts(uid)
  const { specs, expCats, addSpec, removeSpec, addExpCat, removeExpCat }                      = useSettings(uid)
  const { profile, saving: profSaving, uploading, saveName, uploadAvatar }                   = useProfile(uid)
  const { teamMembers, pendingInvite, permissions, effectiveOwnerId, acceptInvite, inviteMember, updateMember, removeMember } = useTeam(uid, user?.email)

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
  const p = permissions
  function renderScreen() {
    const commonData = { projects, employees, workDays, expenses, payments, clientReceipts }
    switch (screen) {
      case 'dashboard': return <DashboardScreen {...commonData} onNav={setScreen} permissions={p} />
      case 'projects':  return p.viewProjects  ? <ProjectsScreen  projects={projects} workDays={workDays} expenses={expenses} clientReceipts={clientReceipts} addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} addReceipt={addReceipt} deleteReceipt={deleteReceipt} userId={uid} permissions={p} /> : <NoAccess />
      case 'workers':   return p.viewWorkers   ? <WorkersScreen   employees={employees} workDays={workDays} payments={payments} specs={specs} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} permissions={p} /> : <NoAccess />
      case 'workdays':  return p.editWorkers   ? <WorkDaysScreen  workDays={workDays} employees={employees} projects={projects} addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay} permissions={p} /> : <NoAccess />
      case 'expenses':  return p.viewExpenses  ? <ExpensesScreen  expenses={expenses} projects={projects} expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense} permissions={p} /> : <NoAccess />
      case 'payments':  return p.viewPayments  ? <PaymentsScreen  payments={payments} employees={employees} workDays={workDays} addPayment={addPayment} deletePayment={deletePayment} userId={uid} permissions={p} /> : <NoAccess />
      case 'settings':  return <SettingsScreen  {...commonData} userId={uid} specs={specs} expCats={expCats} addSpec={addSpec} removeSpec={removeSpec} addExpCat={addExpCat} removeExpCat={removeExpCat} profile={profile} profSaving={profSaving} uploading={uploading} saveName={saveName} uploadAvatar={uploadAvatar} permissions={p} teamMembers={teamMembers} inviteMember={inviteMember} updateMember={updateMember} removeMember={removeMember} />
      default:          return <DashboardScreen {...commonData} onNav={setScreen} permissions={p} />
    }
  }

  return (
    <div style={{ maxWidth:430, margin:'0 auto', background:C.bg, minHeight:'100vh', fontFamily:"'Segoe UI',Tahoma,sans-serif", direction:'rtl', position:'relative' }}>
      <style>{globalCSS}</style>

      {/* بانر الدعوة المعلقة */}
      {pendingInvite && (
        <div style={{ position:'sticky', top:0, zIndex:100, background:`${C.warning}ee`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#000', fontWeight:700 }}>📨 لديك دعوة للانضمام لفريق</span>
          <button onClick={() => acceptInvite(pendingInvite.id)}
            style={{ padding:'6px 14px', borderRadius:10, background:C.primary, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
            قبول
          </button>
        </div>
      )}

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
