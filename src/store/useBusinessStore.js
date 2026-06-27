import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase.js'

// label = المصطلح القانوني العبري (يُعرض كما هو في كل اللغات) · desc مترجم ثلاثياً
export const BUSINESS_TYPES = [
  { id: 'osek_patur', label: 'עוסק פטור',  desc: 'معفي من מע"מ — حد ₪120,000/سنة', desc_he: 'פטור ממע"מ — תקרה ₪120,000/שנה', desc_en: 'VAT-exempt — ₪120,000/yr cap' },
  { id: 'osek_moreh', label: 'עוסק מורשה', desc: 'مرخص — يجمع ويدفع מע"מ 18%',      desc_he: 'מורשה — גובה ומשלם מע"מ 18%',   desc_en: 'Licensed — charges & pays 18% VAT' },
  { id: 'hevra',      label: 'חברה בע"מ',  desc: 'شركة — ضريبة شركات 23%',          desc_he: 'חברה — מס חברות 23%',          desc_en: 'Company — 23% corporate tax' },
]

// نصّ وصف نوع المصلحة حسب اللغة (للاستعمال في شاشات الإعداد/التعديل)
export function bizTypeDesc(bt, lang) {
  if (!bt) return ''
  return lang === 'he' ? (bt.desc_he || bt.desc) : lang === 'en' ? (bt.desc_en || bt.desc) : bt.desc
}

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
      error:            null,   // ← آخر خطأ تحميل (لتمييز «فشل» عن «فارغ فعلاً»)

      // ─── Load all businesses for current user ─────────────────────────
      // مهم: نفرّق بين «حُمِّل بنجاح وعدد المصالح صفر» (مستخدم جديد → onboarding)
      // و«فشل التحميل» (شبكة/جلسة). في حالة الفشل لا نعتبر النتيجة فارغة، بل
      // نعيد المحاولة ونرفع `error` كي لا تُعرض شاشة «أنشئ أول مصلحة» خطأً لمالك
      // عنده مصالح أصلاً.
      async load({ retries = 3 } = {}) {
        set({ loading: true })
        let lastErr = null
        for (let attempt = 0; attempt <= retries; attempt++) {
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
              error:            null,
              loading:          false,
            })
            return
          } catch (e) {
            lastErr = e
            if (attempt < retries) {
              // backoff تصاعدي خفيف قبل إعادة المحاولة
              await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
            }
          }
        }
        // فشل نهائي بعد كل المحاولات: لا نلمس `businesses` (نبقيها كما هي)
        // ونرفع الخطأ كي يعرض التطبيق شاشة إعادة محاولة بدل onboarding.
        console.error('useBusinessStore.load:', lastErr)
        set({ initialized: true, error: lastErr, loading: false })
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
