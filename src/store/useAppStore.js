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
}))
