import React, { useEffect } from 'react'
import { C } from '../constants/index.js'
import { buildDemo, makeDemoBag, seedDemoStores } from '../lib/demoData.js'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

import DashboardScreen from '../screens/dashboard/DashboardScreen.jsx'
import WorkersScreen   from '../screens/workers/WorkersScreen.jsx'
import WorkDaysScreen  from '../screens/WorkDaysScreen.jsx'
import FinanceScreen   from '../screens/finance/FinanceScreen.jsx'
import ProjectsScreen  from '../screens/projects/ProjectsScreen.jsx'
import ExpensesScreen  from '../screens/ExpensesScreen.jsx'
import PaymentsScreen  from '../screens/PaymentsScreen.jsx'
import MaterialsScreen from '../screens/MaterialsScreen.jsx'

// ═══════════════════════════════════════════════════════════════════════════
//  DEMO SHOT — يرندر الشاشات الفعلية للتطبيق ببيانات وهمية (بلا باكند ولا دخول)
//  لأخذ سكرينشوتات حقيقية تُركّب داخل بوسترات AdStudio.
//  المسار: /demoshot?screen=dashboard|workdays|workers|finance|projects|expenses|payments|materials
//  مصدر البيانات الموحّد: src/lib/demoData.js (يشاركه الديمو العام /demo).
// ═══════════════════════════════════════════════════════════════════════════

const DEMO = buildDemo()

function Screen({ name }) {
  const props = makeDemoBag(DEMO)
  switch (name) {
    case 'workdays':  return <WorkDaysScreen {...props} />
    case 'workers':   return <WorkersScreen {...props} />
    case 'finance':   return <FinanceScreen {...props} />
    case 'projects':  return <ProjectsScreen {...props} />
    case 'expenses':  return <ExpensesScreen {...props} />
    case 'payments':  return <PaymentsScreen {...props} />
    case 'materials': return <MaterialsScreen {...props} />
    case 'dashboard':
    default:          return <DashboardScreen {...props} />
  }
}

export default function DemoShot() {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('screen') || 'dashboard'
  const focus = params.get('focus')        // نصّ بطاقة لتمريرها لأعلى الشاشة
  const y = params.get('y')                 // أو إزاحة تمرير بالبكسل

  useEffect(() => {
    seedDemoStores(DEMO)
    // تمرير لإظهار البطاقة المطلوبة. نمرّر عدّة مرّات لأن البطاقات الفخمة
    // تتحرّك للداخل (Framer) فيزيح موضعها — وحتى يلتقطه التسجيل (reel) مبكراً.
    if (!focus && !y) return
    const doScroll = () => {
      if (y) { window.scrollTo({ top: Number(y), behavior: 'instant' }); return }
      const el = [...document.querySelectorAll('div, section, h1, h2, h3, span')]
        .find(n => n.children.length < 6 && n.textContent && n.textContent.trim().startsWith(focus))
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    const timers = [700, 1400, 2400, 3600].map(ms => setTimeout(doScroll, ms))
    return () => timers.forEach(clearTimeout)
  }, [focus, y])

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, direction: 'rtl', paddingBottom: 24 }}>
      <ErrorBoundary key={name}>
        <Screen name={name} />
      </ErrorBoundary>
    </div>
  )
}
