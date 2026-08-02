// ── بوّابة موحّدة لإنشاء إشعار «مرة واحدة» ───────────────────────────────────
//
// أربع هوكس تنبيه (رواتب متأخّرة · ملخّص يومي · طلبات معلّقة · سقف עוסק פטור)
// كانت تكرّر نفس ثلاث خطوات بالإيد: مفتاح localStorage يومي، استعلام dedup،
// ثم insert. التكرار ولّد اختلافات صامتة (وحدة تحفظ المفتاح قبل الاستعلام
// ووحدة بعده) و4 استعلامات منفصلة عند كل فتح للتطبيق. هون المنطق مرّة وحدة.

import { supabase } from './supabase.js'
import { todayStr } from './helpers.js'

/**
 * هل مفتاح الفحص اليومي انصرف اليوم؟ (دالة نقيّة على قيمة مخزّنة)
 * @param {string|null} stored القيمة المحفوظة
 * @param {string} today تاريخ اليوم YYYY-MM-DD
 */
export function alreadyRanToday(stored, today = todayStr()) {
  return stored === today
}

/** قراءة/كتابة مفتاح الفحص اليومي بأمان (localStorage قد يكون محجوباً). */
export function readDayKey(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
export function writeDayKey(key, value = todayStr()) {
  try { localStorage.setItem(key, value) } catch { /* تصفّح خاص — تجاهل */ }
}

/**
 * يبني نطاق الـdedup: منذ بداية اليوم أو بداية السنة.
 * @param {'day'|'year'} scope
 */
export function dedupSince(scope = 'day', now = new Date()) {
  return scope === 'year'
    ? `${now.getFullYear()}-01-01T00:00:00`
    : `${now.toISOString().slice(0, 10)}T00:00:00`
}

/**
 * أنشئ إشعاراً إن لم يُنشَأ مثله ضمن النطاق.
 * يجمع فحص التكرار + الإدخال في نداء واحد، ويرجّع هل أُنشئ فعلاً.
 *
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.type   نوع الإشعار (مفتاح في NOTIF_TYPES)
 * @param {string} p.title
 * @param {string} [p.body]
 * @param {string} [p.refId] لربط الإشعار بصف (مصلحة/عامل/مشروع)
 * @param {'day'|'year'} [p.scope] نطاق منع التكرار
 * @returns {Promise<boolean>} true لو أُنشئ إشعار جديد
 */
export async function insertOnce({ userId, type, title, body = '', refId = null, scope = 'day' }) {
  if (!userId || !type) return false

  let q = supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', dedupSince(scope))
    .limit(1)
  if (refId) q = q.eq('ref_id', refId)

  const { data: existing, error } = await q
  // على خطأ شبكة لا نُدخل (أفضل إشعار ضايع من إشعار مكرّر كل ثانية)
  if (error) return false
  if (existing?.length) return false

  const row = { user_id: userId, title, body, type }
  if (refId) row.ref_id = refId
  const { error: insErr } = await supabase.from('notifications').insert(row)
  return !insErr
}

/**
 * غلاف «شغّل مرّة باليوم»: يفحص المفتاح، ينفّذ، ثم يختم المفتاح مهما كانت
 * النتيجة (حتى لو ما انكتب إشعار) — فما بنعيد نفس الاستعلامات كل فتح.
 */
export async function runDailyOnce(key, fn) {
  const today = todayStr()
  if (alreadyRanToday(readDayKey(key), today)) return false
  try { await fn() } catch { /* لا نكسر التطبيق لأجل تنبيه */ }
  writeDayKey(key, today)
  return true
}
