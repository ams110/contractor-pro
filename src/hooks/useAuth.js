import { useState, useEffect } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { supabase, SUPABASE_URL } from '../lib/supabase.js'
import { savePinPayload, readPinPayload, hasPin, clearPin } from '../lib/pinCrypto.js'

const PASSKEY_KEY  = 'cpro_passkey_cred'  // JSON { credentialId, rpId }

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
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      // لو فشل جلب الجلسة (شبكة/تعذّر Supabase) لا نترك التطبيق عالقاً على
      // شاشة البداية للأبد — نوقف التحميل ونعرض شاشة الدخول.
      .catch(() => {
        setUser(null)
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

    // تحقّق من كلمة المرور (يُنشئ/يُجدّد جلسة صالحة لالتقاط توكناتها)
    const { data: signInData, error: verifyErr } =
      await supabase.auth.signInWithPassword({ email: user.email, password })
    if (verifyErr) throw new Error('كلمة المرور غير صحيحة')

    const session = signInData?.session
    if (!session?.refresh_token) throw new Error('تعذّر تجهيز الجلسة — أعد المحاولة')

    // نخزّن توكنات الجلسة (لا كلمة المرور) مشفّرة تحت الـ PIN.
    // التوكنات قابلة للإبطال وتُدوَّر — أأمن بكثير من تخزين كلمة سر قابلة للاسترجاع.
    await savePinPayload(pin, {
      refresh_token: session.refresh_token,
      access_token:  session.access_token,
    })
  }

  async function signInWithPin(pin) {
    if (!hasPin()) throw new Error('لم يتم تعيين PIN على هذا الجهاز')

    // يرفع WRONG_PIN عند خطأ الرقم، وPIN_LOCKED بعد 5 محاولات (مع مسح البيانات)
    const payload = await readPinPayload(pin)

    // مسار قديم (نُسخ سبقت التحديث): الحمولة فيها بريد+كلمة سر → دخول عادي ثم ترقية.
    if (payload?.password && payload?.email) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email, password: payload.password,
      })
      if (error) { const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e }
      // رقّي التخزين لتوكنات بدل كلمة السر
      try {
        if (data?.session?.refresh_token) {
          await savePinPayload(pin, {
            refresh_token: data.session.refresh_token,
            access_token:  data.session.access_token,
          })
        }
      } catch { /* ignore upgrade errors */ }
      return
    }

    // المسار الجديد: استعد الجلسة من التوكنات المخزّنة (تُجدَّد تلقائياً عند الحاجة).
    const { error } = await supabase.auth.setSession({
      access_token:  payload.access_token,
      refresh_token: payload.refresh_token,
    })
    if (error) {
      // التوكن مُبطَل/منتهٍ (دُوِّر بالاستخدام العادي) → اطلب دخولاً بالباسورد مرّة.
      const e = new Error('SESSION_EXPIRED'); e.name = 'SessionExpiredError'; throw e
    }
  }

  function hasPinSet() { return hasPin() }

  function removePin() { clearPin() }

  // ─── Delete account (self) ──────────────────────────────────────────────────

  // حذف الحساب نهائياً: يستدعي edge function (service role) لحذف مستخدم auth
  // وكل بياناته (cascade)، ثم يمسح بيانات الاعتماد المحلية ويُنهي الجلسة.
  async function deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('انتهت الجلسة، سجّل الدخول من جديد')

    const result = await callEdge('delete-account', { confirm: true }, session.access_token)
    if (result.error) throw new Error(result.error)

    // امسح بيانات الاعتماد المحلية (PIN/passkey) — الصفوف بالـ DB حُذفت بالتتالي
    clearPin()
    localStorage.removeItem(PASSKEY_KEY)
    localStorage.removeItem('cpro_passkey_enc')
    localStorage.removeItem('cpro_passkey_creds')

    await supabase.auth.signOut().catch(() => {})
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
    deleteAccount,
  }
}
