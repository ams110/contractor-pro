import React, { useState } from 'react'
import { C, GRAD } from '../constants/index.js'
import { Btn, Input } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'

export default function LoginScreen({ teamMemberSignIn }) {
  const { signIn, signUp, signInWithPasskey, isPasskeySupported } = useAuth()

  const [loginType, setLoginType] = useState('owner')   // 'owner' | 'member'
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')

  // team member fields
  const [tmUsername, setTmUsername] = useState('')
  const [tmPassword, setTmPassword] = useState('')

  const passkeyOk = isPasskeySupported()
  function clearMsg() { setError(''); setInfo('') }

  async function handleForgotPassword() {
    clearMsg()
    if (!email.trim()) return setError('أدخل بريدك الإلكتروني أولاً')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'https://app.linko.services' })
      if (error) throw error
      setInfo('تم إرسال رابط تغيير كلمة المرور لبريدك ✓')
      setMode('login')
    } catch { setError('تأكد من البريد الإلكتروني وحاول مجدداً') }
    finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clearMsg()
    if (!email.trim())        return setError('البريد الإلكتروني مطلوب')
    if (!email.includes('@')) return setError('البريد الإلكتروني غير صحيح')
    if (!password)            return setError('كلمة المرور مطلوبة')
    if (password.length < 6)  return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
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
    } finally { setLoading(false) }
  }

  async function handlePasskey() {
    clearMsg()
    if (!email.trim()) return setError('أدخل البريد الإلكتروني أولاً')
    setLoading(true)
    try { await signInWithPasskey(email.trim()) }
    catch (err) { setError(err.message || 'لم تنجح عملية البصمة') }
    finally { setLoading(false) }
  }

  async function handleMemberLogin(e) {
    e.preventDefault()
    if (!tmUsername.trim()) return setError('أدخل اسم المستخدم')
    if (!tmPassword)        return setError('أدخل كلمة المرور')
    setLoading(true); setError('')
    try {
      await teamMemberSignIn(tmUsername.trim(), tmPassword)
    } catch (err) {
      setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة')
    } finally { setLoading(false) }
  }

  const TABS = [['login','دخول'],['register','حساب جديد'],['forgot','نسيت كلمة المرور']]

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>

      {/* Mesh background blobs */}
      <div style={{ position:'absolute', top:'-20%', right:'-20%', width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle, #00DDB322 0%, transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-15%', left:'-15%', width:350, height:350, borderRadius:'50%', background:`radial-gradient(circle, #6366F122 0%, transparent 70%)`, pointerEvents:'none' }} />

      {/* Logo */}
      <div className="fade-up" style={{ textAlign:'center', marginBottom:36 }}>
        <div style={{ width:88, height:88, borderRadius:28, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, margin:'0 auto 16px', boxShadow:'0 16px 48px #00DDB344', animation:'float 3s ease-in-out infinite' }}>🏗️</div>
        <div style={{ fontSize:28, fontWeight:900, background:GRAD.brand, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Contractor Pro</div>
        <div style={{ fontSize:13, color:C.textDim, marginTop:6, letterSpacing:'0.04em' }}>إدارة مشاريع المقاولات</div>
      </div>

      {/* Card */}
      <div className="fade-up" style={{ width:'100%', maxWidth:400, background:'rgba(13,17,23,0.9)', backdropFilter:'blur(24px)', borderRadius:28, border:`1px solid ${C.borderMid}`, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>

        {/* Login type toggle */}
        {teamMemberSignIn && (
          <div style={{ display:'flex', gap:4, marginBottom:20, background:'rgba(255,255,255,0.04)', borderRadius:14, padding:4 }}>
            {[['owner','صاحب الحساب'],['member','عضو فريق']].map(([t, label]) => (
              <button key={t} onClick={() => { setLoginType(t); clearMsg() }}
                style={{ flex:1, padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, transition:'all .2s',
                  background: loginType === t ? GRAD.brand : 'transparent',
                  color: loginType === t ? '#000' : C.textDim,
                  boxShadow: loginType === t ? '0 4px 14px #00DDB344' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Team member login form */}
        {loginType === 'member' && (
          <form onSubmit={handleMemberLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>اسم المستخدم</label>
              <input value={tmUsername} onChange={e => { setTmUsername(e.target.value); clearMsg() }}
                placeholder="username" autoComplete="username"
                style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:14, boxSizing:'border-box', outline:'none', direction:'ltr', textAlign:'left' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>كلمة المرور</label>
              <input value={tmPassword} onChange={e => { setTmPassword(e.target.value); clearMsg() }}
                type="password" placeholder="••••••••" autoComplete="current-password"
                style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:14, boxSizing:'border-box', outline:'none' }} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <Btn full disabled={loading}>
              {loading ? '⏳ جاري التحقق...' : '→ دخول'}
            </Btn>
          </form>
        )}

        {/* Owner login — Tabs */}
        {loginType === 'owner' && (
        <div style={{ display:'flex', gap:4, marginBottom:24, background:'rgba(255,255,255,0.04)', borderRadius:16, padding:4 }}>
          {TABS.map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); clearMsg() }}
              style={{ flex:1, padding:'10px 4px', borderRadius:12, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, transition:'all .2s',
                background: mode === m ? GRAD.brand : 'transparent',
                color: mode === m ? '#000' : C.textDim,
                boxShadow: mode === m ? '0 4px 14px #00DDB344' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>
        )}

        {loginType === 'owner' && (
          <>
            {mode === 'forgot' && (
              <div>
                <Input label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="example@email.com" required />
                {error && <Alert type="error">{error}</Alert>}
                {info  && <Alert type="success">{info}</Alert>}
                <Btn onClick={handleForgotPassword} full disabled={loading}>{loading ? '...' : 'إرسال رابط التغيير'}</Btn>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: mode === 'forgot' ? 'none' : 'block' }}>
              {mode === 'register' && <Input label="الاسم الكامل" value={name} onChange={setName} placeholder="محمد علي" required />}
              <Input label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" placeholder="example@email.com" required />
              <Input label="كلمة المرور" value={password} onChange={setPassword} type="password" placeholder="••••••••" required
                error={password.length > 0 && password.length < 6 ? 'أقل من 6 أحرف' : ''} />

              {error && <Alert type="error">{error}</Alert>}
              {info  && <Alert type="success">{info}</Alert>}

              <Btn full disabled={loading}>
                {loading ? '⏳ جاري التحميل...' : mode === 'login' ? '→ دخول' : '✓ إنشاء حساب'}
              </Btn>
            </form>

            {mode === 'login' && passkeyOk && (
              <div style={{ marginTop:16 }}>
                <div style={{ textAlign:'center', fontSize:11, color:C.textDim, marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:1, background:C.border }} />
                  <span>أو</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>
                <button onClick={handlePasskey} disabled={loading}
                  style={{ width:'100%', padding:'13px', borderRadius:14, border:`1px solid ${C.borderMid}`, background:'rgba(255,255,255,0.04)', color:C.text, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all .2s', opacity: loading ? 0.5 : 1 }}>
                  <span style={{ fontSize:22 }}>👆</span>
                  دخول بالبصمة / Face ID
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const isErr = type === 'error'
  return (
    <div style={{ padding:'10px 14px', background:isErr ? '#F43F5E18' : '#22C55E18', border:`1px solid ${isErr ? '#F43F5E44' : '#22C55E44'}`, borderRadius:12, fontSize:12, color: isErr ? '#F43F5E' : '#22C55E', marginBottom:14, fontWeight:600 }}>
      {isErr ? '⚠ ' : '✓ '}{children}
    </div>
  )
}
