# CLAUDE.md — Contractor Pro

تطبيق إدارة مقاولات، موبايل-فيرست (RTL عربي)، مبني على React + Vite + Supabase.

---

## الهوية البصرية

**الثيم:** Amber Gold Dark
- Background: `#07080C`
- Primary: `#F59E0B` (amber)
- Secondary: `#F97316` (orange)
- Accent: `#EF4444` (red)
- Success: `#22C55E`
- Warning: `#F59E0B`
- Brand Gradient: `linear-gradient(135deg, #FBBF24, #F59E0B, #EF4444)`
- الأيقونات: Lucide React (لا إيموجي)

---

## المكتبات المستخدمة

### UI / Styling
- Tailwind CSS
- Lucide React ✅
- Framer Motion ✅
- Recharts ✅

### Data / State
- Zustand ✅ (`useAppStore`, `useBusinessStore`)
- Supabase ✅
- Paddle ✅
- PWA ✅

### Security (موجودة)
- crypto-js, tweetnacl, jose, bcryptjs

### Testing
- Vitest ✅ (`npm test` — unit)
- Playwright ✅ (`npm run test:e2e` — E2E متصفح حقيقي)
- Playwright MCP ✅ (مُعرّف في `.mcp.json` — كلود يقود متصفح حقيقي)

---

## هيكل المجلدات

```
src/
├── Router.jsx           ← توجيه client-side (/, /login, /register, /pricing, /welcome, /app)
├── App.jsx              ← التطبيق بعد تسجيل الدخول (الـ 5 tabs)
├── ui/                  ← مكتبة التصميم الداخلية
├── i18n/                ← الترجمة (ar / he / en) — افتراضي ar
├── pages/               ← صفحات عامة قبل الدخول
│   ├── LandingPage.jsx      ← صفحة الهبوط التسويقية
│   ├── PricingPage.jsx      ← الأسعار (Paddle)
│   └── WelcomePage.jsx      ← ترحيب بعد الدخول
├── store/
│   ├── useAppStore.js       ← navigation, toasts, modals, language
│   ├── useBusinessStore.js  ← multi-business (load/create/update/remove)
│   └── useDataStore.js      ← بيانات التطبيق (projects, workers, ...)
├── screens/
│   ├── auth/
│   │   └── LoginScreen.jsx  ← دخول + تسجيل + passkey/PIN + عضو فريق
│   ├── finance/
│   │   ├── FinanceScreen.jsx      ← الشاشة الرئيسية + tabs
│   │   ├── BusinessSetup.jsx      ← onboarding أول مرة
│   │   ├── BusinessSwitcher.jsx   ← dropdown تبديل المصالح
│   │   ├── BusinessEditSheet.jsx  ← تعديل / حذف مصلحة
│   │   ├── IncomeTab.jsx          ← المدخولات
│   │   ├── ExpenseTab.jsx         ← المصاريف + מע"מ
│   │   ├── InvoiceArchiveTab.jsx  ← أرشيف الفواتير
│   │   ├── PayrollTab.jsx         ← قسائم الرواتب
│   │   └── TaxSummaryTab.jsx      ← ملخص الضرائب والأرباح
│   └── ...
├── hooks/               ← useAuth, useTeam, useOrganization, ...
├── lib/                 ← supabase, utils, calculations, storage, paddle
└── constants/           ← colors, gradients, nav, EXP_CATS, VAT, etc.

tests/
└── e2e/                 ← اختبارات Playwright (landing, navigation, auth-forms)
```

---

## هيكل التنقل (5 tabs)

| Tab | الأيقونة | الشاشة |
|-----|----------|--------|
| الرئيسية | LayoutDashboard | Dashboard |
| المشاريع | Building2 | Projects |
| العمال | Users | Workers |
| المالية | Wallet | FinanceScreen |
| المزيد | Grid3x3 | Settings |

---

## شاشة المالية — Finance Module ✅ مكتمل

### Tabs داخل FinanceScreen

| Tab id | الأيقونة | المحتوى |
|--------|----------|---------|
| `income` | TrendingUp | مدخولات |
| `bizexp` | TrendingDown | مصاريف + מע"מ |
| `archive` | FolderOpen | أرشيف الفواتير |
| `payroll` | Banknote | قسائم الرواتب |
| `taxsummary` | BarChart3 | ملخص الضرائب والأرباح |
| `payments` | Banknote | رواتب العمال (قديم) |
| `accounting` | Calculator | محاسبة (قديم) |

### Supabase Tables المضافة

| الجدول | الوصف |
|--------|-------|
| `businesses` | المصالح التجارية (osek_patur / osek_moreh / hevra) |
| `income_entries` | المدخولات |
| `expense_entries` | المصاريف + مبلغ مع"מ |
| `invoice_archive` | أرشيف الفواتير / إثباتات الدفع |
| `payroll_slips` | قسائم الرواتب |

### منطق VAT / ضرائب
- **עוסק פטור**: لا مع"מ — تحذير عند 70% و90% من حد ₪120,000
- **עוסק מורשה / חברה**: مع"מ 18% على المدخولات، خصم جزئي على المصاريف حسب الفئة
- خصومات مع"מ: مواد/أدوات 100% · وقود/مركبات 67% · رواتب/تأمين 0%
- ضريبة الدخل: شرائح إسرائيلية 2024 (10%→47%) أو 23% ثابتة للشركات
- ביטוח לאומי: 10.5% للأفراد

---

## ما تم إنجازه (مُدمج في main)

### إعادة التصميم (Redesign)
- [x] هوية بصرية Amber Gold Dark كاملة
- [x] Nav 5 tabs
- [x] Dashboard, Projects, Workers, Finance, Settings
- [x] تنظيف إيموجي — Lucide في كل مكان
- [x] تأمين: RLS, storage hardening, rate-limiting

### Finance Module
- [x] Phase 0 — businesses table + onboarding + switcher
- [x] Phase 1 — income entries (مدخولات)
- [x] Phase 2 — expense entries (مصاريف + مع"מ)
- [x] Phase 3 — invoice archive (أرشيف الفواتير)
- [x] Phase 4 — payroll slips (قسائم الرواتب + طباعة)
- [x] Phase 5 — tax & profit summary (ملخص الضرائب والأرباح)

---

## الاختبارات — Testing ✅

### Playwright MCP (تفاعلي — كلود يقود متصفح حقيقي)
- مُعرّف في `.mcp.json` تحت اسم `playwright`.
- لما تشغّل `npm run dev` (port 3000) وكلود كود على الجهاز، بيقدر يفتح متصفح حقيقي،
  يضغط أزرار، يعبّي فورمات، يتنقّل بين الصفحات زي مستخدم بشري، ويعطيك تقرير بالأخطاء.

### اختبارات E2E الجاهزة (`tests/e2e/`)
- `@playwright/test` + `playwright.config.js` — يشغّل Vite dev server تلقائياً،
  ويختبر على viewport موبايل (Pixel 7) + ديسكتوب، locale عربي RTL.
- التغطية الحالية **client-side فقط** (تنقّل + تحقّق فورمات) — لا تلمس الباكند،
  فتعمل بدون إعداد Supabase:
  | الملف | التغطية |
  |------|---------|
  | `landing.spec.js`    | صفحة الهبوط: العنوان، الأزرار، الإحصائيات |
  | `navigation.spec.js` | التنقّل: دخول / تسجيل / أسعار |
  | `auth-forms.spec.js` | فورمات الدخول والتسجيل + تبديل اللغة + تحقّق |

### الأوامر
```bash
npm test              # Vitest (unit)
npm run test:e2e      # Playwright (كل الاختبارات)
npm run test:e2e:ui   # واجهة تفاعلية
```
> أي فلو يلمس الباكند فعلياً (دخول حقيقي، إضافة عامل، حفظ مصروف) يحتاج مستخدم/بيئة تجريبية.
> تفاصيل أكمل في `docs/TESTING.md`.

---

## قواعد التطوير

1. **لا prop drilling** — كل الـ state العام عبر Zustand
2. **الأيقونات** من Lucide فقط — ممنوع إيموجي في UI
3. **الاتجاه** RTL دائماً، اللغة عربية
4. **Hebrew strings داخل JSX** تُكتب بـ `{'מע"מ'}` لتجنب كسر الـ JSX بسبب `"`
5. **الـ commit** بعد كل phase أو task مكتمل
6. **لا كسر** للـ screens القديمة قبل ما تُبنى البديل
7. **الاختبارات** — حدّث/أضف اختبار E2E في `tests/e2e/` عند تغيير فلو واجهة مهم

---

## الحالة الحالية

- Branch الرئيسي: `main`
- آخر إنجاز: Playwright MCP + اختبارات E2E (PR #101 — مُدمج في main) ✅
- المصادقة: WebAuthn passkey حقيقي server-side عبر Supabase edge functions + PIN + عضو فريق
- Vercel: مُنشور تلقائياً عند كل push لـ main
- الإصدار الحالي: يتزايد تلقائياً عند كل `npm run build` (prebuild hook)

> ملاحظة CI: في تكامل **Cloudflare Workers** على الريبو بيفشل (ما في `wrangler` config —
> المشروع بينشر على Vercel). الفشل خارجي ومش مرتبط بالكود.
