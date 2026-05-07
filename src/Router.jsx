import React, { useState, useEffect } from 'react'
import App         from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PricingPage from './pages/PricingPage.jsx'

// ─── Client-side navigation (no full page reload) ─────────────────────────────
export function navigate(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function Router() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  // ?portal and ?worker query params always go straight to the app
  const params = new URLSearchParams(window.location.search)
  if (params.has('portal') || params.has('worker')) return <App />

  if (path === '/')        return <LandingPage />
  if (path === '/pricing') return <PricingPage />
  return <App />
}
