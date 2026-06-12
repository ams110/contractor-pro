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

// ── مدة انتهاء صلاحية الـ signed URL: سنة واحدة ──────────────────────────────
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 // 1 year in seconds

/**
 * استخرج الـ bucket و path من أي URL سواء كان public أو signed.
 * يُستخدم لتجديد URLs المنتهية الصلاحية.
 */
function parseBucketPath(url) {
  if (!url) return null
  // Signed URL: /storage/v1/object/sign/<bucket>/<path>
  let m = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(\?|$)/)
  if (m) return { bucket: m[1], path: m[2] }
  // Public URL: /storage/v1/object/public/<bucket>/<path>
  m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(\?|$)/)
  if (m) return { bucket: m[1], path: m[2] }
  return null
}

/**
 * أعد توليد signed URL من أي URL مخزّن (public أو signed منتهي).
 * استخدمه في مكونات العرض لضمان إمكانية الوصول دائماً.
 */
export async function refreshSignedUrl(storedUrl, ttl = SIGNED_URL_TTL) {
  const parsed = parseBucketPath(storedUrl)
  if (!parsed) return storedUrl // رابط خارجي أو غير معروف
  const { data } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, ttl)
  return data?.signedUrl || storedUrl
}

/**
 * افتح إيصالاً مخزّناً في تبويب جديد بعد توقيعه طازجاً.
 * يعالج الروابط العامّة القديمة (الدلاء صارت خاصّة) والروابط الموقّعة المنتهية.
 */
export async function openSignedUrl(storedUrl) {
  if (!storedUrl) return
  // افتح التبويب فوراً (قبل await) حتى لا يحجبه مانع النوافذ المنبثقة
  const win = window.open('', '_blank', 'noopener')
  const url = await refreshSignedUrl(storedUrl)
  if (win) win.location = url
  else window.open(url, '_blank', 'noopener')
}

export async function uploadReceipt(userId, file) {
  const compressed = await compressImage(file)
  const ext  = compressed.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg')
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('receipts')
    .upload(path, compressed, { upsert: false, contentType: compressed.type })

  if (upErr) throw new Error(upErr.message)

  // Signed URL بدلاً من public URL ─ محمية بالمصادقة وتنتهي بعد سنة
  const { data, error: signErr } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (signErr || !data?.signedUrl) throw new Error('فشل توليد رابط الإيصال')
  return data.signedUrl
}

export async function uploadWorkerReceipt(empId, token, file) {
  const compressed = await compressImage(file)
  const ext  = compressed.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg')
  const path = `${empId}/${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('worker-receipts')
    .upload(path, compressed, { upsert: false, contentType: compressed.type })

  if (upErr) throw new Error(upErr.message)

  // البوّابة مجهولة على طبقة التخزين (الدلو خاصّ) — التوقيع يتمّ عبر edge function
  // يتحقّق من جلسة العامل (worker_session_token) ويوقّع مسار العامل فقط.
  const { data, error: signErr } = await supabase.functions.invoke('worker-sign-receipt', {
    body: { emp_id: empId, token, path },
  })
  if (signErr || !data?.signedUrl) throw new Error('فشل توليد رابط الإيصال')
  return data.signedUrl
}
