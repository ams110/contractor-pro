import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const PASSKEY_KEY   = 'cpro_passkey_cred'   // JSON { credentialId, rpId }
const PASSKEY_ENC   = 'cpro_passkey_enc'    // legacy: encrypted refresh_token
const PASSKEY_CREDS = 'cpro_passkey_creds'  // JSON { iv, enc } — encrypted { email, password }
const PIN_HASH_KEY  = 'cpro_pin_hash'
const PIN_CREDS_KEY = 'cpro_pin_creds'

// ── Crypto helpers ────────────────────────────────────────────────────────────

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

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('cpro_keys', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore('keys')
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

async function idbPut(key, value) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite')
    if (value === undefined) {
      tx.objectStore('keys').delete(key)
    } else {
      tx.objectStore('keys').put(value, key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = e => reject(e.target.error)
  })
}

async function idbGet(key) {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly')
    const req = tx.objectStore('keys').get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = e => reject(e.target.error)
  })
}

function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

// Silently re-encrypts the latest refresh_token into PASSKEY_ENC so the
// stored passkey credential never goes stale after a password login or an
// automatic token rotation by Supabase.
async function _silentlyUpdatePasskeyToken(refreshToken) {
  try {
    if (!localStorage.getItem(PASSKEY_KEY)) return
    const aesKey = await idbGet('cpro_aes')
    if (!aesKey) return
    const iv  = crypto.getRandomValues(new Uint8Array(12))
    const enc = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(refreshToken)
    )
    localStorage.setItem(PASSKEY_ENC, JSON.stringify({
      iv:  Array.from(iv),
      enc: Array.from(new Uint8Array(enc)),
    }))
  } catch {}
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Keep the stored passkey token fresh on every login and auto-refresh
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.refresh_token) {
        _silentlyUpdatePasskeyToken(session.refresh_token)
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

  // ─── Passkeys — raw WebAuthn + IndexedDB AES key + encrypted refresh_token ──

  // password is required — verified against Supabase before storing credentials.
  async function registerPasskey(password) {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')
    if (!password) throw new Error('كلمة المرور مطلوبة لتفعيل البصمة')

    // Verify the password is correct before storing it
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (verifyErr) throw new Error('كلمة المرور غير صحيحة')

    // Create platform WebAuthn credential — triggers Face ID / fingerprint
    let credential
    try {
      credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Contractor Pro', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id.replace(/-/g, '').slice(0, 32)),
            name: user.email,
            displayName: user.email,
          },
          pubKeyCredParams: [
            { alg: -7,   type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            requireResidentKey: false,
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('فشل تسجيل البصمة: ' + (e.message || ''))
    }

    if (!credential) throw new Error('فشل إنشاء بيانات البصمة')

    // Generate AES-256 key and persist in IndexedDB (origin-bound)
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    )
    await idbPut('cpro_aes', aesKey)

    // Encrypt { email, password } — used for direct server login on each biometric attempt
    const iv  = crypto.getRandomValues(new Uint8Array(12))
    const enc = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(JSON.stringify({ email: user.email, password }))
    )
    localStorage.setItem(PASSKEY_CREDS, JSON.stringify({
      iv: Array.from(iv),
      enc: Array.from(new Uint8Array(enc)),
    }))

    // Clear old refresh_token storage (migration)
    localStorage.removeItem(PASSKEY_ENC)

    // Store credential ID (base64url) + rpId
    localStorage.setItem(PASSKEY_KEY, JSON.stringify({
      credentialId: credential.id,
      rpId: window.location.hostname,
    }))
  }

  async function signInWithPasskey() {
    const stored = localStorage.getItem(PASSKEY_KEY)
    if (!stored) throw new Error('لا توجد بصمة مسجلة على هذا الجهاز')

    let credInfo
    try { credInfo = JSON.parse(stored) } catch {
      throw new Error('بيانات البصمة تالفة — أعد التسجيل من الإعدادات')
    }

    const { credentialId, rpId } = credInfo

    // Trigger biometric via WebAuthn assertion
    let assertion
    try {
      assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: rpId || window.location.hostname,
          allowCredentials: [{ type: 'public-key', id: b64urlToBytes(credentialId) }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('فشلت البصمة — أعد التسجيل من الإعدادات')
    }

    if (!assertion) throw new Error('فشلت البصمة — أعد التسجيل من الإعدادات')

    // Retrieve AES key from IndexedDB
    const aesKey = await idbGet('cpro_aes')
    if (!aesKey) throw new Error('مفتاح التشفير مفقود — أعد تسجيل البصمة من الإعدادات')

    // ── New path: server-verified login via stored credentials ────────────────
    const credsStr = localStorage.getItem(PASSKEY_CREDS)
    if (credsStr) {
      let email, password
      try {
        const { iv, enc } = JSON.parse(credsStr)
        const dec = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(iv) },
          aesKey,
          new Uint8Array(enc)
        )
        ;({ email, password } = JSON.parse(new TextDecoder().decode(dec)))
      } catch {
        throw new Error('فشل فك التشفير — أعد تسجيل البصمة من الإعدادات')
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('فشل التحقق مع السيرفر — أعد تسجيل البصمة من الإعدادات')
      return data
    }

    // ── Legacy path: refresh_token (old registrations before this update) ─────
    const encStr = localStorage.getItem(PASSKEY_ENC)
    if (!encStr) throw new Error('لا توجد بيانات بصمة — أعد التسجيل من الإعدادات')

    let refreshToken
    try {
      const { iv, enc } = JSON.parse(encStr)
      const dec = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        aesKey,
        new Uint8Array(enc)
      )
      refreshToken = new TextDecoder().decode(dec)
    } catch {
      throw new Error('فشل فك التشفير — أعد تسجيل البصمة من الإعدادات')
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error) { const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e }

    // Rotate stored token
    try {
      const iv2  = crypto.getRandomValues(new Uint8Array(12))
      const enc2 = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv2 },
        aesKey,
        new TextEncoder().encode(data.session.refresh_token)
      )
      localStorage.setItem(PASSKEY_ENC, JSON.stringify({ iv: Array.from(iv2), enc: Array.from(new Uint8Array(enc2)) }))
    } catch {}

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
      const parsed = JSON.parse(stored)
      return !!parsed.credentialId
    } catch {
      return false
    }
  }

  function removePasskey() {
    localStorage.removeItem(PASSKEY_KEY)
    localStorage.removeItem(PASSKEY_ENC)
    localStorage.removeItem(PASSKEY_CREDS)
    idbPut('cpro_aes', undefined).catch(() => {})
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
