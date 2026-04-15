# دليل الإعداد - Contractor Pro v2

## الخطوات المطلوبة (مرة واحدة فقط)

---

### 1️⃣ إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ حساباً مجانياً
2. أنشئ مشروع جديد (اختر اسماً وكلمة مرور قوية)
3. انتظر دقيقة حتى يجهز المشروع

---

### 2️⃣ إعداد قاعدة البيانات

1. من لوحة Supabase → اضغط **SQL Editor**
2. انسخ محتوى ملف `supabase/schema.sql` بالكامل
3. الصقه في المحرر واضغط **Run**

---

### 3️⃣ نشر Edge Functions (للبصمة)

```bash
# ثبّت Supabase CLI
npm install -g supabase

# سجّل دخول
supabase login

# ربط المشروع (استبدل YOUR_PROJECT_ID بمعرّف مشروعك)
supabase link --project-ref YOUR_PROJECT_ID

# نشر الـ functions
supabase functions deploy webauthn-register-options
supabase functions deploy webauthn-register-verify
supabase functions deploy webauthn-auth-options
supabase functions deploy webauthn-auth-verify
```

---

### 4️⃣ إعداد متغيرات البيئة

1. انسخ الملف: `cp .env.example .env`
2. من Supabase → **Settings → API**:
   - انسخ **Project URL** → `VITE_SUPABASE_URL`
   - انسخ **anon public key** → `VITE_SUPABASE_ANON_KEY`

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 5️⃣ تشغيل المشروع

```bash
npm install
npm run dev
```

ثم افتح المتصفح على: `http://localhost:3000`

---

### 6️⃣ النشر على Netlify

```bash
npm run build
```

ارفع مجلد `dist` على Netlify، أو اربط المستودع مع Netlify للنشر التلقائي.

**ملاحظة:** أضف متغيرات البيئة في إعدادات Netlify:
- Site Settings → Environment Variables → أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY

---

## البصمة (Passkeys) - كيف تعمل؟

1. **المرة الأولى:** سجّل دخول بالإيميل وكلمة المرور
2. **بعدها:** اذهب للإعدادات ← اضغط "تفعيل الدخول بالبصمة"
3. **من الآن:** الدخول بالبصمة من شاشة تسجيل الدخول مباشرة

يعمل مع: iPhone Face ID / Touch ID، Android Fingerprint، Windows Hello
