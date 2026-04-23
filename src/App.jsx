import React, { useState } from 'react'
import { supabase } from './lib/supabase.js'
import { C, NAV } from './constants/index.js'
import { useAuth }           from './hooks/useAuth.js'
import { useProjects }       from './hooks/useData.js'
import { useEmployees }      from './hooks/useData.js'
import { useWorkDays }       from './hooks/useData.js'
import { useExpenses }       from './hooks/useData.js'
import { usePayments }       from './hooks/useData.js'
import { useClientReceipts } from './hooks/useData.js'
import { useHolidays }       from './hooks/useData.js'
import { useAdvances }       from './hooks/useData.js'
import { useTaxAdvances }    from './hooks/useData.js'
import { useSettings }       from './hooks/useSettings.js'
import { useProfile }        from './hooks/useProfile.js'
import { useTeam }           from './hooks/useTeam.js'

import LoginScreen        from './screens/LoginScreen.jsx'
import WorkerPortalScreen from './screens/WorkerPortalScreen.jsx'
import DashboardScreen    from './screens/DashboardScreen.jsx'
import ProjectsScreen     from './screens/ProjectsScreen.jsx'
import WorkersScreen      from './screens/WorkersScreen.jsx'
import WorkDaysScreen     from './screens/WorkDaysScreen.jsx'
import ExpensesScreen     from './screens/ExpensesScreen.jsx'
import PaymentsScreen     from './screens/PaymentsScreen.jsx'
import SettingsScreen     from './screens/SettingsScreen.jsx'
import SearchOverlay        from './components/SearchOverlay.jsx'
import NotificationsPanel   from './components/NotificationsPanel.jsx'
import { LoadingSpinner }   from './components/index.jsx'
import { GRAD }             from './constants/index.js'
import { useNotifications } from './hooks/useNotifications.js'
import { useSalaryAlerts }  from './hooks/useSalaryAlerts.js'

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  @keyframes fadeIn   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes slideUp  { from { transform:translateY(100%) }             to { transform:translateY(0) } }
  @keyframes spin     { to   { transform:rotate(360deg) } }
  @keyframes shimmer  { 0%   { background-position:200% 0 }             to  { background-position:-200% 0 } }
  @keyframes ping     { 75%,100% { transform:scale(2.2); opacity:0 } }
  @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(16px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
  @keyframes float    { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  @keyframes gradMove { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }

  .fade-in  { animation: fadeIn  .3s ease both }
  .fade-up  { animation: fadeUp  .35s ease both }
  .slide-up { animation: slideUp .38s cubic-bezier(0.32,0.72,0,1) both }
  .toast-in { animation: toastIn .3s ease both }

  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  ::-webkit-scrollbar { width:2px; height:2px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:2px; }

  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important; }
  input, select, textarea, button { font-family: inherit; }
  button:focus-visible { outline: 2px solid #00DDB3; outline-offset: 2px; }
`

function NoAccess() {
  return (
    <div style={{ padding:60, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:14, color:'#555', fontWeight:600 }}>ليس لديك صلاحية لعرض هذه الصفحة</div>
    </div>
  )
}

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
  const [screen,      setScreen]      = useState('dashboard')
  const [showSearch,  setShowSearch]  = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const [isOnline,    setIsOnline]    = useState(navigator.onLine)

  React.useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const uid = user?.id

  const { projects,       loading: pLoad,  addProject,    updateProject,    deleteProject   } = useProjects(uid)
  const { employees,      loading: eLoad,  addEmployee,   updateEmployee,   deleteEmployee  } = useEmployees(uid)
  const { workDays,       loading: wLoad,  addWorkDay,  deleteWorkDay, approveWorkDay, rejectWorkDay } = useWorkDays(uid)
  const { expenses,       loading: xLoad,  addExpense, deleteExpense, approveExpense, rejectExpense } = useExpenses(uid)
  const { payments,       loading: pyLoad, addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest } = usePayments(uid)
  const { advances,                        addAdvance,                      deleteAdvance   } = useAdvances(uid)
  const { taxAdvances,                     addTaxAdvance,                   deleteTaxAdvance } = useTaxAdvances(uid)
  const { clientReceipts, loading: crLoad, addReceipt, updateReceipt,        deleteReceipt   } = useClientReceipts(uid)
  const { specs, expCats, payMethods, pensionMonthly, taxEnabled, businessType, addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod, setPensionMonthly, setTaxEnabled, setBusinessType } = useSettings(uid)
  const { holidays, addHoliday, deleteHoliday }                                               = useHolidays(uid)
  const { profile, saving: profSaving, uploading, saveName, uploadAvatar }                   = useProfile(uid)
  const { teamMembers, pendingInvite, permissions, effectiveOwnerId, acceptInvite, inviteMember, updateMember, removeMember, isBlocked, blockMember, getActivity } = useTeam(uid, user?.email)
  const { notifications, unreadCount, markAllRead, markRead, deleteAll } = useNotifications(uid)
  useSalaryAlerts(uid, employees, workDays, payments)

  const dataLoading = pLoad || eLoad || wLoad || xLoad || pyLoad || crLoad

  // ─── تسجيل الصفحات التي يشاهدها أعضاء الفريق ───────────────────────────
  // يجب أن يكون قبل أي early return لتجنب React Hooks violation
  React.useEffect(() => {
    if (!permissions?.isOwner && uid && effectiveOwnerId && uid !== effectiveOwnerId) {
      supabase.rpc('log_screen_view', { p_owner_id: effectiveOwnerId, p_screen: screen })
    }
  }, [screen])

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
        <style>{globalCSS}</style>
        <div style={{ width:88, height:88, borderRadius:28, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, marginBottom:24, boxShadow:`0 16px 50px #00DDB344`, animation:'float 2.5s ease-in-out infinite' }}>🏗️</div>
        <div style={{ fontSize:26, fontWeight:900, background:GRAD.brand, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 }}>Contractor Pro</div>
        <div style={{ fontSize:11, color:C.textDim, letterSpacing:'0.1em', marginBottom:36 }}>إدارة مشاريعك بذكاء</div>
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <style>{globalCSS}</style>
        <LoginScreen />
      </>
    )
  }

  if (isBlocked) {
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0, direction:'rtl', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", padding:32 }}>
        <style>{globalCSS}</style>
        <div style={{ fontSize:64, marginBottom:16 }}>🚫</div>
        <div style={{ fontSize:20, fontWeight:900, color:C.accent, marginBottom:8 }}>تم إيقاف وصولك</div>
        <div style={{ fontSize:13, color:C.textDim, textAlign:'center', lineHeight:1.7 }}>
          تواصل مع صاحب الحساب لإعادة تفعيل صلاحياتك
        </div>
      </div>
    )
  }

  // ─── الشاشة الحالية ──────────────────────────────────────────────────────
  const p = permissions
  function renderScreen() {
    const commonData = { projects, employees, workDays, expenses, payments, clientReceipts }
    switch (screen) {
      case 'dashboard': return <DashboardScreen {...commonData} onNav={setScreen} permissions={p} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance} deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} taxEnabled={taxEnabled} businessType={businessType} />
      case 'projects':  return p.viewProjects  ? <ProjectsScreen  projects={projects} workDays={workDays} expenses={expenses} clientReceipts={clientReceipts} employees={employees} addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt} userId={uid} permissions={p} /> : <NoAccess />
      case 'workers':   return p.viewWorkers   ? <WorkersScreen   employees={employees} workDays={workDays} payments={payments} advances={advances} addAdvance={addAdvance} deleteAdvance={deleteAdvance} specs={specs} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} permissions={p} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} /> : <NoAccess />
      case 'workdays':  return p.editWorkers   ? <WorkDaysScreen  workDays={workDays} employees={employees} projects={projects} addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay} approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay} permissions={p} /> : <NoAccess />
      case 'expenses':  return p.viewExpenses  ? <ExpensesScreen  expenses={expenses} projects={projects} expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense} approveExpense={approveExpense} rejectExpense={rejectExpense} employees={employees} userId={uid} permissions={p} /> : <NoAccess />
      case 'payments':  return p.viewPayments  ? <PaymentsScreen  payments={payments} employees={employees} workDays={workDays} projects={projects} addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment} approvePaymentRequest={approvePaymentRequest} rejectPaymentRequest={rejectPaymentRequest} userId={uid} permissions={p} payMethods={payMethods} /> : <NoAccess />
      case 'settings':  return <SettingsScreen  {...commonData} userId={uid} specs={specs} expCats={expCats} payMethods={payMethods} addSpec={addSpec} removeSpec={removeSpec} addExpCat={addExpCat} removeExpCat={removeExpCat} addPayMethod={addPayMethod} removePayMethod={removePayMethod} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} taxEnabled={taxEnabled} businessType={businessType} setTaxEnabled={setTaxEnabled} setBusinessType={setBusinessType} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} profile={profile} profSaving={profSaving} uploading={uploading} saveName={saveName} uploadAvatar={uploadAvatar} permissions={p} teamMembers={teamMembers} inviteMember={inviteMember} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} getActivity={getActivity} />
      default:          return <DashboardScreen {...commonData} onNav={setScreen} permissions={p} />
    }
  }

  return (
    <div style={{ maxWidth:430, margin:'0 auto', background:C.bg, minHeight:'100vh', fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", direction:'rtl', position:'relative' }}>
      <style>{globalCSS}</style>

      {/* بانر عدم الاتصال */}
      {!isOnline && (
        <div style={{ position:'sticky', top:0, zIndex:200, background:'rgba(0,0,0,0.9)', backdropFilter:'blur(12px)', padding:'9px 16px', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:13 }}>📵</span>
          <span style={{ fontSize:11, color:C.textDim, fontWeight:600, letterSpacing:'0.02em' }}>لا يوجد اتصال — البيانات محفوظة محلياً</span>
        </div>
      )}

      {/* بانر الدعوة */}
      {pendingInvite && (
        <div style={{ position:'sticky', top:0, zIndex:100, background:GRAD.warm, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#000', fontWeight:700 }}>📨 لديك دعوة للانضمام لفريق</span>
          <button onClick={() => acceptInvite(pendingInvite.id)} style={{ padding:'6px 16px', borderRadius:20, background:'rgba(0,0,0,0.2)', color:'#000', border:'none', cursor:'pointer', fontSize:12, fontWeight:800 }}>قبول</button>
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(7,9,13,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:14, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 4px 16px #00DDB344', flexShrink:0 }}>🏗️</div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, background:GRAD.brand, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1.2 }}>Contractor Pro</div>
            <div style={{ fontSize:9, color:C.textDim, letterSpacing:'0.08em', fontWeight:600 }}>إدارة مشاريعك بذكاء</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {dataLoading && <div style={{ width:16, height:16, border:`2px solid ${C.border}`, borderTopColor:C.primary, borderRadius:'50%', animation:'spin .75s linear infinite' }} />}
          <button onClick={() => setShowNotifs(true)}
            style={{ position:'relative', background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, borderRadius:12, width:40, height:40, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, transition:'all .2s' }}>
            🔔
            {unreadCount > 0 && (
              <div style={{ position:'absolute', top:-5, right:-5, minWidth:18, height:18, borderRadius:9, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'#fff', padding:'0 4px', boxShadow:`0 2px 10px ${C.accent}88` }}>
                {unreadCount}
              </div>
            )}
          </button>
          <button onClick={() => setShowSearch(true)}
            style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, borderRadius:12, width:40, height:40, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, transition:'all .2s' }}>
            🔍
          </button>
        </div>
        {/* bottom gradient line */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:GRAD.brand, opacity:0.3 }} />
      </div>

      {/* المحتوى */}
      <div style={{ paddingBottom:96 }}>
        {renderScreen()}
      </div>

      {/* ─── Floating Bottom Nav ─── */}
      {(() => {
        const pendingCount = workDays.filter(w => w.status === 'pending').length
        return (
          <div style={{ position:'fixed', bottom:14, left:0, right:0, margin:'0 auto', width:'calc(100% - 32px)', maxWidth:398, background:'rgba(13,17,23,0.97)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderRadius:24, border:`1px solid ${C.borderMid}`, padding:'8px 6px 10px', display:'flex', justifyContent:'space-around', zIndex:50, boxShadow:'0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {NAV.map(n => {
              const active = screen === n.id
              return (
                <button key={n.id} onClick={() => setScreen(n.id)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 2px', background:'none', border:'none', cursor:'pointer', flex:1, position:'relative', minWidth:0 }}>
                  {active && (
                    <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:42, height:36, borderRadius:14, background:GRAD.brand, opacity:0.18, pointerEvents:'none' }} />
                  )}
                  <span style={{ fontSize:20, transition:'all .3s cubic-bezier(0.34,1.56,0.64,1)', transform:active?'scale(1.2)':'scale(1)', filter:active?'none':'grayscale(0.8) opacity(0.4)', position:'relative', zIndex:1 }}>
                    {n.icon}
                  </span>
                  {n.id === 'workdays' && pendingCount > 0 && (
                    <div style={{ position:'absolute', top:-2, right:4, minWidth:16, height:16, borderRadius:8, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'#fff', padding:'0 3px', boxShadow:`0 2px 8px ${C.accent}88` }}>
                      {pendingCount}
                    </div>
                  )}
                  <span style={{ fontSize:8, fontWeight:700, color:active?C.primary:C.textDim, transition:'color .2s', position:'relative', zIndex:1, letterSpacing:'0.02em' }}>{n.label}</span>
                  {active && <div style={{ width:20, height:2, borderRadius:1, background:GRAD.brand, marginTop:1 }} />}
                </button>
              )
            })}
          </div>
        )
      })()}


      {/* إشعارات */}
      <NotificationsPanel
        open={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        markAllRead={markAllRead}
        markRead={markRead}
        deleteAll={deleteAll}
        onNav={nav => { setScreen(nav); setShowNotifs(false) }}
      />

      {/* بحث */}
      <SearchOverlay
        open={showSearch}
        onClose={() => setShowSearch(false)}
        projects={projects} employees={employees}
        expenses={expenses} payments={payments}
        workDays={workDays}
        onNav={nav => { setScreen(nav); setShowSearch(false) }}
      />
    </div>
  )
}
