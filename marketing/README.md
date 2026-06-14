# 📣 Marketing — أعمال الإنتاج الدعائي

أرشيف أعمال الفيديوهات الإعلانية لتطبيق **Contractor Pro**، مولّدة عبر **Higgsfield MCP** (صوت/صورة/فيديو) + **ffmpeg** (تركيب) + **Playwright** (التقاط شاشات حقيقية ورندرة بطاقات عربية).

> ملاحظة: ملفات الإنتاج الوسيطة (clips/silent/segments/frames) تبقى في `promo-frames/` المتجاهَل بـgit. هون فقط **الأعمال النهائية + المصادر + السكربتات**.

---

## 🎬 الفيديوهات النهائية — `final/`

| الملف | الوصف |
|-------|-------|
| `contractor-pro-ad.mp4` | إعلان ديناميكي 9:16 · ~20s. افتتاح سينمائي (مقاول بموقع بناء) + شاشة برند + 5 شاشات حقيقية بحركة Ken Burns + CTA + موسيقى. |
| `contractor-pro-ugc-adam.mp4` | شهادة UGC 9:16 · ~26s. الأفتار **Adam** يحكي بالعربي (lip-sync حقيقي) عن التطبيق + شاشات حقيقية + CTA. |

كلاهما **عمودي 1080×1920**، مناسب لـReels / TikTok / Stories.

---

## 🧱 الخط الإنتاجي (Pipeline)

```
شاشات حقيقية (Playwright /demoshot)  ─┐
بطاقات عربية مرندرة (Playwright)      ─┤
مولّدات Higgsfield (صوت/صورة/فيديو)   ─┼──►  ffmpeg (Ken Burns + تركيب + صوت)  ──►  final/*.mp4
موسيقى + voice-over عربي              ─┘
```

**قاعدة الجودة**: لا نخلّي الـAI يتخيّل واجهة التطبيق (يكسّر النص العربي). الشاشات تُلتقط حقيقية من الكود، والـAI يُستعمل للإنتاج المحيط (b-roll، موسيقى، أفتار، حركة).

---

## 📂 المحتويات

- **`source-screens/`** — 5 شاشات حقيقية من `/demoshot` (1236×2745): dashboard · projects · workers · workdays · expenses.
- **`assets/`** — عناصر تصميم مرندرة بالمتصفّح (تشكيل عربي سليم): بطاقات الافتتاح/الختام، عناوين سفلية لكل شاشة، خلفية مبرندة، قناع زوايا مدوّرة، طبقات overlay للـb-roll وlـAdam.
- **`higgsfield/`** — مولّدات Higgsfield الخام: `broll.png/.mp4` (لقطة المقاول)، `music.m4a` (موسيقى)، `adam.jpg` (صورة الأفتار)، `adam-talk.mp4` (Adam يحكي متزامن)، `vo.wav` (صوت عربي Omar).
- **`scripts/`** — سكربتات التوليد (انظر أسفل).
- **`final/`** — الإعلانان الجاهزان.

---

## 🤖 مولّدات Higgsfield المستعملة

| العنصر | الموديل | ملاحظات |
|--------|---------|---------|
| موسيقى الإعلان | `sonilo_music` | 20s، حماسي مع لمسة عود |
| لقطة المقاول (صورة) | `nano_banana_pro` (nano_banana_2) | 9:16، مقاول بموقع بناء وقت الغروب |
| لقطة المقاول (فيديو) | `kling3_0` | image-to-video، حركة كاميرا خفيفة |
| صوت Adam العربي | `inworld_text_to_speech` | صوت **Omar (ar)** |
| Adam يحكي (lip-sync) | `wan2_7` | start_image=صورة Adam + audio=الصوت العربي → تزامن شفايف حقيقي |

> 💡 **حلّ "ما بتعرف على المنتج"**: تطبيق SPA خلف تسجيل دخول → سكرابر Marketing Studio يلتقط صفحة الهبوط فقط. الحل المعتمد هون: التوليد **مباشرة من صورة الأفتار + الصوت** عبر `wan2_7` بدون الاعتماد على رابط/قراءة منتج إطلاقاً.

---

## 🔧 إعادة التوليد

> السكربتات كُتبت لتعمل من **جذر الريبو** وتكتب في `promo-frames/`. للأرشفة فقط — لإعادة التشغيل انسخها لمكانها أو عدّل المسارات.

**المتطلّبات**: `npm run dev` شغّال · ffmpeg · خطوط `Noto Sans/Kufi Arabic` · متصفّح Playwright (`npx playwright install chromium`).

```bash
# 1) شاشات حقيقية (يحتاج dev server)
SCREENS=dashboard,projects,workers,workdays,expenses DPR=3 OUT=promo-frames node scripts/demo-shots.mjs

# 2) بطاقات/خلفية/طبقات عربية
node promo-frames/cards.mjs && node promo-frames/assets.mjs
node promo-frames/broll-card.mjs && node promo-frames/adam-card.mjs

# 3) كليبات + تركيب
bash promo-frames/build-clips.sh          # الإعلان الديناميكي
bash promo-frames/build-testimonial.sh    # كليبات شهادة Adam
```

**سكربتات `scripts/`:**
- `cards.mjs` — بطاقات النص (هوك/CTA/عناوين سفلية).
- `assets.mjs` — خلفية مبرندة + قناع زوايا مدوّرة.
- `broll-card.mjs` / `adam-card.mjs` — طبقات overlay فوق فيديوهات b-roll/Adam.
- `build-clips.sh` — يبني الإعلان الديناميكي (Ken Burns + intro/outro).
- `build-testimonial.sh` — يبني كليبات شاشات شهادة Adam.

---

## 📅 النشر

أفضل وقت: **مساءً 20:00–22:00** (توقيت محلي)، أيام **أحد–خميس + سبت مساء**. المنصّات: Reels · TikTok · فيسبوك (جروبات المقاولين) · حالة واتساب. CTA ثابت: *"جرّب مجاناً 14 يوم، بدون بطاقة ائتمان."*
