import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { navigate } from '../Router.jsx'

const C = {
  bg:        '#07090D',
  surface:   '#0D1117',
  card:      '#131920',
  primary:   '#00DDB3',
  secondary: '#6366F1',
  accent:    '#F43F5E',
  success:   '#22C55E',
  warning:   '#EAB308',
  text:      '#F8FAFC',
  textDim:   '#64748B',
  border:    'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.14)',
}
const GRAD = { brand: 'linear-gradient(135deg, #00DDB3 0%, #6366F1 100%)' }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: #07090D; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .auth-wrap { display: flex; min-height: 100vh; direction: rtl; }
  .auth-brand { display: none; }
  .auth-form  { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; min-height: 100vh; }
  @media (min-width: 900px) {
    .auth-brand { display: flex; flex: 0 0 440px; flex-direction: column; justify-content: center; padding: 48px; background: linear-gradient(160deg, #0D1117 0%, #0a0e19 100%); border-left: 1px solid rgba(255,255,255,0.07); position: relative; overflow: hidden; }
    .auth-form  { padding: 48px 64px; }
  }
  .auth-input { width: 100%; padding: 13px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #F8FAFC; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s; direction: ltr; text-align: left; }
  .auth-input::placeholder { color: #475569; }
  .auth-input:focus { border-color: rgba(0,221,179,0.5); box-shadow: 0 0 0 3px rgba(0,221,179,0.08); }
  .auth-input.error { border-color: rgba(244,63,94,0.5); }
  .auth-btn { width: 100%; padding: 14px; border-radius: 14px; border: none; font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease; letter-spacing: .01em; }
  .auth-btn:active { transform: scale(.97); }
  .auth-btn:disabled { opacity: .55; cursor: default; }
  .auth-btn-primary { background: linear-gradient(135deg,#00DDB3,#6366F1); color: #000; box-shadow: 0 6px 24px rgba(0,221,179,.35); }
  .auth-btn-primary:not(:disabled):hover { box-shadow: 0 8px 32px rgba(0,221,179,.48); }
  .auth-btn-secondary { background: rgba(255,255,255,.05); color: #94A3B8; border: 1px solid rgba(255,255,255,.09); }
  .auth-btn-secondary:not(:disabled):hover { background: rgba(255,255,255,.08); color: #F8FAFC; }
  .tab { flex: 1; padding: 10px 4px; border-radius: 12px; border: none; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; }
  .tab.active  { background: linear-gradient(135deg,#00DDB3,#6366F1); color: #000; }
  .tab.inactive { background: transparent; color: #64748B; }
  .divider { display: flex; align-items: center; gap: 12px; color: #334155; font-size: 11px; font-weight: 600; margin: 20px 0; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.07); }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  @keyframes float   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
  .fade-up { animation: fadeUp .3s cubic-bezier(.22,1,.36,1) both; }
  .float   { animation: float 3s ease-in-out infinite; }
  .grad-text { background: linear-gradient(135deg,#00DDB3,#6366F1); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  input[type=password] { letter-spacing: .1em; }
`

// ─── Branding panel (desktop) ────────────────────────────────────────────────
function BrandingPanel({ mode }) {
  const isRegister = mode === 'register'
  return (
    <div className="auth-brand">
      {/* Background orbs */}
      <div style={{ position:'absolute', top:'-15%', right:'-15%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,#00DDB314 0%,transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#6366F114 0%,transparent 65%)', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
          <div className="float" style={{ width:52, height:52, borderRadius:16, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:'0 12px 40px rgba(0,221,179,.35)' }}>🏗️</div>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color:C.text }}>Contractor Pro</div>
            <div style={{ fontSize:11, color:C.textDim }}>קבלן פרו</div>
          </div>
        </div>

        {/* Trial badge */}
        {isRegister && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,221,179,.1)', border:'1px solid rgba(0,221,179,.3)', borderRadius:100, padding:'6px 16px', marginBottom:28, fontSize:12, color:C.primary, fontWeight:700 }}>
            🎁 14 يوماً مجاناً — بدون بطاقة ائتمان
          </div>
        )}

        {/* Headline */}
        <h2 style={{ fontSize:28, fontWeight:900, color:C.text, lineHeight:1.25, marginBottom:12 }}>
          {isRegister
            ? <>ابدأ تجربتك المجانية<br /><span className="grad-text">اليوم</span></>
            : <>أهلاً بعودتك<br /><span className="grad-text">إلى Contractor Pro</span></>}
        </h2>
        <p style={{ fontSize:14, color:C.textDim, lineHeight:1.7, marginBottom:40 }}>
          {isRegister
            ? 'جميع بياناتك محفوظة وآمنة. لا حاجة لبطاقة ائتمان للبدء.'
            : 'كل مشاريعك وعمالك وأيام عملك في مكان واحد.'}
        </p>

        {/* Feature list */}
        {[
          { icon:'📅', text:'تسجيل أيام العمل في 3 ثواني' },
          { icon:'💸', text:'تتبع المصاريف واسترداد ضريبة القيمة المضافة' },
          { icon:'👷', text:'بوابة العمال للحضور الذاتي' },
          { icon:'📊', text:'تقارير PDF و Excel جاهزة' },
          { icon:'🔔', text:'إشعارات فورية لكل طلب' },
        ].map((f, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{f.icon}</div>
            <span style={{ fontSize:13, color:C.textDim }}>{f.text}</span>
          </div>
        ))}

        {/* Testimonial snippet */}
        <div style={{ marginTop:32, padding:'16px 18px', background:C.card, borderRadius:16, border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:4, marginBottom:8 }}>
            {[0,1,2,3,4].map(i => <span key={i} style={{ fontSize:12, color:'#EAB308' }}>★</span>)}
          </div>
          <p style={{ fontSize:12, color:C.textDim, lineHeight:1.7, marginBottom:10 }}>
            "وفّرت عليّ ساعة كل يوم — الرواتب والمصاريف كلها جاهزة في نهاية الشهر."
          </p>
          <div style={{ fontSize:11, fontWeight:700, color:C.text }}>محمد خ. — مقاول بناء، الناصرة</div>
        </div>
      </div>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontSize:12, color:error ? C.accent : C.textDim, fontWeight:700, marginBottom:7, letterSpacing:'.01em' }}>
        {label}
      </label>
      {children}
      {error && <div style={{ fontSize:11, color:C.accent, marginTop:5, fontWeight:600 }}>⚠ {error}</div>}
    </div>
  )
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function Alert({ type, children }) {
  const isErr = type === 'error'
  const isOk  = type === 'success'
  return (
    <div style={{ padding:'12px 16px', borderRadius:12, marginBottom:18, fontSize:13, fontWeight:600, lineHeight:1.55,
      background: isErr ? 'rgba(244,63,94,.1)' : isOk ? 'rgba(34,197,94,.1)' : 'rgba(234,179,8,.1)',
      border: `1px solid ${isErr ? 'rgba(244,63,94,.3)' : isOk ? 'rgba(34,197,94,.3)' : 'rgba(234,179,8,.3)'}`,
      color: isErr ? C.accent : isOk ? C.success : C.warning,
    }}>
      {isErr ? '⚠ ' : isOk ? '✓ ' : 'ℹ '}{children}
    </div>
  )
}

// ─── Password input with show/hide ────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = '••••••••', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`auth-input`}
        style={{ paddingLeft:44 }}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.textDim, fontSize:15, padding:2, lineHeight:1 }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export default function AuthPage({ mode: initialMode = 'login' }) {
  const [mode,     setMode]     = useState(initialMode)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [magicMode, setMagicMode] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const emailRef = useRef(null)

  const { signIn, signUp, signInWithMagicLink, user } = useAuth()

  // ── Redirect if already authenticated ──────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const pending = sessionStorage.getItem('pending_plan')
    if (pending) {
      sessionStorage.removeItem('pending_plan')
      navigate('/pricing')
    } else {
      navigate('/app')
    }
  }, [user])

  function clearMessages() { setError(''); setInfo('') }

  function switchMode(m) {
    setMode(m)
    clearMessages()
    setMagicMode(false)
    setMagicSent(false)
    // Update URL without reload
    window.history.replaceState({}, '', m === 'login' ? '/login' : '/register')
    setTimeout(() => emailRef.current?.focus(), 50)
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    if (!email.trim())         return 'البريد الإلكتروني مطلوب'
    if (!email.includes('@'))  return 'البريد الإلكتروني غير صحيح'
    if (magicMode)             return ''
    if (!password)             return 'كلمة المرور مطلوبة'
    if (password.length < 8)   return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    if (mode === 'register' && !name.trim()) return 'الاسم الكامل مطلوب'
    return ''
  }

  // ── Register ────────────────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault()
    clearMessages()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      const { data } = await signUp(email.trim(), password, name.trim())
      // If session is immediately available (email confirm disabled), useAuth redirect fires.
      // Otherwise show confirmation message.
      if (!data?.session) {
        setInfo('تم إنشاء حسابك! تحقق من بريدك الإلكتروني للتفعيل — ثم ادخل بنفس البريد وكلمة المرور.')
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('هذا البريد مسجّل مسبقاً — ')
      } else if (msg.includes('Password')) {
        setError('كلمة المرور ضعيفة جداً، استخدم 8 أحرف على الأقل مع أرقام')
      } else {
        setError(msg || 'حدث خطأ، حاول مجدداً')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    clearMessages()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      // redirect handled by useEffect watching user
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (msg.includes('Email not confirmed')) {
        setError('يجب تأكيد البريد الإلكتروني أولاً — تحقق من صندوق الوارد')
      } else {
        setError(msg || 'حدث خطأ، حاول مجدداً')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Magic Link ──────────────────────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault()
    clearMessages()
    if (!email.trim() || !email.includes('@')) { setError('أدخل بريدك الإلكتروني أولاً'); return }

    setLoading(true)
    try {
      await signInWithMagicLink(email.trim())
      setMagicSent(true)
    } catch (err) {
      setError(err.message || 'فشل إرسال الرابط — تحقق من البريد وحاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ─────────────────────────────────────────────────────────
  async function handleForgotPassword() {
    clearMessages()
    if (!email.trim()) { setError('أدخل بريدك الإلكتروني أولاً'); return }
    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase.js')
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/app`,
      })
      setInfo('تم إرسال رابط إعادة تعيين كلمة المرور — تحقق من بريدك')
    } catch {
      setError('تعذّر إرسال الرابط — تحقق من البريد وحاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <>
      <style>{css}</style>
      <div className="auth-wrap">
        <BrandingPanel mode={mode} />

        {/* ── Form panel ── */}
        <div className="auth-form">
          <div className="fade-up" style={{ width:'100%', maxWidth:420 }}>

            {/* Mobile logo */}
            <div style={{ textAlign:'center', marginBottom:32, display:'flex', flexDirection:'column', alignItems:'center' }} className="mobile-logo">
              <div onClick={() => navigate('/')} style={{ cursor:'pointer', display:'inline-flex', flexDirection:'column', alignItems:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:56, height:56, borderRadius:18, background:GRAD.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, boxShadow:'0 12px 40px rgba(0,221,179,.35)' }} className="float">🏗️</div>
                <div style={{ fontSize:18, fontWeight:900, color:C.text }}>Contractor Pro</div>
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', borderRadius:16, padding:4, marginBottom:28 }}>
              <button className={`tab ${isRegister ? 'inactive' : 'active'}`} onClick={() => switchMode('login')}>
                تسجيل الدخول
              </button>
              <button className={`tab ${isRegister ? 'active' : 'inactive'}`} onClick={() => switchMode('register')}>
                حساب جديد — 14 يوم مجاناً
              </button>
            </div>

            {/* Trial badge on register */}
            {isRegister && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,221,179,.08)', border:'1px solid rgba(0,221,179,.25)', borderRadius:12, padding:'10px 14px', marginBottom:24, fontSize:12, color:C.primary, fontWeight:700 }}>
                🎁
                <span>تجربة مجانية 14 يوماً — بدون بطاقة ائتمان، بدون التزام</span>
              </div>
            )}

            {/* Feedback messages */}
            {error && <Alert type="error">
              {error}
              {error.includes('مسجّل مسبقاً') && (
                <button onClick={() => switchMode('login')} style={{ background:'none', border:'none', color:C.primary, cursor:'pointer', fontSize:13, fontWeight:700, marginRight:4 }}>
                  سجّل دخولك هنا
                </button>
              )}
            </Alert>}
            {info  && <Alert type="success">{info}</Alert>}

            {/* Magic link sent confirmation */}
            {magicSent ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>📬</div>
                <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:10 }}>تحقق من بريدك</div>
                <p style={{ fontSize:14, color:C.textDim, lineHeight:1.7, marginBottom:24 }}>
                  أرسلنا رابط الدخول إلى <strong style={{ color:C.text }}>{email}</strong><br />
                  انقر على الرابط للدخول تلقائياً.
                </p>
                <button onClick={() => { setMagicSent(false); setMagicMode(false); clearMessages() }}
                  className="auth-btn auth-btn-secondary" style={{ width:'auto', padding:'10px 24px' }}>
                  العودة لتسجيل الدخول
                </button>
              </div>
            ) : (
              <>
                {/* Main form */}
                <form onSubmit={isRegister ? handleRegister : (magicMode ? handleMagicLink : handleLogin)} noValidate>
                  {isRegister && (
                    <Field label="الاسم الكامل">
                      <input ref={emailRef} value={name} onChange={e => { setName(e.target.value); clearMessages() }}
                        className="auth-input" placeholder="محمد علي" autoComplete="name" style={{ direction:'rtl', textAlign:'right' }} />
                    </Field>
                  )}

                  <Field label="البريد الإلكتروني">
                    <input ref={isRegister ? undefined : emailRef}
                      value={email} onChange={e => { setEmail(e.target.value); clearMessages() }}
                      type="email" className="auth-input" placeholder="example@email.com"
                      autoComplete="email" />
                  </Field>

                  {!magicMode && (
                    <Field label="كلمة المرور">
                      <PasswordInput
                        value={password} onChange={p => { setPassword(p); clearMessages() }}
                        placeholder={isRegister ? '8 أحرف على الأقل' : '••••••••'}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                      />
                      {!isRegister && (
                        <button type="button" onClick={handleForgotPassword} disabled={loading}
                          style={{ background:'none', border:'none', color:C.textDim, cursor:'pointer', fontSize:11, fontWeight:600, marginTop:6, display:'block', width:'100%', textAlign:'left' }}>
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </Field>
                  )}

                  <button type="submit" disabled={loading} className="auth-btn auth-btn-primary" style={{ marginTop:4 }}>
                    {loading ? '⏳ جاري التحقق...' :
                      magicMode  ? 'إرسال رابط الدخول ←' :
                      isRegister ? 'إنشاء الحساب وابدأ التجربة ←' :
                      'تسجيل الدخول ←'}
                  </button>
                </form>

                {/* Magic link toggle */}
                <div className="divider">أو</div>
                {magicMode ? (
                  <button onClick={() => { setMagicMode(false); clearMessages() }} className="auth-btn auth-btn-secondary">
                    الدخول بكلمة المرور
                  </button>
                ) : (
                  <button onClick={() => { setMagicMode(true); clearMessages() }} className="auth-btn auth-btn-secondary">
                    ✉ دخول برابط البريد الإلكتروني (بدون كلمة مرور)
                  </button>
                )}

                {/* Switch mode */}
                <p style={{ textAlign:'center', marginTop:24, fontSize:13, color:C.textDim }}>
                  {isRegister ? 'عندك حساب؟' : 'ما عندك حساب؟'}{' '}
                  <button onClick={() => switchMode(isRegister ? 'login' : 'register')}
                    style={{ background:'none', border:'none', color:C.primary, cursor:'pointer', fontSize:13, fontWeight:700 }}>
                    {isRegister ? 'تسجيل الدخول' : 'أنشئ حساباً مجانياً'}
                  </button>
                </p>

                {/* Back to landing */}
                <p style={{ textAlign:'center', marginTop:16 }}>
                  <button onClick={() => navigate('/')} style={{ background:'none', border:'none', color:C.textDim, cursor:'pointer', fontSize:12 }}>
                    ← العودة للصفحة الرئيسية
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
