import React, { useState } from 'react'
import { Hash, HardHat, Fingerprint } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { Btn, Input } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'

const WORKER_SESSION_KEY = 'worker_session'
function saveWorkerSession(data) {
  sessionStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(data))
}

/* ── PIN Numpad ── */
function PinPad({ onDone, onCancel, error }) {
  const [digits, setDigits] = useState('')
  const MAX = 6

  function press(d) {
    if (digits.length >= MAX) return
    const next = digits + d
    setDigits(next)
    if (next.length >= 4) {
      // auto-submit when 4–6 digits entered and user hasn't typed more in 300ms
    }
  }
  function del() { setDigits(d => d.slice(0, -1)) }
  function submit() { if (digits.length >= 4) onDone(digits) }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {Array.from({ length: MAX }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i < digits.length ? C.primary : 'rgba(255,255,255,0.12)',
            border: `2px solid ${i < digits.length ? C.primary : 'rgba(255,255,255,0.2)'}`,
            transition: 'all .15s',
            boxShadow: i < digits.length ? `0 0 8px ${C.primary}88` : 'none',
          }} />
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, textAlign: 'center', padding: '8px 16px', background: `${C.accent}15`, borderRadius: 10, border: `1px solid ${C.accent}33` }}>
          ⚠ {error}
        </div>
      )}

      {/* Keypad grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 10 }}>
        {keys.map((k, i) => (
          k === '' ? <div key={i} /> :
          k === '⌫' ? (
            <button key={i} onClick={del}
              style={{ height: 64, borderRadius: 18, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.textDim, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}
              onMouseDown={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseUp={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >{k}</button>
          ) : (
            <button key={i} onClick={() => press(k)}
              style={{ height: 64, borderRadius: 18, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}
              onMouseDown={e => e.currentTarget.style.background = `${C.primary}22`}
              onMouseUp={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >{k}</button>
          )
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          إلغاء
        </button>
        <button onClick={submit} disabled={digits.length < 4}
          style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: digits.length >= 4 ? GRAD.brand : 'rgba(255,255,255,0.08)', color: digits.length >= 4 ? '#000' : C.textDim, fontSize: 14, fontWeight: 800, cursor: digits.length >= 4 ? 'pointer' : 'default', transition: 'all .2s' }}>
          → دخول
        </button>
      </div>
    </div>
  )
}

export default function LoginScreen({ teamMemberSignIn }) {
  const { signIn, signUp, signInWithPasskey, signInWithPin, isPasskeySupported, hasPasskeyRegistered, hasPinSet } = useAuth()

  const [loginType, setLoginType] = useState('owner')
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [showPin,          setShowPin]          = useState(false)
  const [pinError,         setPinError]         = useState('')
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false)

  const [tmUsername, setTmUsername] = useState('')
  const [tmPassword, setTmPassword] = useState('')

  const [wkUsername, setWkUsername] = useState('')
  const [wkPassword, setWkPassword] = useState('')

  const passkeyOk  = isPasskeySupported()
  const passkeyReg = hasPasskeyRegistered()
  const pinOk      = hasPinSet()
  function clearMsg() { setError(''); setInfo(''); setSessionExpiredMsg(false) }

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
    setLoading(true)
    try { await signInWithPasskey() }
    catch (err) {
      if (err.name === 'SessionExpiredError') {
        setSessionExpiredMsg(true)
      } else {
        setError(err.message || 'لم تنجح عملية البصمة')
      }
    }
    finally { setLoading(false) }
  }

  async function handlePin(pin) {
    setPinError('')
    setLoading(true)
    try {
      await signInWithPin(pin)
    } catch (err) {
      if (err.name === 'SessionExpiredError') {
        setShowPin(false)
        setSessionExpiredMsg(true)
      } else {
        setPinError(err.message || 'PIN غير صحيح')
      }
    } finally {
      setLoading(false)
    }
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

  async function handleWorkerLogin(e) {
    e.preventDefault()
    if (!wkUsername.trim()) return setError('أدخل اسم المستخدم')
    if (!wkPassword)        return setError('أدخل كلمة المرور')
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.rpc('worker_login', {
        p_username: wkUsername.trim(),
        p_password: wkPassword,
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      saveWorkerSession(data)
      window.location.href = window.location.pathname + '?portal'
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

        {/* ── PIN mode overlay ── */}
        {showPin && loginType === 'owner' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Hash size={32} style={{ color: C.primary, margin: '0 auto 8px', display:'block' }} />
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>أدخل الـ PIN</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>الرمز الذي أنشأته في الإعدادات</div>
            </div>
            <PinPad onDone={handlePin} onCancel={() => { setShowPin(false); setPinError('') }} error={pinError} />
          </>
        ) : (
          <>
            {/* Login type toggle — always shown */}
            <div style={{ display:'flex', gap:4, marginBottom:20, background:'rgba(255,255,255,0.04)', borderRadius:14, padding:4 }}>
              {[
                ['owner',  '🏢 صاحب العمل'],
                ...(teamMemberSignIn ? [['member', '👥 عضو فريق']] : []),
                ['worker', '👷 عامل'],
              ].map(([t, label]) => (
                <button key={t} onClick={() => { setLoginType(t); clearMsg() }}
                  style={{ flex:1, padding:'9px 4px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, transition:'all .2s',
                    background: loginType === t ? GRAD.brand : 'transparent',
                    color: loginType === t ? '#000' : C.textDim,
                    boxShadow: loginType === t ? '0 4px 14px #00DDB344' : 'none',
                  }}>
                  {label}
                </button>
              ))}
            </div>

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

            {/* Worker login form */}
            {loginType === 'worker' && (
              <form onSubmit={handleWorkerLogin}>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <HardHat size={36} style={{ color: C.primary, margin: '0 auto 8px', display:'block' }} />
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>بوابة العمال</div>
                  <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>أدخل بيانات الدخول التي أعطاك إياها صاحب العمل</div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>اسم المستخدم</label>
                  <input value={wkUsername} onChange={e => { setWkUsername(e.target.value); clearMsg() }}
                    placeholder="username" autoComplete="username"
                    style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:14, boxSizing:'border-box', outline:'none', direction:'ltr', textAlign:'left' }} />
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6, fontWeight:600 }}>كلمة المرور</label>
                  <input value={wkPassword} onChange={e => { setWkPassword(e.target.value); clearMsg() }}
                    type="password" placeholder="••••••••" autoComplete="current-password"
                    style={{ width:'100%', padding:'12px 14px', borderRadius:14, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:14, boxSizing:'border-box', outline:'none' }} />
                </div>
                {error && <Alert type="error">{error}</Alert>}
                <Btn full disabled={loading}>
                  {loading ? '⏳ جاري التحقق...' : '→ دخول للبوابة'}
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

                  {sessionExpiredMsg && (
                    <div style={{ padding:'10px 14px', background:`${C.warning}18`, border:`1px solid ${C.warning}44`, borderRadius:12, fontSize:12, color:C.warning, marginBottom:14, fontWeight:600, lineHeight:1.5 }}>
                      🔄 انتهت جلستك — سجّل دخولك مرة واحدة بكلمة المرور وسيعمل الـ PIN والبصمة تلقائياً
                    </div>
                  )}
                  {error && <Alert type="error">{error}</Alert>}
                  {info  && <Alert type="success">{info}</Alert>}

                  <Btn full disabled={loading}>
                    {loading ? '⏳ جاري التحميل...' : mode === 'login' ? '→ دخول' : '✓ إنشاء حساب'}
                  </Btn>
                </form>

                {mode === 'login' && (pinOk || (passkeyOk && passkeyReg)) && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ textAlign:'center', fontSize:11, color:C.textDim, marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:1, background:C.border }} />
                      <span>أو</span>
                      <div style={{ flex:1, height:1, background:C.border }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {pinOk && (
                        <button onClick={() => { setShowPin(true); setPinError('') }} disabled={loading}
                          style={{ flex:1, padding:'13px', borderRadius:14, border:`1px solid ${C.secondary}44`, background:`${C.secondary}12`, color:C.secondary, fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s', opacity: loading ? 0.5 : 1 }}>
                          <Hash size={18} strokeWidth={2} />
                          PIN
                        </button>
                      )}
                      {passkeyOk && passkeyReg && (
                        <button onClick={handlePasskey} disabled={loading}
                          style={{ flex:1, padding:'13px', borderRadius:14, border:`1px solid ${C.primary}44`, background:`${C.primary}12`, color:C.primary, fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s', opacity: loading ? 0.5 : 1 }}>
                          <Fingerprint size={18} strokeWidth={2} />
                          بصمة
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
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
