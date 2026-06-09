import React, { useState, useEffect, lazy, Suspense } from 'react'
import App         from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import LegalPage   from './pages/LegalPage.jsx'

const LoginScreen = lazy(() => import('./screens/auth/LoginScreen.jsx'))

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

  if (path === '/')         return <LandingPage />
  if (path === '/pricing')  return <PricingPage />
  if (path === '/welcome')  return <WelcomePage />
  if (path === '/terms')    return <LegalPage type="terms" />
  if (path === '/privacy')  return <LegalPage type="privacy" />
  if (path === '/refund')   return <LegalPage type="refund" />
  if (path === '/contact')  return <LegalPage type="contact" />
  if (path === '/login')    return <Suspense fallback={null}><LoginScreen /></Suspense>
  if (path === '/register') return <Suspense fallback={null}><LoginScreen initialView="register" /></Suspense>
  return <App />
}
