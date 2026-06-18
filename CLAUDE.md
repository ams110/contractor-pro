# CLAUDE.md — Contractor Pro

تطبيق إدارة مقاولات إسرائيلي، **موبايل-فيرست (RTL عربي)**، مبني على **React 18 + Vite 5 + Supabase**.
يغطّي: المشاريع، العمّال، أيام العمل، المصاريف، المقبوضات، الرواتب، الضرائب (מע"מ + ضريبة دخل + ביטוח לאומי)،
فريق متعدّد الصلاحيات، بوّابة عامل ذاتية، اشتراكات Paddle، وتحليلات مالية ذكية.

> هذا الملف هو المرجع الكامل لأي محادثة جديدة. اقرأه أولاً قبل أي تعديل.

---

## 1. الأوامر الأساسية

```bash
npm run dev           # Vite dev server على المنفذ 3000
npm run build         # prebuild يرفع رقم الإصدار تلقائياً ثم vite build (PWA)
npm run preview       # معاينة بناء الإنتاج
npm test              # Vitest (اختبارات الوحدة) — يستثني tests/e2e (انظر §18)
npm run lint          # ESLint على src
npm run test:e2e      # Playwright E2E (يشغّل dev server تلقائياً)
npm run test:e2e:ui   # واجهة Playwright التفاعلية
npm run demo:shots    # لقطات شاشات التطبيق الدعائية من /demoshot (هاتف، PNG 4x) — يحتاج dev server
npm run ads:shots     # بوسترات إعلانية من /adstudio (square/portrait/story، PNG 2x) — يحتاج dev server
```

> 🎬 **صور دعائية**: استعمل سكِيل **`promo-shots`** (تفاعلي — بيسألك شو بدك ثم يولّد ويبعت).
> السكربتان وراءه: `scripts/demo-shots.mjs` (شاشات `/demoshot`) و`scripts/ad-shots.mjs` (بوسترات `/adstudio`).
> كلاهما يخصَّص بمتغيّرات بيئة (`SCREENS`/`IDEAS`/`SIZES`/`DPR`/`FORMAT`/`QUALITY`) — التفاصيل براس كل سكربت.

- **Node**: 20 (في CI). **Package manager**: npm.

---

## 2. الهوية البصرية — Amber/Orange Dark

المصدر الموثوق: `src/constants/index.js` (كائن `C` للألوان و`GRAD` للتدرّجات). **استعملهم دائماً بدل قيم hard-coded.**

| دور | المتغيّر | القيمة |
|-----|----------|--------|
| الخلفية | `C.bg` | `#07080F` |
| سطح | `C.surface` | `#0D0F1C` |
| بطاقة | `C.card` | `#12152A` |
| Primary (برتقالي — طاقة) | `C.primary` | `#F97316` |
| Secondary (بنفسجي — احترافية) | `C.secondary` | `#7C3AED` |
| Gold | `C.gold` | `#D97706` |
| Cyan (تقنية) | `C.cyan` | `#06B6D4` |
| Success | `C.success` | `#22C55E` |
| Warning | `C.warning` | `#EAB308` |
| Accent (أحمر — خطر) | `C.accent` | `#EF4444` |
| نص | `C.text` | `#F8FAFC` |
| نص خافت | `C.textDim` | `#64748B` |
| حدود (برتقالية شفّافة) | `C.border` / `C.borderMid` | `rgba(249,115,22,0.08)` / `0.18` |

**التدرّجات** (`GRAD`): `primary`=برتقالي→أحمر · `premium`=بنفسجي→أزرق · `gold` · `success`=أخضر→سماوي · `danger` · `cyan` · `warm` · `purple` · `blue`.

**قواعد التصميم**: أيقونات **Lucide React** فقط (ممنوع إيموجي في UI). أوزان خط ثقيلة (700–900)، `letter-spacing` ضيّق (-0.02em). طبقات ألوان: لون أساسي + `18` (خلفية ناعمة) + `28` (حدود) + `45` (توهّج). حركات **Framer Motion** بـ spring (stiffness 340/damping 30 للـ sheets، 400/20 للبطاقات، 400/17 للأزرار).

### 2.1 لغة «البطاقة الفخمة» (Premium Card DNA)

اللغة البصرية الموحّدة لبطاقات الرؤى الكبيرة. مرجعها الحيّ: `BusinessPulse.jsx`، `CashForecast.jsx`، `NetWorth.jsx`، `CommandCenter.jsx`، و`DashboardScreen.jsx`. **أي بطاقة/لوحة جديدة لازم تتبع هالنمط** بدل اختراع شكل جديد.

- **خريطة النبرة `TONE`** (تُكرَّر محلياً في كل مكوّن — هاد النمط القائم): `excellent→success` · `good→cyan` · `fair→warning` · `weak→primary` · `critical→accent`. كل نبرة لها `main` (اللون) + `soft` (`rgba` ~0.14) + `glow` (`rgba` ~0.45). نبرة الرؤى الداخلية: `warn→accent` · `tip→cyan` · `good→success`.
- **القشرة**: `position:relative; overflow:hidden`، خلفية `linear-gradient(135deg, ${accent}14, ${C.surface} 70%)` (أو `tone.soft`)، حدّ `1px solid ${accent}2e–33`، `borderRadius` **18–22**، حشوة `16–18px`، `marginBottom:12`. + **وميض دائري** بالزاوية: عنصر `absolute` 150–180px، `radial-gradient(circle, glow, transparent 70%)`، `opacity:0.35–0.4`، `insetInlineEnd/Start:-40`. + دخول `initial{opacity:0,y:14–18}→animate{opacity:1,y:0}` مدّة ~0.5s.
- **الرأس**: شريحة أيقونة 30×30 (`borderRadius:10`، خلفية `tone.soft`، حدّ `main44`) **متحرّكة** (نبض scale أو rotate لانهائي)، + عنوان 14/900، + سطر فرعي 10 `textDim`، + شارة حالة على الطرف المقابل (حشوة `4px 9px`، `radius:9`، خلفية `main16`، حدّ `main3a`).
- **الأرقام**: عدّاد تصاعدي `useCountUp` (easeOutCubic، RAF)، `fontVariantNumeric:'tabular-nums'`، وزن 900، إشارة سالب **صريحة `−`** قبل `₪`.
- **صفوف الرؤى الداخلية**: خلفية `C.card`، حدّ `${color}26`، `radius:13`، حشوة `10px 12px`، + شريحة أيقونة 28×28 (`color1c`/`color33`) + نصّ 12 `lineHeight:1.5` + `ChevronLeft` 15 `textDim` للقابل للنقر.
- **الـkit الرسمي المشترك = `src/ui/Premium.jsx`** ويستعمله ~21 ملف (ProjectCard, WorkerCard, ReceiptCard, WorkDayTicket, وأغلب الشاشات). صادراته: `TONES` + `toneFromColor(color)` · `IconChip` (مع `pulse`) · `PremiumCard` (القشرة كاملة بالوميض والدخول) · `PremiumStat` (بطاقة إحصائية) · `HolographicSheen` (لمعة قطرية). **لأي بطاقة/إحصائية جديدة: استورد من هون بدل إعادة الكتابة.**

> ⚠️ تنبيه ازدواجية قائمة: المكوّنات الفخمة الكبيرة (`BusinessPulse`/`CashForecast`/`NetWorth`/`CommandCenter`) و`DashboardScreen.jsx` ما زالت تُعرّف نسخاً **محليّة** من `TONE`/`useCountUp`/القشرة (سبقت `ui/Premium.jsx`). الاتّجاه المعتمد: توحيدها تدريجياً على `ui/Premium.jsx`. لا تنسخ نمطاً محليّاً جديداً — استعمل الـkit.

### 2.2 أيقونات التطبيق (App Icons) — مولّدة، مصدر واحد

شعار التطبيق = **خوذة بناء `HardHat` (Lucide) بيضاء على تدرّج `GRAD.brand` (`linear-gradient(135deg, #F97316, #DC2626)`) بزوايا مدوّرة** — نفس لوغو صفحة الهبوط (`LandingPage.jsx`) بالضبط.

- **المولِّد**: `generate_icon.py` (بايثون + `cairosvg` + `Pillow`). شغّله بعد أي تغيير شكلي: `python3 generate_icon.py`. يرسم كل حجم **متّجهياً من الصفر** (لا تكبير صورة) → كل المقاسات حادّة 100%.
- 🔴 **قاعدة حاسمة — لا تنسخ مسارات الأيقونة يدوياً أبداً.** المولِّد **يقرأ شكل الخوذة وقت التوليد من نفس مصدر التطبيق**: `node_modules/lucide-react/dist/esm/icons/hard-hat.mjs` (دالة `load_hardhat_inner` تفكّك `__iconNode`). هيك الأيقونة دايماً = خوذة `<HardHat/>` المرسومة بالـUI، وتتعقّب أي تحديث Lucide تلقائياً عند إعادة التوليد. **سبب الوجود**: سابقاً كانت المسارات منسوخة بالإيد فتعتّقت واختلفت عن lucide-react → طلعت خوذة مشوّهة (قبّة طايرة فوق حافّة منفصلة). لا تُرجِع هذا الغلط.
- **المخرجات** (في `public/`): عادية `purpose:any` → `icon-1024` (المتاجر) · `pwa-512/384/192` · `apple-touch-icon` 180 · `icon-167/152/120` (iPad/iPhone). + **maskable** لأندرويد → `maskable-512/192` (`make_maskable_svg`: **تدرّج ملء الإطار بلا زوايا مدوّرة** + الخوذة داخل **منطقة الأمان ~80%** فلا تُقصّ تحت قناع المشغّل الدائري). + `badge-96` (سيلويت مصمت مخصّص للإشعارات، `make_badge_svg`) + `favicon.ico` (16/32/48).
- ⚠️ **maskable لازم تظل full-bleed** (بلا `rx`/زوايا) والخوذة صغيرة بالنص — **ممنوع توجيه `purpose:maskable` لأيقونة مدوّرة مثل `pwa-512`** (تنقصّ تحت القناع).
- **التوصيل**: `vite.config.js` → `manifest.icons` (3 عادية + 2 maskable) · `index.html` → روابط `favicon` + `apple-touch-icon` بمقاسات iOS. عند إضافة/إزالة حجم: حدّث المولِّد **و** هذين الموضعين.

---

## 3. المكتبات

- **UI/Styling**: Tailwind CSS 4 (`@tailwindcss/vite`)، Lucide React، Framer Motion، Recharts، vaul (drawers)، cmdk (command palette)، sonner (toasts)، Radix UI.
- **State/Data**: Zustand 5، @supabase/supabase-js 2، @tanstack/react-query + react-table + react-virtual، react-hook-form + zod.
- **Auth/Security**: @simplewebauthn/browser (WebAuthn passkeys)، crypto-js (AES تشفير محلي).
- **Billing**: @paddle/paddle-js.
- **Monitoring**: @sentry/react (مراقبة أخطاء — خاملة ما لم يُضبط `VITE_SENTRY_DSN`، انظر §11).
- **Export/PDF**: jspdf + jspdf-autotable، xlsx (Excel). ⚠️ `xlsx@0.18.5` فيه ثغرتان معروفتان (Prototype Pollution + ReDoS) — مؤجّل الإصلاح: الاستخدام **كتابة فقط** (تصدير) بلا قراءة ملفات غير موثوقة، فالخطر العملي شبه معدوم. الإصلاح الرسمي: الترقية لنسخة CDN 0.20.x من SheetJS.
- **i18n**: i18next + react-i18next (ar/he/en).
- **PWA**: vite-plugin-pwa (Workbox، استراتيجية injectManifest).
- **Testing**: Vitest (unit)، @playwright/test (E2E).

---

## 4. المعمارية وتدفّق البيانات

```
main.jsx → Router.jsx → App.jsx (بعد الدخول) → الشاشات
```

**Router.jsx** (توجيه client-side يدوي عبر `history.pushState`):
| المسار | الصفحة |
|--------|--------|
| `/` | `LandingPage` |
| `/pricing` | `PricingPage` (Paddle) |
| `/welcome` | `WelcomePage` |
| `/terms` `/privacy` `/refund` `/contact` | `LegalPage` (صفحة قانونية موحّدة حسب `type`) |
| `/login` `/register` | `LoginScreen` (lazy) |
| `/admin` | `AdminDashboard` (lazy) — لوحة تحكّم المنصّة (مركز قيادة الأدمن): دخول مخصّص باسم مستخدم/كلمة مرور (أسرار Supabase)، يعرض إجمالي/جدد المستخدمين + الإيراد الشهري MRR + الاشتراكات + التجارب + توزيع الخطط + نمو التسجيلات + آخر المسجّلين. عبر edge `admin-stats` + RPCs `admin_get_stats`/`admin_list_users`/`admin_user_detail`/`admin_broadcast`/`admin_action_items`. تبويبات: نظرة عامة (**نبض المنصّة** 0–100 + **صندوق إجراءات ذكي** + **توقّع نمو** 3 أشهر + **أهداف** قابلة للضبط + نشطون + قمع تحويل + ARR + اتجاه أسبوعي) · **مباشر** (سجلّ نشاط حيّ بشري يتحدّث كل 20ث + **قائمة نشاط البوتات** المرصودة/المصنّفة: تسجيل/دخول/محو عبر `bot_activity`) · **المستخدمون** (بحث + تفاصيل + حظر + تغيير خطة + تمديد تجربة + **دخول كمستخدم** للدعم + تصدير CSV) · **رسالة جماعية**. يدعم **دخول بالبصمة (WebAuthn)** و**تغيير كلمة السر/اسم المستخدم**. + **تنبيهات فورية** للمالك عند تسجيل/اشتراك جديد (trigger يكتب notification → Web Push). + **رصد البوتات**: `is_bot_email` يكشف نمط الفحص (probe/bot/+test...)، وtriggers على `auth.users` (insert/update last_sign_in_at/delete) تسجّل دورة حياة البوت في `bot_activity` وتنبّه موسومةً «🤖 بوت» (لا تُتجاهل) — والسجلّ الحيّ البشري يستثنيها. **مخفي — غير موصول بأي UI عام** |
| `/app` أو أي شيء آخر | `App` |
| `?portal` أو `?worker` | **بوّابة العامل** (`WorkerPortalScreen`) مباشرة بلا دخول مالك |

> `Router` يلفّ كل الصفحات (عدا بوّابة العامل) بـ `<CookieConsent/>` (لافتة موافقة كوكيز خفيفة تظهر مرّة).

**App.jsx** هو القلب — يدير:
1. **المصادقة** عبر `useAuth` (مالك Supabase) أو `teamMemberSignIn` (عضو فريق).
2. **تحميل البيانات** عبر hooks مركزية (`useProjects`, `useEmployees`, `useWorkDays`, ...) — كلها مفتاحها `eid` (`effectiveOwnerId || uid`)، أي عضو الفريق يقرأ بيانات المالك.
3. **فلترة الصلاحيات**: `allowedProjectIds` من `useTeam` تُنتج `visibleProjects/visibleWorkDays/visibleExpenses/...` (memoized). العضو يرى فقط مشاريعه المسموحة + العمّال/المصاريف المرتبطة بها.
4. **مزامنة للمخزن المشترك**: البيانات المفلترة تُكتب في `useDataStore` (مرآة قراءة فقط) لتجنّب prop-drilling.
5. **Early returns** بالترتيب: `authLoading` → splash · لا user → `LoginScreen` · `isBlocked/isExpired` → شاشة منع · انتهاء التجربة + خطة غير نشطة → شاشة اشتراك · لا مصالح → `FirstTimeSetup`.
6. **layout**: موبايل (≤768px) = bottom nav + more drawer · ديسكتوب = `DesktopSidebar`.
7. **مزامنة الخطة**: يكتب `{plan, trialActive, paddleEnabled}` في `usePlanStore` (من `useOrganization`) ليقرأها أي شاشة لتقييد ميزة. كما يربط هوية المستخدم بـ Sentry (`setSentryUser`).

> قاعدة ذهبية: **لا prop drilling للـ state العام** — استعمل Zustand. لكن دوال الـ CRUD والبيانات المفلترة تُمرّر props من App للشاشات (هذا النمط القائم).

---

## 5. هيكل المجلدات

```
src/
├── main.jsx                 ← نقطة الدخول (StrictMode + i18n + Router)
├── Router.jsx               ← توجيه client-side + navigate()
├── App.jsx                  ← التطبيق بعد الدخول (auth, data hooks, perms, layout, 5 tabs)
├── sw.js                    ← Service Worker (Workbox precache + Supabase NetworkFirst + web push)
├── i18n/                    ← index.js + locales/{ar,he,en}.json (افتراضي ar، مفتاح cp_lang)
├── constants/index.js       ← C, GRAD, SPECS, EXP_CATS, EXP_CAT_VAT, PAY_METHODS, DAY_TYPES,
│                              PROJECT_STATUS/TYPES, VAT, OSEK_PATUR_THRESHOLD, NAV, MORE_SCREENS, BP
├── ui/                      ← مكتبة التصميم: Button, Card(+GlassCard), Input, Modal, Badge, StatCard,
│                              Premium (kit الفخامة المشترك — انظر §2.1), Skeleton
├── pages/                   ← LandingPage, PricingPage, WelcomePage, LegalPage (شروط/خصوصية/استرجاع/تواصل)
├── store/
│   ├── useAppStore.js       ← navigation, overlays, toast, signer, lock, readOnly, biometric promise
│   ├── useBusinessStore.js  ← multi-business (load/create/update/remove) + BUSINESS_TYPES (persist)
│   ├── usePlanStore.js      ← معلومات الخطة + تقييد الميزات: planHasFeature/useHasFeature/useWorkerLimit (مغطّى باختبارات)
│   └── useDataStore.js      ← مرآة قراءة فقط للبيانات المفلترة
├── hooks/                   ← انظر §10
├── lib/                     ← انظر §11
├── components/              ← انظر §9
└── screens/                 ← انظر §7
supabase/                    ← schema.sql, master.sql, migrations/, functions/ (edge) — انظر §12
tests/e2e/                   ← Playwright specs (landing, navigation, auth-forms)
.github/workflows/           ← pages.yml (GitHub Pages) + deploy.yml (Supabase edge functions)
scripts/bump-version.mjs     ← يرفع patch version قبل كل build
generate_icon.py             ← مولّد أيقونات التطبيق (يقرأ HardHat من lucide-react) — انظر §2.2
```

---

## 6. التنقّل

**5 tabs أساسية** (`NAV` في constants):
| Tab | الأيقونة | الشاشة |
|-----|----------|--------|
| الرئيسية | LayoutDashboard | `DashboardScreen` |
| مشاريع | Building2 | `ProjectsScreen` |
| عمال | Users | `WorkersScreen` (يدمج أيام العمل) |
| المالية | Wallet | `FinanceScreen` |
| الإعدادات | Settings | `SettingsScreen` |

**شاشات "المزيد"** (`MORE_SCREENS` — drawer على الموبايل / قسم في السايدبار): `team` (إدارة الفريق) · `tracker` (تتبّع الوحدات) · `materials` (البضاعة) · `activity` (سجلّ النشاط).
شاشات قديمة موصولة كذلك: `workdays` (يُحوّل لـ workers) · `expenses` · `payments` · `accounting` (يُحوّل لـ finance).

---

## 7. الشاشات (src/screens/)

| الملف | الغرض |
|-------|-------|
| `dashboard/DashboardScreen.jsx` | لوحة تنفيذية: **نبض المصلحة** + **التوقّع الذكي للسيولة** + نقد بالجيب + مستحق للعمال/العملاء + صافي الربح + مخطّط شهري + أفضل المشاريع |
| `projects/ProjectsScreen.jsx` | CRUD مشاريع + لوحة تفصيل بتبويبات (نظرة/أيام عمل/عمّال/مصاريف/مقبوضات)، إدارة مواقع للمشاريع اليومية، تذكير واتساب، أرشفة/حذف ذكي |
| `workers/WorkersScreen.jsx` | روستر العمّال + تبويب أيام العمل، لوحة تفصيل لكل عامل (إحصائيات/أيام/دفعات/سلف)، رابط بوّابة العامل، تأكيد بصمة للحذف. **`EditWorkerSheet`** (شيت موحّد): تعديل بيانات العامل + **صلاحيات البوّابة** (4 مفاتيح: تسجيل يوم/مصروف/بضاعة/طلب راتب‑سلفة) + **تفعيل/إيقاف الوصول** (`can_access_portal`، الإيقاف يمسح `worker_session_token`) + **حصر بالمشاريع** (`allowed_project_ids`، فارغ=الكل) + **حدود** (`max_advance_amount` للسلفة · `require_expense_receipt`) + **انتهاء صلاحية بتاريخ** (`portal_access_until`، إيقاف تلقائي) + بيانات الدخول (توليد/إعادة تعيين/مشاركة واتساب) |
| `finance/FinanceScreen.jsx` | حاوية المالية + **BusinessSwitcher** + 6 تبويبات (انظر §8). يدعم `pendingAction` لفتح sheet مع مشروع مُمرّر من شاشة المشاريع |
| `settings/SettingsScreen.jsx` | البروفايل، اللغة، التخصّصات/فئات المصاريف/طرق الدفع، الإشعارات، الاشتراك، تحديث التطبيق، **الأمان** (read-only، حدّ صرف يومي، مهلة الجلسة، سجلّ الدخول)، passkey/PIN، سجلّ التواقيع، **منطقة الخطر**: حذف الحساب الذاتي نهائياً (للمالك، بنافذة تأكيد بكتابة كلمة، عبر `useAuth.deleteAccount` → edge `delete-account`) |
| `team/TeamScreen.jsx` (+ `useTeamManager`, `teamConstants`, `AddMemberModal`, `EditPermsPanel`, `MemberCard`, `MemberActivity`) | إدارة أعضاء الفريق: إضافة/صلاحيات دقيقة/حظر/إعادة كلمة سر/انتهاء صلاحية/تقييد بمشاريع |
| `onboarding/FirstTimeSetup.jsx` | شاشة أول مرة (لا مصالح): إعداد سريع (osek_patur عام) أو يدوي |
| `auth/LoginScreen.jsx` | دخول متعدّد: **Passkey / PIN / كلمة سر** (مالك) + **عضو فريق** (username+password)، تسجيل، استعادة كلمة سر، مبدّل لغة |
| `WorkDaysScreen.jsx` | تسجيل/موافقة أيام العمل: نمط مفرد/جماعي/مدى تواريخ (≤100 يوم)، أنواع يوم، عطل، معاينة راتب، Excel |
| `PaymentsScreen.jsx` | دفعات الرواتب: نموذج، طابور موافقات، تأكيد بصمة، إشعار واتساب، Excel |
| `ExpensesScreen.jsx` | مصاريف مستقلّة + **مسح إيصال OCR** (edge function `scan-receipt`)، فئات، מע"מ |
| `MaterialsScreen.jsx` | عرض البضاعة المسجّلة من بوّابة العامل (قراءة فقط، جدول `material_logs`) |
| `UnitTrackerScreen.jsx` | تتبّع إنشائي هرمي (قطع→بيوت→طوابق→مهام) + تبويب "إضافات" بموافقة، يُحفظ localStorage |
| `ActivityScreen.jsx` | سجلّ تدقيق شامل لكل العمليات (insert/update/delete/view) حسب العضو، للمالك فقط، Excel |
| `WorkerPortalScreen.jsx` | بوّابة العامل الذاتية (`?portal`/`?worker`): كشف حساب، طلب سلفة، تسجيل بضاعة، تقديم مصروف — كله عبر RPCs مع token |

**finance/** التبويبات الفرعية مفصّلة في §8.

---

## 8. وحدة المالية — Finance Module

**Multi-business**: كل مصلحة (`businesses`) نوعها `osek_patur` / `osek_moreh` / `hevra`. `BusinessSwitcher` يبدّل المصلحة النشطة (`useBusinessStore`)، وكل بيانات المالية تُفلتر حسبها.

**تبويبات FinanceScreen**:
| التبويب | الملف | المحتوى |
|---------|-------|---------|
| Project Finance | `ProjectFinanceTab.jsx` | P&L مجمّع لكل مشروع (إيراد/مصاريف/عمالة/ربح/هامش) |
| المدخولات | `IncomeTab.jsx` | مقبوضات العملاء + تحذير حدّ עוסק פטור |
| المصاريف | `ExpenseTab.jsx` | مصاريف + حساب מע"מ تلقائي حسب الفئة + فحص ميزانية الإيصال |
| الأرشيف | `InvoiceArchiveTab.jsx` | أرشيف الفواتير/الإيصالات + نسبة التخصيص + تصدير |
| الرواتب | `PayrollTab.jsx` | توزيع الرواتب + طابور موافقات + Excel |
| ملخص الضرائب | `TaxSummaryTab.jsx` | מע"מ داخل/خارج، اختيار فترة، قفل فترة، تصدير |

**إعداد/تبديل المصالح**: `BusinessSetup.jsx`، `BusinessSwitcher.jsx`، `BusinessEditSheet.jsx`.

### منطق الضرائب (إسرائيل) — `useTaxEngine.js` + `helpers.js`
- **עוסק פטור**: لا מע"מ. حدّ سنوي `OSEK_PATUR_THRESHOLD = ₪120,000` — تحذير عند الاقتراب.
- **עוסק מורשה / חברה**: מע"מ **18%** (`VAT`) على المدخولات، خصم على المصاريف حسب الفئة (`EXP_CAT_VAT`): مواد/بضاعة/أدوات/معدات/خدمات **100%** · وقود/صيانة مركبات **66.7%** · رواتب/تأمين **0%**.
- **ضريبة دخل**: شرائح إسرائيلية تصاعدية (أفراد) أو نسبة شركات.
- **ביטוח לאומי**: يُحسب بشريحتين (مخفّضة/كاملة، شامل ביטוח בריאות) عبر `helpers.calcBituachLeumi`/`calcBituachLeumiAnnual` — لا نسبة مسطّحة.
- **خصومات العمّال** (`calcWorkerDeductions`): أنواع `israeli` / `foreign_res` / `foreign_non` (20% ثابت) / `palestinian` / `self`.

---

## 9. المكوّنات المشتركة (src/components/)

| المكوّن | الغرض |
|---------|-------|
| `BusinessPulse.jsx` | **نبض المصلحة** — مؤشّر صحّة مالية (0–100): عدّاد دائري + 5 عوامل + رؤى ذكية. يقرأ من `computeBusinessPulse` |
| `CashForecast.jsx` | **التوقّع الذكي للسيولة** — مسار نقدي (ماضٍ صلب→مستقبل متقطّع) + نطاق ثقة + عدّاد أمان (runway). يقرأ من `computeCashForecast` |
| `CommandCenter.jsx` | **مركز القيادة الذكي** — يجمّع إشارات كل المحرّكات في بطاقات + موجز موحّد. يقرأ من `computeCommandCenter` |
| `NetWorth.jsx` | **الذمّة الصافية** — شلال ميزانية (نقد/ذمم/التزامات→صافي) + عدسة تغطية. يقرأ من `computeNetWorth` |
| `ProjectHealth.jsx` | صحّة المشروع (تكلفة/هامش/تحصيل/جدول). يقرأ من `computeProjectHealth` |
| `CollectionAging.jsx` | **رادار التحصيل** — تقادم الذمم المدينة حسب العمر. يقرأ من `computeCollectionAging` |
| `ExpenseRadar.jsx` | كشف شذوذ المصاريف (قفزات/تكرار). يقرأ من `detectExpenseAnomalies` |
| `TaxRunway.jsx` | مدرج الضريبة — التزام מע"מ/دخل المتوقّع ومتى يُستحقّ. يقرأ من `computeTaxRunway` |
| `TeamPulse.jsx` | نبض الفريق — نشاط/أداء الأعضاء. يقرأ من `computeTeamPulse` |
| `AccountReadiness.jsx` | جاهزية الحساب — اكتمال الإعداد والبيانات. يقرأ من `computeAccountReadiness` (`lib/accountReadiness.js`) |
| `WorkerDNA.jsx` / `WorkerInsights.jsx` | **بصمة العامل** + رؤى/خريطة حضور/رادار/خطّ زمني. يقرآن من `computeWorkerDNA` + `lib/workerInsights.js` |
| `ProjectCard.jsx` / `WorkerCard.jsx` / `ReceiptCard.jsx` | بطاقات هوية متحرّكة موحّدة (تستعمل `ui/Premium`) للمشروع/العامل/الإيصال |
| `WorkDayTicket.jsx` / `WorkMonthHeader.jsx` / `WorkerMonthStrip.jsx` | تذكرة شِفت + رأس الشهر + شريط الشهر للعامل (أيام العمل/البوّابة) |
| `ConnectionStatus.jsx` | مؤشّر حالة الاتصال والمزامنة المتحرّك (يُستعمل في `App.jsx`) |
| `ScreenSkeleton.jsx` | هياكل تحميل (Skeleton) متوهّجة لكل شاشة (variant) |
| `BiometricConfirmModal.jsx` | نافذة تأكيد بصمة/PIN للعمليات الحسّاسة (تُستدعى عبر `useAppStore.requestBioConfirm`) |
| `SessionLockScreen.jsx` | شاشة قفل الجلسة عند الخمول (بدل الخروج التلقائي) |
| `NotificationsPanel.jsx` | مركز الإشعارات داخل التطبيق |
| `SmartSearch.jsx` / `SearchOverlay.jsx` | بحث شامل (cmdk) عبر المشاريع/العمّال/المصاريف/الدفعات |
| `SignaturePad.jsx` | لوحة توقيع canvas |
| `WorkerStatsPanel.jsx` | ملخّص أداء/ساعات/رواتب العامل |
| `ErrorBoundary.jsx` | حدّ خطأ React (يلفّ كل شاشة بمفتاح `screen`) + يبلّغ Sentry عبر `captureException` |
| `FeatureGate.jsx` | يلفّ ميزة مدفوعة: يعرض المحتوى إن كانت الخطة تكفي (`useHasFeature`)، وإلا بطاقة ترقية. مُستعمل لشاشة الفريق (Pro+) |
| `PortalUpsell.jsx` | بطاقة ترقية مدمجة لبوّابة العامل (قفل + شارة Pro + زر → `/pricing`). تُستبدل بها أدوات مشاركة البوّابة/QR عندما تكون خطة المالك < Pro. مُستعملة في `ContractorCard` (الإعدادات)، `WorkerCard`، وتفاصيل العامل |
| `CookieConsent.jsx` | لافتة موافقة كوكيز خفيفة (تخزين ضروري فقط، بلا تتبّع) — تُركّب في `Router` وتظهر مرّة |
| `index.jsx` | مكوّنات مساعدة: `LoadingSpinner`, `GlassCard`, `Card`, `StatCard`, `Modal`, `Input`, `Btn`, `FilterChip`, `TabBar`, `Badge`, `EmptyState`, `ConfirmDialog`, `AnimatedNumber`, ... |
| `sheets/AddExpenseSheet.jsx` | bottom-sheet إضافة مصروف (رفع إيصال، فئة، מע"מ، طريقة دفع) |
| `sheets/AddReceiptSheet.jsx` | bottom-sheet إضافة مقبوض/فاتورة |

**مكتبة UI** (`src/ui/`): `Button` (variants: brand/warm/ghost/danger/success · sizes: sm/md/lg/xl/icon) · `Card`+`GlassCard` · `Input` (label/error/hint/icon/suffix) · `Modal` (bottom-sheet، sizes sm/md/lg) · `Badge` (7 ألوان) · `StatCard` · **`Premium`** (kit الفخامة: `PremiumCard`/`PremiumStat`/`IconChip`/`TONES`/`toneFromColor`/`HolographicSheen` — انظر §2.1) · `Skeleton` (+`SkeletonText`/`SkeletonCard`).

---

## 10. الـ Hooks (src/hooks/)

| Hook | المسؤولية | الجدول/RPC |
|------|-----------|------------|
| `useAuth` | مصادقة Supabase + passkey + PIN (تشفير AES للإيميل/كلمة السر بمفتاح من PIN) | `passkey_credentials`، edge `webauthn-*` |
| `useData` | **وحدة CRUD كبيرة** — تصدّر: `useProjects`, `useEmployees`, `useWorkDays`, `useExpenses`, `usePayments`, `useClientReceipts`, `useAdvances`, `useTaxAdvances`, `useHolidays`. كلها Realtime | core tables |
| `useTeam` | الصلاحيات + CRUD أعضاء + سجلّ نشاط. يصدّر `teamMemberSignIn`، `OWNER_PERMS`، `effectiveOwnerId`، `allowedProjectIds` | `team_members`، edge `create-team-member`/`update-member-password`، RPCs |
| `useOrganization` | الخطة + حالة التجربة (`isTrialActive`, `trialDaysLeft`, `isPlanActive`, `hasFeature`) | RPC `get_my_organization`، realtime `organizations` |
| `useSubscription` | اشتراك Paddle النشط (`isActive`, `isCanceling`, `daysUntilPeriodEnd`) | RPC `get_my_subscription`، realtime `subscriptions` |
| `useSettings` | تفضيلات localStorage: specs، expCats، payMethods، نوع المصلحة، وحدات الضرائب | localStorage `settings_${uid}` |
| `useProfile` | اسم/أفاتار/رقم مقاول + رفع صورة | `profiles`، bucket `avatars` |
| `useNotifications` | قائمة إشعارات + عدد غير مقروء (Realtime) | `notifications` |
| `usePushNotifications` | Web Push (SW + VAPID) | `push_subscriptions`، `VITE_VAPID_PUBLIC_KEY` |
| `useSalaryAlerts` | تنبيه رواتب متأخّرة (14+ يوم) مرّة/يوم | يكتب `notifications` |
| `useDailyDigest` | ملخّص يومي للمالك (طلبات معلّقة + صرف اليوم) مرّة/يوم — للمالك فقط، تبديل عبر `dailyDigest` في `useSettings` | يكتب `notifications` (type `daily_digest`) |
| `useTaxEngine` | حسابات ضريبية إسرائيلية (دوال نقيّة) | — |
| `useBiometricConfirm` | تأكيد passkey/PIN + تسجيل توقيع | `signature_log` |
| `useAppConfig` | إعداد التطبيق (read-only، حدّ صرف، مهلة جلسة) + سجلّ دخول + قفل فترات | `app_config`، `login_log`، `locked_periods`، RPC `upsert_app_config` |
| `useMaterialLogs` | تسجيل بضاعة (من العامل) | RPC `worker_add_material_log` |
| `useProjectBusinessLinks` | ربط مشروع بعدّة مصالح | `project_businesses` |
| `useWorkerPortal` | بوّابة العامل: دخول/تقديم يوم/مصروف/طلب دفعة/سلفة/تغيير كلمة سر + كشف حساب محسوب | RPCs `worker_*`، session `worker_session` |

**ملاحظة Realtime**: كل hook بيانات يشترك بقناة فريدة `${table}_rt_${uid}_${Date.now()}`.

---

## 11. الـ Lib (src/lib/)

| الملف | الغرض / أهم الصادرات |
|-------|----------------------|
| `supabase.js` | عميل Supabase. env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `helpers.js` | `fmt`، `fmtDate`، `fmtDateFull`، `uid`، `todayStr`، `calcSalary` (overtime)، `validate*`، `calcVATNet`، `calcBituachLeumi*`، `estimateIncomeTax`، `isPaymentOverdue` |
| `calculations.js` | دوال نقيّة: `calcEarned`، `calcPaid`، `calcAdvances`، `calcWasel`، `calcMustahaq`، `calcMutabqi` (رصيد العامل)، `calcRevenue`، `calcProjectCost`، `calcProfit`، `calcMargin`، `calcOwnerCash`، `calcProjectStats` |
| `insights.js` | **محرّك الرؤى المالية** (دوال نقيّة): `computeBusinessPulse` · `computeCashForecast` · `computeCommandCenter` · `computeNetWorth` · `computeProjectHealth` · `computeCollectionAging` · `detectExpenseAnomalies` · `computeTaxRunway` · `computeTeamPulse` · `computeWorkerDNA` + مساعدات (`weightedAvg`/`stdDev`/`fmtMonths`/`gradeFor`/`workerTier`/`clamp`). **مغطّى باختبارات** |
| `accountReadiness.js` | `computeAccountReadiness` + `readinessGrade` (جاهزية الحساب 0–100). **مغطّى باختبارات** |
| `workerInsights.js` | رؤى العامل: `buildAttendanceHeatmap`/`buildFleetDna`/`buildRadarData`/`detectWorkerAnomalies`/`buildWorkerTimeline`/`buildFleetLeaderboard`. **مغطّى باختبارات** |
| `crypto.js` | تشفير AES-256-GCM محلي (`secureSet/Get/Remove`)، مفتاح مشتقّ من بصمة المتصفح |
| `storage.js` | `compressImage`، `uploadReceipt`، `uploadWorkerReceipt`، `refreshSignedUrl` (TTL سنة). buckets: `receipts`, `worker-receipts`, `avatars` |
| `whatsapp.js` | `normalizePhone` (972)، `openWhatsApp`، قوالب `waMessages` (دعوة بوّابة/راتب مدفوع/كشف حساب/تذكير دفع). **مغطّى باختبارات** |
| `export.js` | تصدير Excel (مصاريف/أيام/دفعات/تقرير كامل/ضرائب) + PDF (مشروع/راتب عامل/عقد عمل) |
| `paddle.js` | تكامل Paddle: `getPaddle`، `PLAN_PRICES` (شهري) + `PLAN_PRICES_ANNUAL` (سنوي) + `pricesFor(cycle)`، `PLAN_META`، `openCheckout({plan,user,org,cycle})`، `openCustomerPortal` |
| `sentry.js` | تهيئة Sentry (خاملة ما لم يُضبط `VITE_SENTRY_DSN`؛ إنتاج فقط) + `setSentryUser(user)` |
| `analytics.js` | Google Analytics 4 (`GA_ID`) + **Consent Mode v2**: `initAnalytics(alreadyGranted)` يحمّل gtag للجميع بموافقة افتراضية `denied` (بلا كوكيز تحليلات)، و`grantConsent()` يرفعها إلى `granted` عند القبول + `isGranted()` نقيّة. مربوط بـ`CookieConsent` (مفتاح `cp_consent_v2`، مستثنى من بوّابة العامل). **مغطّى باختبارات** |
| `tiktok.js` | **TikTok Pixel + Events API**. الـpixel JS محمّل في `index.html` (Pixel ID `D8PNSDJC77U8R8H6EH90`). يصدّر: `ttPage` (عرض صفحة، يُستدعى من `Router` بكل تنقّل SPA) · `ttTrack(event, params)` (client-side فقط، للأحداث الخفيفة ViewContent/ClickButton) · `ttIdentify` · `ttEventId` (UUID) · `ttServerTrack` (يستدعي edge `track-tiktok-event` لإرسال الحدث server-side) · `ttTrackBoth(event, opts)` للأحداث المهمّة (Lead/CompleteRegistration/CompletePayment) — يطلق على القناتين بنفس `event_id` فـTikTok يدمج (deduplication) ويعالج adblock/iOS. مواقع الإطلاق: `Router` (PageView)، `LandingPage` (ClickButton على CTAs)، `PricingPage` (ViewContent)، `LoginScreen` (Lead+CompleteRegistration على signup)، `paddle.js` (InitiateCheckout)، `ThankYouPage` (CompletePayment)، و**`paddle-webhook` يطلق `Subscribe` server-to-server مستقلاً**. **مغطّى باختبارات** |
| `seo.js` + `seoRoutes.js` | محرّك SEO لكل مسار (SPA): `useRouteSeo(path, extraSchema)` يقرأ العنوان/الوصف/الـschema من `ROUTE_SEO` (مصدر واحد في `seoRoutes.js`، يشاركه `scripts/prerender.mjs`) + breadcrumb تلقائي عبر `breadcrumbFor`. `applySeo`/`useSeo` للتطبيق المباشر + باني `faqLd` نقيّ (FAQ للأسعار). صورة OG بانر 1200×630 (`public/og-image.png`). **مغطّى باختبارات** |

---

## 12. الباكند — Supabase

**رمز المشروع** (في `.mcp.json`): `rvhjrzbhugvytvktdhor`. تُدار عبر **Supabase MCP** + ملفات SQL في `supabase/` (schema.sql، master.sql، migrations/).

### الجداول الرئيسية
- **العمليات الأساسية**: `projects`، `employees` (+ بيانات بوّابة العامل: `worker_username/password_hash/session_token` + **صلاحيات/ضوابط**: `can_submit_workday/can_submit_expenses/can_log_materials/can_request_payment/can_access_portal` + `allowed_project_ids` (حصر مشاريع) + `max_advance_amount` + `require_expense_receipt` + `portal_access_until` (انتهاء صلاحية الوصول))، `work_days`، `holidays`.
- **المالية**: `expenses` (قيد: `project_id NOT NULL OR is_general`)، `payments`، `client_receipts`، `advances`، `tax_advances`، `businesses`، `project_businesses`، و(وحدة المحاسبة) `income_entries`، `expense_entries`، `invoice_archive`، `payroll_slips`.
- **البضاعة**: `material_logs`.
- **المؤسسة/الاشتراك**: `organizations` (plan: free/starter/pro/business، `trial_ends_at`)، `user_organizations`، `subscriptions` (Paddle).
- **الفريق/التدقيق**: `team_members` (صلاحيات دقيقة `can_*` + `allowed_project_ids` + `expires_at` + `is_blocked`)، `audit_log`، `signature_log`، `login_log`، `locked_periods`، `app_config`.
- **الإشعارات**: `notifications`، `push_subscriptions`.
- **المصادقة**: `passkey_credentials`، `passkey_challenges`، `rate_limits`، `profiles`.
- **الأدمن** (لوحة `/admin`، كلها RLS بلا policies = service_role فقط): `admin_auth` (بيانات دخول مجزّأة قابلة للتغيير)، `admin_passkeys` (بصمات WebAuthn)، `admin_challenges` (تحدّيات مؤقتة).
- **مرجعية**: `ref_counters` (ترقيم تلقائي PAY-/ADV-/EXP-/RCP-/PRJ-/INV-/INC-/...).

### نموذج الأمان (RLS)
- الجداول الأساسية مُقيّدة بـ `user_id = auth.uid()` — كل مستخدم يرى صفوفه فقط.
- **عضو الفريق** يقرأ بيانات المالك عبر RPCs/policies تستخدم `owner_id`؛ التطبيق يفلتر إضافياً بـ `allowedProjectIds`.
- triggers: `audit_trigger_fn` (يسجّل تغييرات غير المالك)، `set_ref_number` (ترقيم)، `call_send_push` (push عند إشعار)، `handle_new_user` (إنشاء profile+org عند التسجيل).
- **RPCs مهمّة**: `worker_login`، `worker_submit_day/expense`، `worker_request_payment/advance`، `worker_add_material_log`، `get_worker_self` (يُرجع أعلام صلاحيات العامل للبوّابة)، `approve_payment_request`، `get_my_organization/subscription`، `update_team_member_perms`، `set_member_blocked`، `get_member_activity`، `log_screen_view`، `upsert_app_config`، `next_ref_number`.
  > 🔒 **فرض صلاحيات/ضوابط بوّابة العامل خادمياً**: كل دوال `worker_*` (يوم/مصروف/بضاعة/راتب/سلفة) تفحص علم الصلاحية المعني + `worker_portal_open(can_access_portal, portal_access_until)` (دالة مساعدة) + حصر `allowed_project_ids` + سقف `max_advance_amount` + `require_expense_receipt` + قيود تاريخ اليوم (لا مستقبلي · رجوع ≤7 أيام). و`get_worker_self` يُرجع كل الأعلام للبوّابة. **لا تكتفِ بإخفاء التبويب في الواجهة** — أضف الفحص داخل الـRPC أيضاً (الإخفاء وحده قابل للتجاوز بنداء مباشر).
  > ⚠️ **`get_worker_projects` لازم يرجّع `type` و`locations` (لا `id`/`name` فقط).** بوّابة العامل تعرض أزرار «مكان العمل» (`أماكن`) للمشاريع اليومية اعتماداً على `selProj.type === 'يومي'` + `selProj.locations` (في `WorkerPortalScreen.jsx`). الدالة الأصلية (`add_work_locations.sql`) كانت ترجّع الحقلين، لكن migration لاحقة (`20260613060000`) أعادت تعريفها لإضافة token gating + حصر `allowed_project_ids` و**أسقطت** `type`/`locations` سهواً → اختفت الأماكن نهائياً عند اختيار المشروع. أُعيدا في `20260616000000_worker_projects_restore_type_locations`. **عند أي تعديل لاحق على هذه الدالة، حافظ على الحقلين الأربعة (`id`/`name`/`type`/`locations`).**

> ⚠️ **خطر شائع — إعداد PostgREST بعد حذف schema (سبق وعطّل الإنتاج بالكامل بـ503).** كان هذا المشروع يشارك تطبيق متجر B2B منفصل في schema اسمه `store` (أُزيل في `remove_store_app`). عند حذف أي schema مكشوف، **لازم** تُزيله أيضاً من إعداد PostgREST و`search_path` للأدوار، وإلا يفشل بناء schema cache وترجع **كل** طلبات الـREST API خطأ **503** (وسجلّ Postgres يكرّر `schema "X" does not exist`). الإعداد الصحيح حالياً (تطبيق المقاولات يعيش كلّه في `public`):
> - `authenticator`: `pgrst.db_schemas = 'public'`
> - `anon` / `authenticated`: `search_path = public, extensions`
>
> للتشخيص: افحص `pg_db_role_setting` + سجلّ `api`/`postgres` عبر Supabase MCP. الإصلاح موثّق في migration `20260613040000_fix_pgrst_schemas_after_store_removal`. **لا تكشف schema غير موجود.** `src/store/` هو مجلّد كود Zustand — **ليس** schema في القاعدة، لا تخلط بينهما.

> ⚠️ **خطر شائع — إعداد PostgREST بعد حذف schema (سبق وعطّل الإنتاج بالكامل بـ503).** كان هذا المشروع يشارك تطبيق متجر B2B منفصل في schema اسمه `store` (أُزيل في `remove_store_app`). عند حذف أي schema مكشوف، **لازم** تُزيله أيضاً من إعداد PostgREST و`search_path` للأدوار، وإلا يفشل بناء schema cache وترجع **كل** طلبات الـREST API خطأ **503** (وسجلّ Postgres يكرّر `schema "X" does not exist`). الإعداد الصحيح حالياً (تطبيق المقاولات يعيش كلّه في `public`):
> - `authenticator`: `pgrst.db_schemas = 'public'`
> - `anon` / `authenticated`: `search_path = public, extensions`
>
> للتشخيص: افحص `pg_db_role_setting` + سجلّ `api`/`postgres` عبر Supabase MCP. الإصلاح موثّق في migration `20260613040000_fix_pgrst_schemas_after_store_removal`. **لا تكشف schema غير موجود.** `src/store/` هو مجلّد كود Zustand — **ليس** schema في القاعدة، لا تخلط بينهما.

### Edge Functions (`supabase/functions/`)
| الدالة | الغرض |
|--------|-------|
| `create-team-member` | إنشاء عضو فريق (auth user + صف صلاحيات) — للمالك |
| `update-member-password` | إعادة تعيين كلمة سر عضو (admin API) |
| `delete-account` | حذف الحساب الذاتي نهائياً (للمالك): يتحقّق من الجلسة، يحذف مستخدم auth (يتتالى حذف كل بياناته عبر `ON DELETE CASCADE`)، ويحذف حسابات أعضاء الفريق الفرعية التابعة. يتطلّب `{confirm:true}` |
| `admin-stats` | لوحة الأدمن (`/admin`): `{action:'login'}` يتحقّق من بيانات الدخول (جدول `admin_auth` المجزّأ، أو أسرار `ADMIN_USERNAME`/`ADMIN_PASSWORD` كـbootstrap) ويُصدر توكن HMAC موقّع صالح 8 ساعات؛ `{action:'stats'}` يستدعي RPC `admin_get_stats` بالـservice role. + **بصمة WebAuthn للأدمن**: `wa-reg-options`/`wa-reg-verify` (بتوكن، تخزّن في `admin_passkeys`) و`wa-auth-options`/`wa-auth-verify` (عامة، تُصدر توكن) + `change-password` (تغيير كلمة السر/الاسم، تكتب في `admin_auth` مجزّأة بـsalt+sha256) + `passkey-status` + **إدارة**: `list-users`/`user-detail`/`set-user-banned`/`set-trial`/`set-plan`/`broadcast`/`action-items`/`activity-feed`/`set-targets`/`impersonate` (يولّد magiclink token_hash لجلسة المستخدم). توقيع التوكن بسرّ ثابت (`ADMIN_JWT_SECRET` أو service key) مستقلّ عن كلمة المرور. **منفصل عن مصادقة Supabase** (`--no-verify-jwt`). أسرار: `ADMIN_USERNAME`/`ADMIN_PASSWORD` (+ اختياري `ADMIN_JWT_SECRET`) |
| `paddle-webhook` | استقبال أحداث Paddle (تحقّق HMAC) ومزامنة `subscriptions`+`organizations` + إشعار داخل التطبيق عند `past_due`/`canceled`. خريطة الأسعار تشمل الشهري والسنوي. + **يطلق حدث `Subscribe` لـTikTok Events API** على `subscription.created` (server-to-server، الأوثق لأنّ adblock/iOS ما يأثر — يقرأ إيميل المستخدم من `auth.users` ويـhash بـSHA-256). أسرار TikTok: `TIKTOK_PIXEL_ID`/`TIKTOK_ACCESS_TOKEN` |
| `track-tiktok-event` | جسر **TikTok Events API** (server-side) للأحداث المهمّة (Lead/CompleteRegistration/CompletePayment): الـclient يطلق الحدث على الـpixel JS وبنفس الوقت يستدعي هاي الدالة بنفس `event_id` → TikTok يدمج (deduplication) فلا يُحتسب مرّتين. يـhash الإيميل/الموبايل/ID المستخدم بـSHA-256 قبل الإرسال (متطلّب TikTok). **منفذ عام بلا JWT** (الـlanding غير مصادق). أسرار: `TIKTOK_PIXEL_ID`/`TIKTOK_ACCESS_TOKEN` (+ اختياري `TIKTOK_TEST_EVENT_CODE` للتشخيص). يستعمله `src/lib/tiktok.js` عبر `ttServerTrack`/`ttTrackBoth` |
| `send-auth-email` | إيميلات مصادقة مخصّصة عبر **Resend** (تأكيد/استعادة/دخول سحري/تغيير بريد/دعوة) بقوالب عربية RTL. يُفعَّل كـ Supabase Auth "Send Email Hook". أسرار: `RESEND_API_KEY`/`SEND_EMAIL_HOOK_SECRET`/`EMAIL_FROM`/`APP_URL` |
| `scan-receipt` | OCR للإيصالات عبر Claude Haiku vision (rate-limited) → {amount, vendor, date, category} |
| `send-push` | إرسال Web Push عبر VAPID (يُستدعى من trigger أو client) |
| `webauthn-register-options` / `-verify` | تسجيل passkey (challenge 5د) |
| `webauthn-auth-options` / `-verify` | دخول passkey → magic link لجلسة Supabase. **credential_id يُخزّن base64url** |

**نشر الـ edge functions**: عبر `.github/workflows/deploy.yml` عند push لـ main (`create-team-member`, `update-member-password`, `delete-account`, `send-push`, `send-auth-email`, `paddle-webhook`, `track-tiktok-event` (الأخيرتان `--no-verify-jwt`)، + دوال webauthn).

---

## 13. المصادقة والأمان

- **مالك**: كلمة سر (Supabase) · **Passkey** WebAuthn حقيقي server-side · **PIN** (يشفّر الإيميل/كلمة السر محلياً بـ AES، المفتاح مشتقّ من PIN).
- **عضو فريق**: username + password عبر `teamMemberSignIn` (edge function أنشأ له auth user).
- **تأكيد بصمة** للعمليات الحسّاسة (حذف، دفعة كبيرة، إنشاء مشروع) عبر `useBiometricConfirm` + تسجيل في `signature_log`.
- **قفل الجلسة** عند الخمول (`session_timeout` من `app_config`، افتراضي 30د) → `SessionLockScreen` بدل الخروج.
- **read-only mode** و**حدّ صرف يومي** (`daily_spend_limit`) و**قفل فترات** (`locked_periods` — منع تعديل أشهر ماضية) و**حدّ بصمة الدفعات** (`payment_bio_threshold` في `app_config`: دفعة ≥ الحدّ تتطلّب تأكيد بصمة عبر `_addPayment` المغلَّف في `App.jsx`) — كلها للمالك.

### تقييد الميزات حسب الخطة (Monetization) — `store/usePlanStore.js`
- `App.jsx` يكتب `{plan, trialActive, paddleEnabled}` للمخزن من `useOrganization`.
- `planHasFeature(reqPlan)` / `useHasFeature(reqPlan)`: **الدفع غير مُفعّل** (`!paddleEnabled`) أو **خلال التجربة** → وصول كامل؛ غير ذلك مقارنة هرمية (free<starter<pro<business).
- `workerLimitFor({plan,trialActive})` / `useWorkerLimit()`: **تجربة → عامل واحد** · Starter → 10 · Pro/Business → غير محدود. مطبّق في `WorkersScreen` (نافذة ترقية + عدّاد `X/الحد`).
- تقييدات فعلية حالياً: **شاشة الفريق** على Pro+ (`FeatureGate`) · **بوّابة العامل** على Pro (`PortalUpsell` — مشاركة الرابط/QR محجوبة عند خطة < Pro) · **حدّ العمّال**. (تصدير PDF/Excel موعود كـ Pro بالتسعير لكن غير مقيَّد بعد.)
- **حساب المالك** مضبوط `plan=business` دائماً في `organizations` (لا يُقفل ولا يدفع).
- **صلاحية «مشاهدة المبالغ»** (`can_view_amounts` في `team_members` → `permissions.viewAmounts`): عضو فريق بدونها تُخفى عنه كل الأرقام المالية. التطبيق: `App.jsx` يحجب تبويب **المالية** (`viewAmounts===false → NoAccess`)؛ و`DashboardScreen` يُخفي الكتلة المالية كاملةً (بطاقات الرؤى + النقد + الربح + الإيرادات/المصاريف + المخطّط + أفضل المشاريع) ويُبقي الأرقام غير المالية؛ و`WorkersScreen`/`WorkerCard`/`PaymentsScreen`/`FinanceScreen`/`ProjectsScreen`/`ProjectCard`/`ExpensesScreen` تقنّع المبالغ بـ`•••` عبر `showAmounts = permissions?.viewAmounts !== false` (المدخلات/رسائل التأكيد لا تُقنّع).

---

## 14. i18n / PWA / Push

- **i18n** (`src/i18n/index.js`): ar (افتراضي) / he / en، مخزّن في localStorage `cp_lang`. RTL تلقائي لـ ar/he. الترجمات في `locales/*.json`. **سلاسل عبرية داخل JSX تُكتب `{'מע"מ'}`** لتجنّب كسر JSX بسبب `"`.
- **PWA**: `vite-plugin-pwa` بنمط `injectManifest` و`src/sw.js`. precache للأصول + Supabase API بـ NetworkFirst (مهلة 10s). تحديث تلقائي (`onNeedRefresh` → reload).
- **Web Push**: SW يستقبل `push` → إشعار RTL. الاشتراكات في `push_subscriptions`، VAPID عبر `VITE_VAPID_PUBLIC_KEY`، الإرسال عبر edge `send-push`.

---

## 15. البناء والنشر

| الهدف | الآلية |
|-------|--------|
| **Vercel** | النشر الأساسي التلقائي عند push لـ main (preview لكل PR). `vercel.json`: SPA rewrite → `/` |
| **GitHub Pages** | `pages.yml` يبني (`GITHUB_PAGES=true`، base `/contractor-pro/`) وينشر مرآة حيّة |
| **Supabase Edge** | `deploy.yml` ينشر edge functions عند push لـ main |
| **Android (TWA)** | `android.yml` (يدوي، `workflow_dispatch`) يبني AAB+APK موقّعين عبر Bubblewrap من `android/twa-manifest.json` كـartifacts، **ويقدر ينشر تلقائياً على Google Play** (مدخل `publish` اختياري + `track`/`status`، عبر `r0adkll/upload-google-play` وسرّ `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`؛ مطفأ افتراضياً = بناء فقط). ⚠️ التطبيق غلاف TWA يحمّل الموقع الحيّ: **التحديثات العادية (محتوى/ميزات) توصل المستخدم فوراً بلا APK**؛ الـAPK/الرفعة فقط لتغييرات الغلاف (أيقونة/اسم/splash/إشعارات) أو رفعة متجر جديدة. التفاصيل والأسرار في `android/README.md` |
| **رقم الإصدار** | `scripts/bump-version.mjs` يرفع patch تلقائياً قبل كل build (`prebuild` hook). ⚠️ نسخة الويب (`package.json`) منفصلة عن نسخة الأندرويد (`twa-manifest.json` → `appVersionCode`/`appVersionName`) — لا تتزامنان |

**vite.config.js**: منفذ 3000، code-splitting يدوي (react/recharts/framer-motion/lucide منفصلة)، حقن `__APP_VERSION__` و`__BUILD_DATE__`.

> ⚠️ **CI خارجي**: تكامل **Cloudflare Workers** على الريبو **يفشل دائماً** (لا يوجد `wrangler` config — المشروع لا يُنشر على Cloudflare). الفشل **خارجي ومتوقّع، تجاهله**.

---

## 16. متغيّرات البيئة (Vite)

تُحقن وقت البناء (GitHub Secrets في `pages.yml`؛ Vercel env):
`VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` · `VITE_VAPID_PUBLIC_KEY` · `VITE_PADDLE_CLIENT_TOKEN` · `VITE_PADDLE_ENVIRONMENT` · `VITE_PADDLE_PRICE_{STARTER,PRO,BUSINESS}` (شهري) · `VITE_PADDLE_PRICE_{STARTER,PRO,BUSINESS}_ANNUAL` (سنوي) · `VITE_SENTRY_DSN`.
(⚠️ `supabase.js` **يرمي خطأً** إن غابت `VITE_SUPABASE_URL`/`_ANON_KEY` — لا قيم افتراضية في الكود. لذا هوك بداية الجلسة يولّد `.env.local` بقيم وهمية للمعاينة بالساندبوكس.)

**أسرار Edge Functions (Supabase)**: `PADDLE_WEBHOOK_SECRET` · `PADDLE_PRICE_ID_{STARTER,PRO,BUSINESS}` (+`_ANNUAL`) · `RESEND_API_KEY` · `SEND_EMAIL_HOOK_SECRET` · `EMAIL_FROM` · `APP_URL` · `ADMIN_USERNAME`/`ADMIN_PASSWORD` (+ اختياري `ADMIN_JWT_SECRET`) للوحة الأدمن `/admin` · **`TIKTOK_PIXEL_ID`/`TIKTOK_ACCESS_TOKEN`** (+ اختياري `TIKTOK_TEST_EVENT_CODE` للتشخيص) لـ`track-tiktok-event` و`paddle-webhook`. (كلها خاملة بأمان حتى تُضبط — التطبيق يعمل بدونها؛ لوحة الأدمن تُرجع 503 حتى تُضبط بياناتها؛ بدون توكن TikTok الـedge function ترجع `{ok:false,reason:'not_configured'}` بلا كسر.)

---

## 17. MCP

`.mcp.json` يعرّف خادمين:
- **supabase** (HTTP): مشروع `rvhjrzbhugvytvktdhor` (docs/database/functions/storage/branching...).
- **playwright** (`npx @playwright/mcp@latest`): كلود يقود متصفح حقيقي للتحقّق البصري.

---

## 18. الاختبارات

- **Vitest (unit)**: `npm test`. الملفات: `src/lib/insights.test.js`، `calculations.test.js`، `whatsapp.test.js`، `accountReadiness.test.js`، `workerInsights.test.js`، `export.test.js`، `src/hooks/useTaxEngine.test.js`، و`src/store/usePlanStore.test.js` (تقييد الخطط + حدّ العمّال).
  > `vite.config.js` يستثني `tests/e2e/**` من Vitest، فما عاد يلتقط ملفات Playwright. (المجموع حالياً ~143 اختباراً ناجحاً.)
- **Playwright (E2E)**: `tests/e2e/` — تغطية **client-side فقط** (تنقّل + تحقّق فورمات، بلا باكند): `landing.spec.js`، `navigation.spec.js`، `auth-forms.spec.js`. على viewport موبايل (Pixel 7) + ديسكتوب، locale عربي. تفاصيل في `docs/TESTING.md`.
- **Playwright MCP**: للتحقّق البصري التفاعلي (المتصفح يُثبّت بـ `npx playwright install chrome` عند الحاجة).
- **سكيل `landing-shots`** (`.claude/skills/landing-shots/`): وصفة التصوير المعتمدة — سكرينشوتات عالية الجودة (ديسكتوب 1380×820 + موبايل 412×915، توقيتات الأنميشن، مشاهد السكرول المثبّتة) وإرسالها للمحادثة. هوك بداية الجلسة ينشئ `.env.local` بقيم وهمية تلقائياً حتى تعمل المعاينة بالساندبوكس.

---

## 19. قواعد التطوير

1. **لا prop drilling للـ state العام** — Zustand. (دوال CRUD والبيانات المفلترة تُمرّر props من App — نمط قائم.)
2. **أيقونات Lucide فقط** — ممنوع إيموجي في UI.
3. **RTL دائماً**، اللغة الافتراضية عربية.
4. **سلاسل عبرية داخل JSX**: `{'מע"מ'}`. 🔴 **ممنوع خلط حروف عربية وعبرية داخل كلمة واحدة.** المصطلحات العبرية (מע"מ، ביטוח לאומי، עוסק פטור/מורשה، מס הכנסה، פנסיה، שכיר، עצמאי، חברה) لازم تُكتب **بحروف عبرية نقية 100%** — لا تستبدل أبداً حرفاً عبرياً بشبيهه العربي (مثل ي↔י، ر↔ר، و↔ו، ة↔ה، پ↔פ، ن↔נ، م↔מ). سبق أن تسلّلت حروف عربية داخل مصطلحات عبرية فظهرت مكسورة للمستخدم (أُصلح في #196). عند الشك، ابنِ السلسلة من أكواد يونيكود العبرية (U+05D0–U+05EA) بدل الكتابة المباشرة، وافحص بـ regex أنّ أي كلمة لا تخلط النطاقين `[֐-׿]` و`[؀-ۿ]`. (هذا ينطبق على الكود **وعلى المحادثة** — إن تعذّر كتابة العبري نظيفاً في الشرح، استعمل الاسم العربي/النطق بدلاً منه.)
5. **ألوان/تدرّجات من `constants` (C/GRAD)** — لا hard-coding.
6. **حسابات في دوال نقيّة** (`calculations.js`/`insights.js`/`helpers.js`) قابلة للاختبار، والـ UI يقرأ منها.
7. **commit بعد كل مهمة مكتملة**. أضف/حدّث اختبار وحدة للدوال النقيّة الجديدة، واختبار E2E عند تغيير فلو واجهة مهم.
8. **لا تكسر** الشاشات القديمة قبل بناء البديل.
9. تأكّد `npm run build` ينجح قبل الدفع.

---

## 20. الحالة الحالية

- Branch رئيسي: `main`. الإصدار يتزايد تلقائياً (حالياً ~2.0.12x).
- وحدة المالية مكتملة (Phases 0→5)، المصادقة WebAuthn passkey حقيقية، الفريق متعدّد الصلاحيات، بوّابة العامل، اشتراكات Paddle، Push.
- **جهوزية الإطلاق** (مدموجة): صفحات قانونية (`/terms`,`/privacy`,`/refund`,`/contact`) + تنظيف الهبوط من محتوى وهمي · تقييد الميزات حسب الخطة (شاشة الفريق + **بوّابة العامل** على Pro + حدّ عمّال تجربة=1) + إدارة اشتراك بالإعدادات · فوترة سنوية · مراقبة أخطاء Sentry · إيميلات Resend · لافتة كوكيز · إشعارات فشل الدفع · **حذف الحساب الذاتي** (وعد سياسة الخصوصية + متطلّب App Store) · شارة الخطة بلوحة التحكم + شاشة ترحيب محسّنة.
- **متبقٍّ للإطلاق التجاري**: ضبط مفاتيح Paddle/Resend/Sentry للإنتاج (أو اعتماد بوّابة دفع إسرائيلية مثل iCount) + تفعيل Send Email Hook + توثيق نطاق Resend + تفعيل Leaked Password Protection. (الكود جاهز وخامل بأمان حتى تُضبط المفاتيح.)
- **طبقة الذكاء المالي** مدموجة وموسّعة: نبض المصلحة · التوقّع الذكي للسيولة · مركز القيادة · الذمّة الصافية · صحّة المشروع · رادار التحصيل · كشف شذوذ المصاريف · مدرج الضريبة · نبض الفريق · بصمة العامل · جاهزية الحساب — كلها دوال نقيّة في `insights.js`/`accountReadiness.js`/`workerInsights.js` مغطّاة باختبارات.
- **توحيد بصري**: kit الفخامة `ui/Premium.jsx` + هياكل تحميل (Skeleton) + مؤشّر اتصال، وبطاقات هوية موحّدة (مشروع/عامل/إيصال). جارٍ مطابقة باقي الشاشات على نفس اللغة (انظر §2.1).
- **بحث سوق**: `docs/MARKET_RESEARCH.md` — تقرير موثّق (منافسون/تسعير/نقاط ألم/جمهور عربي/قنوات تسويق) لتوجيه التسعير وصياغة الإعلان.
- **إصلاح ضريبي**: `TaxSummaryTab` صار يحسب ביטוח לאומي بشريحتين عبر `helpers.calcBituachLeumiAnnual` بدل نسبة مسطّحة (مغطّى بـ `helpers.test.js`).
- النشر: Vercel (أساسي) + GitHub Pages (مرآة) + Supabase edge functions — كلها تلقائية عند push لـ main.
