import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://rvhjrzbhugvytvktdhor.supabase.co'

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_StYQEWIn705_V2lNNSITtg_ty04ZO5E'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    experimental: {
      passkey: true,
    },
  }
})
