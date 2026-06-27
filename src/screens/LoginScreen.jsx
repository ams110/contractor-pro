import React, { useState } from 'react'
import { C } from '../constants/index.js'
import { Btn, Input } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginScreen() {
  const { signIn, signUp, signInWithPasskey, isPasskeySupported } = useAuth()

  const [mode,     setMode]     = useState('login')   // 'login' | 'register'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')

  const passkeyOk = isPasskeySupported()

  function clearMsg() { setError(''); setInfo('') }

  async function handleSubmit(e) {
    e.preventDefault()
    clearMsg()

    // ─── Validation ───
    if (!email.trim())    return setError('البريد الإلكتروني مطلوب')
    if (!email.includes('@')) return setError('البريد الإلكتروني غير صحيح')
    if (!password)        return setError('كلمة المرور مطلوبة')
    if (password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (mode === 'register' && !name.trim()) return setError('الاسم الكامل مطلوب')

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password, name.trim())
        setInfo('تم التسجيل! تحقق من بريدك الإلكتروني لتفعيل الحساب')
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) setError('البريد أو كلمة المرور غير صحيحة')
      else if (msg.includes('Email already registered')) setError('البريد مسجّل مسبقاً')
      else if (msg.includes('Email not confirmed')) setError('يجب تأكيد البريد الإلكتروني أولاً')
      else setError(msg || 'حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasskey() {
    clearMsg()
    if (!email.trim()) return setError('أدخل البريد الإلكتروني أولاً')
    setLoading(true)
    try {
      await signInWithPasskey(email.trim())
    } catch (err) {
      setError(err.message || 'لم تنجح عملية البصمة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:64, marginBottom:12 }}>🏗️</div>
        <div style={{ fontSize:26, fontWeight:800, color:C.primary }}>كبلان</div>
        <div style={{ fontSize:13, color:C.textDim, marginTop:6 }}>إدارة مشاريع المقاولات</div>
      </div>

      {/* Card */}
      <div style={{ width:'100%', maxWidth:400, background:C.surface, borderRadius:24, border:`1px solid ${C.border}`, padding:28 }}>

        {/* Tabs */}
        <div style={{ display:'flex', marginBottom:24, background:C.bg, borderRadius:14, padding:4 }}>
          {[['login','تسجيل دخول'],['register','حساب جديد']].map(([m, label]) => (
            <button
              key={m} onClick={() => { setMode(m); clearMsg() }}
              style={{ flex:1, padding:'10px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, transition:'all .2s',
                background: mode === m ? C.primary : 'transparent',
                color:      mode === m ? C.bg      : C.textDim,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <Input label="الاسم الكامل" value={name} onChange={setName} placeholder="محمد علي" required />
          )}
          <Input
            label="البريد الإلكتروني" value={email} onChange={setEmail}
            type="email" placeholder="example@email.com" required
          />
          <Input
            label="كلمة المرور" value={password} onChange={setPassword}
            type="password" placeholder="••••••••" required
            error={password.length > 0 && password.length < 6 ? 'أقل من 6 أحرف' : ''}
          />

          {/* رسائل */}
          {error && (
            <div style={{ padding:'10px 14px', background:`${C.accent}18`, border:`1px solid ${C.accent}44`, borderRadius:10, fontSize:12, color:C.accent, marginBottom:14 }}>
              ⚠ {error}
            </div>
          )}
          {info && (
            <div style={{ padding:'10px 14px', background:`${C.success}18`, border:`1px solid ${C.success}44`, borderRadius:10, fontSize:12, color:C.success, marginBottom:14 }}>
              ✓ {info}
            </div>
          )}

          <Btn full disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
          </Btn>
        </form>

        {/* الدخول بالبصمة */}
        {mode === 'login' && passkeyOk && (
          <div style={{ marginTop:16 }}>
            <div style={{ textAlign:'center', fontSize:11, color:C.textMuted, marginBottom:10 }}>أو</div>
            <button
              onClick={handlePasskey}
              disabled={loading}
              style={{
                width:'100%', padding:'13px', borderRadius:14,
                border:`1.5px solid ${C.border}`, background:'transparent',
                color:C.text, fontSize:14, fontWeight:700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize:22 }}>👆</span>
              دخول بالبصمة / Face ID
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
