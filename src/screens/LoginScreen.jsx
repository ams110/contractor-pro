import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Fingerprint, Hash, Eye, EyeOff, AlertCircle, CheckCircle, Delete } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { cn } from '../lib/cn.js'

const WORKER_SESSION_KEY = 'worker_session'
function saveWorkerSession(data) {
  sessionStorage.setItem(WORKER_SESSION_KEY, JSON.stringify(data))
}

function PinPad({ onDone, onCancel, error }) {
  const [digits, setDigits] = useState('')
  const MAX = 6

  function press(d) {
    if (digits.length >= MAX) return
    setDigits(prev => prev + d)
  }
  function del() { setDigits(d => d.slice(0, -1)) }
  function submit() { if (digits.length >= 4) onDone(digits) }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <div>
        <div className="text-center mb-1 text-sm font-bold text-[#F8FAFC]">أدخل الـ PIN</div>
        <div className="text-xs text-[#64748B] text-center">الرمز الذي أنشأته في الإعدادات</div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-3">
        {Array.from({ length: MAX }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: i < digits.length ? 1 : 0.8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 transition-all duration-150',
              i < digits.length
                ? 'bg-primary border-primary shadow-glow-sm'
                : 'bg-transparent border-white/20'
            )}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/30 rounded-xl text-danger text-xs font-semibold w-full">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2.5">
        {keys.map((k, i) => (
          k === '' ? <div key={i} /> :
          k === 'del' ? (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              onClick={del}
              className="h-16 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] text-[#64748B] flex items-center justify-center transition-colors hover:bg-white/[0.08]"
            >
              <Delete size={18} />
            </motion.button>
          ) : (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              onClick={() => press(k)}
              className="h-16 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] text-[#F8FAFC] text-xl font-bold flex items-center justify-center transition-colors hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
            >
              {k}
            </motion.button>
          )
        ))}
      </div>

      <div className="flex gap-2.5 w-full">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-white/[0.08] bg-transparent text-[#64748B] text-sm font-bold transition-colors hover:bg-white/[0.05] hover:text-[#F8FAFC]"
        >
          إلغاء
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={submit}
          disabled={digits.length < 4}
          className={cn(
            'flex-[2] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
            digits.length >= 4
              ? 'bg-gradient-to-r from-primary to-secondary text-bg shadow-glow-sm'
              : 'bg-white/[0.06] text-[#64748B] cursor-not-allowed'
          )}
        >
          <ArrowRight size={15} />
          دخول
        </motion.button>
      </div>
    </motion.div>
  )
}

function Alert({ type, children }) {
  const isErr = type === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold mb-4',
        isErr
          ? 'bg-danger/10 border border-danger/30 text-danger'
          : 'bg-success/10 border border-success/30 text-success'
      )}
    >
      {isErr ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
      {children}
    </motion.div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
        <Lock size={15} />
      </div>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-4 py-3 pr-9 pl-10 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:bg-white/[0.06]"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC] transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export default function LoginScreen({ teamMemberSignIn }) {
  const { signIn, signUp, signInWithPasskey, signInWithPin, isPasskeySupported, hasPasskeyRegistered, hasPinSet } = useAuth()

  const [loginType, setLoginType] = useState('owner')
  const [mode,      setMode]      = useState('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [name,      setName]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [info,      setInfo]      = useState('')
  const [showPin,           setShowPin]           = useState(false)
  const [pinError,          setPinError]          = useState('')
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
      if (err.name === 'SessionExpiredError') setSessionExpiredMsg(true)
      else setError(err.message || 'لم تنجح عملية البصمة')
    }
    finally { setLoading(false) }
  }

  async function handlePin(pin) {
    setPinError('')
    setLoading(true)
    try { await signInWithPin(pin) }
    catch (err) {
      if (err.name === 'SessionExpiredError') { setShowPin(false); setSessionExpiredMsg(true) }
      else setPinError(err.message || 'PIN غير صحيح')
    }
    finally { setLoading(false) }
  }

  async function handleMemberLogin(e) {
    e.preventDefault()
    if (!tmUsername.trim()) return setError('أدخل اسم المستخدم')
    if (!tmPassword)        return setError('أدخل كلمة المرور')
    setLoading(true); setError('')
    try { await teamMemberSignIn(tmUsername.trim(), tmPassword) }
    catch (err) { setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة') }
    finally { setLoading(false) }
  }

  async function handleWorkerLogin(e) {
    e.preventDefault()
    if (!wkUsername.trim()) return setError('أدخل اسم المستخدم')
    if (!wkPassword)        return setError('أدخل كلمة المرور')
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.rpc('worker_login', { p_username: wkUsername.trim(), p_password: wkPassword })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      saveWorkerSession(data)
      window.location.href = window.location.pathname + '?portal'
    } catch (err) { setError(err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة') }
    finally { setLoading(false) }
  }

  const loginTabs = [
    { id: 'owner', label: 'صاحب العمل', icon: '🏢' },
    ...(teamMemberSignIn ? [{ id: 'member', label: 'عضو فريق', icon: '👥' }] : []),
    { id: 'worker', label: 'عامل', icon: '👷' },
  ]

  const modeTabs = [
    { id: 'login',    label: 'دخول' },
    { id: 'register', label: 'حساب جديد' },
    { id: 'forgot',   label: 'نسيت المرور' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">

      {/* Background blobs */}
      <div className="absolute top-[-20%] right-[-20%] w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00DDB318 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] left-[-15%] w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366F118 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #00DDB308 0%, transparent 60%)' }} />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, #00DDB3 0%, #6366F1 100%)',
            boxShadow: '0 16px 48px #00DDB344',
          }}
        >
          🏗️
        </motion.div>
        <h1 className="text-2xl font-black text-gradient">Contractor Pro</h1>
        <p className="text-sm text-[#64748B] mt-1.5 tracking-wide">إدارة مشاريع المقاولات</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] rounded-3xl border border-white/[0.10] p-7"
        style={{ background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(28px)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
      >
        {/* PIN overlay */}
        <AnimatePresence mode="wait">
          {showPin && loginType === 'owner' ? (
            <PinPad key="pin" onDone={handlePin} onCancel={() => { setShowPin(false); setPinError('') }} error={pinError} />
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Login type tabs */}
              <div className="flex gap-1 mb-5 bg-white/[0.04] rounded-2xl p-1">
                {loginTabs.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => { setLoginType(id); clearMsg() }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1',
                      loginType === id
                        ? 'text-bg shadow-glow-sm'
                        : 'text-[#64748B] hover:text-[#F8FAFC]'
                    )}
                    style={loginType === id ? { background: 'linear-gradient(135deg, #00DDB3, #6366F1)' } : {}}
                  >
                    <span>{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">

                {/* Team member login */}
                {loginType === 'member' && (
                  <motion.form
                    key="member"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleMemberLogin}
                    className="space-y-4"
                  >
                    <FormField label="اسم المستخدم" icon={<User size={15} />}>
                      <input value={tmUsername} onChange={e => { setTmUsername(e.target.value); clearMsg() }}
                        placeholder="username" autoComplete="username" dir="ltr"
                        className="w-full rounded-xl px-4 py-3 pr-9 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-left" />
                    </FormField>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">كلمة المرور</label>
                      <PasswordInput value={tmPassword} onChange={v => { setTmPassword(v); clearMsg() }} placeholder="••••••••" autoComplete="current-password" />
                    </div>
                    {error && <Alert type="error">{error}</Alert>}
                    <SubmitBtn loading={loading} label="دخول" />
                  </motion.form>
                )}

                {/* Worker login */}
                {loginType === 'worker' && (
                  <motion.form
                    key="worker"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleWorkerLogin}
                    className="space-y-4"
                  >
                    <div className="text-center mb-2">
                      <div className="text-3xl mb-2">👷</div>
                      <div className="text-sm font-bold text-[#F8FAFC]">بوابة العمال</div>
                      <div className="text-xs text-[#64748B] mt-1">أدخل بيانات الدخول التي أعطاك إياها صاحب العمل</div>
                    </div>
                    <FormField label="اسم المستخدم" icon={<User size={15} />}>
                      <input value={wkUsername} onChange={e => { setWkUsername(e.target.value); clearMsg() }}
                        placeholder="username" autoComplete="username" dir="ltr"
                        className="w-full rounded-xl px-4 py-3 pr-9 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-left" />
                    </FormField>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">كلمة المرور</label>
                      <PasswordInput value={wkPassword} onChange={v => { setWkPassword(v); clearMsg() }} placeholder="••••••••" autoComplete="current-password" />
                    </div>
                    {error && <Alert type="error">{error}</Alert>}
                    <SubmitBtn loading={loading} label="دخول للبوابة" />
                  </motion.form>
                )}

                {/* Owner login */}
                {loginType === 'owner' && (
                  <motion.div
                    key="owner"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Mode tabs */}
                    <div className="flex gap-1 mb-5 bg-white/[0.04] rounded-2xl p-1">
                      {modeTabs.map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => { setMode(id); clearMsg() }}
                          className={cn(
                            'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200',
                            mode === id
                              ? 'text-bg shadow-glow-sm'
                              : 'text-[#64748B] hover:text-[#F8FAFC]'
                          )}
                          style={mode === id ? { background: 'linear-gradient(135deg, #00DDB3, #6366F1)' } : {}}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Forgot password */}
                    {mode === 'forgot' && (
                      <div className="space-y-4">
                        <FormField label="البريد الإلكتروني" icon={<Mail size={15} />}>
                          <input value={email} onChange={e => { setEmail(e.target.value); clearMsg() }}
                            type="email" placeholder="example@email.com" dir="ltr"
                            className="w-full rounded-xl px-4 py-3 pr-9 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-left" />
                        </FormField>
                        {error && <Alert type="error">{error}</Alert>}
                        {info  && <Alert type="success">{info}</Alert>}
                        <SubmitBtn loading={loading} label="إرسال رابط التغيير" onClick={handleForgotPassword} />
                      </div>
                    )}

                    {/* Login / Register form */}
                    {mode !== 'forgot' && (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                          <FormField label="الاسم الكامل" icon={<User size={15} />}>
                            <input value={name} onChange={e => { setName(e.target.value); clearMsg() }}
                              placeholder="محمد علي"
                              className="w-full rounded-xl px-4 py-3 pr-9 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                          </FormField>
                        )}
                        <FormField label="البريد الإلكتروني" icon={<Mail size={15} />}>
                          <input value={email} onChange={e => { setEmail(e.target.value); clearMsg() }}
                            type="email" placeholder="example@email.com" autoComplete="email" dir="ltr"
                            className="w-full rounded-xl px-4 py-3 pr-9 bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] text-sm placeholder:text-[#64748B] transition-all focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-left" />
                        </FormField>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">كلمة المرور</label>
                          <PasswordInput value={password} onChange={v => { setPassword(v); clearMsg() }} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                          {password.length > 0 && password.length < 6 && (
                            <p className="text-xs text-danger">أقل من 6 أحرف</p>
                          )}
                        </div>

                        {sessionExpiredMsg && (
                          <div className="flex items-start gap-2 px-4 py-3 bg-warning/10 border border-warning/30 rounded-xl text-warning text-xs font-semibold">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />
                            انتهت جلستك — سجّل دخولك مرة واحدة بكلمة المرور وسيعمل الـ PIN والبصمة تلقائياً
                          </div>
                        )}
                        {error && <Alert type="error">{error}</Alert>}
                        {info  && <Alert type="success">{info}</Alert>}

                        <SubmitBtn loading={loading} label={mode === 'login' ? 'دخول' : 'إنشاء حساب'} />
                      </form>
                    )}

                    {/* Passkey / PIN buttons */}
                    {mode === 'login' && (pinOk || (passkeyOk && passkeyReg)) && (
                      <div className="mt-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-px bg-white/[0.07]" />
                          <span className="text-xs text-[#64748B]">أو</span>
                          <div className="flex-1 h-px bg-white/[0.07]" />
                        </div>
                        <div className="flex gap-2.5">
                          {pinOk && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setShowPin(true); setPinError('') }}
                              disabled={loading}
                              className="flex-1 py-3.5 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-secondary/20 disabled:opacity-50"
                            >
                              <Hash size={16} />
                              PIN
                            </motion.button>
                          )}
                          {passkeyOk && passkeyReg && (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={handlePasskey}
                              disabled={loading}
                              className="flex-1 py-3.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-primary/20 disabled:opacity-50"
                            >
                              <Fingerprint size={16} />
                              بصمة
                            </motion.button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function FormField({ label, icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none">
            {icon}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function SubmitBtn({ loading, label, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={loading}
      className="w-full py-3.5 rounded-xl font-bold text-sm text-bg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
      style={{ background: 'linear-gradient(135deg, #00DDB3 0%, #6366F1 100%)', boxShadow: loading ? 'none' : '0 0 20px #00DDB344' }}
    >
      {loading ? (
        <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
      ) : (
        <>
          <ArrowRight size={15} />
          {label}
        </>
      )}
    </motion.button>
  )
}
