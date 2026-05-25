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

---

## هيكل المجلدات

```
src/
├── ui/                  ← مكتبة التصميم الداخلية
├── store/
│   ├── useAppStore.js       ← navigation, toasts, modals, language
│   └── useBusinessStore.js  ← multi-business (load/create/update/remove)
├── screens/
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
├── hooks/
├── lib/                 ← supabase, utils, calculations, storage
└── constants/           ← colors, gradients, nav, EXP_CATS, VAT, etc.
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

## قواعد التطوير

1. **لا prop drilling** — كل الـ state العام عبر Zustand
2. **الأيقونات** من Lucide فقط — ممنوع إيموجي في UI
3. **الاتجاه** RTL دائماً، اللغة عربية
4. **Hebrew strings داخل JSX** تُكتب بـ `{'מע"מ'}` لتجنب كسر الـ JSX بسبب `"`
5. **الـ commit** بعد كل phase أو task مكتمل
6. **لا كسر** للـ screens القديمة قبل ما تُبنى البديل

---

## الحالة الحالية

- Branch التطوير: `claude/finance-accounting-updates-P7s9n`
- مُدمج في: `main`
- آخر إنجاز: Finance Module كامل (Phase 0–5) ✅
