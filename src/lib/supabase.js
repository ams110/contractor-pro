import { createClient } from '@supabase/supabase-js'

// تُحقن وقت البناء من متغيّرات البيئة (Vercel env / GitHub Secrets في pages.yml).
// لا قيم افتراضية مكتوبة في الكود.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'إعداد Supabase ناقص: عيّن VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في متغيّرات البيئة'
  )
}

export const SUPABASE_URL = supabaseUrl

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    experimental: {
      passkey: true,
    },
  }
})
