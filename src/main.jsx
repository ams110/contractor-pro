import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n/index.js'
import Router from './Router.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
)
