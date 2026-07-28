// ─── مدخل تطبيق بوّابة العامل (منفصل عن تطبيق المالك) ──────────────────────────
// هذا المدخل يخصّ `worker.html` فقط. ما بيستورد `App.jsx` ولا `Router.jsx` —
// فحزمة العامل خفيفة (بلا شاشات المالك/المالية/الفريق) وما في أي طريق يوصله
// لتطبيق المالك. كانت المشكلة سابقاً: البوّابة تُفتح بـ`?portal` على نفس وثيقة
// المالك ونفس الـmanifest، فعند التثبيت يفتح `start_url` تطبيق المالك.

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './index.css'
import './i18n/index.js'   // يحلّ لغة الإقلاع من ?lang= قبل أي مخزن يقرأ اللغة
import './lib/sentry.js'   // مراقبة الأخطاء (خاملة بلا VITE_SENTRY_DSN)
import { runDomainMigration } from './lib/domainMigration.js'
import { globalCSS } from './globalCSS.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import WorkerPortalScreen from './screens/WorkerPortalScreen.jsx'

function WorkerApp() {
  // تحديث تلقائي — نفس سلوك تطبيق المالك (SW واحد للأصل، بنطاقين للـmanifest)
  useRegisterSW({ onNeedRefresh() { window.location.reload() } })

  // إصلاح 100vh على أندرويد كروم
  useEffect(() => {
    const setVH = () => document.documentElement.style.setProperty('--actual-vh', `${window.innerHeight}px`)
    setVH()
    window.addEventListener('resize', setVH)
    return () => window.removeEventListener('resize', setVH)
  }, [])

  return (
    <>
      <style>{globalCSS}</style>
      <ErrorBoundary screen="worker-portal">
        <WorkerPortalScreen />
      </ErrorBoundary>
    </>
  )
}

// ترحيل النطاق القديم → kabblan.com (الروابط المنتشرة بالواتساب عند العمّال).
// لو رجّع true فالصفحة عم تتحوّل ولا داعي لتركيب React.
if (!runDomainMigration()) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <WorkerApp />
    </React.StrictMode>
  )
}
