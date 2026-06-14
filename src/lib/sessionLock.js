// منطق قفل الجلسة (نمط «المجلد الآمن») — دوال نقيّة قابلة للاختبار يقرأ منها App.jsx.
// السلوك: قفل فوري عند الخروج من التطبيق (visibilitychange) + قفل بعد مهلة خمول،
// لكن فقط لمن سجّل وسيلة فتح (بصمة/PIN) حتى لا يعلق المستخدم بشاشة قفل لا تُفتح.

export const LOCK_ON_BG_KEY = 'cpro_lock_on_bg'
export const PASSKEY_KEY    = 'cpro_passkey_cred'

// هل وُجدت وسيلة فتح (بصمة/PIN) تسمح بتفعيل القفل التلقائي؟
export function hasUnlockMethod({ hasPasskey, hasPinSet } = {}) {
  return !!hasPasskey || !!hasPinSet
}

// مهلة الخمول بالمللي ثانية (افتراضي 30 دقيقة؛ القيم غير الصالحة تُرَدّ للافتراضي).
export function idleTimeoutMs(sessionTimeoutMinutes) {
  const m = Number(sessionTimeoutMinutes)
  const minutes = Number.isFinite(m) && m > 0 ? m : 30
  return minutes * 60 * 1000
}

// هل القفل الفوري عند الخروج مفعّل؟ (مخزّن محلياً، مفعّل افتراضياً — يُعطَّل فقط بـ '0').
export function lockOnBackgroundEnabled(stored) {
  return stored !== '0'
}
