---
name: promo-shots
description: توليد لقطات وبوسترات دعائية عالية الجودة من داخل التطبيق — شاشات حقيقية ببيانات وهمية (مسار /demoshot) و/أو بوسترات إعلانية بموك‑أب آيفون + عنوان + CTA (محرّك AdStudio، مسار /adstudio). استعمله عند طلب "صوّرلي شاشات التطبيق"، "اعملي صور دعائية/بوسترات للإعلانات"، "صور للستوري/انستغرام"، أو "صور المصلحة من جوّا". لمّا يُشغَّل بيسأل المستخدم أول: شو نوع الصور، أي شاشات/أفكار، أي مقاسات، أي جودة — ثم يولّد ويبعت.
---

# Promo Shots — صور وبوسترات دعائية من داخل التطبيق

وصفة معتمدة لتوليد:
- **شاشات التطبيق** الحقيقية ببيانات وهمية متماسكة (مسار `/demoshot`) — مقاس هاتف.
- **بوسترات إعلانية** (محرّك AdStudio، مسار `/adstudio`) — موك‑أب آيفون + عنوان + CTA بالهوية، بمقاسات Instagram/Story.

السكربتان المحفوظان: `scripts/demo-shots.mjs` و`scripts/ad-shots.mjs`
(أوامر: `npm run demo:shots` · `npm run ads:shots`). هالسكِيل يلفّهما بسؤال تفاعلي.

---

## 0) ⚠️ أول إشي — اسأل المستخدم شو بدّه (إلزامي)

**قبل أي تصوير**، استعمل أداة `AskUserQuestion` لتحديد النطاق. لا تفترض — اسأل:

1. **نوع الصور** (`النوع`): 
   - «شاشات التطبيق» (`/demoshot`)
   - «بوسترات إعلانية» (`/adstudio`)
   - «الاثنين»
2. **الشاشات/الأفكار** (`المحتوى`) — حسب النوع:
   - شاشات: dashboard · expenses · workers · projects · workdays · payments · materials
     (تجنّب `finance` — تعلق على "تحميل..." بوضع الديمو). خيار «أفضل 5» أو «حدّدها لي».
   - بوسترات: أفضل 9 (`0,1,3,4,7,10,11,13,29`) · كل الـ30 · أرقام محدّدة (0..29).
     (قائمة الأفكار كاملة في `src/pages/AdStudio.jsx` ثابت `IDEAS`.)
3. **المقاس(ات)** (`المقاس`, multiSelect):
   - شاشات: هاتف 412×915 (افتراضي).
   - بوسترات: square 1080×1080 · portrait 1080×1350 · story 1080×1920.
4. **الجودة/الصيغة** (`الجودة`): PNG 2x (أقصى — افتراضي) · JPEG (أخف للمشاركة) · PNG 1x (المقاس الأصلي).

> إن طلب المستخدم صراحةً تفاصيل كاملة بالرسالة، اقفز السؤال ونفّذ مباشرة.

---

## 1) جهّز البيئة (مرة لكل جلسة)

- **`.env.local`**: هوك بداية الجلسة ينشئه تلقائياً (قيم Supabase وهمية — بدونها الصفحة سوداء). إن لم يوجد:
  ```bash
  printf 'VITE_SUPABASE_URL=https://example.supabase.co\nVITE_SUPABASE_ANON_KEY=dummy-key-for-sandbox-preview\n' > .env.local
  ```
- **dev server** (تحقّق أولاً، وإلا شغّله بالخلفية وانتظر :3000):
  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || npm run dev   # بالخلفية
  for i in $(seq 1 25); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)" = 200 ] && break; sleep 1; done
  ```
  ⚠️ الحاوية أحياناً تعمل restart وتقتل السيرفر — تحقّق أنه شغّال قبل كل دفعة.

---

## 2) ولّد حسب اختيار المستخدم

### شاشات التطبيق
```bash
# أقصى جودة (PNG 4x) — كل الشاشات الأساسية
npm run demo:shots
# تخصيص
SCREENS=dashboard,expenses,workers DPR=4 FORMAT=png npm run demo:shots
FORMAT=jpeg QUALITY=92 DPR=3 npm run demo:shots          # نسخة خفيفة
```
الإخراج: `shots/`. كل الخيارات موثّقة براس `scripts/demo-shots.mjs`.

### بوسترات إعلانية
```bash
# أفضل 9 أفكار × (square + story) PNG 2x
npm run ads:shots
# تخصيص
IDEAS=0,7,10 SIZES=square,portrait,story FORMAT=png npm run ads:shots
```
الإخراج: `ads/`. كل الخيارات موثّقة براس `scripts/ad-shots.mjs`.

> **ملاحظة أداء**: التصوير عبر السكربت أسرع وأثبت من حلقات Playwright‑MCP الطويلة
> (اللي تتجاوز مهلة 60s). لو صوّرت يدوياً عبر MCP بدل السكربت، **قسّم لدفعات ≤3** كل مرة.

---

## 3) ابعت النتائج

- **عدد قليل** (≤5): ابعت الصور مباشرة بـ `SendUserFile`.
- **عدد كبير** أو PNG كبيرة (قد تظهر ⚠️ بالمعاينة): غلّفها بـ`.zip` وابعت الـzip:
  ```bash
  zip -q -j contractor-pro-promo.zip ads/*.png shots/*.png
  ```
- للمعاينة السريعة بالشات، ابعت نسخة JPEG خفيفة من 1–2 صور مع الـzip.

---

## 4) نظّف (مهم — لا توسّخ الريبو)

مجلّدات الإخراج والـzip متجاهَلة بـ`.gitignore` (`/shots/` · `/ads/` · `*.zip`).
بعد الإرسال احذف الـartifacts المؤقتة إن لزم — لا تـcommit صور ناتجة.

---

## مرجع سريع

| الإعداد | شاشات (`demo:shots`) | بوسترات (`ads:shots`) |
|---|---|---|
| المسار | `/demoshot?screen=…` | `/adstudio?idea=N&size=…` |
| المقاس | 412×915 (هاتف) | 1080×{1080\|1350\|1920} |
| الدقّة الافتراضية | DPR 4 (PNG) | DPR 2 (PNG) |
| الإخراج | `shots/` | `ads/` |
| التخصيص | `SCREENS`,`DPR`,`FORMAT`,`QUALITY` | `IDEAS`,`SIZES`,`DPR`,`FORMAT`,`QUALITY` |

المحرّكات: `src/pages/DemoShot.jsx` (بيانات الديمو) · `src/pages/AdStudio.jsx` (30 فكرة، ثابت `IDEAS`).
