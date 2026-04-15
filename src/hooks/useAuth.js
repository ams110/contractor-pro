import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // تحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // استمع لتغييرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  /** تسجيل مستخدم جديد */
  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  }

  /** تسجيل دخول بالإيميل والكلمة */
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  /** تسجيل خروج */
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ─── WebAuthn / Passkeys ───────────────────────────────────────────

  /** تفعيل البصمة على الجهاز الحالي (بعد تسجيل الدخول) */
  async function registerPasskey() {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')

    // اطلب خيارات التسجيل من Supabase Edge Function
    const { data: options, error: optErr } = await supabase.functions.invoke('webauthn-register-options', {
      body: { userId: user.id, userEmail: user.email },
    })
    if (optErr) throw new Error('فشل تحضير البصمة: ' + optErr.message)

    // اطلب من المتصفح/الجهاز التسجيل (يفتح نافذة البصمة)
    let credential
    try {
      credential = await startRegistration(options)
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('خطأ في تسجيل البصمة: ' + e.message)
    }

    // أرسل النتيجة للتحقق والحفظ
    const { error: verErr } = await supabase.functions.invoke('webauthn-register-verify', {
      body: { userId: user.id, credential },
    })
    if (verErr) throw new Error('فشل التحقق من البصمة: ' + verErr.message)
  }

  /** تسجيل دخول بالبصمة */
  async function signInWithPasskey(email) {
    // اطلب خيارات المصادقة
    const { data: options, error: optErr } = await supabase.functions.invoke('webauthn-auth-options', {
      body: { email },
    })
    if (optErr) throw new Error('البصمة غير مفعّلة على هذا الجهاز')

    // اطلب من الجهاز التحقق بالبصمة
    let credential
    try {
      credential = await startAuthentication(options)
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('خطأ في البصمة: ' + e.message)
    }

    // تحقق وسجّل الدخول
    const { data, error: verErr } = await supabase.functions.invoke('webauthn-auth-verify', {
      body: { email, credential },
    })
    if (verErr) throw new Error('البصمة غير صحيحة')

    // أنشئ جلسة من التوكن الراجع
    const { error: sessErr } = await supabase.auth.setSession({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
    })
    if (sessErr) throw sessErr
  }

  /** هل البصمة مدعومة على هذا الجهاز؟ */
  function isPasskeySupported() {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }

  /** هل سبق تفعيل البصمة لهذا المستخدم؟ */
  async function hasPasskey(email) {
    try {
      const { data } = await supabase.functions.invoke('webauthn-auth-options', { body: { email } })
      return !!data
    } catch {
      return false
    }
  }

  return { user, loading, signUp, signIn, signOut, registerPasskey, signInWithPasskey, isPasskeySupported, hasPasskey }
}
