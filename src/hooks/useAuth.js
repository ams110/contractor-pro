import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'

const PASSKEY_KEY  = 'cpro_passkey_cred'
const SESSION_KEY  = 'cpro_passkey_sess'
const PIN_HASH_KEY = 'cpro_pin_hash'
const PIN_CREDS_KEY = 'cpro_pin_creds'
const PK_KEY_KEY   = 'cpro_pk_key'
const PK_CREDS_KEY = 'cpro_pk_creds'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// PBKDF2 → AES-GCM key (100k iterations, SHA-256)
async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // بعد أي login ناجح: جدّد الجلسة المخزّنة إذا كان PIN أو بصمة مفعّلَين
      if (session && (localStorage.getItem(PASSKEY_KEY) || localStorage.getItem(PIN_HASH_KEY))) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
        }))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ─── WebAuthn / Passkeys (بدون Edge Functions) ────────────────────────────

  /** تفعيل البصمة على الجهاز الحالي */
  async function registerPasskey(password) {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')

    // verify password first
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (verifyErr) throw new Error('كلمة المرور غير صحيحة')

    // challenge عشوائي محلي (كافٍ لتطبيق شخصي)
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const challengeB64 = btoa(String.fromCharCode(...challenge))

    let credential
    try {
      credential = await startRegistration({
        challenge:       challengeB64,
        rp:              { name: 'Contractor Pro', id: window.location.hostname },
        user:            { id: user.id, name: user.email, displayName: user.email },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification:        'required',
          residentKey:             'preferred',
        },
        timeout: 60000,
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('خطأ في تسجيل البصمة: ' + e.message)
    }

    // احفظ معرّف البصمة
    localStorage.setItem(PASSKEY_KEY, credential.id)

    // شفّر الـ credentials بمفتاح عشوائي (دائمة — لا تعتمد على التوكنات)
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const aesKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, true, ['encrypt'])
    const iv     = crypto.getRandomValues(new Uint8Array(12))
    const data   = new TextEncoder().encode(JSON.stringify({ email: user.email, password }))
    const enc    = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data)
    localStorage.setItem(PK_KEY_KEY,   JSON.stringify({ key: Array.from(rawKey), iv: Array.from(iv) }))
    localStorage.setItem(PK_CREDS_KEY, JSON.stringify(Array.from(new Uint8Array(enc))))

    // احتفظ بالجلسة أيضاً كـ fallback
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      }))
    }
  }

  /** تسجيل دخول بالبصمة */
  async function signInWithPasskey() {
    const credId = localStorage.getItem(PASSKEY_KEY)
    if (!credId) throw new Error('لا توجد بصمة مسجّلة على هذا الجهاز')

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const challengeB64 = btoa(String.fromCharCode(...challenge))

    try {
      await startAuthentication({
        challenge:        challengeB64,
        allowCredentials: [{ type: 'public-key', id: credId }],
        userVerification: 'required',
        timeout:          60000,
        rpId:             window.location.hostname,
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('فشلت البصمة: ' + e.message)
    }

    // البصمة نجحت — المسار الجديد: credentials مشفّرة → دخول مباشر
    const keyStr = localStorage.getItem(PK_KEY_KEY)
    const encStr = localStorage.getItem(PK_CREDS_KEY)
    if (keyStr && encStr) {
      const { key: rawKey, iv } = JSON.parse(keyStr)
      const aesKey = await crypto.subtle.importKey('raw', new Uint8Array(rawKey), { name: 'AES-GCM' }, false, ['decrypt'])
      const dec    = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, new Uint8Array(JSON.parse(encStr)))
      const { email, password } = JSON.parse(new TextDecoder().decode(dec))
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('فشل تسجيل الدخول — أعد تفعيل البصمة من الإعدادات')
      return
    }

    // fallback للأجهزة القديمة (قبل هذا التحديث)
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) { const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e }
    const { access_token, refresh_token } = JSON.parse(raw)
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      localStorage.removeItem(SESSION_KEY)
      const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e
    }
  }

  /** هل البصمة مدعومة على هذا الجهاز؟ */
  function isPasskeySupported() {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }

  /** هل البصمة مفعّلة على هذا الجهاز؟ */
  function hasPasskeyRegistered() {
    return !!localStorage.getItem(PASSKEY_KEY)
  }

  /** حذف البصمة من الجهاز */
  function removePasskey() {
    localStorage.removeItem(PASSKEY_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(PK_KEY_KEY)
    localStorage.removeItem(PK_CREDS_KEY)
  }

  // ─── PIN Login ────────────────────────────────────────────────────────────

  /** تعيين PIN جديد — يتطلب كلمة المرور الحالية لتشفير الـ credentials */
  async function setPin(pin, password) {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN يجب أن يكون 4–6 أرقام')

    // تحقق من كلمة المرور أولاً
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (verifyErr) throw new Error('كلمة المرور غير صحيحة')

    // احفظ hash الـ PIN للتحقق السريع
    const hash = await sha256(pin + user.email)
    localStorage.setItem(PIN_HASH_KEY, hash)
    localStorage.setItem('cpro_pin_email', user.email)

    // شفّر الـ email + password باستخدام PIN كمفتاح
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv   = crypto.getRandomValues(new Uint8Array(12))
    const key  = await deriveKey(pin, salt)
    const data = new TextEncoder().encode(JSON.stringify({ email: user.email, password }))
    const enc  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
    localStorage.setItem(PIN_CREDS_KEY, JSON.stringify({
      salt: Array.from(salt),
      iv:   Array.from(iv),
      enc:  Array.from(new Uint8Array(enc)),
    }))
  }

  /** تسجيل دخول بالـ PIN */
  async function signInWithPin(pin) {
    const stored = localStorage.getItem(PIN_HASH_KEY)
    if (!stored) throw new Error('لم يتم تعيين PIN على هذا الجهاز')
    const savedEmail = localStorage.getItem('cpro_pin_email')
    if (!savedEmail) throw new Error('أعد تعيين الـ PIN من الإعدادات')

    // تحقق من الـ hash أولاً (سريع)
    const hash = await sha256(pin + savedEmail)
    if (hash !== stored) throw new Error('PIN غير صحيح')

    // المسار الجديد: credentials مشفّرة → دخول مباشر بدون اعتماد على التوكنات
    const credStr = localStorage.getItem(PIN_CREDS_KEY)
    if (credStr) {
      const { salt, iv, enc } = JSON.parse(credStr)
      const key = await deriveKey(pin, new Uint8Array(salt))
      const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(enc))
      const { email, password } = JSON.parse(new TextDecoder().decode(dec))
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('فشل تسجيل الدخول — أعد تعيين الـ PIN من الإعدادات')
      return
    }

    // fallback للأجهزة القديمة التي أعدّت الـ PIN قبل هذا التحديث
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) { const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e }
    const { access_token, refresh_token } = JSON.parse(raw)
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      localStorage.removeItem(SESSION_KEY)
      const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e
    }
  }

  function hasPinSet() { return !!localStorage.getItem(PIN_HASH_KEY) }

  function removePin() {
    localStorage.removeItem(PIN_HASH_KEY)
    localStorage.removeItem('cpro_pin_email')
    localStorage.removeItem(PIN_CREDS_KEY)
  }

  return {
    user, loading,
    signUp, signIn, signOut,
    registerPasskey, signInWithPasskey,
    isPasskeySupported, hasPasskeyRegistered, removePasskey,
    setPin, signInWithPin, hasPinSet, removePin,
  }
}

