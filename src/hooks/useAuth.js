import { useState, useEffect } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { supabase, SUPABASE_URL } from '../lib/supabase.js'

const PASSKEY_KEY  = 'cpro_passkey_cred'  // JSON { credentialId, rpId }
const PIN_HASH_KEY  = 'cpro_pin_hash'
const PIN_CREDS_KEY = 'cpro_pin_creds'

// ── Crypto helpers (PIN only) ─────────────────────────────────────────────────

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

// ── Edge function helpers ─────────────────────────────────────────────────────

async function callEdge(path, body, accessToken) {
  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

// ── Hook ──────────────────────────────────────────────────────────────────────

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

  // ─── Passkeys — server-side WebAuthn via edge functions ───────────────────

  async function registerPasskey() {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('انتهت الجلسة، سجّل الدخول من جديد')

    // 1. Get registration options from server
    const options = await callEdge('webauthn-register-options', {}, session.access_token)
    if (options.error) throw new Error(options.error)

    // 2. Trigger biometric (Face ID / fingerprint)
    let credential
    try {
      credential = await startRegistration(options)
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('فشل تسجيل البصمة: ' + (e.message || ''))
    }

    // 3. Verify and store on server.
    // مرّر بصمة هذا الجهاز الحالية (إن وُجدت) ليستبدلها الخادم فقط — تبقى بقية الأجهزة مفعّلة.
    let prevCredentialId = null
    try { prevCredentialId = JSON.parse(localStorage.getItem(PASSKEY_KEY) || 'null')?.credentialId || null } catch { /* ignore */ }
    const result = await callEdge('webauthn-register-verify', { credential, prev_credential_id: prevCredentialId }, session.access_token)
    if (result.error) throw new Error(result.error)

    // Store credential ID locally (not a secret — public identifier only)
    localStorage.setItem(PASSKEY_KEY, JSON.stringify({
      credentialId: result.credentialId,
      rpId: window.location.hostname,
    }))

    // Clean up any old passkey storage from previous approach
    localStorage.removeItem('cpro_passkey_enc')
    localStorage.removeItem('cpro_passkey_creds')
  }

  async function signInWithPasskey() {
    const stored = localStorage.getItem(PASSKEY_KEY)
    if (!stored) throw new Error('لا توجد بصمة مسجلة على هذا الجهاز')

    let credentialId
    try { credentialId = JSON.parse(stored).credentialId } catch {
      throw new Error('بيانات البصمة تالفة — أعد التسجيل من الإعدادات')
    }

    // 1. Get authentication challenge from server
    const options = await callEdge('webauthn-auth-options', { credentialId })
    if (options.error) throw new Error('بصمة غير معروفة — أعد التسجيل من الإعدادات')

    // 2. Trigger biometric
    let assertion
    try {
      assertion = await startAuthentication(options)
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('فشلت البصمة — أعد المحاولة')
    }

    // 3. Verify on server — server checks public key stored in DB
    const result = await callEdge('webauthn-auth-verify', { credentialId, credential: assertion })
    if (result.error) throw new Error(result.error)

    // 4. Exchange server token for a real Supabase session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: result.token_hash,
      type: 'magiclink',
    })
    if (error) throw new Error('فشل إنشاء الجلسة — أعد المحاولة')
    return data
  }

  function isPasskeySupported() {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }

  function hasPasskeyRegistered() {
    try {
      const stored = localStorage.getItem(PASSKEY_KEY)
      if (!stored) return false
      return !!JSON.parse(stored).credentialId
    } catch {
      return false
    }
  }

  async function removePasskey() {
    // Remove from DB (requires authenticated user — RLS allows uid = user_id).
    // ألغِ بصمة هذا الجهاز فقط إن توفّر معرّفها محلياً — تبقى الأجهزة الأخرى مفعّلة.
    let localCredId = null
    try { localCredId = JSON.parse(localStorage.getItem(PASSKEY_KEY) || 'null')?.credentialId || null } catch { /* ignore */ }
    if (user) {
      let q = supabase.from('passkey_credentials').delete().eq('user_id', user.id)
      if (localCredId) q = q.eq('credential_id', localCredId)
      await q
    }
    localStorage.removeItem(PASSKEY_KEY)
    localStorage.removeItem('cpro_passkey_enc')
    localStorage.removeItem('cpro_passkey_creds')
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
