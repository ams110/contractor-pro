import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'

const PASSKEY_KEY = 'cpro_passkey_cred'
const SESSION_KEY = 'cpro_passkey_sess'

function toBase64url(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
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
      // تحديث جلسة البصمة تلقائياً عند كل تسجيل دخول
      if (session && localStorage.getItem(PASSKEY_KEY)) {
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

  async function registerPasskey() {
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    let credential
    try {
      credential = await startRegistration({
        challenge:        toBase64url(challenge),
        rp:               { name: 'Contractor Pro', id: window.location.hostname },
        user:             {
          id:          toBase64url(new TextEncoder().encode(user.id)),
          name:        user.email,
          displayName: user.email,
        },
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

    localStorage.setItem(PASSKEY_KEY, credential.id)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
      }))
    }
  }

  async function signInWithPasskey() {
    const credId = localStorage.getItem(PASSKEY_KEY)
    if (!credId) throw new Error('لا توجد بصمة مسجّلة على هذا الجهاز')

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    try {
      await startAuthentication({
        challenge:        toBase64url(challenge),
        allowCredentials: [{ type: 'public-key', id: credId }],
        userVerification: 'required',
        timeout:          60000,
        rpId:             window.location.hostname,
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
      throw new Error('فشلت البصمة: ' + e.message)
    }

    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) throw new Error('انتهت الجلسة — سجّل دخولك بكلمة المرور مرة واحدة ثم ستعود البصمة تعمل')
    const { access_token, refresh_token } = JSON.parse(raw)
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      localStorage.removeItem(SESSION_KEY)
      throw new Error('انتهت الجلسة — سجّل دخولك بكلمة المرور مرة واحدة ثم ستعود البصمة تعمل')
    }
  }

  function isPasskeySupported() {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    )
  }

  function hasPasskeyRegistered() {
    return !!localStorage.getItem(PASSKEY_KEY)
  }

  function removePasskey() {
    localStorage.removeItem(PASSKEY_KEY)
    localStorage.removeItem(SESSION_KEY)
  }

  return {
    user, loading,
    signUp, signIn, signOut,
    registerPasskey, signInWithPasskey,
    isPasskeySupported, hasPasskeyRegistered, removePasskey,
  }
}
