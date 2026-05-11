import React, { useState, useMemo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, Activity, WifiOff, Gift, Loader2 } from 'lucide-react'
import { Toaster, toast as sonnerToast } from 'sonner'
import { supabase } from './lib/supabase.js'
import { C, NAV } from './constants/index.js'
import { navigate }          from './Router.jsx'
import { useAuth }           from './hooks/useAuth.js'
import { useOrganization }   from './hooks/useOrganization.js'
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
import { useTeam, teamMemberSignIn }      from './hooks/useTeam.js'

import LoginScreen        from './screens/LoginScreen.jsx'
import WorkerPortalScreen from './screens/WorkerPortalScreen.jsx'
import DashboardScreen    from './screens/DashboardScreen.jsx'
const ProjectsScreen  = lazy(() => import('./screens/ProjectsScreen.jsx'))
const WorkersScreen   = lazy(() => import('./screens/WorkersScreen.jsx'))
const WorkDaysScreen  = lazy(() => import('./screens/WorkDaysScreen.jsx'))
const ExpensesScreen  = lazy(() => import('./screens/ExpensesScreen.jsx'))
const PaymentsScreen  = lazy(() => import('./screens/PaymentsScreen.jsx'))
const SettingsScreen    = lazy(() => import('./screens/SettingsScreen.jsx'))
const AccountingScreen  = lazy(() => import('./screens/AccountingScreen.jsx'))
const UnitTrackerScreen = lazy(() => import('./screens/UnitTrackerScreen.jsx'))
const MaterialsScreen   = lazy(() => import('./screens/MaterialsScreen.jsx'))
const ActivityScreen  = lazy(() => import('./screens/ActivityScreen.jsx'))
import SearchOverlay        from './components/SearchOverlay.jsx'
import NotificationsPanel   from './components/NotificationsPanel.jsx'
import ErrorBoundary        from './components/ErrorBoundary.jsx'
import { LoadingSpinner }   from './components/index.jsx'
import { GRAD }             from './constants/index.js'
import { useNotifications } from './hooks/useNotifications.js'
import { useSalaryAlerts }  from './hooks/useSalaryAlerts.js'

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap');

  @keyframes fadeIn    { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes slideUp   { from { transform:translateY(100%) }             to { transform:translateY(0) } }
  @keyframes spin      { to   { transform:rotate(360deg) } }
  @keyframes shimmer   { 0%   { background-position:200% 0 }             to  { background-position:-200% 0 } }
  @keyframes ping      { 75%,100% { transform:scale(2.2); opacity:0 } }
  @keyframes toastIn   { from { opacity:0; transform:translateX(-50%) translateY(16px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
  @keyframes float     { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  @keyframes gradMove  { 0%,100% { background-position:0% 50% } 50% { background-position:100% 50% } }
  @keyframes navPop    { 0% { transform:scale(0.85) translateY(4px); opacity:0 } 60% { transform:scale(1.12) translateY(-1px) } 100% { transform:scale(1) translateY(0); opacity:1 } }
  @keyframes glowPulse { 0%,100% { box-shadow:0 0 12px #00DDB355 } 50% { box-shadow:0 0 22px #00DDB388 } }
  @keyframes badgePop  { 0% { transform:scale(0) } 70% { transform:scale(1.2) } 100% { transform:scale(1) } }

  .fade-in   { animation: fadeIn   .28s cubic-bezier(0.22,1,0.36,1) both }
  .fade-up   { animation: fadeUp   .35s cubic-bezier(0.22,1,0.36,1) both }
  .slide-up  { animation: slideUp  .38s cubic-bezier(0.32,0.72,0,1) both }
  .toast-in  { animation: toastIn  .3s  ease both }
  .nav-pop   { animation: navPop   .4s  cubic-bezier(0.34,1.56,0.64,1) both }
  .badge-pop { animation: badgePop .3s  cubic-bezier(0.34,1.56,0.64,1) both }

  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

  ::-webkit-scrollbar { width:3px; height:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(0,221,179,0.2); border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,221,179,0.4); }

  body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important; -webkit-font-smoothing:antialiased; }
  input, select, textarea, button { font-family: inherit; }
  button:focus-visible { outline: 2px solid #00DDB3; outline-offset: 2px; }

  .btn-press { transition: transform .12s ease, box-shadow .12s ease !important; }
  .btn-press:active { transform: scale(0.94) !important; }

  .glass { background: rgba(13,17,23,0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }

  .nav-btn { transition: transform .3s cubic-bezier(0.34,1.56,0.64,1) !important; }
  .nav-btn:active { transform: scale(0.88) !important; }
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
  const [screen,         setScreen]        = useState('dashboard')
  const [showSearch,     setShowSearch]    = useState(false)
  const [showNotifs,     setShowNotifs]    = useState(false)
  const [isOnline,       setIsOnline]      = useState(navigator.onLine)
  const [toast,          setToast]         = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const toastTimerRef = React.useRef(null)

  React.useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  function showToast(msg, type = 'success') {
    if (type === 'success') sonnerToast.success(msg)
    else if (type === 'warning') sonnerToast.warning(msg)
    else sonnerToast.error(msg)
  }

  const uid = user?.id

  const { teamMembers, permissions, effectiveOwnerId, allowedProjectIds, updateMember, removeMember, isBlocked, isExpired, teamLoadError, blockMember, getActivity, getAllActivity, addMember, resetMemberPassword, reload: reloadTeam } = useTeam(uid, user?.email)

  const eid = effectiveOwnerId || uid

  const { projects,       loading: pLoad,  addProject,    updateProject,    deleteProject   } = useProjects(eid)
  const { employees,      loading: eLoad,  addEmployee,   updateEmployee,   deleteEmployee  } = useEmployees(eid)
  const { workDays,       loading: wLoad,  addWorkDay, bulkAddWorkDays, updateWorkDay, bulkUpdateWorkDays,  deleteWorkDay, approveWorkDay, rejectWorkDay } = useWorkDays(eid)
  const { expenses,       loading: xLoad,  addExpense, deleteExpense, approveExpense, rejectExpense } = useExpenses(eid)
  const { payments,       loading: pyLoad, addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest } = usePayments(eid)
  const { advances,                        addAdvance,                      deleteAdvance   } = useAdvances(eid)
  const { taxAdvances,                     addTaxAdvance,                   deleteTaxAdvance } = useTaxAdvances(eid)
  const { clientReceipts, loading: crLoad, addReceipt, updateReceipt,        deleteReceipt   } = useClientReceipts(eid)
  const { specs, expCats, payMethods, pensionMonthly, taxEnabled, businessType, taxModules, addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod, setPensionMonthly, setTaxEnabled, setBusinessType, setTaxModule } = useSettings(eid)
  const { holidays, addHoliday, deleteHoliday }                                               = useHolidays(eid)
  const { profile, saving: profSaving, uploading, saveName, uploadAvatar, saveContractorNumber } = useProfile(uid)
  const { notifications, unreadCount, markAllRead, markRead, deleteAll } = useNotifications(uid)
  useSalaryAlerts(uid, employees, workDays, payments)

  // ─── Subscription / plan state (Phase 2+3) ──────────────────────────────
  const { org, loading: orgLoading, isPlanActive, isTrialActive, trialDaysLeft } = useOrganization(uid)

  React.useEffect(() => {
    if (uid && !localStorage.getItem('cp_onboarded')) setShowOnboarding(true)
  }, [uid])

  // تسجيل الخروج التلقائي بعد 30 دقيقة من عدم النشاط (للمالك فقط — أعضاء الفريق لهم جلسة مستقلة)
  React.useEffect(() => {
    if (!uid || effectiveOwnerId) return  // تجاهل أعضاء الفريق
    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => supabase.auth.signOut(), 30 * 60 * 1000)
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointermove']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [uid, effectiveOwnerId])

  // ─── تصفية البيانات حسب المشاريع المسموح بها (memoized لتجنب إعادة الحساب) ─
  const visibleProjects       = useMemo(() => allowedProjectIds ? projects.filter(p => allowedProjectIds.includes(p.id)) : projects, [projects, allowedProjectIds])
  const visibleWorkDays       = useMemo(() => allowedProjectIds ? workDays.filter(w => allowedProjectIds.includes(w.project_id)) : workDays, [workDays, allowedProjectIds])
  const visibleClientReceipts = useMemo(() => allowedProjectIds ? clientReceipts.filter(r => allowedProjectIds.includes(r.project_id)) : clientReceipts, [clientReceipts, allowedProjectIds])
  const visibleEmployeeIds    = useMemo(() => allowedProjectIds ? new Set(visibleWorkDays.map(w => w.employee_id)) : null, [visibleWorkDays, allowedProjectIds])
  const visibleExpenses       = useMemo(() => allowedProjectIds
    ? expenses.filter(e => e.employee_id
        ? visibleEmployeeIds.has(e.employee_id)
        : allowedProjectIds.includes(e.project_id))
    : expenses, [expenses, allowedProjectIds, visibleEmployeeIds])
  const visibleEmployees      = useMemo(() => visibleEmployeeIds ? employees.filter(e => visibleEmployeeIds.has(e.id)) : employees, [employees, visibleEmployeeIds])
  const visiblePayments       = useMemo(() => allowedProjectIds
    ? payments.filter(p => p.project_id && allowedProjectIds.includes(p.project_id))
    : payments, [payments, allowedProjectIds])
  const visibleAdvances       = useMemo(() => visibleEmployeeIds ? advances.filter(a => visibleEmployeeIds.has(a.employee_id)) : advances, [advances, visibleEmployeeIds])

  // ─── دوال الموافقة/الرفض مع إشعار توست ────────────────────────────────────
  const _approveWorkDay = id      => approveWorkDay(id).then(() => showToast('✓ تمت الموافقة على يوم العمل'))
  const _rejectWorkDay  = (id, r) => rejectWorkDay(id, r).then(() => showToast('رُفض يوم العمل', 'warning'))
  const _approveExpense = id      => approveExpense(id).then(() => showToast('✓ تمت الموافقة على المصروف'))
  const _rejectExpense  = (id, r) => rejectExpense(id, r).then(() => showToast('رُفض المصروف', 'warning'))
  const _approvePayment = id      => approvePaymentRequest(id).then(() => showToast('✓ تمت الموافقة على الدفعة'))
  const _rejectPayment  = (id, r) => rejectPaymentRequest(id, r).then(() => showToast('رُفضت الدفعة', 'warning'))

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
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-0">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl mb-6"
          style={{ background: 'linear-gradient(135deg, #00DDB3, #6366F1)', boxShadow: '0 16px 50px #00DDB344' }}
        >
          🏗️
        </motion.div>
        <div className="text-2xl font-black text-gradient mb-1.5">Contractor Pro</div>
        <div className="text-xs text-[#64748B] tracking-widest mb-9">إدارة مشاريعك بذكاء</div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen teamMemberSignIn={teamMemberSignIn} />
  }

  if (isBlocked || isExpired) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-0 p-8 text-center" dir="rtl">
        <div className="text-6xl mb-4">{isExpired ? '⏰' : '🚫'}</div>
        <div className="text-xl font-black text-danger mb-2">
          {isExpired ? 'انتهت صلاحية وصولك' : 'تم إيقاف وصولك'}
        </div>
        <div className="text-sm text-[#64748B] leading-relaxed">
          تواصل مع صاحب الحساب لإعادة تفعيل صلاحياتك
        </div>
        <button onClick={() => supabase.auth.signOut()} className="mt-6 px-6 py-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-bold transition-colors hover:bg-danger/20">
          خروج
        </button>
      </div>
    )
  }

  if (!orgLoading && org && !isPlanActive() && !effectiveOwnerId) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="text-7xl mb-4">⏰</div>
        <div className="text-2xl font-black text-[#F8FAFC] mb-2.5">انتهت فترة التجربة المجانية</div>
        <div className="text-sm text-[#64748B] leading-relaxed max-w-xs mb-8">
          جميع بياناتك محفوظة. اشترك الآن للاستمرار في استخدام Contractor Pro.
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/pricing')}
          className="px-9 py-3.5 rounded-2xl font-black text-base text-bg mb-3.5"
          style={{ background: 'linear-gradient(135deg, #00DDB3, #6366F1)', boxShadow: '0 8px 28px #00DDB344' }}
        >
          اختر خطة اشتراك ←
        </motion.button>
        <button onClick={() => supabase.auth.signOut()} className="px-6 py-2.5 rounded-xl border border-white/10 text-[#64748B] text-sm font-semibold transition-colors hover:text-[#F8FAFC] hover:border-white/20">
          تسجيل الخروج
        </button>
      </div>
    )
  }

  // ─── الشاشة الحالية ──────────────────────────────────────────────────────
  const p = permissions
  function renderScreen() {
    const commonData = { projects: visibleProjects, employees: visibleEmployees, workDays: visibleWorkDays, expenses: visibleExpenses, payments: visiblePayments, clientReceipts: visibleClientReceipts }
    let content
    switch (screen) {
      case 'dashboard': content = <DashboardScreen {...commonData} onNav={setScreen} permissions={p} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance} deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} taxEnabled={taxEnabled} businessType={businessType} taxModules={taxModules} />; break
      case 'projects':  content = p.viewProjects  ? <ProjectsScreen  projects={visibleProjects} workDays={visibleWorkDays} expenses={visibleExpenses} clientReceipts={visibleClientReceipts} employees={visibleEmployees} payments={visiblePayments} addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt} userId={uid} permissions={p} payMethods={payMethods} /> : <NoAccess />; break
      case 'workers':   content = p.viewWorkers   ? <WorkersScreen   employees={visibleEmployees} workDays={visibleWorkDays} payments={visiblePayments} advances={visibleAdvances} expenses={visibleExpenses} addAdvance={addAdvance} deleteAdvance={deleteAdvance} specs={specs} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} permissions={p} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} teamMembers={teamMembers} addMember={addMember} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} resetMemberPassword={resetMemberPassword} getActivity={getActivity} teamLoadError={teamLoadError} reloadTeam={reloadTeam} projects={projects} profile={profile} /> : <NoAccess />; break
      case 'workdays':  content = p.editWorkers   ? <WorkDaysScreen  workDays={visibleWorkDays} employees={visibleEmployees} projects={visibleProjects} addWorkDay={addWorkDay} bulkAddWorkDays={bulkAddWorkDays} updateWorkDay={updateWorkDay} bulkUpdateWorkDays={bulkUpdateWorkDays} deleteWorkDay={deleteWorkDay} approveWorkDay={_approveWorkDay} rejectWorkDay={_rejectWorkDay} permissions={p} holidays={holidays} /> : <NoAccess />; break
      case 'expenses':  content = p.viewExpenses  ? <ExpensesScreen  expenses={visibleExpenses} projects={visibleProjects} expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense} approveExpense={_approveExpense} rejectExpense={_rejectExpense} employees={visibleEmployees} userId={uid} permissions={p} businessType={businessType} /> : <NoAccess />; break
      case 'payments':  content = p.viewPayments  ? <PaymentsScreen  payments={visiblePayments} employees={visibleEmployees} workDays={visibleWorkDays} expenses={visibleExpenses} projects={visibleProjects} addPayment={addPayment} updatePayment={updatePayment} deletePayment={deletePayment} approvePaymentRequest={_approvePayment} rejectPaymentRequest={_rejectPayment} userId={uid} permissions={p} payMethods={payMethods} /> : <NoAccess />; break
      case 'tracker':    content = p.viewProjects ? <UnitTrackerScreen projects={visibleProjects} /> : <NoAccess />; break
      case 'materials':  content = p.viewProjects ? <MaterialsScreen userId={eid} employees={visibleEmployees} projects={visibleProjects} /> : <NoAccess />; break
      case 'accounting': content = <AccountingScreen employees={visibleEmployees} payments={visiblePayments} clientReceipts={visibleClientReceipts} expenses={visibleExpenses} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance} deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} businessType={businessType} setBusinessType={setBusinessType} />; break
      case 'activity':  content = (p.viewActivity || p.isOwner) ? <ActivityScreen getAllActivity={getAllActivity} getActivity={getActivity} teamMembers={teamMembers} permissions={p} /> : <NoAccess />; break
      case 'settings':  content = <SettingsScreen  {...commonData} userId={uid} specs={specs} expCats={expCats} payMethods={payMethods} addSpec={addSpec} removeSpec={removeSpec} addExpCat={addExpCat} removeExpCat={removeExpCat} addPayMethod={addPayMethod} removePayMethod={removePayMethod} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} taxEnabled={taxEnabled} businessType={businessType} setTaxEnabled={setTaxEnabled} setBusinessType={setBusinessType} taxModules={taxModules} setTaxModule={setTaxModule} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} profile={profile} profSaving={profSaving} uploading={uploading} saveName={saveName} uploadAvatar={uploadAvatar} saveContractorNumber={saveContractorNumber} permissions={p} teamMembers={teamMembers} addMember={addMember} resetMemberPassword={resetMemberPassword} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} getActivity={getActivity} reloadTeam={reloadTeam} />; break
      default:          content = <DashboardScreen {...commonData} onNav={setScreen} permissions={p} />
    }
    return <ErrorBoundary key={screen}>{content}</ErrorBoundary>
  }

  const pendingCount = workDays.filter(w => w.status === 'pending').length
  const currentNav = NAV.find(n => n.id === screen)

  return (
    <div className="max-w-[430px] mx-auto bg-bg min-h-screen relative" dir="rtl">

      <Toaster
        position="bottom-center"
        offset={110}
        toastOptions={{
          style: { background: '#131920', border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC', borderRadius: '14px', fontSize: '13px', fontWeight: 600 },
        }}
      />

      {/* بانر عدم الاتصال */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-0 z-[200] bg-black/90 backdrop-blur-xl border-b border-white/[0.06]"
          >
            <div className="flex items-center justify-center gap-2 px-4 py-2.5">
              <WifiOff size={13} className="text-[#64748B]" />
              <span className="text-xs text-[#64748B] font-semibold tracking-wide">لا يوجد اتصال — البيانات محفوظة محلياً</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* بانر التجربة المجانية */}
      {org && isTrialActive() && !effectiveOwnerId && (
        <div className="sticky top-0 z-[199] backdrop-blur-xl border-b border-secondary/25 flex items-center justify-between gap-2 px-4 py-2" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(0,221,179,0.12))' }}>
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-[#A5B4FC]" />
            <span className="text-xs text-[#A5B4FC] font-bold">
              التجربة المجانية — متبقي <strong className="text-white">{trialDaysLeft()} يوم</strong>
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/pricing')}
            className="px-3.5 py-1.5 rounded-lg text-bg text-xs font-black whitespace-nowrap shrink-0"
            style={{ background: 'linear-gradient(135deg, #00DDB3, #6366F1)' }}
          >
            اشترك الآن
          </motion.button>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-50 px-4 py-2.5 flex justify-between items-center border-b border-white/[0.06] relative" style={{ background: 'rgba(7,9,13,0.95)', backdropFilter: 'blur(28px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-[13px] flex items-center justify-center text-xl shrink-0 text-bg font-bold"
            style={{ background: 'linear-gradient(135deg, #00DDB3, #6366F1)', boxShadow: '0 4px 18px #00DDB344' }}>
            🏗️
          </div>
          <div>
            <div className="text-[15px] font-black text-gradient leading-tight tracking-tight">Contractor Pro</div>
            <div className="text-[9px] font-bold tracking-widest transition-colors duration-300" style={{ color: currentNav ? '#00DDB3' : '#64748B' }}>
              {currentNav ? `${currentNav.icon} ${currentNav.label}` : 'إدارة مشاريعك بذكاء'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {dataLoading && <Loader2 size={14} className="text-primary animate-spin" />}
          {(p?.isOwner || p?.viewActivity) && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setScreen('activity')}
              className={`w-9 h-9 rounded-[11px] flex items-center justify-center transition-all ${screen === 'activity' ? 'bg-primary/15 border border-primary/40 shadow-glow-sm' : 'bg-white/[0.05] border border-white/[0.08]'}`}
            >
              <Activity size={16} className={screen === 'activity' ? 'text-primary' : 'text-[#64748B]'} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotifs(true)}
            className="relative w-9 h-9 rounded-[11px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center transition-all hover:bg-white/[0.09]"
          >
            <Bell size={16} className="text-[#64748B]" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger flex items-center justify-center text-[9px] font-black text-white px-1"
                  style={{ boxShadow: '0 2px 10px #F43F5E88' }}
                >
                  {unreadCount}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-[11px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center transition-all hover:bg-white/[0.09]"
          >
            <Search size={16} className="text-[#64748B]" />
          </motion.button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #00DDB355, transparent)' }} />
      </div>

      {/* المحتوى */}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="pb-24"
        >
          <Suspense fallback={<div className="flex justify-center pt-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>}>
            {renderScreen()}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* ─── Floating Bottom Nav ─── */}
      <div className="fixed bottom-4 left-0 right-0 mx-auto z-50 flex justify-around items-center px-1 py-1.5"
        style={{
          width: 'calc(100% - 28px)',
          maxWidth: 400,
          background: 'rgba(10,13,19,0.97)',
          backdropFilter: 'blur(28px)',
          borderRadius: 26,
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {NAV.map(n => {
          const active = screen === n.id
          return (
            <motion.button
              key={n.id}
              onClick={() => setScreen(n.id)}
              whileTap={{ scale: 0.85 }}
              className="flex flex-col items-center gap-0.5 py-1.5 flex-1 relative cursor-pointer bg-transparent border-0 min-w-0"
            >
              {active && (
                <motion.div
                  layoutId="navPill"
                  className="absolute top-0.5 left-1/2 -translate-x-1/2 w-11 h-9 rounded-2xl pointer-events-none animate-glow-pulse"
                  style={{ background: 'linear-gradient(160deg,#00DDB322,#6366F118)', border: '1px solid #00DDB333' }}
                />
              )}
              <span className="relative z-10 text-lg leading-none block transition-all duration-250"
                style={{ filter: active ? 'drop-shadow(0 0 6px #00DDB388)' : 'grayscale(1) opacity(0.35)', fontSize: active ? 20 : 17 }}>
                {n.icon}
              </span>
              {n.id === 'workdays' && pendingCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-[calc(50%-18px)] min-w-[15px] h-[15px] rounded-full bg-danger flex items-center justify-center text-[8px] font-black text-white px-0.5"
                  style={{ boxShadow: '0 2px 8px #F43F5E88' }}
                >
                  {pendingCount}
                </motion.div>
              )}
              <span className="relative z-10 text-[8.5px] leading-none tracking-wide transition-all duration-200"
                style={{ fontWeight: active ? 800 : 600, color: active ? '#00DDB3' : 'rgba(255,255,255,0.25)' }}>
                {n.label}
              </span>
              {active && (
                <div className="w-4 h-0.5 rounded-full mt-0.5 relative z-10"
                  style={{ background: 'linear-gradient(90deg, #00DDB3, #6366F1)', boxShadow: '0 0 8px #00DDB388' }} />
              )}
            </motion.button>
          )
        })}


      </div>

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

      {/* ─── Onboarding ─── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-[400] flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-3xl border border-white/[0.10] p-6"
              style={{ background: '#0D1117' }}
            >
              <div className="text-center mb-5">
                <div className="text-4xl mb-3">🏗️</div>
                <div className="text-lg font-black text-gradient">أهلاً بك في Contractor Pro</div>
                <div className="text-xs text-[#64748B] mt-1">إليك أهم الميزات للبداية السريعة</div>
              </div>
              <div className="space-y-0">
                {[
                  { icon:'🏗️', title:'المشاريع', desc:'أضف مشاريعك وتابع الأرباح والمصاريف' },
                  { icon:'👷', title:'العمال',   desc:'أدر فريق عملك، الرواتب، والسلف بسهولة' },
                  { icon:'📅', title:'أيام العمل', desc:'سجّل أيام العمل مع نظام الموافقات' },
                  { icon:'💸', title:'المصاريف', desc:'تتبع مصاريف المشاريع واسترداد الضريبة' },
                ].map((f, i) => (
                  <div key={f.title} className={`flex items-center gap-3 py-3 ${i < 3 ? 'border-b border-white/[0.06]' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg shrink-0">{f.icon}</div>
                    <div>
                      <div className="text-sm font-bold text-[#F8FAFC]">{f.title}</div>
                      <div className="text-[10px] text-[#64748B] mt-0.5 leading-relaxed">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { localStorage.setItem('cp_onboarded', '1'); setShowOnboarding(false) }}
                className="mt-5 w-full py-3.5 rounded-2xl font-black text-sm text-bg"
                style={{ background: 'linear-gradient(135deg, #00DDB3, #6366F1)', boxShadow: '0 8px 24px #00DDB344' }}
              >
                ابدأ الآن ←
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
