import { supabase } from './supabase.js'

// ضغط الصور قبل الرفع (max 1200px، جودة 80%) — يوفر ~70% من حجم الملف
async function compressImage(file, maxPx = 1200, quality = 0.8) {
  if (!file.type.startsWith('image/')) return file
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export async function uploadReceipt(userId, file) {
  const compressed = await compressImage(file)
  const ext  = compressed.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg')
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('receipts')
    .upload(path, compressed, { upsert: false, contentType: compressed.type })

  if (upErr) throw new Error(upErr.message)

  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadWorkerReceipt(empId, file) {
  const compressed = await compressImage(file)
  const ext  = compressed.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg')
  const path = `${empId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('worker-receipts')
    .upload(path, compressed, { upsert: false, contentType: compressed.type })

  if (upErr) throw new Error(upErr.message)

  const { data } = supabase.storage.from('worker-receipts').getPublicUrl(path)
  return data.publicUrl
}
