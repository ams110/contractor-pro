import React, { useState, useEffect, lazy, Suspense } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import LegalPage   from './pages/LegalPage.jsx'
import BlogPage    from './pages/BlogPage.jsx'
import ThankYouPage from './pages/ThankYouPage.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import { ttPage } from './lib/tiktok.js'

// التطبيق الكامل lazy — صفحات التسويق (هبوط/أسعار/قانونية) ما تنزّل كود التطبيق
// والـhooks والشاشات معها، فتصغر الحزمة الأولى كثيراً (أداء أسرع على الموبايل).
const App = lazy(() => import('./App.jsx'))
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const AdStudio    = lazy(() => import('./pages/AdStudio.jsx'))
const AdReel      = lazy(() => import('./pages/AdReel.jsx'))
const DemoShot    = lazy(() => import('./pages/DemoShot.jsx'))
const DemoApp     = lazy(() => import('./pages/DemoApp.jsx'))
const BpDemo      = lazy(() => import('./pages/BpDemo.jsx'))   // معاينة مؤقّتة /bpdemo

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

  // TikTok Pixel: أطلق حدث عرض صفحة عند كل تنقّل client-side (SPA).
  // الـHTML يطلق page() الأولى تلقائياً، فنتجاهلها هنا لتفادي التكرار.
  const firstPv = React.useRef(true)
  useEffect(() => {
    if (firstPv.current) { firstPv.current = false; return }
    ttPage()
  }, [path])

  // ?portal and ?worker query params always go straight to the app
  const params = new URLSearchParams(window.location.search)
  if (params.has('portal') || params.has('worker')) return <Suspense fallback={null}><App /></Suspense>

  // /demo (أو ?demo) — الديمو العام التفاعلي: التطبيق الحقيقي ببيانات وهمية بلا تسجيل
  if (path === '/demo' || params.has('demo')) return <Suspense fallback={null}><DemoApp /></Suspense>

  // /admin — لوحة تحكّم المنصّة (مركز قيادة الأدمن، دخول مخصّص — بلا لافتة كوكيز)
  if (path === '/admin') return <Suspense fallback={null}><AdminDashboard /></Suspense>
  // /adstudio — محرّك البوسترات التسويقية (بلا لافتة كوكيز)
  if (path === '/adstudio') return <Suspense fallback={null}><AdStudio /></Suspense>
  // /adreel — نسخة فيديو ٩:١٦ من البوسترات (تُسجَّل عبر scripts/reel-shots.mjs)
  if (path === '/adreel') return <Suspense fallback={null}><AdReel /></Suspense>
  // /demoshot — يرندر الشاشات الفعلية ببيانات وهمية (للموكاب داخل البوسترات)
  if (path === '/demoshot') return <Suspense fallback={null}><DemoShot /></Suspense>
  // معاينة مؤقّتة للطابع الهندسي على الشاشات الفاضية (تُحذف بعد الاعتماد)
  if (path === '/bpdemo') return <Suspense fallback={null}><BpDemo /></Suspense>

  let page
  if (path === '/')              page = <LandingPage />
  else if (path === '/pricing')  page = <PricingPage />
  else if (path === '/welcome')  page = <WelcomePage />
  else if (path === '/terms')    page = <LegalPage type="terms" />
  else if (path === '/privacy')  page = <LegalPage type="privacy" />
  else if (path === '/refund')   page = <LegalPage type="refund" />
  else if (path === '/contact')  page = <LegalPage type="contact" />
  else if (path === '/blog')     page = <BlogPage />
  else if (path === '/thankyou') page = <ThankYouPage />
  else if (path === '/login')    page = <Suspense fallback={null}><LoginScreen /></Suspense>
  else if (path === '/register') page = <Suspense fallback={null}><LoginScreen initialView="register" /></Suspense>
  else                           page = <Suspense fallback={null}><App /></Suspense>

  return <>{page}<CookieConsent /></>
}
