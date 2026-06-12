# Android (TWA) — كيف نطلّع نسخة لجوجل بلاي

التطبيق **PWA** (موقع ويب) ملفوف لأندرويد كـ **TWA** (Trusted Web Activity) عبر
**Bubblewrap**. الغلاف الأندرويدي رفيع: بيفتح الموقع الحيّ `app.linko.services/app`
داخل نافذة بلا متصفّح. الإعداد كله في `twa-manifest.json`.

## القاعدة الذهبية: متى نحتاج APK ومتى لأ

| نوع التغيير | بيحتاج بناء/رفع APK؟ | كيف يوصل للمستخدم |
|------------|----------------------|---------------------|
| **محتوى / ميزات / UI / إصلاحات** (شبه كل الشغل) | ❌ **لأ** | تلقائياً وفوراً — الـTWA بيحمّل الموقع الحيّ. بمجرّد ما يندمج التغيير على `main` وينشر Vercel، المستخدم يفتح التطبيق فيشوف آخر نسخة بلا أي تحديث من المتجر |
| **الغلاف الأصلي** (الأيقونة، الاسم، `packageId`، splash، الألوان، الإشعارات، `minSdkVersion`، النطاق) | ✅ نعم | عدّل `twa-manifest.json` → ابنِ AAB → ارفعه يدوياً على Play Console |
| **إصدار جديد للمتجر فقط** (بلا تغيير غلاف) | ✅ نعم (لرفع `versionCode`) | نفس الأعلى |

> الخلاصة: **التحديثات العادية ما بتحتاج APK إطلاقاً.** الـAPK فقط لتغييرات الغلاف
> أو لرفعة رسمية جديدة على المتجر.

## كيف يتصرّف كلود عند أي تحديث مستقبلي

1. **تغيير عادي** (ميزة/إصلاح/تصميم): كلود يعدّل الكود → commit → PR → دمج على `main`.
   Vercel ينشر تلقائياً → مستخدمو الأندرويد ياخدوه حيّاً. **لا APK، لا رفع لجوجل.**
2. **تغيير بالغلاف** (مثلاً غيّرنا الأيقونة أو اسم التطبيق): كلود يعدّل `twa-manifest.json`
   (و`public/.well-known/assetlinks.json` لو لزم) ويخبرك إنه **لازم رفعة جديدة للمتجر**.
3. **بناء النسخة**: **يدوي بقرارك** — إنت تشغّل workflow «Build Android (TWA)» من تبويب
   Actions. كلود **ما بينشر تلقائياً على جوجل**؛ بس بجهّز الإعداد وبنبّهك.
4. **الرفع للمتجر**: تنزّل الـAAB من الـArtifacts وترفعه على Play Console بنفسك.

## بناء النسخة (workflow يدوي)

`.github/workflows/android.yml` → تبويب **Actions** → **Build Android (TWA)** → **Run workflow**:
- `versionName`: الاسم الظاهر (مثلاً `1.0.2`).
- `versionCode`: رقم صحيح **لازم يكبر كل رفعة**. اتركه فاضي ليُشتقّ تلقائياً من رقم التشغيل
  (`100 + run_number`، يتزايد دائماً).

المخرجات (Artifacts): `app-release-bundle.aab` (للرفع على Play) + `app-release-signed.apk`
(للتجربة المباشرة على جهاز). يبنيهما Bubblewrap موقّعين بمفتاح الرفع.

### النشر التلقائي على Google Play (اختياري)

مدخلات الـworkflow كمان فيها:
- `publish` (checkbox): لو فعّلته، يرفع الـAAB مباشرة على Play بعد البناء (عبر
  Google Play Developer API). مطفأ افتراضياً → بناء فقط بلا نشر.
- `track`: المسار — `internal` (مختبرون داخليون، فوري بلا مراجعة) / `alpha` / `beta`
  / `production` (كل المستخدمين، يمرّ بمراجعة جوجل). الافتراضي `internal`.
- `status`: `draft` (يرفعه كمسوّدة بتأكّدها إنت بضغطة في Play Console — **محطة أمان**) أو
  `completed` (يطلق على المسار مباشرة). الافتراضي `draft`.

**سرّ إضافي مطلوب للنشر التلقائي**: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — مفتاح حساب خدمة من
Play Console بصلاحية **Release manager**:
1. Play Console → Setup → **API access** → اربط مشروع Google Cloud.
2. أنشئ **Service Account** ونزّل مفتاح **JSON**.
3. امنحه دور **Release manager** على التطبيق.
4. الصق محتوى ملف الـJSON كاملاً في السرّ `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

> ⚠️ هذا المفتاح يقدر ينشر نيابة عنك — تعامل معه كأخطر سرّ. للأمان: استعمل `track: internal`
> أو `status: draft` حتى تطمئن قبل ما تخلّي `production` + `completed`.
> **شرط جوجل**: أوّل نسخة لازم ترفعها يدوياً مرة على Play Console (لإنشاء التطبيق وقبول
> الشروط)؛ بعدها الـAPI يقدر يرفع التحديثات.

### الأسرار المطلوبة (مرة واحدة — Settings → Secrets → Actions)

| السرّ | المحتوى |
|------|---------|
| `ANDROID_KEYSTORE_BASE64` | محتوى مفتاح الرفع `android-upload.keystore` بصيغة base64 |
| `ANDROID_KEYSTORE_PASSWORD` | كلمة سرّ الـkeystore |
| `ANDROID_KEY_PASSWORD` | كلمة سرّ المفتاح (alias `upload`) |

توليد الـbase64 من المفتاح:
```bash
base64 -w0 android-upload.keystore   # Linux
base64 -i  android-upload.keystore   # macOS
```

> ⚠️ **مفتاح الرفع لا يُحفظ بالريبو إطلاقاً** (`.gitignore` يمنع `*.keystore`/`*.aab`/`*.apk`).
> احتفظ به بأمان: ضياعه يمنعك من تحديث التطبيق على Play لاحقاً.

## ربط التحقّق (Digital Asset Links)

`public/.well-known/assetlinks.json` لازم يحوي بصمة SHA-256 لمفتاح **التوقيع النهائي**
على Play. إذا تستعمل **Play App Signing** (الموصى به)، انسخ البصمة من
Play Console → Setup → App signing، وحدّث الملف، وانشر الموقع. بلا هذا الربط الصحيح،
الـTWA بيظهر شريط متصفّح بدل ملء الشاشة.
