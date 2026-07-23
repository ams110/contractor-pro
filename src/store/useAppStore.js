import { create } from 'zustand'
import { setLanguage, getCurrentLang } from '../i18n/index.js'
import { celebrationConfig } from '../lib/celebrations.js'
import { applyTheme } from '../constants/index.js'

// ثيم الجهاز (وليس الحساب): اختيار المستخدم المحفوظ (cp_theme) يُحترم دائماً.
// بلا اختيار محفوظ: التطبيق (/app) وبوّابة العامل (?portal/?worker) افتراضيّهما
// «وضع الورشة» الفاتح (site)، وصفحات التسويق العامة (الهبوط/الأسعار...) تبقى غامقة.
const savedTheme = (() => {
  try {
    const v = localStorage.getItem('cp_theme')
    return v === 'site' || v === 'dark' ? v : null
  } catch { return null }
})()
const isAppEntry = (() => {
  try {
    return /[?&](portal|worker)\b/.test(window.location.search) || window.location.pathname.includes('/app')
  } catch { return false }
})()
const initialTheme = savedTheme || (isAppEntry ? 'site' : 'dark')
// تطبيق مبكّر قبل أول رسم — يمنع وميض الثيم الغلط عند فتح التطبيق بوضع الورشة
applyTheme(initialTheme)

export const useAppStore = create((set, get) => ({
  // ─── Navigation ───────────────────────────────────────────────────────────
  screen:     'dashboard',
  prevScreen: null,
  setScreen:  (screen) => set(s => ({ screen, prevScreen: s.screen })),

  // ─── Theme (وضع الورشة) ───────────────────────────────────────────────────
  theme: initialTheme,
  setTheme: (mode) => {
    const m = mode === 'site' ? 'site' : 'dark'
    try { localStorage.setItem('cp_theme', m) } catch { /* private mode */ }
    applyTheme(m)
    set({ theme: m })
  },
  toggleTheme: () => get().setTheme(get().theme === 'site' ? 'dark' : 'site'),
  // افتراضي التطبيق/البوّابة فاتح ما لم يحفظ المستخدم اختياراً — يُستدعى عند
  // تركيب App/WorkerPortalScreen (يغطّي الوصول عبر تنقّل SPA من صفحة عامة غامقة).
  // بلا كتابة لـcp_theme: «الافتراضي» يظل افتراضياً حتى يبدّل المستخدم بنفسه.
  ensureAppDefaultTheme: () => {
    try { if (localStorage.getItem('cp_theme')) return } catch { /* private mode */ }
    if (get().theme !== 'site') { applyTheme('site'); set({ theme: 'site' }) }
  },

  // ─── Pending Action ───────────────────────────────────────────────────────
  // طريقة لتمرير "نية" بين الشاشات: مثلاً من ProjectsScreen → FinanceScreen
  // لفتح subTab محدد مع مشروع كفلتر مسبق + (اختياري) فتح فورم الإدخال.
  pendingAction: null,   // { type, payload } | null
  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),

  // ─── Overlays ─────────────────────────────────────────────────────────────
  showSearch:    false,
  showNotifs:    false,
  showMore:      false,
  setShowSearch: (v) => set({ showSearch: v }),
  setShowNotifs: (v) => set({ showNotifs: v }),
  setShowMore:   (v) => set({ showMore: v }),

  // ─── Toast ────────────────────────────────────────────────────────────────
  toast:      null,
  toastTimer: null,
  showToast: (msg, type = 'success') => {
    const { toastTimer } = get()
    if (toastTimer) clearTimeout(toastTimer)
    const timer = setTimeout(() => set({ toast: null, toastTimer: null }), 3000)
    set({ toast: { msg, type }, toastTimer: timer })
  },
  clearToast: () => {
    const { toastTimer } = get()
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: null, toastTimer: null })
  },

  // ─── Celebration (لحظات الاحتفال) ─────────────────────────────────────────
  // يُطلق انفجار احتفال عابر على كل التطبيق. variant: win | money | success | milestone.
  // النمط زي showToast: نخزّن النيّة + مؤقّت تنظيف ذاتي، والمكوّن <Celebration/> يعرضها.
  celebration:      null,   // { id, variant, label } | null
  celebrationTimer: null,
  celebrate: (variant = 'win', opts = {}) => {
    const { celebrationTimer } = get()
    if (celebrationTimer) clearTimeout(celebrationTimer)
    const { duration } = celebrationConfig(variant)
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const timer = setTimeout(() => set({ celebration: null, celebrationTimer: null }), duration + 500)
    set({ celebration: { id, variant, label: opts.label || '' }, celebrationTimer: timer })
  },
  clearCelebration: () => {
    const { celebrationTimer } = get()
    if (celebrationTimer) clearTimeout(celebrationTimer)
    set({ celebration: null, celebrationTimer: null })
  },

  // ─── Online state ─────────────────────────────────────────────────────────
  isOnline: navigator.onLine,
  setOnline: (v) => set({ isOnline: v }),
  queueCount: 0,                                  // تسجيلات بانتظار المزامنة (offlineQueue)
  setQueueCount: (v) => set({ queueCount: v }),

  // ─── Language ─────────────────────────────────────────────────────────────
  language: getCurrentLang(),
  setLanguage: (lang) => {
    setLanguage(lang)
    set({ language: lang })
  },

  // ─── Theme / UI ───────────────────────────────────────────────────────────
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  // ─── Command Palette ──────────────────────────────────────────────────────
  showCommandPalette: false,
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),

  // ─── Signer Info (set once on login) ──────────────────────────────────────
  signerName:   '',
  signerRole:   'owner',
  signerUserId: null,
  ownerUserId:  null,
  setSigner: (name, role, userId, ownerUserId) =>
    set({ signerName: name, signerRole: role, signerUserId: userId, ownerUserId }),

  // ─── Session Lock ─────────────────────────────────────────────────────────
  isLocked:      false,
  lockSession:   () => set({ isLocked: true }),
  unlockSession: () => set({ isLocked: false }),

  // ─── App Config (synced from DB) ──────────────────────────────────────────
  isReadOnly:      false,
  dailySpendLimit: 0,
  setReadOnly:      (v) => set({ isReadOnly: v }),
  setDailySpendLimit: (v) => set({ dailySpendLimit: v }),

  // ─── Biometric Confirm (Promise-based global modal trigger) ───────────────
  bioPending:   null,   // { description, tbl } | null
  bioResolvers: null,   // { resolve, reject }  — non-serializable, fine in Zustand
  requestBioConfirm: ({ description, tbl }) =>
    new Promise((resolve, reject) => {
      set({ bioPending: { description, tbl }, bioResolvers: { resolve, reject } })
    }),
  // البصمة أو PIN نجح — resolve مع بيانات الموقّع
  resolveBioConfirm: () => {
    const { bioResolvers, signerName, signerRole } = get()
    const info = { name: signerName, role: signerRole }
    bioResolvers?.resolve(info)
    set({ bioPending: null, bioResolvers: null })
    return info
  },
  // المستخدم ألغى أو رفض — reject (العملية تُحجب)
  rejectBioConfirm: () => {
    const { bioResolvers } = get()
    bioResolvers?.reject(new Error('CANCELLED'))
    set({ bioPending: null, bioResolvers: null })
  },
}))
