import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'

export const BUSINESS_TYPES = [
  { id: 'osek_patur', label: 'עוסק פטור',  desc: 'معفي من מע"מ — حد ₪120,000/سنة' },
  { id: 'osek_moreh', label: 'עוסק מורשה', desc: 'مرخص — يجمع ويدفع מע"מ 18%' },
  { id: 'hevra',      label: 'חברה בע"מ',  desc: 'شركة — ضريبة شركات 23%' },
]

// ─── Helper: compute activeBusiness from businesses + activeBusinessId ─────────
function computeActive(businesses, activeBusinessId) {
  return businesses.find(b => b.id === activeBusinessId) ?? businesses[0] ?? null
}

export const useBusinessStore = create(
  persist(
    (set, get) => ({
      // ─── State ───────────────────────────────────────────────────────────
      businesses:       [],
      activeBusinessId: null,
      activeBusiness:   null,   // ← state حقيقي (مش getter) يُحدَّث صراحةً
      loading:          false,
      initialized:      false,

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
          const validId = data?.find(b => b.id === activeBusinessId)
            ? activeBusinessId
            : (data?.[0]?.id ?? null)

          set({
            businesses:       data ?? [],
            activeBusinessId: validId,
            activeBusiness:   computeActive(data ?? [], validId),
            initialized:      true,
          })
        } catch (e) {
          console.error('useBusinessStore.load:', e)
          set({ initialized: true })
        } finally {
          set({ loading: false })
        }
      },

      // ─── Switch active business ────────────────────────────────────────
      setActiveBusiness(id) {
        const { businesses } = get()
        set({
          activeBusinessId: id,
          activeBusiness:   businesses.find(b => b.id === id) ?? null,
        })
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

        set(s => {
          const newActiveId = s.activeBusinessId ?? data.id
          return {
            businesses:       [...s.businesses, data],
            activeBusinessId: newActiveId,
            activeBusiness:   s.activeBusiness ?? data,
          }
        })
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
          businesses:     s.businesses.map(b => b.id === id ? { ...b, ...fields } : b),
          activeBusiness: s.activeBusiness?.id === id
            ? { ...s.activeBusiness, ...fields }
            : s.activeBusiness,
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
          const remaining  = s.businesses.filter(b => b.id !== id)
          const newActiveId = s.activeBusinessId === id
            ? (remaining[0]?.id ?? null)
            : s.activeBusinessId
          return {
            businesses:       remaining,
            activeBusinessId: newActiveId,
            activeBusiness:   computeActive(remaining, newActiveId),
          }
        })
      },
    }),
    {
      name: 'contractor-pro-businesses',
      partialize: s => ({ activeBusinessId: s.activeBusinessId }),
    }
  )
)
