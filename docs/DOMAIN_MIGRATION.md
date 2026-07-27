# 🌐 ترحيل النطاق — `app.linko.services` → `kabblan.com` + `app.kabblan.com`

## البنية الجديدة: نطاقان

| النطاق | يخدم | الفهرسة |
|---|---|---|
| **`kabblan.com`** | الهبوط · الأسعار · الحاسبات · المدوّنة · القانونية | مفهرس ✅ |
| **`app.kabblan.com`** | التطبيق · الدخول/التسجيل · بوّابة العامل · الأدمن | `noindex` ⛔ |

- على `app.kabblan.com` الجذر `/` بيفتح **التطبيق مباشرة** — بلا صفحة هبوط.
- المسارات المشتركة (`/pricing` + القانونية) بتُعرَض على النطاقين، والـcanonical
  تبعها دايماً على نطاق التسويق فما بيصير تكرار عند جوجل.
- **مصدر القرار الوحيد**: `src/lib/hosts.js` — أي مسار وصل النطاق الغلط بينحوّل
  لمكانه مع الحفاظ على الـquery والـhash. **التقسيم معطَّل على `localhost` ومعاينات
  Vercel** حتى لا ينكسر التطوير ولا معاينات الـPR.

> دليل تنفيذي كامل. القسم الأول (الكود) **منجَز** في هذا الفرع. الأقسام الباقية
> إعدادات خارجية لازم تعملها بالإيد بالترتيب المذكور.
> آخر تحديث: 2026-07-27.

---

## 0. القاعدة الذهبية

**لا تُطفئ النطاق القديم.** خلّيه شغّال على نفس مشروع Vercel لمدّة **12 شهر على الأقل**.
سبب الوجود:

| اللي بيكسر لو أطفأناه | التفصيل |
|---|---|
| روابط بوّابة العامل | كل عامل عنده رابط `app.linko.services/?portal` منتشر بالواتساب |
| صفحات الحاسبة المفهرسة | `/calculator/*` و`/vat-calculator` عليها ترتيب بجوجل — الـ301 هو اللي بينقل السلطة |
| تطبيق أندرويد المنشور | الـTWA المثبّت على أجهزة المستخدمين مضبوط على `host = app.linko.services` لحدّ ما ينزّلوا التحديث |
| Digital Asset Links | `/.well-known/assetlinks.json` لازم يظلّ مخدوم من النطاق القديم كمان |

---

## 1. تغييرات الكود ✅ (منجَزة بهذا الفرع)

| الملف | التغيير |
|---|---|
| `src/lib/seoRoutes.js` | `ORIGIN` → `https://kabblan.com` (مصدر واحد لكل canonical/OG/sitemap/prerender) |
| `index.html` | canonical + `og:url` + `og:image` + `twitter:image` + كل الـJSON-LD (`@id`/`url`/`logo`) |
| `public/robots.txt` | رابط الـSitemap |
| `src/pages/{Calculator,VatCalculator,CityCalculator,CityTradeCalculator}Page.jsx` | حذف الرابط المكتوب بالإيد → صاروا يستوردوا `ORIGIN` (ما بيتعتّقوا مرّة ثانية) |
| `src/pages/LegalPage.jsx` | `LEGAL_INFO.domain` |
| `supabase/functions/send-auth-email/index.ts` | افتراضي `APP_URL` + `EMAIL_FROM` |
| `supabase/functions/send-push/index.ts` | `mailto:` بتفاصيل VAPID |
| `android/twa-manifest.json` | `host` + `iconUrl` + `maskableIconUrl` + `webManifestUrl` + `fullScopeUrl` + `packageId` → `com.kabblan.app`، + النطاق القديم بـ`additionalTrustedOrigins` (انظر §8) |
| `.github/workflows/android.yml` + `public/.well-known/assetlinks.json` | الباكج الجديد (انظر §8) |
| `src/lib/domainMigration.js` | **جديد** — جسر الترحيل على العميل (انظر §2) |
| `src/lib/hosts.js` + `src/Router.jsx` | **جديد** — تقسيم تسويق × تطبيق والتحويل بينهما |
| `vercel.json` | ترويسة `X-Robots-Tag: noindex` لنطاق التطبيق والنطاق القديم |
| 9 دوال WebAuthn | `rpIdFromOrigin` — تثبيت البصمة على النطاق الأمّ (§6) |
| `src/lib/seoRoutes.js` | `/login` و`/register` صاروا `noindex` (انتقلوا لنطاق التطبيق) |

**ما تغيّر عمداً**: مفتاح التوقيع (`ANDROID_KEYSTORE_BASE64` — غير مرتبط باسم الباكج) ·
مدخل `app.linko.services` في `assetlinks.json` (لازم للنسخ المثبّتة — §8) · اسم حزمة npm
(`contractor-pro` — داخلي، غير مرئي للمستخدم).

---

## 2. جسر الترحيل على العميل (`src/lib/domainMigration.js`)

أي زيارة للنطاق القديم بتشغّل — **قبل تركيب React** — التسلسل التالي:

1. **يلغّي تسجيل الـService Worker ويمسح كل الكاشات.**
   بدون هالخطوة، الـSW القديم بيظلّ يعترض التنقّلات ويخدم نسخة مخزّنة **للأبد**
   (ولو حطّينا 301 من الخادم بيصير أسوأ: `/sw.js` نفسه بيصير redirect فبيفشل التحديث).
   هذا أخطر فخّ بترحيل نطاق PWA.
2. **ينقل التفضيلات المحلية** عبر الـhash (`#__kblmig=`) — والأهمّ **بيانات متتبّع الوحدات**
   (`tracker_*` / `extras_*` / `blueprints_*`) لأنّها **محلية بحتة، مش بالقاعدة**، وبتضيع
   كلياً بلا هالجسر (الـlocalStorage معزول لكل origin).
   ⛔ الأسرار ما بتُرحَّل عمداً: PIN، passkey، مفتاح التشفير، توكن جلسة العامل، جلسة Supabase.
3. **يحوّل لنفس المسار والـquery — على النطاق الصحيح حسب نوع المسار**:
   `?portal` وشاشات التطبيق → `app.kabblan.com` · صفحات `/calculator/*` المفهرسة →
   `kabblan.com`. والحمولة ما بتنكتب إلا على نطاق التطبيق (بيانات التطبيق تخصّ نطاقه).

> ⚠️ **لذلك: لا تضيف redirect من طرف الخادم على النطاق القديم الآن.** لازم النطاق القديم
> يظلّ يخدم الـHTML فعلياً حتى يشتغل الجسر. الـ301 من الخادم بيجي بالمرحلة الأخيرة (§8).

---

## 3. DNS + الاستضافة (Vercel)

1. عند مسجّل النطاق: وجّه `kabblan.com` و`www.kabblan.com` لـVercel
   (`A 76.76.21.21` للـapex + `CNAME cname.vercel-dns.com` للـwww — أو اتبع اللي بيعطيك ياه Vercel).
2. Vercel → Project → Settings → Domains:
   - أضف `kabblan.com` واجعله **Production / Primary**.
   - أضف **`app.kabblan.com`** → Production كذلك (نفس المشروع — نفس الحزمة تخدم
     النطاقين، والتقسيم يصير داخل `hosts.js`).
   - أضف `www.kabblan.com` → **Redirect to `kabblan.com` (308)**.
   - **أبقِ `app.linko.services` مربوطاً بنفس المشروع** (بلا redirect حالياً — §2).
3. الـDNS: سجلّ `A` للـapex + سجلّ `CNAME` لكل من `www` و**`app`**.
4. استنّى شهادة الـSSL تصير Valid **للنطاقات الثلاثة** قبل ما تكمّل.

---

## 4. Supabase

### 4.1 إعدادات المصادقة (Authentication → URL Configuration)
- **Site URL** → `https://app.kabblan.com` ← **نطاق التطبيق، لا التسويق** (الدخول
  والتسجيل يعيشان هناك).
- **Redirect URLs** — أضف (وأبقِ القديمة سنة):
  ```
  https://app.kabblan.com/**
  https://kabblan.com/**
  https://www.kabblan.com/**
  https://app.linko.services/**
  http://localhost:3000/**
  ```
  ⚠️ بدون هالخطوة: تأكيد الإيميل، استعادة كلمة السر، الدخول السحري، و**دخول
  الـpasskey** (بيمرّ عبر magic link) — كلها بترجع خطأ `redirect_to not allowed`.

### 4.2 أسرار Edge Functions — **لا شيء مطلوب الآن**

الأسرار المضبوطة فعلياً على المشروع: `VAPID_PRIVATE_KEY` · `VAPID_PUBLIC_KEY` ·
`SEND_PUSH_SECRET` · `TIKTOK_PIXEL_ID` · `TIKTOK_ACCESS_TOKEN` — **ولا واحد منها
مرتبط بالنطاق**.

- **`APP_URL` غير مضبوط** → الدالة تستعمل الافتراضي في الكود، وقد صار
  `https://app.kabblan.com`. فلا حاجة لضبط السرّ إطلاقاً.
- **`RESEND_API_KEY` و`SEND_EMAIL_HOOK_SECRET` غير مضبوطين** → دالة `send-auth-email`
  **غير مفعّلة أصلاً**، وSupabase يرسل إيميلات المصادقة بمرسله المدمج. لذلك
  `EMAIL_FROM` لا معنى له الآن، و**§5 (Resend) مؤجَّل بالكامل** لحين الإطلاق التجاري.
- ⇒ **رابط إيميلات المصادقة يحكمه `Site URL` في §4.1 وحده.** هذا يجعل §4.1 هو
  التغيير الوحيد المطلوب على Supabase.

### 4.3 لا تغييرات على القاعدة
الـRLS وكل الـRPCs مبنيّة على `auth.uid()` — مستقلّة عن النطاق. الـCORS على كل
الـedge functions `*` — ما بتحتاج تعديل.

---

## 5. البريد (Resend) — ⏸️ مؤجَّل (غير مفعّل حالياً — انظر §4.2)

1. Resend → Domains → أضف `kabblan.com` → أضف سجلات **SPF + DKIM + DMARC** بالـDNS.
2. استنّى الحالة تصير **Verified** (ساعة–24 ساعة).
3. **بعدها فقط** غيّر `EMAIL_FROM`. لو غيّرته قبل التوثيق → كل إيميلات المصادقة بتفشل
   والمستخدم الجديد ما بيقدر يأكّد حسابه.
4. غيّر بريد الدعم من `contractor.pro.linko@gmail.com` لـ`support@kabblan.com`
   (`LEGAL_INFO.supportEmail` في `src/pages/LegalPage.jsx`) بعد ما تجهّز الصندوق.

---

## 6. 🔴 البصمة/Passkeys — كسر متوقّع، جهّز المستخدم

الـWebAuthn مربوط بالنطاق (`rpID`). الكود بيشتقّ `rpID` من ترويسة `Origin` تلقائياً،
فالتسجيل الجديد بيشتغل فوراً على `kabblan.com` — **بس كل البصمات المسجّلة سابقاً على
`app.linko.services` ما بتشتغل** (المتصفح ببساطة ما بيعرضها). بينطبق على:
- بصمة المالك (`passkey_credentials`)
- بصمة العامل (بوّابة العامل)
- بصمة الأدمن (`admin_passkeys`)

> ✅ **تحسين مدموج**: `rpID` صار **مثبَّتاً على النطاق الأمّ `kabblan.com`** في كل دوال
> WebAuthn (`rpIdFromOrigin`)، بدل ما يُشتقّ من النطاق الفرعي الكامل. يعني البصمة
> المسجَّلة تشتغل على `kabblan.com` و`app.kabblan.com` معاً — وعلى أي نطاق فرعي
> تضيفه مستقبلاً بلا كسر جديد. **هذا يُحلّ مرّة واحدة فقط، فلا تُرجِع الاشتقاق القديم.**

**التخفيف**: المستخدم بيقدر يدخل بكلمة السر عادي ثم يعيد تسجيل البصمة من الإعدادات.
- ابعت إشعار/رسالة جماعية قبل التبديل: «رح نغيّر رابط التطبيق — بتحتاج تدخل بكلمة
  السر مرّة وحدة وتعيد تفعيل البصمة».
- ابعت نفس التنبيه للأدمن (`/admin`) — عنده بصمة كمان.

## 6.1 إشعارات الـPush — كسر متوقّع كمان

اشتراكات Web Push معزولة لكل origin. كل صفوف `push_subscriptions` القديمة بتصير
**ميتة** (بترجع 410 من خدمة الـpush). المستخدم بيعيد الاشتراك تلقائياً أوّل ما يفتح
التطبيق على النطاق الجديد ويوافق على الإذن. اختياري: نظّف الصفوف القديمة بعد شهر.

---

## 7. التحليلات والدفع والمراقبة

| الخدمة | المطلوب |
|---|---|
| **Paddle** | Settings → Website/Domain approval: أضف **`kabblan.com` و`app.kabblan.com`** (الأسعار على التسويق والترقية من داخل التطبيق). + حدّث روابط الـcheckout المسموحة. بدون هيك الـcheckout بينفتح ويفشل |
| **Google Search Console** | أنشئ خاصية جديدة لـ`kabblan.com` (توثيق DNS TXT) · قدّم `https://kabblan.com/sitemap.xml` · بعد ما تفعّل الـ301 (§8) استعمل **أداة Change of Address** من الخاصية القديمة للجديدة. ⚠️ `public/google2e9ae507788087c4.html` توثيق الخاصية القديمة — خلّيه |
| **GA4** | نفس الـMeasurement ID (`G-KFGX0K1VT5`) — حدّث Data Stream URL لـ`https://kabblan.com` وفعّل **قياس النطاقات الفرعية** ليتتبّع القمع من التسويق للتطبيق |
| **TikTok Events Manager** | وثّق `kabblan.com` كنطاق جديد + حدّث الـPixel domain. الـEvents API server-side ما بيتأثّر |
| **Sentry** | Project Settings → Allowed Domains: أضف `kabblan.com` و`app.kabblan.com` |
| **Google Play Console** | Store listing → روابط الخصوصية/الشروط/حذف الحساب → `https://kabblan.com/...` |

---

## 8. أندرويد (TWA) — تطبيق **جديد** بباكج `com.kabblan.app`

### ليش تطبيق جديد أصلاً؟

الباكج القديم `app.linko.services` **محجوز للأبد** عند جوجل من لحظة أوّل رفعة، ولا
بيتعدّل بمكانه. الطريق الوحيد لاسم مطابق للعلامة = **تسجيل تطبيق جديد** بالكونسول.

**هلق هي اللحظة الوحيدة اللي التبديل فيها مجاني**: التطبيق **ما انطلق للإنتاج أبداً**،
الاختبار المغلق **مسوّدة ما انطلقت**، و**صفر مختبِرين** → عدّاد الـ14 يوم واقف على صفر
أصلاً. يعني ما في مستخدمين ولا تقييمات ولا وقت بينخسر. بعد ما تجيب المختبِرين، الكلفة
بتصير خسارة عدّاد كامل.

### اللي تغيّر بالكود ✅

| الملف | التغيير |
|---|---|
| `android/twa-manifest.json` | `packageId` → `com.kabblan.app` · `host` → **`app.kabblan.com`** · `startUrl` → `/` · 1.0.3 / 112 |
| `.github/workflows/android.yml` | `packageName` للنشر التلقائي → `com.kabblan.app` |
| `public/.well-known/assetlinks.json` | مدخل جديد لـ`com.kabblan.app`، **والمدخل القديم محفوظ** (انظر التحذير تحت) |

> 🔑 **مفتاح التوقيع ما بتغيّر.** هو مخزَّن كسرّ `ANDROID_KEYSTORE_BASE64` وغير مرتبط
> باسم الباكج إطلاقاً — نفس المفتاح بوقّع الباكج الجديد بلا أي إعداد إضافي.

> ⚠️ **ليش أبقينا مدخل `app.linko.services` بملف الربط؟** لأنّ نسخة الاختبار الداخلي
> المثبّتة على أجهزتكم مضبوطة على النطاق القديم، وبعد التحويل بتوصل لـ`kabblan.com`.
> بلا هالمدخل بيطلع فوقها **شريط عنوان متصفح** بدل ما تشتغل ملء الشاشة. احذفه بعد ما
> تتخلّصوا من النسخ القديمة.

### خطوات Play Console (عليك)

1. **أنشئ تطبيق جديد**: Play Console → *All apps* → **Create app**
   - App name: `Kabblan - Contractor Manager` · اللغة الافتراضية: نفس القديم
   - نوع: App · مجاني
2. **Store listing**: انسخ الوصف والصور من التطبيق القديم (كلها محفوظة عندك — النصوص
   الجاهزة بـ`docs/GOOGLE_PLAY_PRODUCTION.md`).
3. **App content + Content rating**: أعد تعبئتها (الأجوبة موثّقة بنفس الملف:
   All ages · Advertising ID = No). حدّث روابط الخصوصية/الشروط/حذف الحساب لـ`kabblan.com`.
4. **ابنِ ورفع أوّل نسخة**: شغّل workflow **Build Android (TWA)** يدوياً → نزّل
   `app-release-bundle.aab` → ارفعه على **Internal testing**.
   > ⚠️ أوّل رفعة **لازم تكون يدوية** (شرط جوجل لإنشاء التطبيق وقبول الشروط)؛
   > بعدها الـAPI بيقدر ينشر التحديثات.
5. **🔴 خذ بصمة التوقيع الجديدة** — أهم خطوة وسهل تُنسى:
   Play Console → التطبيق الجديد → *Test and release* → **Setup → App integrity** →
   *App signing key certificate* → انسخ **SHA-256**.
   جوجل بتولّد **مفتاح توقيع جديد لكل تطبيق**، فبصمة التطبيق القديم **ما بتنفع**.
6. **أضف البصمة لملف الربط**: احطّها بمصفوفة `sha256_cert_fingerprints` تبعت
   `com.kabblan.app` في `public/.well-known/assetlinks.json` → ادمج → انتظر نشر Vercel.
7. **تحقّق من الربط**:
   ```
   curl -s https://kabblan.com/.well-known/assetlinks.json
   ```
   لازم يرجع مدخل `com.kabblan.app` وفيه الـSHA-256 اللي نسختها.
   ثم افتح التطبيق على جهاز — لو اشتغل **ملء الشاشة بلا شريط عنوان** فالربط سليم.
8. **أطلق الاختبار المغلق** + ضيف 12 مختبِر → **يبدأ عدّاد الـ14 يوم**.
9. **نظّف**: التطبيق القديم اتركه مركوناً بالكونسول (ما بيتحذف بعد أوّل رفعة، وما بيضرّ).

---

## 9. التسلسل الزمني الموصى به

| # | الخطوة | متى |
|---|---|---|
| 1 | DNS + إضافة النطاق على Vercel (§3) | يوم 0 |
| 2 | Supabase Auth URLs (§4.1) — **قبل النشر** | يوم 0 |
| 3 | ادمج هذا الفرع وانشر على الإنتاج | يوم 0 |
| 4 | فحص الدخان (§10) | يوم 0 |
| 5 | ~~Resend~~ — مؤجَّل، غير مفعّل (§4.2) | الإطلاق التجاري |
| 6 | Paddle + Sentry + TikTok + GA4 (§7) | يوم 1 |
| 7 | Search Console: خاصية جديدة + sitemap | يوم 1 |
| 8 | رسالة جماعية للمستخدمين عن البصمة (§6) | يوم 1 |
| 9 | إنشاء تطبيق Play جديد بباكج `com.kabblan.app` + رفع AAB + بصمة التوقيع الجديدة (§8) | أسبوع 1 |
| 10 | **بعد 30 يوم**: فعّل 301 من الخادم على النطاق القديم (باستثناء `/.well-known/*`) + أداة Change of Address | شهر 1 |
| 11 | أبقِ النطاق القديم مسجَّلاً ومحوَّلاً | 12 شهر+ |

---

## 10. فحص الدخان بعد النشر

```
□ https://kabblan.com                          يفتح صفحة الهبوط
□ https://app.kabblan.com                      يفتح **التطبيق مباشرة** (بلا صفحة هبوط)
□ https://kabblan.com/app                      يحوّل لـapp.kabblan.com/app
□ https://app.kabblan.com/calculator/haifa     يحوّل لـkabblan.com/calculator/haifa
□ https://kabblan.com/pricing                  يفتح بمكانه (مشترك — بلا تحويل)
□ https://app.linko.services                   يحوّل تلقائياً لـapp.kabblan.com
□ https://app.linko.services/?portal           يوصّل لبوّابة العامل على app.kabblan.com
□ https://app.linko.services/calculator/haifa  يحوّل لـkabblan.com (لا نطاق التطبيق)
□ curl -sI https://app.kabblan.com | grep -i x-robots-tag   → noindex
□ بيانات متتبّع الوحدات ظهرت بعد التحويل        (اختبرها بجهاز فيه بيانات فعلية)
□ تسجيل مستخدم جديد + إيميل التأكيد يوصل ورابطه يشتغل
□ استعادة كلمة السر — الرابط يفتح النطاق الجديد
□ دخول بكلمة السر ثم إعادة تسجيل passkey جديدة تشتغل
□ إشعار Push جديد يوصل بعد إعادة الاشتراك
□ صفحة /pricing → checkout بادل يفتح بلا رفض نطاق
□ curl -s https://kabblan.com/sitemap.xml | head   الروابط كلها kabblan.com
□ curl -s https://kabblan.com/robots.txt           سطر Sitemap صحيح
□ curl -s https://kabblan.com/.well-known/assetlinks.json
□ معاينة واتساب لرابط kabblan.com تعرض صورة OG صح
□ التطبيق الأندرويدي المثبّت لسّا شغّال (ما انكسر)
```

---

## 11. أخطاء ما تعملها

- ❌ **تغيير `packageId` بعد ما يصير عندك مستخدمين** → تطبيق جديد على Play وفقدان كل
  المستخدمين والتقييمات. (بدّلناه **الآن** تحديداً لأنّ العدد صفر — انظر §8.)
- ❌ **نسيان بصمة التوقيع الجديدة** بعد أوّل رفعة (§8 خطوة 5) → التطبيق بيفتح وفوقه شريط
  عنوان متصفح بدل ما يشتغل ملء الشاشة.
- ❌ **redirect 301 من الخادم على النطاق القديم من اليوم الأول** → الـSW القديم بيعلق للأبد
  وبيانات متتبّع الوحدات بتضيع (§2).
- ❌ **تغيير `EMAIL_FROM` قبل توثيق النطاق بـResend** → كل إيميلات المصادقة بتفشل.
- ❌ **نسيان Redirect URLs بـSupabase** → التأكيد/الاستعادة/الـpasskey كلها بتنكسر.
- ❌ **إطفاء `app.linko.services`** → روابط بوّابة العامل المنتشرة + ترتيب جوجل + التطبيقات
  المثبّتة، كلها بتموت دفعة وحدة.
- ❌ **كتابة رابط النطاق بالإيد بأي ملف جديد** → استورد `ORIGIN` من `src/lib/seoRoutes.js`.
