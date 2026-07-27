import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/index.js'   // يحلّ لغة الإقلاع من ?lang= (رابط الحملة) قبل أي مخزن يقرأ اللغة
import './lib/sentry.js'   // تهيئة مراقبة الأخطاء (تعمل فقط عند ضبط VITE_SENTRY_DSN)
import { captureAttribution } from './lib/attribution.js'
import { captureReferralCode } from './lib/referral.js'
import { runDomainMigration } from './lib/domainMigration.js'
import Router from './Router.jsx'

// ترحيل النطاق القديم → kabblan.com (يلغّي الـSW، ينقل التفضيلات، يحوّل).
// لازم يكون أوّل شي: لو رجّع true فالصفحة عم تتحوّل ولا داعي لتركيب React.
if (!runDomainMigration()) {
  captureAttribution()   // التقاط مصدر الزائر أول لمسة (UTM/referrer) قبل أي تنقّل
  captureReferralCode()  // التقاط كود الإحالة ?ref= (مفتاح مستقل — يُقرأ عند التسجيل)

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Router />
    </React.StrictMode>
  )
}
