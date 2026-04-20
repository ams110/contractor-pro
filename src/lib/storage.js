import { supabase } from './supabase.js'

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

export async function uploadWorkerReceipt(empId, file) {
  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${empId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('worker-receipts')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (upErr) throw new Error(upErr.message)

  const { data } = supabase.storage.from('worker-receipts').getPublicUrl(path)
  return data.publicUrl
}
