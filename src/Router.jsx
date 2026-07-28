import React, { useState, useEffect, lazy, Suspense } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import WelcomePage from './pages/WelcomePage.jsx'
import LegalPage   from './pages/LegalPage.jsx'
import BlogPage    from './pages/BlogPage.jsx'
import ThankYouPage from './pages/ThankYouPage.jsx'
import CalculatorPage from './pages/CalculatorPage.jsx'
import VatCalculatorPage from './pages/VatCalculatorPage.jsx'
import CityCalculatorPage from './pages/CityCalculatorPage.jsx'
import CityTradeCalculatorPage from './pages/CityTradeCalculatorPage.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import Celebration from './components/Celebration.jsx'
import { ttPage } from './lib/tiktok.js'
import { pageview } from './lib/analytics.js'
import { crossHostRedirect, isAppHost } from './lib/hosts.js'
import { isWorkerHost, isWorkerPath, workerRedirect } from './lib/workerApp.js'

// التطبيق الكامل lazy — صفحات التسويق (هبوط/أسعار/قانونية) ما تنزّل كود التطبيق
// والـhooks والشاشات معها، فتصغر الحزمة الأولى كثيراً (أداء أسرع على الموبايل).
const App = lazy(() => import('./App.jsx'))
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const AdStudio    = lazy(() => import('./pages/AdStudio.jsx'))
const AdReel      = lazy(() => import('./pages/AdReel.jsx'))
const DemoShot    = lazy(() => import('./pages/DemoShot.jsx'))
const DemoApp     = lazy(() => import('./pages/DemoApp.jsx'))
// بوّابة العامل لها **مدخل HTML مستقل** (`worker.html` → `/worker`) وهو الطريق
// الطبيعي بالإنتاج. هذا الاستيراد شبكة أمان فقط: خادم التطوير (بلا rewrite)
// ومرآة GitHub Pages (بلا rewrite كذلك) يسقطان على `index.html`، فنعرض البوّابة
// هنا بدل ما يهبط العامل على تطبيق المالك.
const WorkerPortalScreen = lazy(() => import('./screens/WorkerPortalScreen.jsx'))

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

  // مشاهدة صفحة (SPA) على القناتين عند كل تنقّل client-side.
  // الإقلاع الأوّل يُحتسب تلقائياً (TikTok page() في الـHTML + GA config page_view)،
  // فنتجاهله هنا لتفادي التكرار، ونطلق الباقي يدوياً لكل تنقّل لاحق.
  const firstPv = React.useRef(true)
  useEffect(() => {
    if (firstPv.current) { firstPv.current = false; return }
    ttPage()          // TikTok PageView
    pageview(path)    // Google Analytics 4 page_view
  }, [path])

  // ─── بوّابة العامل = تطبيق منفصل على نطاق خاص ───────────────────────────────
  // 🔴 **لازم قبل `crossHostRedirect`**: أي دخول للبوّابة (مسار `/worker` أو رابط
  // قديم `?portal`/`?worker`) يُحوَّل **مباشرة** لنطاق البوّابة `worker.kabblan.com`.
  // لو تركناه بعد تقسيم النطاقات لصار تحويلان متتاليان (تسويق → تطبيق → بوّابة).
  // سبب النطاق الفرعي: تصادم scope مع تطبيق المالك — انظر `lib/workerApp.js`.
  const toWorker = workerRedirect({
    hostname: window.location.hostname,
    pathname: path,
    search:   window.location.search,
    hash:     window.location.hash,
    base:     import.meta.env.BASE_URL,
  })
  if (toWorker) { window.location.replace(toWorker); return null }

  // على نطاق البوّابة تُخدَم وثيقة `worker.html` من الخادم، فما بيوصل حدا لهون.
  // شبكة أمان: لو وصل (تطوير/مرآة Pages/إعداد ناقص) نعرض البوّابة بلا مرور المالك.
  if (isWorkerHost(window.location.hostname) || isWorkerPath(path))
    return <Suspense fallback={null}><WorkerPortalScreen /></Suspense>

  // ─── تقسيم النطاقات: تسويق (kabblan.com) × تطبيق (app.kabblan.com) ──────────
  // أي مسار وصل النطاق الغلط يُحوَّل لمكانه الصحيح مع الحفاظ على الـquery والـhash.
  // (بلا تأثير على localhost ومعاينات Vercel — انظر `lib/hosts.js`.)
  const redirectTo = crossHostRedirect({
    hostname: window.location.hostname,
    pathname: path,
    search:   window.location.search,
    hash:     window.location.hash,
  })
  if (redirectTo) { window.location.replace(redirectTo); return null }

  const params = new URLSearchParams(window.location.search)

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

  let page
  // على نطاق التطبيق الجذر `/` بيفتح التطبيق مباشرة — بلا صفحة هبوط.
  if (path === '/' && isAppHost(window.location.hostname))
                                 page = <Suspense fallback={null}><App /></Suspense>
  else if (path === '/')         page = <LandingPage />
  else if (path === '/pricing')  page = <PricingPage />
  else if (path === '/calculator') page = <CalculatorPage />
  else if (path === '/vat-calculator') page = <VatCalculatorPage />
  else if (path.startsWith('/calculator/')) {
    const parts = path.slice(12).split('/').filter(Boolean)
    page = parts.length >= 2
      ? <CityTradeCalculatorPage city={parts[0]} trade={parts[1]} />
      : <CityCalculatorPage slug={parts[0] || ''} />
  }
  else if (path === '/welcome')  page = <WelcomePage />
  else if (path === '/terms')    page = <LegalPage type="terms" />
  else if (path === '/privacy')  page = <LegalPage type="privacy" />
  else if (path === '/refund')   page = <LegalPage type="refund" />
  else if (path === '/contact')  page = <LegalPage type="contact" />
  else if (path === '/delete-account') page = <LegalPage type="delete-account" />
  else if (path === '/blog')     page = <BlogPage />
  else if (path === '/thankyou') page = <ThankYouPage />
  else if (path === '/login')    page = <Suspense fallback={null}><LoginScreen /></Suspense>
  else if (path === '/register') page = <Suspense fallback={null}><LoginScreen initialView="register" /></Suspense>
  else                           page = <Suspense fallback={null}><App /></Suspense>

  return <>{page}<CookieConsent /><Celebration /></>
}
