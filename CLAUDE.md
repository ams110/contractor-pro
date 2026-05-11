# Contractor Pro — CLAUDE.md

> هذا الملف يُقرأ تلقائياً في كل محادثة جديدة. يحتوي على كل السياق اللازم للمتابعة.

---

## المشروع

**الاسم:** Contractor Pro  
**الوصف:** تطبيق إدارة مقاولات موبايل-فيرست — يعمل حالياً في production  
**Stack:** React 18 + Vite + Supabase + Tailwind CSS  
**الفرع الحالي:** `claude/claude-environment-setup-9UQdw`  
**الاتجاه:** Premium Dark UI بمستوى $10,000+ (مثل Vercel/Stripe)  
**اتجاه التطبيق:** RTL (عربي) + موبايل-فيرست (max-width: 430px)

---

## المكتبات المثبتة (كاملة)

### UI & Styling
- `tailwindcss` v3 + `tailwindcss-animate` + `postcss` + `autoprefixer`
- `tailwind-merge` + `clsx` + `class-variance-authority`
- `lucide-react` — أيقونات SVG
- `sonner` — Toast notifications
- `vaul` — Mobile Drawer
- `cmdk` — Command Palette

### Radix UI Components
- `@radix-ui/react-dialog`, `dropdown-menu`, `select`, `tooltip`, `popover`
- `@radix-ui/react-tabs`, `switch`, `checkbox`, `slider`, `progress`
- `@radix-ui/react-avatar`, `separator`, `label`, `toast`

### Animation
- `framer-motion` — الأساسي
- `gsap` — للـ animations المعقدة
- `@react-spring/web` — فيزيائي
- `@formkit/auto-animate` — تلقائي
- `lottie-react` — JSON animations

### 3D
- `three` + `@react-three/fiber` + `@react-three/drei`
- `@splinetool/react-spline`

### Data
- `@tanstack/react-query` — Data fetching & caching
- `@tanstack/react-table` — جداول بيانات
- `@tanstack/react-virtual` — Virtual lists
- `date-fns` — معالجة التواريخ
- `recharts` — Charts (موجود من قبل)

### Forms
- `react-hook-form` + `zod` + `@hookform/resolvers`

### Security
- `crypto-js` — AES encryption
- `tweetnacl` — NaCl cryptography
- `jose` — JWT
- `bcryptjs` — Password hashing

### Backend & Payments
- `@supabase/supabase-js`
- `@paddle/paddle-js`
- `@simplewebauthn/browser`

---

## ما تم بناؤه حتى الآن

### ✅ مكتمل
- `src/index.css` — Tailwind directives + design tokens + utility classes
- `tailwind.config.js` — theme كامل بألوان المشروع
- `src/lib/cn.js` — utility function (clsx + tailwind-merge)
- `src/ui/Button.jsx` — 5 variants (primary, secondary, ghost, danger, gradient)
- `src/ui/Card.jsx` + CardHeader + CardTitle + CardBody
- `src/ui/Input.jsx` + Select
- `src/ui/Badge.jsx` — 7 variants
- `src/ui/StatCard.jsx` — مع Framer Motion
- `src/ui/Modal.jsx` — مع animations
- `src/ui/index.js` — exports
- `src/screens/LoginScreen.jsx` — مُعاد بناؤه بالكامل (Tailwind + Lucide + Framer Motion)
- `src/App.jsx` — App shell محدّث (Header + Nav + Toaster + Onboarding)

### 🔄 ما زال قديماً (inline styles) — مطلوب إعادة بناء
- `DashboardScreen.jsx` — 639 سطر، 137 inline style
- `ProjectsScreen.jsx` — 1239 سطر
- `WorkersScreen.jsx` — 754 سطر
- `WorkDaysScreen.jsx` — 1092 سطر
- `ExpensesScreen.jsx` — 381 سطر
- `PaymentsScreen.jsx` — 502 سطر
- `AccountingScreen.jsx` — 569 سطر
- `SettingsScreen.jsx` — 768 سطر
- `UnitTrackerScreen.jsx` — 871 سطر
- `WorkerPortalScreen.jsx` — 1337 سطر
- `components/index.jsx` — 355 سطر (قديم، يُستبدل تدريجياً)

---

## الهيكل الجديد المتفق عليه

### Navigation — 5 Tabs بدل 10
```
📊 الرئيسية | 🏗️ المشاريع | 👷 العمال | 💰 المالية | ⚙️ الإعدادات
```

### التدرج الداخلي
```
🏗️ المشاريع
 └── قائمة المشاريع
      └── تفاصيل مشروع (Tabs داخلية)
           ├── أيام العمل
           ├── المصاريف
           ├── الإيصالات / القبضات
           ├── البضاعة
           └── تتبع الوحدات

👷 العمال
 └── قائمة العمال
      └── تفاصيل عامل (Tabs داخلية)
           ├── أيام العمل
           ├── الرواتب
           └── السلف

💰 المالية
 ├── المصاريف الكلية
 ├── الرواتب الكلية
 └── المحاسبة والضرائب
```

### هيكل المجلدات الجديد
```
src/
├── ui/                          ✅ موجود
├── screens/
│   ├── dashboard/
│   │   └── DashboardScreen.jsx
│   ├── projects/
│   │   ├── ProjectsScreen.jsx
│   │   ├── ProjectDetailScreen.jsx   ← جديد
│   │   └── components/
│   │       ├── ProjectWorkDays.jsx
│   │       ├── ProjectExpenses.jsx
│   │       ├── ProjectReceipts.jsx
│   │       ├── ProjectMaterials.jsx
│   │       └── ProjectUnitTracker.jsx
│   ├── workers/
│   │   ├── WorkersScreen.jsx
│   │   ├── WorkerDetailScreen.jsx    ← جديد
│   │   └── components/
│   │       ├── WorkerWorkDays.jsx
│   │       ├── WorkerPayments.jsx
│   │       └── WorkerAdvances.jsx
│   ├── finance/
│   │   ├── FinanceScreen.jsx         ← جديد
│   │   ├── ExpensesScreen.jsx
│   │   ├── PaymentsScreen.jsx
│   │   └── AccountingScreen.jsx
│   ├── settings/
│   │   └── SettingsScreen.jsx
│   └── auth/
│       └── LoginScreen.jsx           ✅ منتهي
├── store/                            ← Zustand (لم يُنشأ بعد)
│   └── useAppStore.js
├── hooks/                            ✅ موجود (لا تغيير)
├── lib/                              ✅ موجود
├── pages/                            ✅ موجود (Landing + Pricing)
└── constants/                        ✅ موجود
```

---

## خطة العمل — المراحل

| المرحلة | المهمة | الحالة |
|---------|--------|--------|
| **0** | الأساس: Zustand + هيكل مجلدات + تحديث NAV | ⏳ التالية |
| **1** | Dashboard جديد | ⏳ |
| **2أ** | Projects List | ⏳ |
| **2ب** | Project Detail + Tabs داخلية | ⏳ |
| **3أ** | Workers List | ⏳ |
| **3ب** | Worker Detail + Tabs | ⏳ |
| **4** | Finance Screen (موحّد) | ⏳ |
| **5** | Settings + تنظيف الملفات القديمة | ⏳ |

---

## قاعدة العمل الذهبية

> **"Build Beside, Then Replace"**  
> التطبيق يبقى يعمل في كل لحظة.  
> نبني الشاشة الجديدة بجانب القديمة، نختبرها، ثم نستبدل.

---

## Design System — الألوان

```js
bg:        '#07090D'   // الخلفية الرئيسية
surface:   '#0D1117'   // السطح
card:      '#131920'   // الكارد
primary:   '#00DDB3'   // الأخضر المائي
secondary: '#6366F1'   // البنفسجي
success:   '#22C55E'
warning:   '#EAB308'
danger:    '#F43F5E'
text:      '#F8FAFC'
textDim:   '#64748B'
```

---

## للبدء في محادثة جديدة

قل لكلود:
> "اقرأ CLAUDE.md وابدأ من المرحلة [رقم المرحلة]"
