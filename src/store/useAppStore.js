import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // ─── Navigation ───────────────────────────────────────────────────────────
  screen: 'dashboard',
  prevScreen: null,
  setScreen: (screen) => set(s => ({ screen, prevScreen: s.screen })),

  // ─── Overlays ─────────────────────────────────────────────────────────────
  showSearch:     false,
  showNotifs:     false,
  showMore:       false,  // "المزيد" drawer
  setShowSearch:  (v) => set({ showSearch: v }),
  setShowNotifs:  (v) => set({ showNotifs: v }),
  setShowMore:    (v) => set({ showMore: v }),

  // ─── Toast ────────────────────────────────────────────────────────────────
  toast: null,
  toastTimer: null,
  showToast: (msg, type = 'success') => {
    const { toastTimer } = get()
    if (toastTimer) clearTimeout(toastTimer)
    const timer = setTimeout(() => set({ toast: null, toastTimer: null }), 3000)
    set({ toast: { msg, type }, toastTimer: timer })
  },
  clearToast: () => set({ toast: null }),

  // ─── Online state ─────────────────────────────────────────────────────────
  isOnline: navigator.onLine,
  setOnline: (v) => set({ isOnline: v }),
}))
