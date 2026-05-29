import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// ── مفاتيح localStorage ───────────────────────────────────────────────────────
const PASSKEY_KEY   = 'cpro_passkey_cred'     // علامة: البصمة مسجّلة على هذا الجهاز
const PIN_HASH_KEY  = 'cpro_pin_hash'
const PIN_CREDS_KEY = 'cpro_pin_creds'

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

  // ─── Passkeys — Supabase Native ───────────────────────────────────────────

  /**
   * تسجيل passkey على الجهاز (يحتاج المستخدم مسجّل دخوله مرة واحدة فقط)
   * المفاتيح تُخزَّن في Supabase — لا باسورد على الجهاز
   */
  async function registerPasskey() {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')
    try {
      const { data, error } = await supabase.auth.registerPasskey({
        friendlyName: `Contractor Pro — ${navigator.platform || 'Device'}`,
      })
      if (error) throw error
      localStorage.setItem(PASSKEY_KEY, 'registered')
      return data
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('فشل تسجيل البصمة: ' + (e.message || ''))
    }
  }

  /**
   * تسجيل دخول مباشر بالبصمة — بدون باسورد
   * Supabase يتحقق من البصمة على السيرفر ويعطي جلسة مباشرة
   */
  async function signInWithPasskey() {
    try {
      const { data, error } = await supabase.auth.signInWithPasskey()
      if (error) throw error
      localStorage.setItem(PASSKEY_KEY, 'registered')
      return data
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('فشلت البصمة — أعد التسجيل من الإعدادات: ' + (e.message || ''))
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

  /** هل البصمة مسجّلة على هذا الجهاز؟ */
  function hasPasskeyRegistered() {
    return !!localStorage.getItem(PASSKEY_KEY)
  }

  /** إلغاء علامة البصمة محلياً */
  function removePasskey() {
    localStorage.removeItem(PASSKEY_KEY)
  }

  // ─── PIN Login ────────────────────────────────────────────────────────────

  async function setPin(pin, password) {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN يجب أن يكون 4–6 أرقام')

    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (verifyErr) throw new Error('كلمة المرور غير صحيحة')

    const hash = await sha256(pin + user.email)
    localStorage.setItem(PIN_HASH_KEY, hash)
    localStorage.setItem('cpro_pin_email', user.email)

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

  async function signInWithPin(pin) {
    const stored = localStorage.getItem(PIN_HASH_KEY)
    if (!stored) throw new Error('لم يتم تعيين PIN على هذا الجهاز')
    const savedEmail = localStorage.getItem('cpro_pin_email')
    if (!savedEmail) throw new Error('أعد تعيين الـ PIN من الإعدادات')

    const hash = await sha256(pin + savedEmail)
    if (hash !== stored) throw new Error('PIN غير صحيح')

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

    const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e
  }

  function hasPinSet() { return !!localStorage.getItem(PIN_HASH_KEY) }

  function removePin() {
    localStorage.removeItem(PIN_HASH_KEY)
    localStorage.removeItem('cpro_pin_email')
    localStorage.removeItem(PIN_CREDS_KEY)
  }

  // ─── Magic Link ───────────────────────────────────────────────────────────

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  return {
    user, loading,
    signUp, signIn, signOut,
    signInWithMagicLink,
    registerPasskey, signInWithPasskey,
    isPasskeySupported, hasPasskeyRegistered, removePasskey,
    setPin, signInWithPin, hasPinSet, removePin,
  }
}
