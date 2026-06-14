import React, { useState, useEffect, lazy, Suspense } from 'react'
import App         from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import LegalPage   from './pages/LegalPage.jsx'
import BlogPage    from './pages/BlogPage.jsx'
import CookieConsent from './components/CookieConsent.jsx'

const LoginScreen = lazy(() => import('./screens/auth/LoginScreen.jsx'))
const AdStudio    = lazy(() => import('./pages/AdStudio.jsx'))
const AdReel      = lazy(() => import('./pages/AdReel.jsx'))
const DemoShot    = lazy(() => import('./pages/DemoShot.jsx'))

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

  // /adstudio — محرّك البوسترات التسويقية (بلا لافتة كوكيز)
  if (path === '/adstudio') return <Suspense fallback={null}><AdStudio /></Suspense>
  // /adreel — نسخة فيديو ٩:١٦ من البوسترات (تُسجَّل عبر scripts/reel-shots.mjs)
  if (path === '/adreel') return <Suspense fallback={null}><AdReel /></Suspense>
  // /demoshot — يرندر الشاشات الفعلية ببيانات وهمية (للموكاب داخل البوسترات)
  if (path === '/demoshot') return <Suspense fallback={null}><DemoShot /></Suspense>

  let page
  if (path === '/')              page = <LandingPage />
  else if (path === '/pricing')  page = <PricingPage />
  else if (path === '/welcome')  page = <WelcomePage />
  else if (path === '/terms')    page = <LegalPage type="terms" />
  else if (path === '/privacy')  page = <LegalPage type="privacy" />
  else if (path === '/refund')   page = <LegalPage type="refund" />
  else if (path === '/contact')  page = <LegalPage type="contact" />
  else if (path === '/blog')     page = <BlogPage />
  else if (path === '/login')    page = <Suspense fallback={null}><LoginScreen /></Suspense>
  else if (path === '/register') page = <Suspense fallback={null}><LoginScreen initialView="register" /></Suspense>
  else                           page = <App />

  return <>{page}<CookieConsent /></>
}
