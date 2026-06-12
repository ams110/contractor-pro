# نشر Contractor Pro على Google Play (TWA)

التطبيق **PWA** منشور على `https://app.linko.services`. لرفعه على Google Play نلفّه بحاوية
**TWA (Trusted Web Activity)** عبر [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) —
حاوية أندرويد رفيعة بتفتح الموقع بملء الشاشة بدون شريط عنوان (هي الطريقة الرسمية من Google لتطبيقات PWA).

## الهوية الثابتة (لا تتغيّر بعد أول نشر)

| الحقل | القيمة |
|------|--------|
| **Package / Application ID** | `services.linko.app` |
| **اسم التطبيق** | Contractor Pro |
| **الدومين** | `app.linko.services` |
| **مصدر الإعداد** | `android/twa-manifest.json` |

## 1. مفتاح التوقيع (Upload Key) — ⚠️ احتفظ فيه للأبد

المفتاح: `android/android-upload.keystore` · alias: `upload` · خوارزمية RSA 2048، صلاحية 10000 يوم.

> **حرج:** هذا المفتاح + كلمة سرّه **لازم تنحفظ بمكان آمن دائم** (مدير كلمات سر / خزنة).
> بدونه ما بتقدر تنشر **تحديثات** للتطبيق. الكونتينر مؤقّت — نزّل نسخة منه فوراً.
> الملف **مستثنى من git** عمداً (`.gitignore`) لأنه سرّي.

بصمة الـ SHA-256 للمفتاح:
```
77:31:76:61:F9:40:3D:3D:97:9D:52:DD:DE:E6:A1:BD:49:53:71:4B:B3:7D:47:0A:FA:22:DC:8E:B0:B2:22:7A
```

لو احتجت تطبع البصمة مرّة ثانية:
```bash
keytool -list -v -keystore android/android-upload.keystore -alias upload
```

## 2. ملف Digital Asset Links — يشيل شريط العنوان

عشان تفتح الحاوية الموقع بملء الشاشة (بدون شريط URL)، أندرويد بيتأكد من ملكية الدومين عبر:
`https://app.linko.services/.well-known/assetlinks.json`

الملف موجود بالريبو في `public/.well-known/assetlinks.json` وبيتنشر تلقائياً مع Vercel.

> **مهم جداً مع Google Play App Signing:** لما تفعّل Play App Signing (الافتراضي)، Google
> بيعيد توقيع التطبيق بمفتاحه الخاص. عشان التحقّق ينجح على النسخ المنزّلة من المتجر، **لازم
> تضيف بصمة SHA-256 تبع مفتاح توقيع Google** لمصفوفة `sha256_cert_fingerprints`:
>
> 1. بعد إنشاء التطبيق ورفع أول AAB، روح Play Console → **Test and release → Setup → App integrity → App signing**.
> 2. انسخ **SHA-256 certificate fingerprint** تبع *App signing key*.
> 3. ضيفه للمصفوفة في `public/.well-known/assetlinks.json` (بتصير فيها بصمتين: مفتاح الرفع تبعنا + مفتاح Google).
> 4. ادفع التغيير (بيتنشر على Vercel).

شكل الملف النهائي بعد إضافة بصمة Google:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "services.linko.app",
    "sha256_cert_fingerprints": [
      "77:31:...:7A",          // مفتاح الرفع (الحالي)
      "AA:BB:...:FF"           // مفتاح توقيع Google (من Play Console)
    ]
  }
}]
```

## 3. بناء ملف الرفع (.aab) محلياً

المتطلّبات: JDK 17 + Android SDK (build-tools 34.0.0, platform android-34).

```bash
cd android
# كلمات سرّ المفتاح عبر متغيّرات البيئة (لا تكتبها بالأوامر مباشرة)
export BUBBLEWRAP_KEYSTORE_PASSWORD='********'
export BUBBLEWRAP_KEY_PASSWORD='********'

# توليد مشروع أندرويد من twa-manifest.json (عند تغيير الإعداد)
npx @bubblewrap/cli update

# البناء → بينتج app-release-bundle.aab (للمتجر) + app-release-signed.apk (للتجربة)
npx @bubblewrap/cli build
```

المخرجات:
- **`app-release-bundle.aab`** ← هاد اللي بترفعه على Google Play.
- **`app-release-signed.apk`** ← للتجربة على جهاز قبل الرفع (`adb install`).

## 4. خطوات Google Play Console

1. **Create app** → اسم: Contractor Pro · لغة افتراضية: العربية · نوع: App · مجاني/مدفوع.
2. أكمل **App content**: سياسة الخصوصية (`https://app.linko.services/privacy`)، تصنيف المحتوى،
   الجمهور المستهدف، أمان البيانات (Data safety)، الوصول للتطبيق.
3. **Production → Create new release** → فعّل **Google Play App Signing** (موصى به).
4. ارفع `app-release-bundle.aab`.
5. خُد بصمة SHA-256 تبع مفتاح توقيع Google وضيفها لـ `assetlinks.json` (خطوة 2).
6. عبّي **Store listing**: وصف، أيقونة 512×512، Feature graphic 1024×500، سكرينشوتات (استعمل سكِيل `promo-shots`).
7. أرسل للمراجعة.

## 5. ترقية الإصدار (تحديثات لاحقة)

`npx @bubblewrap/cli update` بيرفع `appVersionCode` تلقائياً بكل مرة. تأكّد إنه **أعلى** من
آخر إصدار منشور، أعد البناء بنفس المفتاح، وارفع الـ AAB الجديد.

## ملاحظات

- المحتوى الفعلي بيتحمّل من `app.linko.services` (مش مدمج بالـ APK)، فأي تحديث للويب بينعكس فوراً
  بدون تحديث على المتجر — التحديث على المتجر فقط لتغييرات الحاوية نفسها (أيقونة، اسم، صلاحيات).
- الإشعارات (Web Push) مفعّلة بالحاوية (`enableNotifications: true`).
- لو ما بدك تبني محلياً: [PWABuilder.com](https://www.pwabuilder.com) بياخد رابط الموقع وبيولّد
  AAB جاهز + assetlinks بنفس المنطق.
