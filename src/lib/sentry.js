import * as Sentry from '@sentry/react'

/**
 * مراقبة الأخطاء عبر Sentry.
 * خاملة تماماً ما لم يُضبط VITE_SENTRY_DSN — فلا تؤثّر على بيئة التطوير أو
 * البناء بدون مفتاح. اضبط المتغيّر في Vercel لتفعيلها بالإنتاج.
 */
const DSN = import.meta.env.VITE_SENTRY_DSN

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: typeof __APP_VERSION__ !== 'undefined' ? `contractor-pro@${__APP_VERSION__}` : undefined,
    // معدّل أخذ عيّنات الأداء — منخفض لتوفير الحصّة المجانية
    tracesSampleRate: 0.1,
    // تسجيل أخطاء غير معالَجة + رفض الوعود
    integrations: [Sentry.browserTracingIntegration()],
    // لا ترسل أخطاء التطوير المحلّي
    enabled: import.meta.env.PROD,
    // لا تلتقط أخطاء الإضافات/الشبكة المعروفة الضوضائية
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Load failed',
      'NetworkError',
    ],
  })
}

/** ربط هوية المستخدم بالأخطاء (يُستدعى بعد تسجيل الدخول) */
export function setSentryUser(user) {
  if (!DSN) return
  if (user) Sentry.setUser({ id: user.id, email: user.email })
  else Sentry.setUser(null)
}

export { Sentry }
