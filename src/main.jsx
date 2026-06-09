import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/index.js'
import './lib/sentry.js'   // تهيئة مراقبة الأخطاء (تعمل فقط عند ضبط VITE_SENTRY_DSN)
import Router from './Router.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
