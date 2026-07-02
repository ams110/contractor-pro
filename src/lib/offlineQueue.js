// ─────────────────────────────────────────────────────────────────────────────
// offlineQueue — شبكة أمان للكتابة بلا اتصال (طابور خفيف، ليس محرّك مزامنة)
//
// النطاق عمداً: إدراجات work_days + expenses فقط (الدفعات مستثناة — تأكيد
// البصمة في App.jsx لازم يفشل بصوت عالٍ، لا بصمت بطابور).
//
// الضمانات:
//  - كل صف يحمل id (uuid) مولَّداً بالعميل → إعادة إرسال صف سبق ووصل الخادم
//    تضرب unique-violation (23505) فتُعامل كنجاح وتُحذف (dedupe).
//  - FIFO بسقف MAX_QUEUE؛ التجاوز يرمي خطأً عادياً (الواجهة تعرض الفشل المعتاد).
//  - خطأ شبكة أثناء flush → توقّف واحتفاظ بالباقي. خطأ دائم (RLS/قيد) →
//    نقل للقائمة الفاشلة بلا إعادة محاولة أبدية.
//  - المفاتيح لكل مستخدم (kbl_oq_v1_<uid>) — لا تسريب طابور بين حسابات.
// ─────────────────────────────────────────────────────────────────────────────
import { useAppStore } from '../store/useAppStore.js'

export const MAX_QUEUE = 50
const KEY = (uid) => `kbl_oq_v1_${uid}`
const FAILED_KEY = (uid) => `kbl_oq_failed_v1_${uid}`

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
}
function write(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch {}
}

/** uuid v4 للصفوف المولَّدة بالعميل (dedupe عند إعادة الإرسال) */
export function newRowId() {
  try { return crypto.randomUUID() } catch {
    // fallback نادر (متصفحات قديمة جداً)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }
}

/** هل الخطأ شبكي (يستحق الطابور) أم دائم (يستحق الفشل الصريح)؟ */
export function isNetworkError(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String(err?.message || err || '')
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg)
}

function syncStore(userId) {
  try { useAppStore.getState().setQueueCount?.(queueCount(userId)) } catch {}
}

export function queueCount(userId) {
  return userId ? read(KEY(userId)).length : 0
}

export function failedCount(userId) {
  return userId ? read(FAILED_KEY(userId)).length : 0
}

/**
 * أضف عملية إدراج للطابور. rows = مصفوفة صفوف كاملة (مع user_id وid).
 * يرمي خطأً عند امتلاء الطابور — فتظهر رسالة الفشل المعتادة بدل الإسقاط الصامت.
 */
export function enqueue(userId, table, rows) {
  if (!userId || !table || !rows?.length) throw new Error('offlineQueue: bad enqueue args')
  const list = read(KEY(userId))
  if (list.length >= MAX_QUEUE) throw new Error('offline queue full')
  list.push({ id: newRowId(), table, rows, ts: Date.now() })
  write(KEY(userId), list)
  syncStore(userId)
}

let flushing = false

/**
 * صرّف الطابور FIFO. يُرجع { synced, failed, remaining } (عدد صفوف).
 * آمن للاستدعاء المتوازي (علم flushing) وللاستدعاء بلا مستخدم.
 */
export async function flush(supabase, userId) {
  if (!userId || flushing) return { synced: 0, failed: 0, remaining: queueCount(userId) }
  flushing = true
  let synced = 0, failed = 0
  try {
    let list = read(KEY(userId))
    while (list.length) {
      const entry = list[0]
      let error = null
      try {
        ({ error } = await supabase.from(entry.table).insert(entry.rows))
      } catch (e) { error = e }

      if (!error || error.code === '23505') {
        // نجاح — أو الصفوف وصلت أصلاً بمحاولة سابقة (unique violation على id)
        synced += entry.rows.length
        list = list.slice(1)
        write(KEY(userId), list)
      } else if (isNetworkError(error)) {
        break // ما زلنا بلا شبكة فعلياً — أوقف واحتفظ بالباقي
      } else {
        // خطأ دائم (RLS/قيد/قراءة-فقط) — للقائمة الفاشلة، بلا إعادة أبدية
        failed += entry.rows.length
        const failedList = read(FAILED_KEY(userId))
        failedList.push({ ...entry, error: String(error?.message || error) })
        write(FAILED_KEY(userId), failedList.slice(-MAX_QUEUE))
        list = list.slice(1)
        write(KEY(userId), list)
      }
    }
  } finally {
    flushing = false
    syncStore(userId)
  }
  return { synced, failed, remaining: queueCount(userId) }
}
