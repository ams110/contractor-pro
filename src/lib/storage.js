import { supabase } from './supabase.js'

/**
 * رفع ملف إثبات/فاتورة إلى Supabase Storage
 * @param {string} userId - معرف المستخدم
 * @param {File}   file   - الملف المراد رفعه
 * @returns {Promise<string>} الرابط العام للملف
 */
export async function uploadReceipt(userId, file) {
  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (upErr) throw new Error(upErr.message)

  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}
