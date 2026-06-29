import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/index.js'
import './lib/sentry.js'   // تهيئة مراقبة الأخطاء (تعمل فقط عند ضبط VITE_SENTRY_DSN)
import { captureAttribution } from './lib/attribution.js'
import Router from './Router.jsx'

captureAttribution()  // التقاط مصدر الزائر أول لمسة (UTM/referrer) قبل أي تنقّل

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
