import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'

export const BUSINESS_TYPES = [
  { id: 'osek_patur', label: 'עוסק פטור',  desc: 'معفي من מע"מ — حد ₪120,000/سنة' },
  { id: 'osek_moreh', label: 'עוסק מורשה', desc: 'مرخص — يجمع ويدفع מע"מ 18%' },
  { id: 'hevra',      label: 'חברה בע"מ',  desc: 'شركة — ضريبة شركات 23%' },
]

export const useBusinessStore = create(
  persist(
    (set, get) => ({
      // ─── State ───────────────────────────────────────────────────────────
      businesses:       [],
      activeBusinessId: null,
      loading:          false,
      initialized:      false,

      // ─── Derived ─────────────────────────────────────────────────────────
      get activeBusiness() {
        const { businesses, activeBusinessId } = get()
        return businesses.find(b => b.id === activeBusinessId) ?? businesses[0] ?? null
      },

      // ─── Load all businesses for current user ─────────────────────────
      async load() {
        set({ loading: true })
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })

          if (error) throw error

          const { activeBusinessId } = get()
          // اختر أول مصلحة إذا ما في مختارة
          const firstId = data?.[0]?.id ?? null
          const validId = data?.find(b => b.id === activeBusinessId)
            ? activeBusinessId
            : firstId

          set({ businesses: data ?? [], activeBusinessId: validId, initialized: true })
        } catch (e) {
          console.error('useBusinessStore.load:', e)
        } finally {
          set({ loading: false })
        }
      },

      // ─── Switch active business ────────────────────────────────────────
      setActiveBusiness(id) {
        set({ activeBusinessId: id })
      },

      // ─── Create ────────────────────────────────────────────────────────
      async create(fields) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('businesses')
          .insert({ ...fields, user_id: user.id })
          .select()
          .single()

        if (error) throw error

        set(s => ({
          businesses: [...s.businesses, data],
          activeBusinessId: s.activeBusinessId ?? data.id,
        }))
        return data
      },

      // ─── Update ────────────────────────────────────────────────────────
      async update(id, fields) {
        const { error } = await supabase
          .from('businesses')
          .update(fields)
          .eq('id', id)

        if (error) throw error

        set(s => ({
          businesses: s.businesses.map(b => b.id === id ? { ...b, ...fields } : b),
        }))
      },

      // ─── Delete ────────────────────────────────────────────────────────
      async remove(id) {
        const { error } = await supabase
          .from('businesses')
          .delete()
          .eq('id', id)

        if (error) throw error

        set(s => {
          const remaining = s.businesses.filter(b => b.id !== id)
          const newActive = s.activeBusinessId === id
            ? (remaining[0]?.id ?? null)
            : s.activeBusinessId
          return { businesses: remaining, activeBusinessId: newActive }
        })
      },
    }),
    {
      name: 'contractor-pro-businesses',
      partialize: s => ({ activeBusinessId: s.activeBusinessId }),
    }
  )
)
