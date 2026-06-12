// ── تشفير PIN محلي (مشترك بين useAuth و useBiometricConfirm) ───────────────────
// نموذج الأمان:
//   • الحمولة (توكنات جلسة Supabase، أو بيانات اعتماد قديمة) تُشفَّر AES-256-GCM
//     بمفتاح مشتقّ PBKDF2(pin, 600k iter, ملح عشوائي 16 بايت).
//   • التحقّق من صحّة الـ PIN يتمّ عبر فشل/نجاح فكّ التشفير (auth tag) — بلا أي
//     hash منفصل غير مملّح، وبلا تخزين البريد بنصّ صريح (نقاط ضعف سابقة).
//   • قفل بعد MAX_FAILS محاولات خاطئة → تُمسح البيانات ويُطلب الدخول بالباسورد.

const PIN_CREDS_KEY = 'cpro_pin_creds'
const PIN_FAILS_KEY = 'cpro_pin_fails'
// مفاتيح قديمة (نُنظّفها — لم تعد تُكتب) :
const LEGACY_HASH_KEY  = 'cpro_pin_hash'
const LEGACY_EMAIL_KEY = 'cpro_pin_email'

const PBKDF2_ITER = 600000
const MAX_FAILS   = 5

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function hasPin() {
  return !!localStorage.getItem(PIN_CREDS_KEY)
}

export function clearPin() {
  localStorage.removeItem(PIN_CREDS_KEY)
  localStorage.removeItem(PIN_FAILS_KEY)
  localStorage.removeItem(LEGACY_HASH_KEY)
  localStorage.removeItem(LEGACY_EMAIL_KEY)
}

// يخزّن حمولة (object) مشفّرة تحت الـ PIN، ويُنظّف المفاتيح القديمة وعدّاد المحاولات.
export async function savePinPayload(pin, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(pin, salt)
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const enc  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  localStorage.setItem(PIN_CREDS_KEY, JSON.stringify({
    v:    2,
    salt: Array.from(salt),
    iv:   Array.from(iv),
    enc:  Array.from(new Uint8Array(enc)),
  }))
  localStorage.removeItem(PIN_FAILS_KEY)
  localStorage.removeItem(LEGACY_HASH_KEY)
  localStorage.removeItem(LEGACY_EMAIL_KEY)
}

// يفكّ الحمولة. عند خطأ الـ PIN يرفع 'WRONG_PIN'، وبعد MAX_FAILS يمسح ويرفع 'PIN_LOCKED'.
export async function readPinPayload(pin) {
  const credStr = localStorage.getItem(PIN_CREDS_KEY)
  if (!credStr) throw new Error('NO_PIN')
  const { salt, iv, enc } = JSON.parse(credStr)
  try {
    const key = await deriveKey(pin, new Uint8Array(salt))
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(enc))
    localStorage.removeItem(PIN_FAILS_KEY) // نجاح → صفّر العدّاد
    return JSON.parse(new TextDecoder().decode(dec))
  } catch {
    const fails = (parseInt(localStorage.getItem(PIN_FAILS_KEY) || '0', 10) || 0) + 1
    if (fails >= MAX_FAILS) {
      clearPin()
      throw new Error('PIN_LOCKED')
    }
    localStorage.setItem(PIN_FAILS_KEY, String(fails))
    throw new Error('WRONG_PIN')
  }
}

// تحقّق فقط من صحّة الـ PIN (يُستعمل لفكّ قفل الجلسة الحيّة بلا إعادة مصادقة).
export async function verifyPin(pin) {
  await readPinPayload(pin)
}
