# Salary Calculator (Acquisition + Activation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one reusable salary-calculator that doubles as a public lead-magnet (`/calculator`) and the post-signup activation moment, and remove the forced 3.3s splash.

**Architecture:** A pure helper (`computeSalaryPreview`, wrapping the existing `calcSalary`) feeds a shared presentational component `SalaryCalculator`. That component renders in two hosts: a new public page `CalculatorPage` (mode `public`, CTA → register + WhatsApp share) and the existing first-time onboarding gate (mode `onboarding`, CTA → create a real worker). Post-auth navigation is redirected from `/welcome` to `/app` so the splash leaves the critical path.

**Tech Stack:** React 18 + Vite, Zustand, Supabase, Vitest (unit), Lucide icons, Framer Motion. Routing is the manual if/else chain in `src/Router.jsx`. Styling via `C`/`GRAD` from `src/constants/index.js`.

> ⚠️ **This repo is NOT a git repository.** Ignore the "Commit" steps in the standard template — instead each task ends with a **Verify** checkpoint (`npm test` for logic, `npm run build` for compile, browser preview for UI). Do not run `git` commands.
>
> 🔴 **Israeli/Hebrew term rule (CLAUDE.md §19.4):** any Hebrew term (מע"מ etc.) must be written in pure Hebrew letters — never mix Arabic letters in. The salary calculator copy is otherwise pure Arabic + numbers.

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `src/lib/salaryPreview.js` | Pure calc: wrap `calcSalary` → `{dayPay, monthTotal, overtime breakdown}` | **New** |
| `src/lib/salaryPreview.test.js` | Unit tests for the pure calc | **New** |
| `src/components/SalaryCalculator.jsx` | Shared UI: inputs + live result + CTA (modes `public`/`onboarding`) | **New** |
| `src/pages/CalculatorPage.jsx` | Public `/calculator` page (chrome + SEO + WhatsApp share) | **New** |
| `src/Router.jsx` | Add `/calculator` route | Modify |
| `src/lib/seoRoutes.js` | Add `/calculator` SEO entry (indexable) | Modify |
| `src/pages/LandingPage.jsx` | Add hero CTA → `/calculator` | Modify |
| `src/App.jsx` | Pass `addEmployee` to the onboarding gate | Modify |
| `src/screens/onboarding/FirstTimeSetup.jsx` | Embed the calculator as the onboarding hero + save-as-worker | Modify |
| `src/screens/auth/LoginScreen.jsx` | Redirect post-auth `/welcome` → `/app` (remove forced splash) | Modify |

---

## Task 1: Pure salary-preview helper (TDD)

**Files:**
- Create: `src/lib/salaryPreview.js`
- Test: `src/lib/salaryPreview.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/salaryPreview.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeSalaryPreview } from './salaryPreview.js'
import { calcSalary } from './helpers.js'

describe('computeSalaryPreview', () => {
  it('يوم 8 ساعات = الأجر اليومي بلا إضافي', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 8, days: 22 })
    expect(r.dayPay).toBe(400)
    expect(r.monthTotal).toBe(8800)
    expect(r.hasOvertime).toBe(false)
    expect(r.ot125Hours).toBe(0)
    expect(r.ot150Hours).toBe(0)
  })

  it('يوم 10 ساعات يضيف ساعتين ×125%', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 10, days: 22 })
    // 8×50 + 2×50×1.25 = 525
    expect(r.dayPay).toBe(525)
    expect(r.monthTotal).toBe(11550)
    expect(r.regularHours).toBe(8)
    expect(r.ot125Hours).toBe(2)
    expect(r.ot150Hours).toBe(0)
    expect(r.hasOvertime).toBe(true)
  })

  it('يوم 12 ساعة يضيف 2×125% + 2×150%', () => {
    const r = computeSalaryPreview({ dailyWage: 400, hoursPerDay: 12, days: 1 })
    // 400 + 125 + 2×50×1.5(=150) = 675
    expect(r.dayPay).toBe(675)
    expect(r.ot125Hours).toBe(2)
    expect(r.ot150Hours).toBe(2)
  })

  it('يطابق محرّك الرواتب calcSalary بالضبط (فرع الساعات)', () => {
    expect(computeSalaryPreview({ dailyWage: 380, hoursPerDay: 11, days: 1 }).dayPay)
      .toBe(calcSalary(380, 'ساعات', 11))
  })

  it('مدخلات فارغة/سالبة → أصفار بلا انهيار', () => {
    const r = computeSalaryPreview({ dailyWage: '', hoursPerDay: '', days: '' })
    expect(r.dayPay).toBe(0)
    expect(r.monthTotal).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- salaryPreview`
Expected: FAIL — "Failed to resolve import './salaryPreview.js'" / `computeSalaryPreview is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/salaryPreview.js`:

```js
import { calcSalary } from './helpers.js'

// معاينة راتب عامل: راتب يوم واحد (مع ساعات إضافية) × عدد الأيام، + تفصيل الساعات للعرض.
// يعيد استخدام calcSalary (نفس محرّك الرواتب) — لا منطق رواتب مكرّر.
// dayType='ساعات' هو الفرع الذي يطبّق الإضافي: 9-10 ساعة ×1.25، 11+ ×1.5 (helpers.js).
export function computeSalaryPreview({ dailyWage, hoursPerDay, days }) {
  const rate = Number(dailyWage) || 0
  const h    = Number(hoursPerDay) || 0
  const d    = Math.max(0, Math.floor(Number(days) || 0))

  const dayPay     = calcSalary(rate, 'ساعات', h)   // مدوّر داخل calcSalary
  const monthTotal = Math.round(dayPay * d)

  const regularHours = Math.min(Math.max(h, 0), 8)
  const ot125Hours   = Math.max(0, Math.min(h, 10) - 8)
  const ot150Hours   = Math.max(0, h - 10)

  return {
    hourly:      Math.round(rate / 8),
    dayPay,
    monthTotal,
    regularHours,
    ot125Hours,
    ot150Hours,
    hasOvertime: ot125Hours + ot150Hours > 0,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- salaryPreview`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify (no git commit — repo isn't git)**

Run: `npm test` — confirm the full suite still passes (no regressions).

---

## Task 2: Shared `SalaryCalculator` component

**Files:**
- Create: `src/components/SalaryCalculator.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/SalaryCalculator.jsx`:

```jsx
import React, { useState } from 'react'
import { Calculator, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { computeSalaryPreview } from '../lib/salaryPreview.js'
import { fmt } from '../lib/helpers.js'

// حاسبة راتب عامل قابلة لإعادة الاستخدام:
//  mode='public'     → صفحة /calculator (اكتساب)؛ CTA يسجّل المستخدم.
//  mode='onboarding' → الإعداد الأول؛ CTA يحفظ القيم كأول عامل حقيقي.
// onCta يستلم { dailyWage, hoursPerDay, days } (أرقام) ويقرّر المضيف ما يعمل.
export default function SalaryCalculator({ mode = 'public', onCta, ctaLabel, busy = false }) {
  const [dailyWage, setDailyWage]     = useState('400')
  const [hoursPerDay, setHoursPerDay] = useState('10')
  const [days, setDays]               = useState('22')

  const r = computeSalaryPreview({ dailyWage, hoursPerDay, days })

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 12, background: C.surface,
    border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 16, fontWeight: 700,
    fontFamily: 'inherit', textAlign: 'center', outline: 'none',
  }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 6, display: 'block' }

  return (
    <div dir="rtl" style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
      {/* المدخلات */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>الأجر اليومي (₪)</label>
          <input type="number" inputMode="numeric" min="0" value={dailyWage}
            onChange={e => setDailyWage(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>ساعات اليوم</label>
          <input type="number" inputMode="numeric" min="0" max="24" value={hoursPerDay}
            onChange={e => setHoursPerDay(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>عدد الأيام</label>
          <input type="number" inputMode="numeric" min="0" max="31" value={days}
            onChange={e => setDays(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* النتيجة */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${C.primary}14, ${C.surface} 70%)`,
        border: `1px solid ${C.primary}33`, borderRadius: 20, padding: 18, marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 4 }}>راتب الشهر التقديري</div>
        <div style={{ fontSize: 34, fontWeight: 900, color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          ₪{fmt(r.monthTotal)}
        </div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>راتب اليوم الواحد: ₪{fmt(r.dayPay)}</div>

        {r.hasOvertime && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: C.card, borderRadius: 12, border: `1px solid ${C.primary}26` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: C.primary, marginBottom: 6 }}>
              <Clock size={14} strokeWidth={2.4} /> الساعات الإضافية محسوبة تلقائياً
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              {r.regularHours} ساعات عادية
              {r.ot125Hours > 0 && <> · {r.ot125Hours} ساعة ×125%</>}
              {r.ot150Hours > 0 && <> · {r.ot150Hours} ساعة ×150%</>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, color: C.textDim, lineHeight: 1.6 }}>
          + الخصومات والضرائب تُحسب تلقائياً داخل التطبيق.
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onCta?.({ dailyWage: Number(dailyWage) || 0, hoursPerDay: Number(hoursPerDay) || 0, days: Number(days) || 0 })}
        disabled={busy}
        style={{
          width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
          background: busy ? `${C.primary}40` : GRAD.brand, color: '#fff',
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 28px rgba(249,115,22,0.4)',
        }}>
        {mode === 'onboarding' ? <Sparkles size={18} strokeWidth={2.2} /> : <Calculator size={18} strokeWidth={2.2} />}
        {ctaLabel || (mode === 'onboarding' ? 'احفظ كعامل حقيقي وابدأ' : 'سجّل مجاناً واحفظ عمّالك')}
        <ArrowLeft size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (the component is imported next task; this step just checks syntax by building — if not yet imported anywhere, run `npx vite build` is unnecessary, defer the visual check to Task 3). If the build does not yet include the file because nothing imports it, that's fine — proceed.

---

## Task 3: Public `/calculator` page + route + SEO + landing CTA

**Files:**
- Create: `src/pages/CalculatorPage.jsx`
- Modify: `src/Router.jsx` (import + route branch)
- Modify: `src/lib/seoRoutes.js` (add `/calculator` entry)
- Modify: `src/pages/LandingPage.jsx` (hero CTA)

- [ ] **Step 1: Create `src/pages/CalculatorPage.jsx`**

```jsx
import React from 'react'
import { HardHat, ArrowLeft, Share2 } from 'lucide-react'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'
import { trackCtaClick } from '../lib/track.js'
import SalaryCalculator from '../components/SalaryCalculator.jsx'

const C = {
  bg: '#07080F', surface: '#0D0F1C', card: '#12152A', primary: '#F97316',
  text: '#F8FAFC', textDim: '#64748B', border: 'rgba(249,115,22,0.08)', borderMid: 'rgba(249,115,22,0.18)',
}
const GRAD = { brand: 'linear-gradient(135deg, #F97316 0%, #D97706 100%)' }

function shareWhatsApp() {
  trackCtaClick('calculator_share')
  const url = 'https://app.linko.services/calculator'
  const text = `احسب راتب عاملك بالساعات الإضافية مجاناً 👷\n${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export default function CalculatorPage() {
  useRouteSeo('/calculator')

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'inherit' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', position: 'sticky', top: 0, background: `${C.bg}E6`, backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardHat size={20} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>كبلان</span>
        </button>
        <button onClick={() => { trackCtaClick('calculator_nav_login'); navigate('/login') }} style={{ background: 'none', border: `1px solid ${C.borderMid}`, color: C.text, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>دخول</button>
      </nav>

      {/* Hero + calculator */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 18px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 8 }}>
          احسب راتب عاملك بثانية
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, textAlign: 'center', lineHeight: 1.7, marginBottom: 24, maxWidth: 380, marginInline: 'auto' }}>
          الساعات الإضافية (125%/150%) محسوبة تلقائياً حسب قانون العمل الإسرائيلي — مجاناً وبلا تسجيل.
        </p>

        <SalaryCalculator
          mode="public"
          ctaLabel="سجّل مجاناً واحفظ عمّالك"
          onCta={() => { trackCtaClick('calculator_register'); navigate('/register') }}
        />

        <button onClick={shareWhatsApp} style={{ marginTop: 14, width: '100%', maxWidth: 440, marginInline: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Share2 size={16} strokeWidth={2.2} /> شارك الحاسبة عبر واتساب
        </button>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {[['/', 'الرئيسية'], ['/pricing', 'الأسعار'], ['/privacy', 'الخصوصية'], ['/terms', 'الشروط'], ['/contact', 'تواصل']].map(([p, label]) => (
            <button key={p} onClick={() => navigate(p)} style={{ background: 'none', border: 'none', color: C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textDim }}>© {new Date().getFullYear()} كبلان</div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Add the route to `src/Router.jsx`**

Add the import after the `ThankYouPage` import (around `src/Router.jsx:7`):
```jsx
import CalculatorPage from './pages/CalculatorPage.jsx'
```
Add the route branch immediately after the `/pricing` branch (`src/Router.jsx:66`):
```jsx
  else if (path === '/pricing')  page = <PricingPage />
  else if (path === '/calculator') page = <CalculatorPage />
```

- [ ] **Step 3: Add the SEO entry to `src/lib/seoRoutes.js`**

Add this key to the `ROUTE_SEO` object immediately after the `'/pricing'` entry (after `src/lib/seoRoutes.js:76`, before `'/blog'`):
```js
  '/calculator': {
    title: 'حاسبة راتب العامل بالساعات الإضافية | كبلان — مجاناً',
    description:
      'احسب راتب عاملك بثانية: الساعات الإضافية (125%/150%) محسوبة تلقائياً حسب قانون العمل الإسرائيلي. حاسبة مجانية للمقاول العربي في إسرائيل من كبلان.',
    crumb: 'حاسبة الراتب',
  },
```
(No `noindex` → it enters prerender + sitemap automatically.)

- [ ] **Step 4: Add the hero CTA on `src/pages/LandingPage.jsx`**

In the hero CTA row (the `style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}` container ~`src/pages/LandingPage.jsx:634`), add a third button after the existing "شاهد كيف يعمل" button (~line 646):
```jsx
<button onClick={() => goCta('landing_calculator', '/calculator')} className="lp-btn"
  style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}40`, color: C.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '15px 26px', borderRadius: 14 }}>
  احسب راتب عامل مجاناً
</button>
```

- [ ] **Step 5: Verify build + render**

Run: `npm run build`
Expected: build + prerender succeed; prerender output lists `/calculator` among static pages, and sitemap includes it.

Then, with the dev server running, verify the page renders and computes (browser preview): navigate to `http://localhost:3000/calculator`, confirm the كبلان navbar, the calculator with default ₪400/10h/22d showing **₪11,550** and the "2 ساعة ×125%" overtime line, and the "سجّل مجاناً" + "شارك" buttons.

---

## Task 4: Onboarding integration (calculator → first real worker)

**Files:**
- Modify: `src/App.jsx` (pass `addEmployee` to the gate)
- Modify: `src/screens/onboarding/FirstTimeSetup.jsx`

- [ ] **Step 1: Pass `addEmployee` into the onboarding gate (`src/App.jsx`)**

At the FirstTimeSetup early-return (`src/App.jsx:611`), pass `addEmployee` (already in scope from `const { ... addEmployee } = useEmployees(eid)` at line 335):
```jsx
        <FirstTimeSetup language={language} addEmployee={addEmployee} />
```

- [ ] **Step 2: Embed the calculator + save-as-worker in `src/screens/onboarding/FirstTimeSetup.jsx`**

Add the import near the top (after the existing imports):
```jsx
import SalaryCalculator from '../../components/SalaryCalculator.jsx'
```
Update the component signature (line 50) to accept `addEmployee`:
```jsx
export default function FirstTimeSetup({ language = 'ar', addEmployee }) {
```
Add state next to the existing `useState` declarations (after line 56):
```jsx
  const [step, setStep]           = useState('calc')   // 'calc' | 'name'
  const [workerVals, setWorkerVals] = useState(null)
  const [workerName, setWorkerName] = useState('')
```
Add the save handler next to `handleAutoCreate` (after line 70):
```jsx
  async function handleSaveWorker() {
    if (!workerName.trim()) { setErr('اكتب اسم العامل'); return }
    setCreating(true); setErr('')
    try {
      await create({ name: t.default_name, business_type: 'osek_patur' })
      await addEmployee({ name: workerName.trim(), daily_rate: workerVals?.dailyWage || 0 })
      await load()
      useAppStore.getState().celebrate('win', { label: 'تمام! عاملك جاهز' })
    } catch (e) {
      console.error(e); setErr('حدث خطأ — حاول مجدداً'); setCreating(false)
    }
  }
```
Render the calculator as the hero. Inside the main `return (...)` (the non-`manual` branch, after the logo/subtitle block ~line 129, BEFORE the existing "خيار 1" auto button), insert:
```jsx
        {step === 'calc' && (
          <SalaryCalculator
            mode="onboarding"
            ctaLabel="احفظ كعامل حقيقي وابدأ"
            busy={creating}
            onCta={(vals) => { setWorkerVals(vals); setStep('name') }}
          />
        )}

        {step === 'name' && (
          <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.textDim, marginBottom: 8, display: 'block' }}>اسم العامل</label>
            <input autoFocus value={workerName} onChange={e => setWorkerName(e.target.value)}
              placeholder="مثلاً: محمود"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.text, fontSize: 16, fontWeight: 700, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }} />
            <button onClick={handleSaveWorker} disabled={creating}
              style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: creating ? `${C.primary}40` : GRAD.primary, color: '#000', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? 'جاري الحفظ...' : 'تمام، ابدأ'}
            </button>
            <button onClick={() => setStep('calc')} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>رجوع</button>
          </div>
        )}

        {err && <div style={{ color: C.accent, fontSize: 13, textAlign: 'center', marginTop: 12 }}>{err}</div>}

        {/* أو إعداد يدوي — يبقى الخيار القديم متاحاً */}
        <div style={{ textAlign: 'center', margin: '18px 0 8px', fontSize: 12, color: C.textDim }}>أو</div>
```
(The existing "خيار 1" auto-create button and "خيار 2" manual button remain below as the manual fallback. `C`, `GRAD`, `useAppStore`, `create`, `load`, `creating`, `setCreating`, `err`, `setErr`, `t` are all already in scope in this file.)

- [ ] **Step 3: Verify the activation flow**

Run: `npm run build` (must pass).
Browser check (dev server): register a fresh account → confirm you land on the onboarding screen showing the calculator (no /welcome splash after Task 5) → enter wage/hours → "احفظ كعامل حقيقي" → enter a name → "تمام، ابدأ" → confirm a business is created, a worker with that `daily_rate` appears in the Workers screen, and the empty-dashboard gate is gone.

---

## Task 5: Remove the forced 3.3s splash

**Files:**
- Modify: `src/screens/auth/LoginScreen.jsx`

Redirect all 5 post-auth `navigate('/welcome')` sites to `/app`. New accounts (no businesses) hit the onboarding gate inside `App.jsx`; returning users land directly in the app.

- [ ] **Step 1: Passkey path (`src/screens/auth/LoginScreen.jsx:151`)**
```jsx
      navigate('/app')
```
- [ ] **Step 2: PIN path (line 177)**
```jsx
      setTimeout(() => navigate('/app'), 350)
```
- [ ] **Step 3: Password path (line 198)** — change only the success branch:
```jsx
    if (err) { setError(err.message || t('auth.wrongCredentials')) } else { trackLogin('password'); navigate('/app') }
```
- [ ] **Step 4: Team-member path (line 210)**
```jsx
      navigate('/app')
```
- [ ] **Step 5: Registration path (lines 236 and 240)**
```jsx
      if (data?.session) {
        navigate('/app'); return
      }
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password: regPass })
      if (signInData?.session) {
        navigate('/app')
```

- [ ] **Step 6: Verify**

Run: `npm run build` (must pass). Browser: log in with an existing account → confirm you go straight to the app with **no** 3.3s splash. (WelcomePage.jsx is left in the repo but is now off the critical path.)

---

## Task 6 (optional fast-follow): light "log a work-day" nudge

> Lowest priority — ship Tasks 1-5 first. Included for spec completeness (spec §3.3).

**Files:**
- Modify: `src/screens/dashboard/DashboardScreen.jsx`

- [ ] **Step 1: Add a dismissible nudge** shown when the owner has at least one employee but no work-days yet. Near the top of the dashboard content, add:
```jsx
{employees?.length > 0 && (workDays?.length ?? 0) === 0 && localStorage.getItem('cp_hideDayNudge') !== '1' && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${C.primary}12`, border: `1px solid ${C.primary}33`, borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
    <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>سجّل أول يوم عمل تشوف الراتب يتراكم</span>
    <button onClick={() => navigate?.('workers')} style={{ background: GRAD.primary, color: '#000', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>سجّل يوم</button>
    <button onClick={() => { localStorage.setItem('cp_hideDayNudge', '1'); /* force re-render via existing state or location */ }} aria-label="إغلاق" style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 18 }}>×</button>
  </div>
)}
```
(Confirm `employees`, `workDays`, `navigate`, `C`, `GRAD` are in scope in DashboardScreen; if `workDays` isn't passed, gate the nudge only on `employees?.length > 0`. Wire the close button to whatever state triggers a re-render in this screen.)

- [ ] **Step 2: Verify** — `npm run build` passes; the nudge appears for a new account with a worker and no work-days, and dismisses.

---

## Self-Review

**Spec coverage:**
- §1 dual goal (acquisition + activation) → Tasks 3 (public page) + 4 (onboarding). ✓
- §3.1 shared `SalaryCalculator` → Task 2; pure calc → Task 1. ✓
- §3.2 public `/calculator` + CTA→register + WhatsApp share → Task 3. ✓
- §3.3 onboarding convert-to-worker + light nudge → Task 4 + Task 6. ✓
- §3.4 remove splash → Task 5. ✓
- §6 SEO entry (indexable, prerender/sitemap) → Task 3 Step 3. ✓
- §7 unit test matches `calcSalary` → Task 1. ✓

**Placeholder scan:** none — every code step is complete. (Task 6 has two "confirm X is in scope" notes; it is explicitly optional and DashboardScreen wasn't extracted — acceptable, gated behind optional.)

**Type/name consistency:** `computeSalaryPreview({dailyWage,hoursPerDay,days})` returns `{hourly,dayPay,monthTotal,regularHours,ot125Hours,ot150Hours,hasOvertime}` — used consistently in Tasks 1, 2. `addEmployee({name, daily_rate})` and `create({name, business_type})` match the extracted signatures. `'ساعات'` is the confirmed overtime day-type. CTA contract `onCta({dailyWage,hoursPerDay,days})` consistent between component (Task 2) and both hosts (Tasks 3, 4).
