import { create } from 'zustand'
import { setLanguage, getCurrentLang } from '../i18n/index.js'

export const useAppStore = create((set, get) => ({
  // ─── Navigation ───────────────────────────────────────────────────────────
  screen:     'dashboard',
  prevScreen: null,
  setScreen:  (screen) => set(s => ({ screen, prevScreen: s.screen })),

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

  // ─── Biometric Confirm (Promise-based global modal trigger) ───────────────
  bioPending:   null,   // { description, tbl } | null
  bioResolvers: null,   // { resolve, reject }  — non-serializable, fine in Zustand
  requestBioConfirm: ({ description, tbl }) =>
    new Promise((resolve) => {
      set({ bioPending: { description, tbl }, bioResolvers: { resolve } })
    }),
  // البصمة نجحت — resolve مع بيانات الموقّع
  resolveBioConfirm: () => {
    const { bioResolvers, signerName, signerRole } = get()
    const info = { name: signerName, role: signerRole }
    bioResolvers?.resolve(info)
    set({ bioPending: null, bioResolvers: null })
    return info
  },
  // ألغى أو فشل — resolve بـ null (العملية تكمل بدون توقيع)
  skipBioConfirm: () => {
    const { bioResolvers } = get()
    bioResolvers?.resolve(null)
    set({ bioPending: null, bioResolvers: null })
  },
}))
