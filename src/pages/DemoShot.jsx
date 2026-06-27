import React, { useEffect, useState } from 'react'
import { C } from '../constants/index.js'
import { buildDemo, makeDemoBag, seedDemoStores } from '../lib/demoData.js'
import { setLanguage } from '../i18n/index.js'
import { useAppStore } from '../store/useAppStore.js'
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

function Screen({ name, lang }) {
  // نمرّر language صريحاً من بارامتر الـURL حتى تُرندَر الشاشات بلغة الإعلان
  // بشكل حتمي (الشاشات تعتمد على prop اسمه language) — بلا انتظار توقيت i18n.
  const props = makeDemoBag(DEMO, { extra: { language: lang || undefined } })
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
  const lang = params.get('lang')           // ar | he | en — لشاشة بلغة الإعلان (موكاب البوسترات العبرية)

  // اضبط اللغة مرّة واحدة قبل أوّل رسم (synchronous — الموارد مُجمّعة) حتى يلتقطها السكرينشوت.
  // نضبط i18n + مخزن التطبيق معاً حتى تُرندَر المكوّنات التي تقرأ اللغة من useAppStore بشكل صحيح.
  useState(() => {
    if (lang === 'he' || lang === 'en' || lang === 'ar') {
      setLanguage(lang)
      useAppStore.getState().setLanguage(lang)
    }
    return null
  })

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
        <Screen name={name} lang={lang} />
      </ErrorBoundary>
    </div>
  )
}
