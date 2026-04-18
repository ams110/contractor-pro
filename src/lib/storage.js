import { supabase } from './supabase.js'

export async function uploadReceipt(userId, file) {
  const ext  = file.name.split('.').pop()
  const path = `receipts/${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
