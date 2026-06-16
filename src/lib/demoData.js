// ═══════════════════════════════════════════════════════════════════════════
//  DEMO DATA — بيانات وهمية متماسكة (مقاول تشطيبات) لتشغيل التطبيق بلا باكند.
//  مصدر واحد يشاركه: /demoshot (سكرينشوتات) و/demo (الديمو العام التفاعلي).
// ═══════════════════════════════════════════════════════════════════════════
import { SPECS, EXP_CATS, PAY_METHODS } from '../constants/index.js'
import { OWNER_PERMS } from '../hooks/useTeam.js'
import { setPlanInfo } from '../store/usePlanStore.js'
import { useDataStore } from '../store/useDataStore.js'
import { useBusinessStore } from '../store/useBusinessStore.js'

// ─── مولّد بيانات تجريبية متماسكة (مقاول تشطيبات) ─────────────────────────────
export function buildDemo() {
  const M = (n) => Math.round(n)
  const projects = [
    { id: 'p1', name: 'فيلا الياسمين', status: 'نشط',    type: 'مقاولة مغلقة', client_name: 'سمير حدّاد', client_phone: '0521234567', price: 380000, created_at: '2026-02-01' },
    { id: 'p2', name: 'عمارة الورد',  status: 'نشط',    type: 'يومي',         client_name: 'شركة البناء الحديث', client_phone: '0539876543', price: 0, created_at: '2026-03-05' },
    { id: 'p3', name: 'محل النور',    status: 'نشط',    type: 'مقاولة مغلقة', client_name: 'خالد عثمان', client_phone: '0501112233', price: 96000, created_at: '2026-04-10' },
    { id: 'p4', name: 'شقة الزيتون',  status: 'مكتمل',  type: 'مقاولة مغلقة', client_name: 'ليلى ناصر', client_phone: '0524445566', price: 142000, created_at: '2026-01-12' },
    { id: 'p5', name: 'مكاتب الأمل',  status: 'موافق عليه', type: 'مقاولة مغلقة', client_name: 'مجموعة الأمل', client_phone: '0537778899', price: 210000, created_at: '2026-05-20' },
  ]
  // كل المشاريع تتبع المصلحة الوهمية (لتعمل وحدة المالية في الديمو)
  projects.forEach(p => { p.business_id = 'biz1' })

  const empNames = [
    ['e1', 'محمد العبد', 420, 'بناء / تشطيبات'],
    ['e2', 'سامر خليل',  380, 'بلاط'],
    ['e3', 'أحمد ياسين', 400, 'كهرباء'],
    ['e4', 'خالد عمر',   350, 'سباكة'],
    ['e5', 'يوسف حسن',   440, 'دهان / صبغ'],
    ['e6', 'إبراهيم سعيد',360, 'جبص'],
    ['e7', 'عمر فارس',   390, 'بناء / تشطيبات'],
    ['e8', 'ماهر زيد',   410, 'ألمنيوم'],
  ]
  const employees = empNames.map(([id, name, wage, spec], i) => ({
    id, name, phone: '05' + (20000000 + i * 1111111),
    daily_wage: wage, spec, worker_type: 'israeli',
    portal_enabled: i < 4, created_at: '2026-02-01',
  }))

  // أيام عمل: شهرين (04 و05) لكل عامل، أغلبها approved + بعض pending
  const workDays = []
  let wid = 0
  const days0405 = []
  for (const mo of ['2026-04', '2026-05']) for (let d = 1; d <= 26; d++) days0405.push(`${mo}-${String(d).padStart(2, '0')}`)
  employees.forEach((e, ei) => {
    const proj = projects[ei % 3].id            // يوزّعهم على المشاريع النشطة
    const count = 14 + (ei % 6)                  // 14..19 يوم
    for (let k = 0; k < count; k++) {
      const date = days0405[(ei * 3 + k * 2) % days0405.length]
      const pending = k >= count - 2             // آخر يومين معلّقين
      workDays.push({
        id: 'wd' + (wid++), project_id: proj, employee_id: e.id, date,
        amount: M(e.daily_wage), day_type: 'كامل', hours: 9,
        status: pending ? 'pending' : 'approved',
      })
    }
  })

  // مقبوضات العملاء
  const clientReceipts = [
    { id: 'r1', project_id: 'p1', amount: 120000, date: '2026-03-10', method: 'تحويل بنكي', ref_number: 'RCP-1001' },
    { id: 'r2', project_id: 'p1', amount: 90000,  date: '2026-04-22', method: 'شيك',        ref_number: 'RCP-1002' },
    { id: 'r3', project_id: 'p2', amount: 64000,  date: '2026-04-18', method: 'تحويل بنكي', ref_number: 'RCP-1003' },
    { id: 'r4', project_id: 'p3', amount: 38000,  date: '2026-05-02', method: 'كاش',        ref_number: 'RCP-1004' },
    { id: 'r5', project_id: 'p4', amount: 142000, date: '2026-02-28', method: 'تحويل بنكي', ref_number: 'RCP-1005' },
    { id: 'r6', project_id: 'p1', amount: 54000,  date: '2026-05-12', method: 'تحويل بنكي', ref_number: 'RCP-1006' },
  ]

  // مصاريف (مشروع + عامة + بعض مصاريف عمال)
  const expenses = [
    { id: 'x1', project_id: 'p1', amount: 12400, category: 'مواد بناء / خامات', status: 'approved', is_general: false, vat_amount: 1892, date: '2026-04-05', vendor: 'مخزن البناء' },
    { id: 'x2', project_id: 'p1', amount: 3600,  category: 'إيجار معدات',        status: 'approved', is_general: false, vat_amount: 549,  date: '2026-04-09', vendor: 'تأجير الرافعات' },
    { id: 'x3', project_id: 'p2', amount: 5400,  category: 'بضاعة',             status: 'approved', is_general: false, vat_amount: 824,  date: '2026-04-14', vendor: 'بلاط الشرق' },
    { id: 'x4', project_id: 'p3', amount: 2100,  category: 'عدد وأدوات',         status: 'approved', is_general: false, vat_amount: 320,  date: '2026-05-01', vendor: 'أدوات المحترف' },
    { id: 'x5', project_id: null, amount: 1800,  category: 'وقود وتنقلات',       status: 'approved', is_general: true,  vat_amount: 183,  date: '2026-05-03', vendor: 'محطة الوقود' },
    { id: 'x6', project_id: null, amount: 950,   category: 'صيانة مركبات',       status: 'approved', is_general: true,  vat_amount: 97,   date: '2026-05-06', vendor: 'كراج النور' },
    { id: 'x7', project_id: 'p1', amount: 7800,  category: 'مواد بناء / خامات', status: 'approved', is_general: false, vat_amount: 1190, date: '2026-05-08', vendor: 'مخزن البناء' },
    { id: 'x8', project_id: 'p2', amount: 4200,  category: 'خدمات مهنية',        status: 'pending',  is_general: false, vat_amount: 641,  date: '2026-05-10', vendor: 'مكتب هندسي' },
    { id: 'x9', project_id: 'p1', employee_id: 'e1', amount: 600, category: 'عدد وأدوات', status: 'approved', is_general: false, date: '2026-04-20', vendor: 'أدوات' },
  ]

  // مدفوعات الرواتب
  const payments = [
    { id: 'y1', employee_id: 'e1', amount: 5200, date: '2026-04-30', status: 'approved', method: 'تحويل بنكي' },
    { id: 'y2', employee_id: 'e2', amount: 4800, date: '2026-04-30', status: 'approved', method: 'كاش' },
    { id: 'y3', employee_id: 'e3', amount: 5000, date: '2026-04-30', status: 'approved', method: 'تحويل بنكي' },
    { id: 'y4', employee_id: 'e5', amount: 5600, date: '2026-05-05', status: 'approved', method: 'تحويل بنكي' },
    { id: 'y5', employee_id: 'e1', amount: 4000, date: '2026-05-15', status: 'pending',  method: 'تحويل بنكي' },
    { id: 'y6', employee_id: 'e4', amount: 3800, date: '2026-05-15', status: 'pending',  method: 'كاش' },
  ]

  const advances = [
    { id: 'a1', employee_id: 'e3', amount: 1500, date: '2026-04-12', note: 'سلفة' },
    { id: 'a2', employee_id: 'e4', amount: 2000, date: '2026-04-25', note: 'سلفة' },
    { id: 'a3', employee_id: 'e7', amount: 1200, date: '2026-05-04', note: 'سلفة' },
  ]

  return { projects, employees, workDays, clientReceipts, expenses, payments, advances }
}

const noop = () => {}
const noopAsync = async () => ({ error: null })

// appCfg وهمي بالحدّ الأدنى الآمن
export const DEMO_APPCFG = {
  config: { read_only: false, daily_spend_limit: 0, session_timeout: 30 },
  loginLog: [], lockedPeriods: [],
  isPeriodLocked: () => false,
  getLockedPeriods: async () => [],
  getLoginLog: noopAsync,
  lockPeriod: noopAsync, unlockPeriod: noopAsync,
  logLogin: noop,
  update: noopAsync,
  loading: false,
  saveConfig: noopAsync, reload: noop,
}

export const DEMO_PROFILE = { name: 'أبو محمد', contractor_number: '512345678', avatar_url: null }

export const DEMO_BUSINESS = {
  id: 'biz1', name: 'مقاولات النور', business_type: 'osek_moreh',
  sort_order: 0, created_at: '2026-01-01',
}

// حقيبة props شاملة — كل شاشة تاخد ما يلزمها والباقي يُتجاهل.
// تمرّر DEMO (نتيجة buildDemo) + onAction اختياري يُستدعى عند أي محاولة تعديل.
export function makeDemoBag(DEMO, { onAction = noop, extra = {} } = {}) {
  // دالة CRUD وهمية: تستدعي onAction (لتنبيه «سجّل مجاناً») بدل ما تحفظ.
  const block = (...a) => { onAction(...a) }
  return {
    ...DEMO,
    permissions: OWNER_PERMS,
    userId: 'demo-owner', eid: 'demo-owner',
    specs: SPECS, expCats: EXP_CATS, payMethods: PAY_METHODS,
    holidays: [], taxAdvances: [],
    pensionMonthly: 0, setPensionMonthly: noop,
    taxEnabled: true, setTaxEnabled: noop, taxModules: { vat: true, income: true, bituach: true }, setTaxModule: noop,
    profile: DEMO_PROFILE, appCfg: DEMO_APPCFG,
    teamMembers: [],
    onNav: noop,
    // دوال CRUD — في الديمو تنبّه «سجّل مجاناً» بدل الحفظ
    addProject: block, updateProject: block, deleteProject: block, archiveProject: block, restoreProject: block, deleteProjectWithAll: block,
    addReceipt: block, updateReceipt: block, deleteReceipt: block,
    addWorkDay: block, bulkAddWorkDays: block, updateWorkDay: block, bulkUpdateWorkDays: block, deleteWorkDay: block, approveWorkDay: block, rejectWorkDay: block,
    addExpense: block, deleteExpense: block, approveExpense: block, rejectExpense: block,
    addPayment: block, updatePayment: block, deletePayment: block, approvePaymentRequest: block, rejectPaymentRequest: block,
    addAdvance: block, deleteAdvance: block,
    addEmployee: block, updateEmployee: block, deleteEmployee: block,
    addHoliday: block, deleteHoliday: block,
    addMember: block, updateMember: block, removeMember: block, blockMember: block, resetMemberPassword: block,
    getActivity: noopAsync, getAllActivity: noopAsync, teamLoadError: null, reloadTeam: noop,
    addTaxAdvance: block, deleteTaxAdvance: block,
    refetchReceipts: noop, refetchExpenses: noop,
    pushSubStatus: 'unsupported', forceResubscribePush: noop,
    ...extra,
  }
}

// بذر المخازن المشتركة (خطة كاملة + مرآة البيانات + مصلحة عوسك مورشيه)
// حتى تعمل البطاقات الفخمة بلا باكند.
export function seedDemoStores(DEMO) {
  setPlanInfo({ plan: 'business', trialActive: true, paddleEnabled: false })
  useDataStore.getState().setData({
    projects: DEMO.projects, employees: DEMO.employees, workDays: DEMO.workDays,
    expenses: DEMO.expenses, payments: DEMO.payments, clientReceipts: DEMO.clientReceipts, advances: DEMO.advances,
  })
  useBusinessStore.setState({
    businesses: [DEMO_BUSINESS], activeBusinessId: 'biz1', activeBusiness: DEMO_BUSINESS,
    initialized: true, loading: false, error: null,
    // 🔒 حاسم: عدّة شاشات (ProjectsScreen/FinanceScreen) تستدعي load() عند التركيب،
    // وهي تجلب businesses من Supabase. بلا جلسة (الديمو anon) ترجع [] فتمسح المصلحة
    // الوهمية وتنهار الشاشة. نُبطل load في الديمو حتى تبقى البيانات المبذورة.
    load: async () => {},
  })
}
