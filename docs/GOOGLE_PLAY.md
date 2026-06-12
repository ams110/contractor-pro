# دليل النشر على Google Play (TWA)

Contractor Pro تطبيق **PWA**. النشر على Google Play يتمّ عبر **Trusted Web Activity (TWA)** —
غلاف Android رفيع يفتح الموقع الحيّ (`https://app.linko.services`) بملء الشاشة بلا شريط عنوان.

> ملاحظة: التطبيق نفسه (الكود/الميزات) **جاهز**. هذا الدليل لخطوات التغليف والنشر فقط،
> ويحتاج بيانات لا يمكن توليدها من الكود (اسم الحزمة + بصمة توقيع Google Play + بيانات قانونية).

---

## 1. المتطلّبات قبل البدء

| المتطلّب | الحالة | المصدر |
|----------|--------|--------|
| سياسة خصوصية على رابط عام | ✅ موجود | `https://app.linko.services/privacy` |
| شروط استخدام | ✅ موجود | `/terms` |
| حذف الحساب داخل التطبيق + ويب | ✅ موجود | الإعدادات ← منطقة الخطر |
| PWA manifest مكتمل | ✅ (id/categories/maskable/ألوان موحّدة) | `vite.config.js` |
| `assetlinks.json` | ⚠️ سقالة جاهزة — تحتاج البصمة | `public/.well-known/assetlinks.json` |
| اسم الحزمة (package name) | ⚠️ مقترح `services.linko.app` — أكّده | أدناه |
| حساب Google Play Console (25$ مرّة واحدة) | ⬜ | play.google.com/console |
| كيان قانوني للمشغّل (اسم/عنوان) | ⚠️ راجع `LEGAL_INFO` في `src/pages/LegalPage.jsx` | — |

---

## 2. توليد غلاف TWA عبر Bubblewrap

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://app.linko.services/manifest.webmanifest
# الأسئلة المهمّة:
#   Package name:        services.linko.app   (أو ما تختاره — يجب أن يبقى ثابتاً للأبد)
#   App name:            Contractor Pro
#   Launcher name:       Contractor Pro
#   Display mode:        standalone
#   Orientation:         portrait
#   Status bar color:    #F97316
#   Splash color:        #07080F
bubblewrap build        # يُنتج app-release-bundle.aab + مفتاح توقيع
```

بدل Bubblewrap يمكن استخدام **PWABuilder.com** (يولّد نفس الـ `.aab` من رابط الموقع بدون أدوات محلية).

---

## 3. ربط الدومين (Digital Asset Links) — إلزامي لإخفاء شريط العنوان

1. بعد رفع أول `.aab` على Play Console، فعّل **Play App Signing**، ثم انسخ
   بصمة **SHA-256** من: `Play Console ← Setup ← App signing ← App signing key certificate`.
2. ضع البصمة (وأكّد اسم الحزمة) في `public/.well-known/assetlinks.json` بدل
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`.
3. انشر الموقع وتأكّد أنّ الملف يُخدَم **كـ JSON خام** على:
   `https://app.linko.services/.well-known/assetlinks.json`
   - على **Vercel**: ملفات `public/` تُخدَم قبل إعادة كتابة الـ SPA، فالملف يعمل مباشرة.
   - تحقّق أنّه لا يُعاد توجيهه إلى `index.html` (افتح الرابط وتأكّد أنّ الناتج JSON).
4. تحقّق رسمياً:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.linko.services&relation=delegate_permission/common.handle_all_urls`

---

## 4. نموذج Data Safety (Play Console)

البيانات المجموعة (من `src/pages/LegalPage.jsx` §البيانات):
- **معلومات شخصية**: الاسم، البريد الإلكتروني، رقم المقاول (اختياري).
- **بيانات أعمال**: المشاريع، العمّال، أيام العمل، المصاريف، المقبوضات، الرواتب.
- **بيانات تقنية**: جلسة/جهاز لأغراض الأمان وتسجيل الدخول.
- **لا** بيانات بطاقات بنكية (الدفع عبر Paddle كـ Merchant of Record).
- **لا** تتبّع إعلاني.
- **مشاركة مع**: Paddle (الفوترة) + Supabase (الاستضافة).
- التشفير أثناء النقل: نعم (HTTPS). حذف الحساب: متاح داخل التطبيق وعبر البريد.

---

## 5. أصول صفحة المتجر

- **أيقونة 512×512**: `public/pwa-512.png`.
- **Feature graphic 1024×500**: يُولَّد عبر سكِيل `promo-shots` / `npm run ads:shots`.
- **لقطات شاشة الهاتف**: `npm run demo:shots` (مسار `/demoshot`) — ≥ 2 لقطات مطلوبة.
- الوصف والكلمات المفتاحية: انظر `index.html` (meta) و`docs/MARKET_RESEARCH.md`.

---

## 6. قائمة تحقّق نهائية قبل الرفع

- [ ] أكّد اسم الحزمة النهائي وثبّته في `assetlinks.json` و Bubblewrap.
- [ ] ضع بصمة SHA-256 الحقيقية في `assetlinks.json` وانشرها.
- [ ] عبّئ `LEGAL_INFO` ببيانات الكيان القانوني الحقيقية + تأكّد أنّ `support@linko.services` مُراقَب.
- [ ] طبّق ترحيلات قاعدة البيانات الأمنية (انظر `supabase/migrations/`) على الإنتاج.
- [ ] انشر edge functions المحدّثة (webauthn verify) على الإنتاج.
- [ ] جهّز ≥ 2 لقطة شاشة + أيقونة + feature graphic.
- [ ] عبّئ نموذج Data Safety + رابط سياسة الخصوصية في Play Console.
