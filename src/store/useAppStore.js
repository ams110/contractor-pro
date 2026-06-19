import { create } from 'zustand'
import { setLanguage, getCurrentLang } from '../i18n/index.js'
import { celebrationConfig } from '../lib/celebrations.js'

export const useAppStore = create((set, get) => ({
  // ─── Navigation ───────────────────────────────────────────────────────────
  screen:     'dashboard',
  prevScreen: null,
  setScreen:  (screen) => set(s => ({ screen, prevScreen: s.screen })),

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
