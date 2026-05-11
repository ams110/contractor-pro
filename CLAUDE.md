# CLAUDE.md — Contractor Pro

تطبيق إدارة مقاولات، موبايل-فيرست (RTL عربي)، مبني على React + Vite + Supabase.
الـ branch الحالي: `claude/redesign-app-branding-MCX7E` — إعادة تصميم شاملة للهوية البصرية.

---

## الهوية البصرية

**الثيم:** Amber Gold Dark
- Background: `#07080C`
- Primary: `#F59E0B` (amber)
- Secondary: `#F97316` (orange)
- Accent: `#EF4444` (red)
- Brand Gradient: `linear-gradient(135deg, #FBBF24, #F59E0B, #EF4444)`
- الأيقونات: Lucide React (لا إيموجي)

---

## المكتبات المستهدفة

### UI / Styling
- Tailwind CSS
- Lucide React ✅ (مثبتة)
- Sonner (toast notifications)
- Vaul (drawer/bottom sheets)
- CMDK (command palette / بحث)

### Radix UI
- Dialog, Dropdown, Select, Tooltip, Tabs, Switch, Checkbox, Slider, Progress, Avatar, Toast

### Animation
- Framer Motion
- GSAP
- React Spring
- Auto Animate
- Lottie

### 3D (اختياري / للـ landing page)
- Three.js + React Three Fiber + Drei + Spline

### Data / State
- Zustand (global state — يحل محل prop drilling في App.jsx)
- TanStack Query + Table + Virtual
- date-fns
- Recharts ✅ (مثبتة)

### Forms
- React Hook Form + Zod

### Security (موجودة)
- crypto-js, tweetnacl, jose, bcryptjs

### Backend
- Supabase ✅
- Paddle ✅
- PWA ✅

---

## هيكل المجلدات المستهدف

```
src/
├── ui/                  ← مكتبة التصميم الداخلية
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   ├── Badge.jsx
│   ├── Modal.jsx
│   └── StatCard.jsx
├── store/               ← Zustand stores
│   ├── useAppStore.js   ← navigation, toasts, modals
│   └── useDataStore.js  ← projects, workers, etc.
├── screens/             ← الشاشات الرئيسية (موجودة، ستُعاد كتابتها تدريجياً)
├── components/          ← مكونات مشتركة
├── hooks/               ← hooks موجودة
├── lib/                 ← supabase, utils
└── constants/           ← colors, gradients, nav
```

---

## هيكل التنقل الجديد (5 tabs)

| Tab | الأيقونة | الشاشة |
|-----|----------|--------|
| الرئيسية | LayoutDashboard | Dashboard |
| المشاريع | Building2 | Projects |
| العمال | Users | Workers |
| المالية | Wallet | Accounting (موحدة) |
| المزيد | Grid3x3 | Settings + الباقي |

---

## خطة البناء (Phases)

### Phase 0 — الأساس ✅ مكتمل
- [x] تثبيت lucide-react
- [x] تثبيت Framer Motion + Tailwind CSS
- [x] تحديث constants (Amber Gold theme)
- [x] تحديث Nav إلى 5 tabs

### Phase 1 — Dashboard ✅ مكتمل
- [x] إعادة تصميم DashboardScreen بالهوية الجديدة

### Phase 2أ — قائمة المشاريع ✅ مكتمل
- [x] ProjectsScreen الجديدة

### Phase 2ب — تفاصيل المشروع ✅ مكتمل
- [x] أيام عمل + مصاريف + إيصالات + بضاعة + تتبع وحدات

### Phase 3أ — قائمة العمال ✅ مكتمل
- [x] WorkersScreen الجديدة

### Phase 3ب — تفاصيل العامل ✅ مكتمل
- أيام + رواتب + سلف

### Phase 4 — شاشة المالية الموحدة ✅ مكتمل
- [x] PaymentsScreen محدثة بالهوية الجديدة
- [x] ExpensesScreen محدثة مع Lucide + CAT_ICONS
- [x] AccountingScreen محدثة

### Phase 5 — الإعدادات + تنظيف ✅ مكتمل
- [x] SettingsScreen محدثة بالكامل
- [x] تنظيف إيموجي من جميع الشاشات (WorkDaysScreen, ActivityScreen, LoginScreen, MaterialsScreen, UnitTrackerScreen, WorkerPortalScreen, team/*)
- [x] تنظيف مكونات مشتركة (NotificationsPanel, SearchOverlay, TaxDashboard, WorkerStatsPanel)

---

## قواعد التطوير

1. **لا prop drilling** — كل الـ state العام يمر عبر Zustand
2. **كل مكوّن جديد** يستخدم مكونات `src/ui/` لا inline styles مباشرة
3. **الأيقونات** من Lucide فقط — ممنوع استخدام إيموجي في UI
4. **الاتجاه** RTL دائماً، اللغة عربية
5. **الـ commit** بعد كل phase أو task مكتمل
6. **لا كسر** للـ screens القديمة قبل ما تُبنى البديل

---

## الحالة الحالية للـ Branch

- Branch: `claude/redesign-app-branding-MCX7E`
- آخر commit: Phase 5 مكتمل — تنظيف إيموجي كامل + Lucide في جميع الملفات
- **جميع الـ Phases مكتملة ✅**
