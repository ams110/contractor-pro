import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Building2, Users, Wallet, Settings,
  Bell, ClipboardCheck, HardHat, Gift,
  Clock, ShieldOff, Lock, CalendarDays, CreditCard, Banknote,
  ClipboardList, Package, Calculator, Activity, Grid3x3,
  Search, AlertTriangle, RefreshCw,
} from 'lucide-react'

import { supabase }            from './lib/supabase.js'
import { C, GRAD, NAV, MORE_SCREENS, navLabel } from './constants/index.js'
import { tl } from './lib/labels.js'
import { navigate }            from './Router.jsx'
import { useAppStore }         from './store/useAppStore.js'
import { useBusinessStore }    from './store/useBusinessStore.js'
import { useDataStore }        from './store/useDataStore.js'
import FirstTimeSetup          from './screens/onboarding/FirstTimeSetup.jsx'
import { useAuth }             from './hooks/useAuth.js'
import { useOrganization }     from './hooks/useOrganization.js'
import { setPlanInfo }         from './store/usePlanStore.js'
import FeatureGate             from './components/FeatureGate.jsx'
import { setSentryUser }       from './lib/sentry.js'
import { identifyUser }         from './lib/track.js'
import { useProjects, useEmployees, useWorkDays, useExpenses, usePayments, useClientReceipts, useHolidays, useAdvances, useTaxAdvances } from './hooks/useData.js'
import { useSettings }         from './hooks/useSettings.js'
import { useProfile }          from './hooks/useProfile.js'
import { useTeam, teamMemberSignIn } from './hooks/useTeam.js'
import { useNotifications }    from './hooks/useNotifications.js'
import { useSalaryAlerts }     from './hooks/useSalaryAlerts.js'
import { useDailyDigest }      from './hooks/useDailyDigest.js'

import WorkerPortalScreen      from './screens/WorkerPortalScreen.jsx'
import NotificationsPanel      from './components/NotificationsPanel.jsx'
import ErrorBoundary            from './components/ErrorBoundary.jsx'
import SmartSearch              from './components/SmartSearch.jsx'
import BiometricConfirmModal   from './components/BiometricConfirmModal.jsx'
import { useBiometricConfirm } from './hooks/useBiometricConfirm.js'
import SessionLockScreen       from './components/SessionLockScreen.jsx'
import ConnectionStatus        from './components/ConnectionStatus.jsx'
import ScreenSkeleton          from './components/ScreenSkeleton.jsx'
import { LoadingSpinner }       from './components/index.jsx'
import { usePushNotifications } from './hooks/usePushNotifications.js'
import { useAppConfig }        from './hooks/useAppConfig.js'
import { idleTimeoutMs, lockOnBackgroundEnabled, LOCK_ON_BG_KEY } from './lib/sessionLock.js'

// ── New screens ───────────────────────────────────────────────────────────────
const LoginScreen    = lazy(() => import('./screens/auth/LoginScreen.jsx'))
const DashboardScreen = lazy(() => import('./screens/dashboard/DashboardScreen.jsx'))
const ProjectsScreen  = lazy(() => import('./screens/projects/ProjectsScreen.jsx'))
const WorkersScreen   = lazy(() => import('./screens/workers/WorkersScreen.jsx'))
const FinanceScreen   = lazy(() => import('./screens/finance/FinanceScreen.jsx'))
const SettingsScreen  = lazy(() => import('./screens/settings/SettingsScreen.jsx'))

// ── Legacy screens (accessible via settings / more) ───────────────────────────
const WorkDaysScreen    = lazy(() => import('./screens/WorkDaysScreen.jsx'))
const ExpensesScreen    = lazy(() => import('./screens/ExpensesScreen.jsx'))
const PaymentsScreen    = lazy(() => import('./screens/PaymentsScreen.jsx'))
const UnitTrackerScreen = lazy(() => import('./screens/UnitTrackerScreen.jsx'))
const MaterialsScreen   = lazy(() => import('./screens/MaterialsScreen.jsx'))
const ActivityScreen    = lazy(() => import('./screens/ActivityScreen.jsx'))
const TeamScreen        = lazy(() => import('./screens/team/TeamScreen.jsx'))

// ─── Icon map ────────────────────────────────────────────────────────────────
const NAV_ICONS = {
  dashboard:  LayoutDashboard,
  projects:   Building2,
  workers:    Users,
  finance:    Wallet,
  settings:   Settings,
  more:       Grid3x3,
  workdays:   CalendarDays,
  expenses:   CreditCard,
  payments:   Banknote,
  tracker:    ClipboardList,
  materials:  Package,
  accounting: Calculator,
  activity:   Activity,
}

const globalCSS = `
  @keyframes spin       { to { transform:rotate(360deg) } }
  @keyframes float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-7px) } }
  @keyframes shimmer    { 0% { background-position:200% 0 } to { background-position:-200% 0 } }
  @keyframes ping       { 75%,100% { transform:scale(2.2); opacity:0 } }
  @keyframes glowPulse  { 0%,100% { box-shadow:0 0 14px rgba(249,115,22,0.3) } 50% { box-shadow:0 0 28px rgba(249,115,22,0.55) } }
  @keyframes badgePop   { 0% { transform:scale(0) } 70% { transform:scale(1.2) } 100% { transform:scale(1) } }
  @keyframes auroraMove { 0%,100% { opacity:0.6 } 50% { opacity:1 } }

  .glass { background:rgba(7,8,15,0.88); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(249,115,22,0.07); }
  .badge-pop { animation: badgePop .3s cubic-bezier(0.34,1.56,0.64,1) both; }
  .app-root { min-height: var(--actual-vh, 100dvh); }
`

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  React.useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isDesktop
}

function NoAccess() {
  const language = useAppStore(s => s.language)
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Lock size={24} color="#EF4444" strokeWidth={2} />
      </div>
      <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{tl(language, 'ليس لديك صلاحية لعرض هذه الصفحة', 'אין לך הרשאה לצפות בדף זה', "You don't have permission to view this page")}</div>
    </div>
  )
}

// ─── "المزيد" Drawer — accessed via settings tab on mobile ──────────────────
function MoreDrawer({ open, onClose, screen, setScreen, permissions }) {
  const p = permissions || {}
  const language = useAppStore(s => s.language)
  const filtered = MORE_SCREENS.filter(s => {
    if (s.id === 'activity') return p.viewActivity || p.isOwner
    return true
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="more-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: C.surface,
              border: `1px solid ${C.primary}1F`,
              borderRadius: '24px 24px 0 0',
              padding: '8px 0 40px',
              maxWidth: 430, margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div style={{ padding: '0 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {filtered.map(item => {
                const Icon = NAV_ICONS[item.id] || Grid3x3
                const active = screen === item.id
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setScreen(item.id); onClose() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 16,
                      background: active ? `${C.primary}1F` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? `${C.primary}40` : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer', color: active ? C.primary : '#94A3B8',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{navLabel(item, language)}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────
function DesktopSidebar({ screen, setScreen, permissions, pendingCount }) {
  const p = permissions || {}
  const language = useAppStore(s => s.language)
  const moreScreenIds = MORE_SCREENS.map(s => s.id)
  const activeScreen = moreScreenIds.includes(screen) ? screen
    : NAV.find(n => n.id === screen) ? screen
    : 'dashboard'

  const filteredMore = MORE_SCREENS.filter(s => {
    if (s.id === 'activity') return p.viewActivity || p.isOwner
    return true
  })

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, width: 240, height: '100vh',
      background: 'rgba(13,15,24,0.98)', borderLeft: `1px solid ${C.primary}1A`,
      display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    }}>
      <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(245,158,11,0.35)', flexShrink: 0 }}>
            <HardHat size={18} color="#000" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, background: GRAD.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>{language === 'ar' ? 'كبلان' : 'Kabblan'}</div>
        </div>
      </div>

      <div style={{ padding: '12px 10px', flex: 1 }}>
        {NAV.map(n => {
          const active = activeScreen === n.id
          const Icon = NAV_ICONS[n.id]
          return (
            <button key={n.id} onClick={() => setScreen(n.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12, marginBottom: 3,
              background: active ? `${C.primary}1F` : 'transparent',
              border: `1px solid ${active ? `${C.primary}40` : 'transparent'}`,
              color: active ? C.primary : '#94A3B8', cursor: 'pointer',
              textAlign: 'right', fontFamily: 'inherit', transition: 'all .15s',
            }}>
              {Icon && <Icon size={17} color={active ? C.primary : '#94A3B8'} strokeWidth={active ? 2.2 : 1.8} />}
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{navLabel(n, language)}</span>
            </button>
          )
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 4px' }} />
        <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px 8px' }}>{tl(language, 'المزيد', 'עוד', 'More')}</div>

        {filteredMore.map(item => {
          const active = activeScreen === item.id
          const Icon = NAV_ICONS[item.id] || Grid3x3
          return (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 12, marginBottom: 3,
              background: active ? `${C.primary}1F` : 'transparent',
              border: `1px solid ${active ? `${C.primary}40` : 'transparent'}`,
              color: active ? C.primary : '#94A3B8', cursor: 'pointer',
              textAlign: 'right', fontFamily: 'inherit', transition: 'all .15s',
            }}>
              {Icon && <Icon size={16} color={active ? C.primary : '#94A3B8'} strokeWidth={active ? 2.2 : 1.8} />}
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{navLabel(item, language)}</span>
              {item.id === 'workers' && pendingCount > 0 && (
                <span style={{ marginRight: 'auto', background: C.accent, color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 8, minWidth: 18, textAlign: 'center' }}>{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function App() {
  // Worker portal
  const params = new URLSearchParams(window.location.search)
  if (params.has('portal') || params.has('worker')) {
    return (
      <>
        <style>{globalCSS}</style>
        <WorkerPortalScreen />
      </>
    )
  }

  return <OwnerApp />
}

// المكوّن الرئيسي للمالك — مفصول عن App كي تبقى كل الـ hooks بلا أي return مبكّر
// قبلها (App يقرّر بين بوّابة العامل وتطبيق المالك دون استدعاء أي hook).
function OwnerApp() {
  const { user, loading: authLoading } = useAuth()
  const isDesktop = useIsDesktop()

  // ─── Zustand store ────────────────────────────────────────────────────────
  const { t } = useTranslation()

  const {
    screen, setScreen,
    showSearch, setShowSearch,
    showNotifs, setShowNotifs,
    showMore, setShowMore,
    toast, showToast,
    setOnline,
    language, setLanguage: setLang,
    setSigner,
    lockSession, isReadOnly, setReadOnly, setDailySpendLimit,
  } = useAppStore()

  const dir = (language === 'ar' || language === 'he') ? 'rtl' : 'ltr'

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const [showOnboarding, setShowOnboarding] = useState(false)

  // ─── PWA auto-update ─────────────────────────────────────────────────────
  useRegisterSW({
    onNeedRefresh() {
      // New SW ready — activate it and reload to pick up the update
      window.location.reload()
    },
  })

  // Fix Android Chrome 100vh bug — set --actual-vh CSS variable
  useEffect(() => {
    const setVH = () => document.documentElement.style.setProperty('--actual-vh', `${window.innerHeight}px`)
    setVH()
    window.addEventListener('resize', setVH)
    return () => window.removeEventListener('resize', setVH)
  }, [])

  const uid = user?.id

  // ─── Business onboarding ──────────────────────────────────────────────────
  const { businesses, initialized: bizInit, loading: bizLoading, error: bizError, load: loadBiz } = useBusinessStore()
  useEffect(() => { if (uid) loadBiz() }, [uid]) // eslint-disable-line

  const { teamMembers, permissions, effectiveOwnerId, allowedProjectIds, updateMember, removeMember, isBlocked, isExpired, teamLoadError, blockMember, getActivity, getAllActivity, addMember, resetMemberPassword, reload: reloadTeam } = useTeam(uid, user?.email)
  const eid = effectiveOwnerId || uid

  const { projects,       loading: pLoad,  addProject,    updateProject,    deleteProject, archiveProject, restoreProject, deleteProjectWithAll } = useProjects(eid)
  const { employees,      loading: eLoad,  addEmployee,   updateEmployee,   deleteEmployee  } = useEmployees(eid)
  const { workDays,       loading: wLoad,  addWorkDay, bulkAddWorkDays, updateWorkDay, bulkUpdateWorkDays, deleteWorkDay, approveWorkDay, rejectWorkDay } = useWorkDays(eid)
  const { expenses,       loading: xLoad,  addExpense, deleteExpense, approveExpense, rejectExpense, refetch: refetchExpenses } = useExpenses(eid)
  const { payments,       loading: pyLoad, addPayment, updatePayment, deletePayment, approvePaymentRequest, rejectPaymentRequest } = usePayments(eid)
  const { advances,                        addAdvance,  deleteAdvance   } = useAdvances(eid)
  const { taxAdvances,                     addTaxAdvance, deleteTaxAdvance } = useTaxAdvances(eid)
  const appCfg = useAppConfig(eid)
  const { clientReceipts, loading: crLoad, addReceipt, updateReceipt, deleteReceipt, refetch: refetchReceipts } = useClientReceipts(eid)
  const { specs, expCats, payMethods, pensionMonthly, taxEnabled, taxModules, salaryAlerts, dailyDigest, addSpec, removeSpec, addExpCat, removeExpCat, addPayMethod, removePayMethod, setPensionMonthly, setTaxEnabled, setTaxModule, setSalaryAlerts, setDailyDigest } = useSettings(eid)
  const { holidays, addHoliday, deleteHoliday } = useHolidays(eid)
  const { profile, saving: profSaving, uploading, saveName, uploadAvatar, saveContractorNumber } = useProfile(uid)
  const { notifications, unreadCount, markAllRead, markRead, deleteAll } = useNotifications(uid)
  useSalaryAlerts(uid, employees, workDays, payments, advances, expenses, salaryAlerts)
  // الملخّص اليومي للمالك فقط (ليس عضو فريق)
  useDailyDigest(effectiveOwnerId ? null : uid, { workDays, expenses, payments }, dailyDigest)
  const { permission: pushPermission, requestPermission: requestPushPermission, subStatus: pushSubStatus, forceResubscribe: forceResubscribePush } = usePushNotifications(uid)

  const { org, loading: orgLoading, isPlanActive, isTrialActive, trialDaysLeft } = useOrganization(uid)

  // ربط هوية المستخدم بتقارير الأخطاء (Sentry) + تحليلات القمع (GA4 user_id +
  // TikTok identify) — يغطّي كل الجلسات المصادَقة لقياس أدقّ عبر الأجهزة.
  useEffect(() => {
    setSentryUser(user || null)
    identifyUser(user ? { id: user.id, email: user.email } : null)
  }, [user])

  // مزامنة معلومات الخطة لمخزن مشترك تقرأه الشاشات لتقييد الميزات (بدون prop-drilling)
  useEffect(() => {
    setPlanInfo({
      plan:          org?.plan ?? 'free',
      trialActive:   isTrialActive(),
      paddleEnabled: !!import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    })
  }, [org, org?.plan, org?.trial_ends_at])

  useEffect(() => {
    if (uid && !localStorage.getItem('cp_onboarded')) setShowOnboarding(true)
  }, [uid])

  // Set signer info whenever user/profile/permissions change
  useEffect(() => {
    if (!uid) return
    const isOwner = permissions?.isOwner !== false
    let name = ''
    if (isOwner) {
      name = profile?.name || user?.email || tl(language, 'المالك', 'בעל החשבון', 'Owner')
    } else {
      const member = teamMembers?.find(m => m.member_id === uid)
      name = member?.display_name || user?.email || tl(language, 'عضو', 'חבר צוות', 'Member')
    }
    setSigner(name, isOwner ? 'owner' : 'member', uid, eid)
  }, [uid, eid, profile, permissions, teamMembers, language])

  // Sync app_config to store
  useEffect(() => {
    setReadOnly(appCfg.config.is_read_only)
    setDailySpendLimit(appCfg.config.daily_spend_limit)
  }, [appCfg.config])

  // Log login event
  useEffect(() => {
    if (!uid || !eid) return
    const role = permissions?.isOwner ? 'owner' : 'member'
    appCfg.logLogin(uid, user?.email || '', role, navigator.userAgent.slice(0, 120))
  }, [uid])

  // Session security: قفل عند الخمول + قفل فوري عند الخروج من التطبيق (نمط «المجلد الآمن»)
  // يطبَّق على المالك وأعضاء الفريق دائماً عند تسجيل الدخول — شاشة القفل تقبل
  // البصمة/PIN/كلمة السر، فلا يعتمد التفعيل على وجود وسيلة فتح محلية (كانت تُفقد
  // عند مسح التخزين فيتعطّل القفل بصمت).
  useEffect(() => {
    if (!uid) return

    const timeoutMs = idleTimeoutMs(appCfg.config.session_timeout)
    let timer
    const reset = () => { clearTimeout(timer); timer = setTimeout(lockSession, timeoutMs) }
    // عند تصغير التطبيق/التبديل لتطبيق آخر → قفل فوري (ما لم يُعطَّل من الإعدادات)
    const onHidden = () => { if (document.hidden && lockOnBackgroundEnabled(localStorage.getItem(LOCK_ON_BG_KEY))) lockSession() }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointermove']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    document.addEventListener('visibilitychange', onHidden)
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [uid, appCfg.config.session_timeout])

  // Log screen views for team members
  useEffect(() => {
    if (!permissions?.isOwner && uid && effectiveOwnerId && uid !== effectiveOwnerId) {
      supabase.rpc('log_screen_view', { p_owner_id: effectiveOwnerId, p_screen: screen })
    }
  }, [screen])

  // ─── Filtered data ────────────────────────────────────────────────────────
  const visibleProjects       = useMemo(() => allowedProjectIds ? projects.filter(p => allowedProjectIds.includes(p.id)) : projects, [projects, allowedProjectIds])
  const visibleWorkDays       = useMemo(() => allowedProjectIds ? workDays.filter(w => allowedProjectIds.includes(w.project_id)) : workDays, [workDays, allowedProjectIds])
  const visibleClientReceipts = useMemo(() => allowedProjectIds ? clientReceipts.filter(r => allowedProjectIds.includes(r.project_id)) : clientReceipts, [clientReceipts, allowedProjectIds])
  const visibleEmployeeIds    = useMemo(() => allowedProjectIds ? new Set(visibleWorkDays.map(w => w.employee_id)) : null, [visibleWorkDays, allowedProjectIds])
  const visibleExpenses       = useMemo(() => allowedProjectIds ? expenses.filter(e => e.employee_id ? visibleEmployeeIds.has(e.employee_id) : allowedProjectIds.includes(e.project_id)) : expenses, [expenses, allowedProjectIds, visibleEmployeeIds])
  const visibleEmployees      = useMemo(() => visibleEmployeeIds ? employees.filter(e => visibleEmployeeIds.has(e.id)) : employees, [employees, visibleEmployeeIds])
  const visiblePayments       = useMemo(() => visibleEmployeeIds ? payments.filter(p => visibleEmployeeIds.has(p.employee_id)) : payments, [payments, visibleEmployeeIds])
  const visibleAdvances       = useMemo(() => visibleEmployeeIds ? advances.filter(a => visibleEmployeeIds.has(a.employee_id)) : advances, [advances, visibleEmployeeIds])

  // مزامنة البيانات المفلترة إلى مخزن القراءة المشترك (يقرأ منه المكوّنات مباشرة
  // بدل prop drilling). المصدر الموثوق يبقى الـ hooks أعلاه.
  useEffect(() => {
    useDataStore.getState().setData({
      projects: visibleProjects, employees: visibleEmployees, workDays: visibleWorkDays,
      expenses: visibleExpenses, payments: visiblePayments, clientReceipts: visibleClientReceipts,
      advances: visibleAdvances,
    })
  }, [visibleProjects, visibleEmployees, visibleWorkDays, visibleExpenses, visiblePayments, visibleClientReceipts, visibleAdvances])

  const _approveWorkDay = id      => approveWorkDay(id).then(() => showToast(tl(language, 'تمت الموافقة على يوم العمل', 'יום העבודה אושר', 'Work day approved')))
  const _rejectWorkDay  = (id, r) => rejectWorkDay(id, r).then(() => showToast(tl(language, 'رُفض يوم العمل', 'יום העבודה נדחה', 'Work day rejected'), 'warning'))
  const _approveExpense = id      => approveExpense(id).then(() => showToast(tl(language, 'تمت الموافقة على المصروف', 'ההוצאה אושרה', 'Expense approved')))
  const _rejectExpense  = (id, r) => rejectExpense(id, r).then(() => showToast(tl(language, 'رُفض المصروف', 'ההוצאה נדחתה', 'Expense rejected'), 'warning'))
  const _approvePayment = id      => approvePaymentRequest(id).then(() => { showToast(tl(language, 'تمت الموافقة على الدفعة', 'התשלום אושר', 'Payment approved')); useAppStore.getState().celebrate('success') })
  const _rejectPayment  = (id, r) => rejectPaymentRequest(id, r).then(() => showToast(tl(language, 'رُفضت الدفعة', 'התשלום נדחה', 'Payment rejected'), 'warning'))

  // تأكيد بصمة للدفعات فوق حدّ يضبطه المالك (payment_bio_threshold، 0 = معطّل)
  const { confirm: _bioConfirm } = useBiometricConfirm()
  const _addPayment = async (form) => {
    const thr = Number(appCfg?.config?.payment_bio_threshold) || 0
    if (thr > 0 && Number(form?.amount) >= thr) {
      const sig = await _bioConfirm(tl(language, `تأكيد دفعة ${form.amount}₪`, `אישור תשלום ${form.amount}₪`, `Confirm payment ${form.amount}₪`), 'payments')
      if (!sig) throw new Error(tl(language, 'مطلوب تأكيد بصمة لاعتماد هذه الدفعة', 'נדרש אימות ביומטרי לאישור תשלום זה', 'Biometric confirmation required to approve this payment'))
    }
    const res = await addPayment(form)
    useAppStore.getState().celebrate('money')
    return res
  }

  const dataLoading = pLoad || eLoad || wLoad || xLoad || pyLoad || crLoad

  // ─── Early returns ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, overflow: 'hidden', position: 'relative' }}>
        <style>{globalCSS}</style>
        {/* Aurora */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(249,115,22,0.1) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.07) 0%, transparent 60%)', animation: 'auroraMove 4s ease-in-out infinite', pointerEvents: 'none' }} />
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 96, height: 96, borderRadius: 30, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26, boxShadow: '0 20px 60px rgba(245,158,11,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset', position: 'relative', zIndex: 1 }}
        >
          <HardHat size={48} color="#000" strokeWidth={1.5} />
        </motion.div>
        <div style={{ fontSize: 28, fontWeight: 900, background: GRAD.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>{language === 'ar' ? 'كبلان' : 'Kabblan'}</div>
        <div style={{ fontSize: 10, color: C.textDim, letterSpacing: '0.15em', marginBottom: 44, textTransform: 'uppercase', fontWeight: 600, position: 'relative', zIndex: 1 }}>{tl(language, 'إدارة مشاريعك بذكاء', 'נהל את הפרויקטים שלך בחוכמה', 'Manage your projects smartly')}</div>
        <div style={{ position: 'relative', zIndex: 1 }}><LoadingSpinner /></div>
      </div>
    )
  }

  if (!user) return (
    <>
      <style>{globalCSS}</style>
      <Suspense fallback={<div style={{ minHeight: '100vh', background: C.bg }} />}>
        <LoginScreen teamMemberSignIn={teamMemberSignIn} />
      </Suspense>
    </>
  )

  if (isBlocked || isExpired) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: 32, textAlign: 'center' }}>
      <style>{globalCSS}</style>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        {isExpired ? <Clock size={36} color="#EF4444" strokeWidth={1.5} /> : <ShieldOff size={36} color="#EF4444" strokeWidth={1.5} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>
        {isExpired ? tl(language, 'انتهت صلاحية وصولك', 'תוקף הגישה שלך פג', 'Your access has expired') : tl(language, 'تم إيقاف وصولك', 'הגישה שלך הושבתה', 'Your access has been disabled')}
      </div>
      <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, maxWidth: 280 }}>
        {tl(language, 'تواصل مع صاحب الحساب لإعادة تفعيل صلاحياتك', 'פנה לבעל החשבון לחידוש ההרשאות שלך', 'Contact the account owner to restore your access')}
      </div>
      <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 28, padding: '10px 28px', borderRadius: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        {tl(language, 'خروج', 'יציאה', 'Sign out')}
      </button>
    </div>
  )

  if (!orgLoading && org && !isPlanActive() && !effectiveOwnerId) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{globalCSS}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', position: 'relative', zIndex: 1 }}><Clock size={36} color={C.primary} strokeWidth={1.5} /></div>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 10, position: 'relative', zIndex: 1 }}>{tl(language, 'انتهت فترة التجربة المجانية', 'תקופת הניסיון החינמי הסתיימה', 'Your free trial has ended')}</div>
      <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.7, maxWidth: 300, marginBottom: 32, position: 'relative', zIndex: 1 }}>
        {tl(language, 'جميع بياناتك محفوظة. اشترك الآن للاستمرار في استخدام كبلان.', 'כל הנתונים שלך שמורים. הירשם עכשיו כדי להמשיך להשתמש ב-Kabblan.', 'All your data is saved. Subscribe now to keep using Kabblan.')}
      </div>
      <button onClick={() => navigate('/pricing')} style={{ padding: '14px 36px', borderRadius: 16, background: GRAD.primary, border: 'none', color: '#000', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 28px rgba(245,158,11,0.4)', marginBottom: 14, position: 'relative', zIndex: 1, fontFamily: 'inherit' }}>
        {tl(language, 'اختر خطة اشتراك', 'בחר תוכנית מנוי', 'Choose a plan')}
      </button>
      <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px 24px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', position: 'relative', zIndex: 1, fontFamily: 'inherit' }}>
        {tl(language, 'تسجيل الخروج', 'יציאה', 'Sign out')}
      </button>
    </div>
  )

  // ─── Screen renderer ──────────────────────────────────────────────────────
  const p = permissions
  function renderScreen() {
    const commonData = { projects: visibleProjects, employees: visibleEmployees, workDays: visibleWorkDays, expenses: visibleExpenses, payments: visiblePayments, clientReceipts: visibleClientReceipts }

    // ─── Skeleton على التحميل الأول فقط (قبل وصول أي بيانات) ───
    const noDataYet = visibleProjects.length === 0 && visibleEmployees.length === 0 && visibleWorkDays.length === 0 && visibleExpenses.length === 0 && visiblePayments.length === 0 && visibleClientReceipts.length === 0
    if (dataLoading && noDataYet) {
      const SKEL_VARIANT = { dashboard: 'dashboard', finance: 'finance', accounting: 'finance', workers: 'workers', projects: 'list', expenses: 'list', payments: 'list', tracker: 'list', materials: 'list', team: 'list', activity: 'list' }
      const variant = SKEL_VARIANT[screen]
      if (variant) return <ErrorBoundary key={`${screen}-skel`}><ScreenSkeleton variant={variant} /></ErrorBoundary>
    }

    let content
    const allData = { projects: visibleProjects, employees: visibleEmployees, workDays: visibleWorkDays, expenses: visibleExpenses, payments: visiblePayments, clientReceipts: visibleClientReceipts, advances: visibleAdvances }
    switch (screen) {
      case 'dashboard':  content = <DashboardScreen {...allData} onNav={setScreen} permissions={p} />; break
      case 'finance':    content = (p?.viewAmounts === false) ? <NoAccess /> : <FinanceScreen {...allData} expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense} approveExpense={_approveExpense} rejectExpense={_rejectExpense} addPayment={_addPayment} updatePayment={updatePayment} deletePayment={deletePayment} approvePaymentRequest={_approvePayment} rejectPaymentRequest={_rejectPayment} taxAdvances={taxAdvances} addTaxAdvance={addTaxAdvance} deleteTaxAdvance={deleteTaxAdvance} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} userId={uid} permissions={p} payMethods={payMethods} appCfg={appCfg} refetchReceipts={refetchReceipts} refetchExpenses={refetchExpenses} />; break
      case 'projects':   content = p?.viewProjects  ? <ProjectsScreen  addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} archiveProject={archiveProject} restoreProject={restoreProject} deleteProjectWithAll={deleteProjectWithAll} addReceipt={addReceipt} updateReceipt={updateReceipt} deleteReceipt={deleteReceipt} addWorkDay={addWorkDay} bulkAddWorkDays={bulkAddWorkDays} updateWorkDay={updateWorkDay} deleteWorkDay={deleteWorkDay} approveWorkDay={_approveWorkDay} rejectWorkDay={_rejectWorkDay} addExpense={addExpense} deleteExpense={deleteExpense} expCats={expCats} userId={uid} permissions={p} payMethods={payMethods} holidays={holidays} /> : <NoAccess />; break
      case 'workers':    content = p?.viewWorkers   ? <WorkersScreen   {...allData} addAdvance={addAdvance} deleteAdvance={deleteAdvance} specs={specs} addEmployee={addEmployee} updateEmployee={updateEmployee} deleteEmployee={deleteEmployee} permissions={p} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} teamMembers={teamMembers} addMember={addMember} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} resetMemberPassword={resetMemberPassword} getActivity={getActivity} teamLoadError={teamLoadError} reloadTeam={reloadTeam} addWorkDay={addWorkDay} bulkAddWorkDays={bulkAddWorkDays} updateWorkDay={updateWorkDay} bulkUpdateWorkDays={bulkUpdateWorkDays} deleteWorkDay={deleteWorkDay} approveWorkDay={_approveWorkDay} rejectWorkDay={_rejectWorkDay} addPayment={_addPayment} updatePayment={updatePayment} deletePayment={deletePayment} payMethods={payMethods} profile={profile} appCfg={appCfg} /> : <NoAccess />; break
      case 'workdays':   setScreen('workers'); content = null; break
      case 'settings':   content = <SettingsScreen  {...allData} userId={uid} specs={specs} expCats={expCats} payMethods={payMethods} addSpec={addSpec} removeSpec={removeSpec} addExpCat={addExpCat} removeExpCat={removeExpCat} addPayMethod={addPayMethod} removePayMethod={removePayMethod} pensionMonthly={pensionMonthly} setPensionMonthly={setPensionMonthly} taxEnabled={taxEnabled} setTaxEnabled={setTaxEnabled} taxModules={taxModules} setTaxModule={setTaxModule} salaryAlerts={salaryAlerts} setSalaryAlerts={setSalaryAlerts} dailyDigest={dailyDigest} setDailyDigest={setDailyDigest} holidays={holidays} addHoliday={addHoliday} deleteHoliday={deleteHoliday} profile={profile} profSaving={profSaving} uploading={uploading} saveName={saveName} uploadAvatar={uploadAvatar} saveContractorNumber={saveContractorNumber} permissions={p} teamMembers={teamMembers} addMember={addMember} resetMemberPassword={resetMemberPassword} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} getActivity={getActivity} reloadTeam={reloadTeam} onNav={setScreen} appCfg={appCfg} pushSubStatus={pushSubStatus} forceResubscribePush={forceResubscribePush} />; break
      case 'expenses':   content = p?.viewExpenses  ? <ExpensesScreen  expenses={visibleExpenses} projects={visibleProjects} expCats={expCats} addExpense={addExpense} deleteExpense={deleteExpense} approveExpense={_approveExpense} rejectExpense={_rejectExpense} employees={visibleEmployees} userId={uid} permissions={p} /> : <NoAccess />; break
      case 'payments':   content = p?.viewPayments  ? <PaymentsScreen  payments={visiblePayments} employees={visibleEmployees} workDays={visibleWorkDays} expenses={visibleExpenses} advances={visibleAdvances} projects={visibleProjects} addPayment={_addPayment} updatePayment={updatePayment} deletePayment={deletePayment} approvePaymentRequest={_approvePayment} rejectPaymentRequest={_rejectPayment} userId={uid} permissions={p} payMethods={payMethods} /> : <NoAccess />; break
      case 'tracker':    content = p?.viewProjects  ? <UnitTrackerScreen projects={visibleProjects} /> : <NoAccess />; break
      case 'materials':  content = p?.viewProjects  ? <MaterialsScreen userId={eid} employees={visibleEmployees} projects={visibleProjects} /> : <NoAccess />; break
      case 'accounting': setScreen('finance'); content = null; break
      case 'activity':   content = (p?.viewActivity || p?.isOwner) ? <ActivityScreen getAllActivity={getAllActivity} getActivity={getActivity} teamMembers={teamMembers} permissions={p} /> : <NoAccess />; break
      case 'team':       content = p?.isOwner ? <FeatureGate requiredPlan="pro" title={tl(language, 'إدارة الفريق', 'ניהול צוות', 'Team management')} description={tl(language, 'أضف أعضاء فريق بصلاحيات دقيقة وتابع نشاطهم. هذه الميزة متاحة في خطّتَي Pro و Business.', 'הוסף חברי צוות עם הרשאות מדויקות ועקוב אחר הפעילות שלהם. תכונה זו זמינה בתוכניות Pro ו-Business.', 'Add team members with fine-grained permissions and track their activity. Available on the Pro and Business plans.')}><TeamScreen projects={visibleProjects} teamMembers={teamMembers} permissions={p} addMember={addMember} updateMember={updateMember} removeMember={removeMember} blockMember={blockMember} resetMemberPassword={resetMemberPassword} getActivity={getActivity} getAllActivity={getAllActivity} teamLoadError={teamLoadError} reloadTeam={reloadTeam} /></FeatureGate> : <NoAccess />; break
      default:           content = <DashboardScreen {...allData} onNav={setScreen} permissions={p} />
    }
    return <ErrorBoundary key={screen}>{content}</ErrorBoundary>
  }

  const pendingCount = workDays.filter(w => w.status === 'pending').length

  const moreScreenIds = MORE_SCREENS.map(s => s.id)
  const activeNav = moreScreenIds.includes(screen) ? 'settings'
    : NAV.find(n => n.id === screen) ? screen
    : 'dashboard'

  // ─── فشل تحميل المصالح: لا نعرض «أنشئ أول مصلحة» (قد يكون للمالك مصالح أصلاً)
  // بل شاشة إعادة محاولة. هذا يمنع ظهور onboarding خطأً عند عطل شبكة/جلسة.
  if (uid && bizInit && bizError && businesses.length === 0 && permissions?.isOwner !== false) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: 32, textAlign: 'center' }}>
        <style>{globalCSS}</style>
        <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertTriangle size={36} color={C.warning} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>{tl(language, 'تعذّر تحميل المصالح', 'טעינת העסקים נכשלה', 'Failed to load businesses')}</div>
        <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, maxWidth: 300, marginBottom: 28 }}>
          {tl(language, 'حدث خطأ أثناء جلب بياناتك. بياناتك محفوظة — تحقّق من الاتصال وأعد المحاولة.', 'אירעה שגיאה בעת טעינת הנתונים שלך. הנתונים שלך שמורים — בדוק את החיבור ונסה שוב.', 'An error occurred while loading your data. Your data is safe — check your connection and try again.')}
        </div>
        <button onClick={() => loadBiz()} disabled={bizLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 32px', borderRadius: 16, background: GRAD.primary, border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: bizLoading ? 'wait' : 'pointer', opacity: bizLoading ? 0.7 : 1, boxShadow: '0 8px 28px rgba(245,158,11,0.4)', fontFamily: 'inherit' }}>
          <RefreshCw size={18} strokeWidth={2.2} style={bizLoading ? { animation: 'spin 1s linear infinite' } : undefined} />
          {bizLoading ? tl(language, 'جارٍ المحاولة…', 'מנסה…', 'Retrying…') : tl(language, 'إعادة المحاولة', 'נסה שוב', 'Try again')}
        </button>
        <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 14, padding: '10px 24px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {tl(language, 'تسجيل الخروج', 'יציאה', 'Sign out')}
        </button>
      </div>
    )
  }

  // ─── First-time setup: إذا المستخدم مسجّل دخول بس ما عنده مصالح → اعرض الإعداد الإجباري
  // شرط: التحميل اكتمل بنجاح (bizInit) بلا خطأ وبلا تحميل جارٍ — أي «فارغ فعلاً» مش «فشل».
  if (uid && bizInit && !bizLoading && !bizError && businesses.length === 0 && permissions?.isOwner !== false) {
    return (
      <>
        <style>{globalCSS}</style>
        <FirstTimeSetup language={language} addEmployee={addEmployee} />
      </>
    )
  }

  return (
    <div className="app-root" dir={dir} style={{ background: C.bg, position: 'relative', maxWidth: isDesktop ? 'none' : 430, margin: isDesktop ? 0 : '0 auto', paddingRight: isDesktop ? 240 : 0 }}>
      <style>{globalCSS}</style>
      {isDesktop && <DesktopSidebar screen={screen} setScreen={setScreen} permissions={p} pendingCount={pendingCount} dir={dir} />}

      {/* ─── Aurora background ─── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 80% 40% at 15% 0%, rgba(249,115,22,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 100%, rgba(124,58,237,0.04) 0%, transparent 60%)' }} />

      {/* ─── Connection & Sync status ─── */}
      <ConnectionStatus />

      {/* ─── Trial banner ─── */}
      {org && isTrialActive() && !effectiveOwnerId && (
        <div style={{ position: 'sticky', top: 0, zIndex: 199, background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(239,68,68,0.09))', backdropFilter: 'blur(12px)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid rgba(245,158,11,0.2)', direction: 'rtl' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={15} color="#FBBF24" strokeWidth={2} />
            <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>
              {language === 'he'
                ? <>ניסיון חינם — נותרו <strong style={{ color: '#fff' }}>{trialDaysLeft()} ימים</strong></>
                : language === 'en'
                ? <>Free trial — <strong style={{ color: '#fff' }}>{trialDaysLeft()} days</strong> left</>
                : <>التجربة المجانية — متبقي <strong style={{ color: '#fff' }}>{trialDaysLeft()} يوم</strong></>}
            </span>
          </div>
          <button onClick={() => navigate('/pricing')} style={{ padding: '5px 14px', borderRadius: 9, background: GRAD.primary, border: 'none', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {tl(language, 'اشترك الآن', 'הירשם עכשיו', 'Subscribe now')}
          </button>
        </div>
      )}

      {/* ─── Notification Permission Banner (one-time prompt) ─── */}
      {uid && pushPermission === 'default' && !localStorage.getItem('cpro_notif_dismissed') && (
        <div style={{ position: 'sticky', top: 0, zIndex: 198, background: 'rgba(249,115,22,0.1)', backdropFilter: 'blur(12px)', padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid rgba(249,115,22,0.2)', direction: 'rtl' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={14} color={C.primary} strokeWidth={2} />
            <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{tl(language, 'فعّل الإشعارات لاستقبال طلبات العمال فورياً', 'הפעל התראות לקבלת בקשות העובדים באופן מיידי', 'Enable notifications to receive worker requests instantly')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => { requestPushPermission(); localStorage.setItem('cpro_notif_dismissed', '1') }}
              style={{ padding: '5px 12px', borderRadius: 9, background: C.primary, border: 'none', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
            >{tl(language, 'تفعيل', 'הפעל', 'Enable')}</button>
            <button
              onClick={() => localStorage.setItem('cpro_notif_dismissed', '1')}
              style={{ padding: '5px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: 'none', color: C.textDim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
            >×</button>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(7,8,15,0.93)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(249,115,22,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(245,158,11,0.4), 0 1px 0 rgba(255,255,255,0.15) inset', flexShrink: 0 }}>
            <HardHat size={22} color="#000" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, background: GRAD.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{language === 'ar' ? 'كبلان' : 'Kabblan'}</div>
            <div style={{ fontSize: 9, color: C.primary, letterSpacing: '0.08em', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase' }}>
              {navLabel(NAV.find(n => n.id === activeNav), language) || navLabel(MORE_SCREENS.find(s => s.id === screen), language) || tl(language, 'إدارة مشاريعك بذكاء', 'נהל את הפרויקטים שלך בחוכמה', 'Manage your projects smartly')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {dataLoading && <div style={{ width: 15, height: 15, border: `2px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .75s linear infinite' }} />}

          {/* Language switcher */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, padding: '3px' }}>
            {['ar','he','en'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{ padding: '3px 7px', borderRadius: 8, background: language === l ? GRAD.primary : 'transparent', border: 'none', color: language === l ? '#fff' : C.textDim, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em', transition: 'all .15s' }}
              >
                {l === 'ar' ? 'ع' : l === 'he' ? 'ע' : 'EN'}
              </button>
            ))}
          </div>

          {(p?.isOwner || p?.viewActivity) && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setScreen('activity')}
              style={{ background: screen === 'activity' ? `${C.primary}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${screen === 'activity' ? C.primary+'40' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ClipboardCheck size={16} color={screen === 'activity' ? C.primary : '#64748B'} strokeWidth={2} />
            </motion.button>
          )}

          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowNotifs(true)}
            style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={16} color="#64748B" strokeWidth={2} />
            {unreadCount > 0 && (
              <div className="badge-pop" style={{ position: 'absolute', top: -4, insetInlineEnd: -4, minWidth: 17, height: 17, borderRadius: 9, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', padding: '0 3px' }}>
                {unreadCount}
              </div>
            )}
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSearch(true)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Search size={16} color="#64748B" strokeWidth={2} />
          </motion.button>
        </div>

        {/* Primary accent line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), rgba(124,58,237,0.3), transparent)' }} />
      </div>

      {/* ─── Screen content ─── */}
      <div key={screen} style={{ paddingBottom: isDesktop ? 24 : 'max(110px, calc(90px + env(safe-area-inset-bottom, 0px)))', position: 'relative', zIndex: 1 }}>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><LoadingSpinner /></div>}>
          {renderScreen()}
        </Suspense>
      </div>

      {/* ─── Bottom Nav (mobile only) ─── */}
      {!isDesktop && <div style={{ position: 'fixed', bottom: 'max(14px, calc(8px + env(safe-area-inset-bottom, 0px)))', left: 0, right: 0, margin: '0 auto', width: 'calc(100% - 24px)', maxWidth: 410, background: 'rgba(7,8,12,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderRadius: 28, border: '1px solid rgba(245,158,11,0.1)', padding: '7px 4px 9px', display: 'flex', justifyContent: 'space-around', zIndex: 50, boxShadow: '0 16px 50px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05) inset' }}>
        {NAV.map(n => {
          const active = activeNav === n.id
          const Icon = NAV_ICONS[n.id]
          const hasBadge = n.id === 'workers' && pendingCount > 0

          return (
            <motion.button
              key={n.id}
              onClick={() => setScreen(n.id)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', flex: 1, position: 'relative', minWidth: 0, fontFamily: 'inherit' }}
            >
              {/* Active pill */}
              {active && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', top: 1, left: 0, right: 0, marginInline: 'auto', width: 46, height: 35, borderRadius: 16, background: 'linear-gradient(160deg, rgba(249,115,22,0.2), rgba(220,38,38,0.12))', border: '1px solid rgba(249,115,22,0.28)', pointerEvents: 'none', animation: 'glowPulse 2.5s ease-in-out infinite' }}
                />
              )}

              {/* Icon */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {Icon && <Icon size={active ? 21 : 18} color={active ? C.primary : 'rgba(255,255,255,0.28)'} strokeWidth={active ? 2.3 : 1.8} style={{ filter: active ? `drop-shadow(0 0 6px ${C.primary}88)` : 'none', display: 'block' }} />}
              </div>

              {/* Badge on "settings" (pending work days) */}
              {hasBadge && (
                <div className="badge-pop" style={{ position: 'absolute', top: -1, right: 'calc(50% - 20px)', minWidth: 16, height: 16, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', padding: '0 3px', boxShadow: `0 2px 10px ${C.accent}99` }}>
                  {pendingCount}
                </div>
              )}

              {/* Label */}
              <span style={{ fontSize: 8.5, fontWeight: active ? 800 : 500, color: active ? C.primary : 'rgba(255,255,255,0.25)', position: 'relative', zIndex: 1, letterSpacing: '0.01em', lineHeight: 1 }}>
                {navLabel(n, language)}
              </span>

              {/* Active dot */}
              {active && (
                <div style={{ width: 18, height: 2, borderRadius: 2, background: GRAD.primary, marginTop: 1, boxShadow: '0 0 8px rgba(249,115,22,0.7)' }} />
              )}
            </motion.button>
          )
        })}
      </div>}

      {/* ─── "المزيد" Drawer (mobile only) ─── */}
      {!isDesktop && <MoreDrawer open={showMore} onClose={() => setShowMore(false)} screen={screen} setScreen={setScreen} permissions={p} />}

      {/* ─── Notifications ─── */}
      <NotificationsPanel open={showNotifs} onClose={() => setShowNotifs(false)} notifications={notifications} unreadCount={unreadCount} markAllRead={markAllRead} markRead={markRead} deleteAll={deleteAll} onNav={nav => { setScreen(nav); setShowNotifs(false) }} />

      {/* ─── Biometric Confirm ─── */}
      <BiometricConfirmModal />
      <SessionLockScreen />

      {/* ─── Smart Search (cmdk) ─── */}
      <SmartSearch projects={projects} employees={employees} expenses={expenses} payments={payments} onNav={nav => { setScreen(nav); setShowSearch(false) }} />

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, x: '-50%' }}
            animate={{ opacity: 1, y: 0,  x: '-50%' }}
            exit={{  opacity: 0, y: 8,   x: '-50%' }}
            style={{
              position: 'fixed', bottom: isDesktop ? 32 : 'max(100px, calc(80px + env(safe-area-inset-bottom, 0px)))', left: '50%',
              background: toast.type === 'success' ? C.success : toast.type === 'warning' ? C.warning : C.accent,
              color: '#fff', padding: '11px 22px', borderRadius: 14, fontSize: 13, fontWeight: 700,
              zIndex: 400, whiteSpace: 'nowrap', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Onboarding ─── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, direction: 'rtl' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: C.surface, borderRadius: 24, padding: '28px 22px', width: '100%', maxWidth: 380, border: `1px solid ${C.borderMid}` }}
            >
              <div style={{ textAlign: 'center', marginBottom: 22 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 28px rgba(245,158,11,0.35)' }}>
                  <HardHat size={32} color="#000" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, background: GRAD.primary, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{tl(language, 'أهلاً بك في كبلان', 'ברוכים הבאים ל-Kabblan', 'Welcome to Kabblan')}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{tl(language, 'إليك أهم الميزات للبداية السريعة', 'הנה התכונות החשובות להתחלה מהירה', "Here are the key features to get you started")}</div>
              </div>

              {[
                { Icon: Building2,    title: tl(language, 'المشاريع', 'פרויקטים', 'Projects'),      desc: tl(language, 'أضف مشاريعك وتابع الأرباح والمصاريف لكل مشروع', 'הוסף פרויקטים ועקוב אחר רווחים והוצאות לכל פרויקט', 'Add projects and track profit and expenses for each one') },
                { Icon: Users,        title: tl(language, 'العمال', 'עובדים', 'Workers'),         desc: tl(language, 'أدر فريق عملك، الرواتب، والسلف بسهولة', 'נהל את הצוות שלך, משכורות ומקדמות בקלות', 'Manage your team, salaries and advances with ease') },
                { Icon: CalendarDays, title: tl(language, 'أيام العمل', 'ימי עבודה', 'Work days'),  desc: tl(language, 'سجّل أيام العمل اليومية مع نظام الموافقات', 'רשום ימי עבודה יומיים עם מערכת אישורים', 'Log daily work days with an approval system') },
                { Icon: CreditCard,   title: tl(language, 'المصاريف', 'הוצאות', 'Expenses'),       desc: tl(language, 'تتبع مصاريف المشاريع واسترداد ضريبة القيمة المضافة', 'עקוב אחר הוצאות פרויקטים והחזרי מע"מ', 'Track project expenses and VAT refunds') },
              ].map(({ Icon, title, desc }, i) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={C.primary} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</div>
                    <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { localStorage.setItem('cp_onboarded', '1'); setShowOnboarding(false) }}
                style={{ marginTop: 22, width: '100%', padding: '13px', borderRadius: 14, background: GRAD.primary, border: 'none', color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(245,158,11,0.35)', letterSpacing: '0.02em', fontFamily: 'inherit' }}
              >
                {tl(language, 'ابدأ الآن', 'התחל עכשיו', 'Get started')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
