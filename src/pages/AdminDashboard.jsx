import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Lock, User, Loader2, Eye, EyeOff, LogOut, RefreshCw,
  Users, UserPlus, TrendingUp, Wallet, CreditCard, Clock,
  Building2, Briefcase, CalendarDays, CheckCircle2, AlertTriangle,
  Fingerprint, Settings, KeyRound, X, Check,
  LayoutDashboard, Search, Megaphone, Ban, ShieldCheck as ShieldOk, Crown,
  CalendarPlus, ChevronLeft, Send, Activity, Mail, Zap,
  Inbox, Sparkles, ArrowUpRight, ArrowDownRight, UserX, CalendarClock, Gauge, Download, Minus,
  Radio, Target, LogIn, Rocket, Pencil,
} from 'lucide-react'
import {
  ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { supabase } from '../lib/supabase.js'
import { C, GRAD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { PremiumCard, PremiumStat, IconChip } from '../ui/Premium.jsx'
import { navigate } from '../Router.jsx'

const TOKEN_KEY = 'cp_admin_token'
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const PLAN_LABELS = { free: 'مجاني', starter: 'المبتدئ', pro: 'المحترف', business: 'الأعمال' }
const PLAN_COLORS = { free: C.textDim, starter: C.cyan, pro: C.primary, business: C.secondary }

async function callFn(action, payload = {}, token) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'حدث خطأ')
  return data
}

function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showSettings, setShowSettings] = useState(false)
  const [tab, setTab] = useState('overview')

  const loadStats = useCallback(async (tk) => {
    setLoading(true); setError('')
    try {
      const { stats } = await callFn('stats', {}, tk)
      setStats(stats)
    } catch (e) {
      if (/جلسة|session|401/i.test(e.message)) { logout() }
      else setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (token) loadStats(token) }, []) // eslint-disable-line

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(''); setStats(null)
  }

  if (!token || (!stats && !loading && error)) {
    return <AdminLogin onSuccess={(tk) => { sessionStorage.setItem(TOKEN_KEY, tk); setToken(tk); loadStats(tk) }} initialError={token ? error : ''} />
  }

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingBottom: 40 }}>
      {/* Aurora */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 90% 90%, rgba(124,58,237,0.06) 0%, transparent 60%)' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(249,115,22,0.35)', flexShrink: 0 }}>
              <ShieldCheck size={24} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>مركز القيادة</div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>لوحة تحكّم المنصّة · Admin</div>
            </div>
          </div>
          <div className="admin-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => loadStats(token)} disabled={loading}
              style={btnStyle(C.cyan)}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} /> : <RefreshCw size={15} />}
              تحديث
            </button>
            <button onClick={() => setShowSettings(true)} style={btnStyle(C.secondary)}>
              <Settings size={15} /> إعدادات
            </button>
            <button onClick={logout} style={btnStyle(C.accent)}>
              <LogOut size={15} /> خروج
            </button>
          </div>
        </div>

        <style>{`
          @media (max-width: 640px){
            .admin-header{ align-items: stretch !important; }
            .admin-actions{ width: 100%; }
            .admin-actions button{ flex: 1; justify-content: center; }
          }
        `}</style>

        <AnimatePresence>
          {showSettings && <AdminSettings token={token} onClose={() => setShowSettings(false)} />}
        </AnimatePresence>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!stats && loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.textDim }}>
            <Loader2 size={36} style={{ animation: 'spin .8s linear infinite', color: C.primary }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>جارٍ تحميل الإحصائيات…</div>
          </div>
        )}

        {stats && (
          <>
            {/* تبويبات */}
            <div style={{ display: 'flex', gap: 6, background: C.surface, borderRadius: 14, padding: 5, marginBottom: 16, border: `1px solid ${C.border}` }}>
              {[
                { id: 'overview',  label: 'نظرة عامة', icon: LayoutDashboard },
                { id: 'live',      label: 'مباشر', icon: Radio },
                { id: 'users',     label: 'المستخدمون', icon: Users },
                { id: 'broadcast', label: 'رسالة جماعية', icon: Megaphone },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', background: tab === t.id ? GRAD.primary : 'transparent', color: tab === t.id ? '#fff' : C.textDim, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'overview'  && <Dashboard stats={stats} token={token} />}
            {tab === 'live'      && <ActivityFeed token={token} />}
            {tab === 'users'     && <UsersTab token={token} />}
            {tab === 'broadcast' && <BroadcastTab token={token} />}
          </>
        )}
      </div>
    </div>
  )
}

// ── الإحصائيات ────────────────────────────────────────────────────────────────
function Dashboard({ stats, token }) {
  const u = stats.users || {}
  const s = stats.subscriptions || {}
  const tr = stats.trials || {}
  const tot = stats.totals || {}
  const f = stats.funnel || {}
  const plans = stats.plans || []
  const chart = buildForecastChart(stats.signups_monthly || [])
  const recent = stats.recent_users || []
  const arr = (s.mrr || 0) * 12
  const convRate = f.signups ? Math.round(((f.paying || 0) / f.signups) * 100) : 0
  const pulse = computePulse(stats)
  const wow = wowDelta(u.new_7d || 0, u.new_prev_7d || 0)

  return (
    <>
      {/* نبض المنصّة */}
      <PlatformPulse pulse={pulse} />

      {/* صندوق الإجراءات الذكي */}
      <ActionInbox token={token} />

      {/* الصف الأول — الأرقام الكبرى */}
      <div style={grid(4)}>
        <PremiumStat icon={Users}     tone="cyan"    label="إجمالي المستخدمين" value={fmt(u.total)}     sub={`${u.confirmed || 0} مفعّل`} delay={0} />
        <PremiumStat icon={UserPlus}  tone="success" label="جدد هذا الشهر"      value={fmt(u.new_30d)}   sub={wow.text} delay={0.05} />
        <PremiumStat icon={Wallet}    tone="warning" label="الإيراد الشهري (MRR)" value={fmt(s.mrr)} money sub={`${s.active || 0} اشتراك نشط`} delay={0.1} />
        <PremiumStat icon={CreditCard} tone="brand"  label="اشتراكات مدفوعة"    value={fmt(s.active)}    sub={s.past_due ? `${s.past_due} متعثّر` : 'لا متعثّرين'} delay={0.15} />
      </div>

      {/* الصف الثاني — النشاط + الإيراد السنوي */}
      <div style={grid(4)}>
        <PremiumStat icon={Activity} tone="success" label="نشطون (30 يوم)" value={fmt(u.active_30d)} sub={`${fmt(u.active_7d)} هذا الأسبوع`} delay={0.2} />
        <PremiumStat icon={TrendingUp} tone="cyan"  label="الإيراد السنوي (ARR)" value={fmt(arr)} money sub={`${convRate}% معدّل التحويل`} delay={0.25} />
        <PremiumStat icon={Clock}     tone="warning" label="تجارب نشطة"   value={fmt(tr.active)}   sub={`${fmt(tr.expired)} منتهية`} delay={0.3} />
        <PremiumStat icon={UserPlus}  tone="brand"   label="جدد اليوم"     value={fmt(u.new_today)} delay={0.35} />
      </div>

      {/* قمع التحويل */}
      <PremiumCard tone="success" delay={0.38} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconChip icon={Zap} color={C.success} size={32} radius={10} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>قمع التحويل</div>
            <div style={{ fontSize: 10, color: C.textDim }}>من التسجيل إلى الاشتراك المدفوع</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'تسجيل', val: f.signups || 0, col: C.cyan },
            { label: 'مفعّل', val: f.activated || 0, col: C.secondary },
            { label: 'نشط', val: f.engaged || 0, col: C.warning },
            { label: 'مدفوع', val: f.paying || 0, col: C.success },
          ].map((st, i) => {
            const pct = f.signups ? Math.round((st.val / f.signups) * 100) : 0
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(8, pct)}%` }} transition={{ duration: 0.7, delay: 0.1 * i }}
                    style={{ width: '100%', maxWidth: 46, borderRadius: '8px 8px 4px 4px', background: st.col, boxShadow: `0 0 14px ${st.col}55` }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{fmt(st.val)}</div>
                <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700 }}>{st.label}</div>
              </div>
            )
          })}
        </div>
      </PremiumCard>

      {/* الأهداف */}
      <TargetsCard token={token} stats={stats} />

      {/* الصف الثالث — إجماليات الاستخدام */}
      <div style={grid(4)}>
        <PremiumStat icon={Briefcase}    tone="cyan"    label="مشاريع"   value={fmt(tot.projects)} delay={0.4} />
        <PremiumStat icon={Users}        tone="purple"  label="عمّال"    value={fmt(tot.employees)} delay={0.42} />
        <PremiumStat icon={CalendarDays} tone="success" label="أيام عمل" value={fmt(tot.work_days)} delay={0.44} />
        <PremiumStat icon={Building2}    tone="warning" label="مصالح"    value={fmt(tot.businesses)} delay={0.46} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12, marginTop: 4 }} className="admin-cols">
        {/* مخطّط النمو */}
        <PremiumCard tone="brand" delay={0.4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconChip icon={TrendingUp} color={C.primary} size={32} radius={10} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>نمو التسجيلات + توقّع</div>
              <div style={{ fontSize: 10, color: C.textDim }}>١٢ شهراً ماضية · <span style={{ color: C.cyan }}>٣ أشهر متوقّعة ┄</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.primary} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip
                contentStyle={{ background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: C.textDim }} itemStyle={{ color: C.text }}
                formatter={(v, n) => [v, n === 'proj' ? 'متوقّع' : 'تسجيلات']}
              />
              <Area type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2.5} fill="url(#adminGrad)" connectNulls />
              <Line type="monotone" dataKey="proj" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3, fill: C.cyan }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </PremiumCard>

        {/* توزيع الخطط */}
        <PremiumCard tone="purple" delay={0.45}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconChip icon={Building2} color={C.secondary} size={32} radius={10} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>توزيع الخطط</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{fmt(tot.organizations)} مؤسّسة</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(p => {
              const total = plans.reduce((a, x) => a + x.count, 0) || 1
              const pct = Math.round((p.count / total) * 100)
              const col = PLAN_COLORS[p.plan] || C.textDim
              return (
                <div key={p.plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                    <span style={{ color: C.text }}>{PLAN_LABELS[p.plan] || p.plan}</span>
                    <span style={{ color: C.textDim }}>{p.count} · {pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: C.card, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 6, background: col, boxShadow: `0 0 12px ${col}66` }} />
                  </div>
                </div>
              )
            })}
            {plans.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>لا بيانات</div>}
          </div>
        </PremiumCard>
      </div>

      {/* آخر المسجّلين */}
      <PremiumCard tone="cyan" delay={0.5} style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconChip icon={Users} color={C.cyan} size={32} radius={10} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>آخر المسجّلين</div>
            <div style={{ fontSize: 10, color: C.textDim }}>أحدث {recent.length} حساب</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((r, i) => {
            const col = PLAN_COLORS[r.plan] || C.textDim
            return (
              <motion.div key={r.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.02 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `${col}1c`, border: `1px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: col }}>
                  {(r.name || r.email || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {r.confirmed
                    ? <CheckCircle2 size={14} color={C.success} />
                    : <AlertTriangle size={14} color={C.warning} />}
                  <span style={{ fontSize: 10, fontWeight: 800, color: col, padding: '3px 8px', borderRadius: 8, background: `${col}16`, border: `1px solid ${col}33` }}>
                    {PLAN_LABELS[r.plan] || '—'}
                  </span>
                  <span style={{ fontSize: 10, color: C.textDim, minWidth: 64, textAlign: 'left' }}>{fmtDateTime(r.created_at)}</span>
                </div>
              </motion.div>
            )
          })}
          {recent.length === 0 && <div style={{ fontSize: 12, color: C.textDim }}>لا مستخدمين بعد</div>}
        </div>
      </PremiumCard>

      <div style={{ textAlign: 'center', fontSize: 10, color: C.textDim, marginTop: 18 }}>
        آخر تحديث: {stats.generated_at ? new Date(stats.generated_at).toLocaleString('ar-EG') : ''}
      </div>

      <style>{`@media (max-width: 760px){ .admin-cols{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}

// ── شاشة دخول الأدمن ──────────────────────────────────────────────────────────
function AdminLogin({ onSuccess, initialError }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError || '')

  async function submit(e) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true); setError('')
    try {
      const { token } = await callFn('login', { username, password })
      onSuccess(token)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handlePasskey() {
    setLoading(true); setError('')
    try {
      const options = await callFn('wa-auth-options')
      const assertion = await startAuthentication(options)
      const { token } = await callFn('wa-auth-verify', { credential: assertion })
      onSuccess(token)
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('أُلغيت عملية البصمة')
      else setError(err.message || 'فشلت البصمة')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 38px 11px 13px',
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
    color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    direction: 'ltr', textAlign: 'right',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(249,115,22,0.09) 0%, transparent 60%)' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ width: 72, height: 72, borderRadius: 22, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 18px 50px rgba(249,115,22,0.4)' }}>
            <ShieldCheck size={36} color="#fff" strokeWidth={1.8} />
          </motion.div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: C.text }}>لوحة الأدمن</div>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>دخول مخصّص لإدارة المنصّة</div>
        </div>

        <form onSubmit={submit}
          style={{ background: C.surface, borderRadius: 22, border: `1px solid ${C.border}`, padding: '24px 20px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" style={inputStyle} required autoComplete="username" />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.textDim, marginBottom: 7 }}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ ...inputStyle, padding: '11px 38px 11px 40px' }} required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#FCA5A5', marginBottom: 14 }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
            style={{ width: '100%', padding: '13px', borderRadius: 14, background: loading ? 'rgba(249,115,22,0.4)' : GRAD.primary, border: 'none', color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 28px rgba(249,115,22,0.35)' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin .75s linear infinite' }} /> : <ShieldCheck size={16} />}
            دخول
          </motion.button>

          <button type="button" onClick={handlePasskey} disabled={loading}
            style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 14, background: `${C.secondary}16`, border: `1px solid ${C.secondary}33`, color: C.secondary, fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Fingerprint size={17} /> الدخول بالبصمة
          </button>

          <button type="button" onClick={() => navigate('/')}
            style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← العودة للموقع
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ── إعدادات الأدمن: تفعيل البصمة + تغيير كلمة المرور ──────────────────────────
function AdminSettings({ token, onClose }) {
  const [pkCount, setPkCount] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null) // { type: 'ok'|'err', text }

  // تغيير كلمة المرور
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')
  const [newUser, setNewUser] = useState('')

  useEffect(() => {
    callFn('passkey-status', {}, token).then(d => setPkCount(d.count)).catch(() => setPkCount(0))
  }, [token])

  async function enableBiometric() {
    setBusy('bio'); setMsg(null)
    try {
      const options = await callFn('wa-reg-options', {}, token)
      const cred = await startRegistration(options)
      await callFn('wa-reg-verify', { credential: cred }, token)
      localStorage.setItem('cp_admin_has_passkey', '1')
      const d = await callFn('passkey-status', {}, token).catch(() => null)
      if (d) setPkCount(d.count)
      setMsg({ type: 'ok', text: 'تم تفعيل البصمة على هذا الجهاز ✓' })
    } catch (err) {
      if (err.name === 'NotAllowedError') setMsg({ type: 'err', text: 'أُلغيت عملية البصمة' })
      else setMsg({ type: 'err', text: err.message || 'فشل تفعيل البصمة' })
    }
    setBusy('')
  }

  async function changePassword(e) {
    e.preventDefault()
    setMsg(null)
    if (newPass.length < 8) { setMsg({ type: 'err', text: 'كلمة المرور الجديدة 8 أحرف على الأقل' }); return }
    if (newPass !== confPass) { setMsg({ type: 'err', text: 'تأكيد كلمة المرور غير مطابق' }); return }
    setBusy('pass')
    try {
      await callFn('change-password', { current_password: curPass, new_password: newPass, new_username: newUser || undefined }, token)
      setCurPass(''); setNewPass(''); setConfPass(''); setNewUser('')
      setMsg({ type: 'ok', text: 'تم تغيير بيانات الدخول ✓' })
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'فشل التغيير' })
    }
    setBusy('')
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    direction: 'ltr', textAlign: 'right', marginBottom: 10,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 22, padding: '22px 18px', width: '100%', maxWidth: 420, marginTop: 30 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <IconChip icon={Settings} color={C.secondary} size={30} radius={9} />
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>إعدادات الأمان</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><X size={20} /></button>
        </div>

        {msg && (
          <div style={{ background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: msg.type === 'ok' ? '#86EFAC' : '#FCA5A5', marginBottom: 14 }}>
            {msg.text}
          </div>
        )}

        {/* البصمة */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Fingerprint size={18} color={C.secondary} />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>الدخول بالبصمة</div>
            {pkCount > 0 && <span style={{ marginInlineStart: 'auto', fontSize: 10, fontWeight: 800, color: C.success, padding: '3px 8px', borderRadius: 8, background: `${C.success}16`, border: `1px solid ${C.success}33`, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={11} /> مفعّلة ({pkCount})</span>}
          </div>
          <div style={{ fontSize: 11.5, color: C.textDim, lineHeight: 1.6, marginBottom: 12 }}>
            فعّل بصمة الإصبع / Face ID على هذا الجهاز لتدخل بضغطة بدل كلمة المرور. (لكل جهاز بصمته الخاصة.)
          </div>
          <button onClick={enableBiometric} disabled={busy === 'bio'}
            style={{ width: '100%', padding: '11px', borderRadius: 12, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: busy === 'bio' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy === 'bio' ? <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> : <Fingerprint size={16} />}
            {pkCount > 0 ? 'إضافة بصمة هذا الجهاز' : 'تفعيل البصمة على هذا الجهاز'}
          </button>
        </div>

        {/* تغيير كلمة المرور */}
        <form onSubmit={changePassword} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <KeyRound size={18} color={C.primary} />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>تغيير بيانات الدخول</div>
          </div>
          <input type="password" value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="كلمة المرور الحالية" style={inputStyle} required autoComplete="current-password" />
          <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="اسم مستخدم جديد (اختياري)" style={inputStyle} autoComplete="off" />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة (8 أحرف+)" style={inputStyle} required autoComplete="new-password" />
          <input type="password" value={confPass} onChange={e => setConfPass(e.target.value)} placeholder="تأكيد كلمة المرور الجديدة" style={{ ...inputStyle, marginBottom: 14 }} required autoComplete="new-password" />
          <button type="submit" disabled={busy === 'pass'}
            style={{ width: '100%', padding: '11px', borderRadius: 12, background: GRAD.primary, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: busy === 'pass' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {busy === 'pass' ? <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> : <Check size={16} />}
            حفظ التغييرات
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── تبويب المستخدمين ──────────────────────────────────────────────────────────
function UsersTab({ token }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async (q) => {
    setLoading(true)
    try {
      const { users } = await callFn('list-users', { search: q || '', limit: 200 }, token)
      setUsers(users || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [token])

  useEffect(() => { load('') }, [load])
  useEffect(() => {
    const t = setTimeout(() => load(search), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد…"
            style={{ width: '100%', padding: '12px 40px 12px 13px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <button onClick={() => downloadUsersCSV(users)} disabled={!users.length} title="تصدير CSV"
          style={{ flexShrink: 0, padding: '0 14px', borderRadius: 14, border: `1px solid ${C.cyan}33`, background: `${C.cyan}16`, color: C.cyan, fontSize: 12, fontWeight: 800, cursor: users.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={15} /> CSV
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: C.textDim }}><Loader2 size={28} style={{ animation: 'spin .8s linear infinite', color: C.primary }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((r, i) => {
            const col = PLAN_COLORS[r.plan] || C.textDim
            return (
              <motion.button key={r.id} onClick={() => setSelected(r.id)}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.surface, border: `1px solid ${r.banned ? C.accent + '44' : C.border}`, borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', width: '100%' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${col}1c`, border: `1px solid ${col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800, color: col }}>
                  {(r.name || r.email || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name || '—'} {r.banned && <span style={{ color: C.accent, fontSize: 10 }}>· محظور</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: col, padding: '3px 8px', borderRadius: 8, background: `${col}16`, border: `1px solid ${col}33`, flexShrink: 0 }}>{PLAN_LABELS[r.plan] || '—'}</span>
                <ChevronLeft size={16} color={C.textDim} style={{ flexShrink: 0 }} />
              </motion.button>
            )
          })}
          {users.length === 0 && <div style={{ textAlign: 'center', fontSize: 13, color: C.textDim, padding: '40px 0' }}>لا نتائج</div>}
        </div>
      )}

      <AnimatePresence>
        {selected && <UserDetailModal token={token} userId={selected} onClose={() => setSelected(null)} onChanged={() => load(search)} />}
      </AnimatePresence>
    </div>
  )
}

// ── تفاصيل مستخدم + إجراءات التحكّم ────────────────────────────────────────────
function UserDetailModal({ token, userId, onClose, onChanged }) {
  const [u, setU] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  const reload = useCallback(async () => {
    try { const { user } = await callFn('user-detail', { user_id: userId }, token); setU(user) } catch { /* ignore */ }
  }, [token, userId])
  useEffect(() => { reload() }, [reload])

  async function act(kind, payload, okText) {
    setBusy(kind); setMsg(null)
    try {
      await callFn(payload.action, payload, token)
      setMsg({ type: 'ok', text: okText })
      await reload(); onChanged?.()
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'فشل الإجراء' })
    }
    setBusy('')
  }

  async function impersonate() {
    setBusy('imp'); setMsg(null)
    try {
      const { token_hash } = await callFn('impersonate', { user_id: userId }, token)
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
      if (error) throw new Error('فشل فتح جلسة المستخدم')
      navigate('/app')
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'فشل الدخول كمستخدم' })
      setBusy('')
    }
  }

  const COUNT_LABELS = { projects: 'مشاريع', employees: 'عمّال', work_days: 'أيام عمل', expenses: 'مصاريف', businesses: 'مصالح', material_logs: 'بضاعة', team_members: 'فريق' }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 22, padding: '22px 18px', width: '100%', maxWidth: 460, marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>تفاصيل المستخدم</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><X size={20} /></button>
        </div>

        {!u ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Loader2 size={26} style={{ animation: 'spin .8s linear infinite', color: C.primary }} /></div>
        ) : (
          <>
            {/* هوية */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                {(u.name || u.email || '?').trim().charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{u.name || '—'}</div>
                <div style={{ fontSize: 11.5, color: C.textDim, direction: 'ltr', textAlign: 'right' }}>{u.email}</div>
                <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 2 }}>سجّل {fmtDateTime(u.created_at)} · آخر دخول {u.last_sign_in_at ? fmtDateTime(u.last_sign_in_at) : '—'}</div>
              </div>
            </div>

            {msg && (
              <div style={{ background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: msg.type === 'ok' ? '#86EFAC' : '#FCA5A5', marginBottom: 12 }}>{msg.text}</div>
            )}

            {/* عدّادات الاستخدام */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(72px,1fr))', gap: 8, marginBottom: 16 }}>
              {Object.entries(u.counts || {}).map(([k, v]) => (
                <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.text }}>{fmt(v)}</div>
                  <div style={{ fontSize: 9.5, color: C.textDim, fontWeight: 700 }}>{COUNT_LABELS[k] || k}</div>
                </div>
              ))}
            </div>

            {/* تغيير الخطة */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: 13, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Crown size={15} color={C.secondary} /><span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>الخطة الحالية: {PLAN_LABELS[u.plan] || u.plan}</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['free', 'starter', 'pro', 'business'].map(pl => (
                  <button key={pl} disabled={busy === 'plan' || u.plan === pl}
                    onClick={() => act('plan', { action: 'set-plan', user_id: userId, plan: pl }, `تم ضبط الخطة: ${PLAN_LABELS[pl]}`)}
                    style={{ flex: 1, minWidth: 70, padding: '8px 4px', borderRadius: 9, border: `1px solid ${u.plan === pl ? PLAN_COLORS[pl] : C.border}`, background: u.plan === pl ? `${PLAN_COLORS[pl]}22` : 'transparent', color: u.plan === pl ? PLAN_COLORS[pl] : C.textDim, fontSize: 11.5, fontWeight: 800, cursor: u.plan === pl ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {PLAN_LABELS[pl]}
                  </button>
                ))}
              </div>
            </div>

            {/* التجربة */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 13, padding: 13, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><CalendarPlus size={15} color={C.warning} /><span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>التجربة تنتهي: {u.trial_ends_at ? fmtDateTime(u.trial_ends_at) : '—'}</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[14, 30, 90].map(d => (
                  <button key={d} disabled={busy === 'trial'}
                    onClick={() => act('trial', { action: 'set-trial', user_id: userId, days: d }, `تم تمديد التجربة ${d} يوم`)}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 9, border: `1px solid ${C.warning}44`, background: `${C.warning}12`, color: C.warning, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    +{d} يوم
                  </button>
                ))}
              </div>
            </div>

            {/* دخول كهذا المستخدم */}
            <button onClick={impersonate} disabled={busy === 'imp'}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${C.secondary}44`, background: `${C.secondary}14`, color: C.secondary, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              {busy === 'imp' ? <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> : <LogIn size={16} />}
              دخول كهذا المستخدم (للدعم)
            </button>

            {/* حظر */}
            <button disabled={busy === 'ban'}
              onClick={() => act('ban', { action: 'set-user-banned', user_id: userId, banned: !u.banned }, u.banned ? 'تم إلغاء الحظر' : 'تم حظر المستخدم')}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${u.banned ? C.success : C.accent}44`, background: `${u.banned ? C.success : C.accent}14`, color: u.banned ? C.success : C.accent, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {busy === 'ban' ? <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> : (u.banned ? <ShieldOk size={16} /> : <Ban size={16} />)}
              {u.banned ? 'إلغاء الحظر (السماح بالدخول)' : 'حظر المستخدم (منع الدخول)'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── تبويب الرسالة الجماعية ────────────────────────────────────────────────────
function BroadcastTab({ token }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function send(e) {
    e.preventDefault()
    setMsg(null)
    if (!title.trim() || !body.trim()) { setMsg({ type: 'err', text: 'العنوان والنص مطلوبان' }); return }
    setBusy(true)
    try {
      const { count } = await callFn('broadcast', { title: title.trim(), body: body.trim() }, token)
      setTitle(''); setBody('')
      setMsg({ type: 'ok', text: `تم إرسال الإشعار إلى ${count} مستخدم ✓` })
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'فشل الإرسال' })
    }
    setBusy(false)
  }

  const inputStyle = { width: '100%', padding: '12px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }

  return (
    <PremiumCard tone="purple">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <IconChip icon={Megaphone} color={C.secondary} size={32} radius={10} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 900 }}>رسالة جماعية</div>
          <div style={{ fontSize: 10, color: C.textDim }}>يظهر كإشعار داخل تطبيق كل المستخدمين</div>
        </div>
      </div>
      {msg && (
        <div style={{ background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: msg.type === 'ok' ? '#86EFAC' : '#FCA5A5', margin: '12px 0' }}>{msg.text}</div>
      )}
      <form onSubmit={send} style={{ marginTop: 14 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإشعار" style={inputStyle} maxLength={80} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="نص الرسالة…" rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} maxLength={400} />
        <button type="submit" disabled={busy}
          style={{ width: '100%', padding: '13px', borderRadius: 13, background: busy ? `${C.secondary}60` : GRAD.premium, border: 'none', color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {busy ? <Loader2 size={17} style={{ animation: 'spin .8s linear infinite' }} /> : <Send size={16} />}
          إرسال للجميع
        </button>
      </form>
    </PremiumCard>
  )
}

// ── نبض المنصّة (مؤشّر صحّة 0–100) ────────────────────────────────────────────
function clampP(n) { return Math.max(0, Math.min(100, Math.round(n || 0))) }

function computePulse(stats) {
  const u = stats.users || {}, f = stats.funnel || {}
  const signups = f.signups || 0
  const activation   = signups ? (f.activated / signups) * 100 : 0
  const engagement   = signups ? (f.engaged / signups) * 100 : 0
  const retention    = (u.active_30d || 0) ? ((u.active_7d || 0) / u.active_30d) * 100 : 0
  const monetization = signups ? (f.paying / signups) * 100 : 0
  const growth       = u.total ? Math.min(100, ((u.new_30d || 0) / Math.max(1, u.total)) * 100 * 2) : 0
  const score = clampP(activation * 0.2 + engagement * 0.3 + retention * 0.2 + growth * 0.2 + monetization * 0.1)
  const grade = score >= 80 ? { label: 'ممتاز', color: C.success }
    : score >= 60 ? { label: 'جيد', color: C.cyan }
    : score >= 40 ? { label: 'مقبول', color: C.warning }
    : score >= 20 ? { label: 'ضعيف', color: C.primary }
    : { label: 'حرج', color: C.accent }
  return {
    score, grade,
    factors: [
      { label: 'النمو', val: clampP(growth), color: C.primary },
      { label: 'التفعيل', val: clampP(activation), color: C.cyan },
      { label: 'التفاعل', val: clampP(engagement), color: C.secondary },
      { label: 'الاستبقاء', val: clampP(retention), color: C.success },
      { label: 'التحصيل', val: clampP(monetization), color: C.gold },
    ],
  }
}

function wowDelta(cur, prev) {
  if (!prev && !cur) return { text: 'لا تسجيلات هذا الأسبوع' }
  if (!prev) return { text: `${fmt(cur)} هذا الأسبوع ✦` }
  const pct = Math.round(((cur - prev) / prev) * 100)
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→'
  return { text: `${arrow}${Math.abs(pct)}% عن الأسبوع السابق` }
}

function PlatformPulse({ pulse }) {
  const col = pulse.grade.color
  return (
    <PremiumCard color={col} delay={0} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconChip icon={Gauge} color={col} size={34} radius={11} pulse />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>نبض المنصّة</div>
            <div style={{ fontSize: 10, color: C.textDim }}>مؤشّر صحّة عملك ككل</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: col, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pulse.score}</div>
          <span style={{ fontSize: 10, fontWeight: 800, color: col, padding: '2px 9px', borderRadius: 9, background: `${col}16`, border: `1px solid ${col}3a`, display: 'inline-block', marginTop: 3 }}>{pulse.grade.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {pulse.factors.map((ft, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(6, ft.val)}%` }} transition={{ duration: 0.7, delay: 0.08 * i }}
                style={{ width: '100%', maxWidth: 38, borderRadius: '6px 6px 3px 3px', background: ft.color, boxShadow: `0 0 12px ${ft.color}55` }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.text }}>{ft.val}</div>
            <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700 }}>{ft.label}</div>
          </div>
        ))}
      </div>
    </PremiumCard>
  )
}

// ── صندوق الإجراءات الذكي ──────────────────────────────────────────────────────
function ActionInbox({ token }) {
  const [items, setItems] = useState(null)
  const [busy, setBusy] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    try { const { items } = await callFn('action-items', {}, token); setItems(items || {}) } catch { setItems({}) }
  }, [token])
  useEffect(() => { load() }, [load])

  async function quick(key, payload) {
    setBusy(key)
    try { await callFn(payload.action, payload, token); await load() } catch { /* ignore */ }
    setBusy('')
  }

  if (!items) return null
  const trials = items.trials_ending || [], churn = items.churn_risk || [], upsell = items.upsell || [], unconf = items.unconfirmed || []
  const total = trials.length + churn.length + upsell.length + unconf.length

  const row = (it, ctx, ctxColor, btn) => (
    <div key={it.id + (ctx || '')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11 }}>
      <button onClick={() => setSelected(it.id)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit', padding: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name || it.email}</div>
        <div style={{ fontSize: 10.5, color: ctxColor || C.textDim, fontWeight: 600 }}>{ctx}</div>
      </button>
      {btn}
    </div>
  )

  const actionBtn = (key, label, color, onClick) => (
    <button onClick={onClick} disabled={busy === key}
      style={{ flexShrink: 0, padding: '6px 11px', borderRadius: 9, border: `1px solid ${color}44`, background: `${color}16`, color, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
      {busy === key ? <Loader2 size={12} style={{ animation: 'spin .8s linear infinite' }} /> : label}
    </button>
  )

  const Section = ({ icon: Icon, color, title, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )

  return (
    <PremiumCard color={total ? C.warning : C.success} delay={0.05} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconChip icon={Inbox} color={total ? C.warning : C.success} size={32} radius={10} pulse={total > 0} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 900 }}>صندوق الإجراءات الذكي</div>
          <div style={{ fontSize: 10, color: C.textDim }}>{total ? `${total} بند يحتاج انتباهك` : 'كل شي تحت السيطرة'}</div>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 0', color: C.textDim, fontSize: 13 }}>
          <Sparkles size={26} color={C.success} style={{ marginBottom: 6 }} />
          <div>لا إجراءات عاجلة — كل شي تمام 🎉</div>
        </div>
      ) : (
        <>
          {trials.length > 0 && (
            <Section icon={CalendarClock} color={C.warning} title="تجارب تنتهي قريباً">
              {trials.map(it => row(it, `تنتهي تجربته خلال ${it.days_left} يوم`, C.warning,
                actionBtn(`tr-${it.id}`, '+30 يوم', C.warning, () => quick(`tr-${it.id}`, { action: 'set-trial', user_id: it.id, days: 30 }))))}
            </Section>
          )}
          {upsell.length > 0 && (
            <Section icon={Crown} color={C.success} title="مرشّحون للترقية (استخدام عالٍ · مجاني)">
              {upsell.map(it => row(it, `استخدام ${fmt(it.usage)} عملية`, C.success,
                actionBtn(`up-${it.id}`, 'ترقية Pro', C.success, () => quick(`up-${it.id}`, { action: 'set-plan', user_id: it.id, plan: 'pro' }))))}
            </Section>
          )}
          {churn.length > 0 && (
            <Section icon={UserX} color={C.accent} title="معرّضون للهجر">
              {churn.map(it => row(it, `لم يدخل منذ ${it.days_inactive} يوم`, C.accent,
                <ChevronLeft size={15} color={C.textDim} style={{ flexShrink: 0 }} />))}
            </Section>
          )}
          {unconf.length > 0 && (
            <Section icon={Mail} color={C.cyan} title="بريد غير مفعّل">
              {unconf.map(it => row(it, `سجّل ${fmtDateTime(it.created_at)}`, C.cyan,
                <ChevronLeft size={15} color={C.textDim} style={{ flexShrink: 0 }} />))}
            </Section>
          )}
        </>
      )}

      <AnimatePresence>
        {selected && <UserDetailModal token={token} userId={selected} onClose={() => setSelected(null)} onChanged={load} />}
      </AnimatePresence>
    </PremiumCard>
  )
}

// ── توقّع النمو: يمدّد المنحنى 3 أشهر بمتوسّط آخر 3 ──────────────────────────
function buildForecastChart(monthly) {
  const data = monthly.map(m => ({ month: m.month.slice(2), count: m.count, proj: null }))
  if (data.length) {
    const last3 = monthly.slice(-3).map(m => m.count || 0)
    const avg = last3.length ? Math.max(0, Math.round(last3.reduce((a, b) => a + b, 0) / last3.length)) : 0
    data[data.length - 1] = { ...data[data.length - 1], proj: data[data.length - 1].count }
    let [y, mo] = (monthly[monthly.length - 1].month).split('-').map(Number)
    for (let i = 0; i < 3; i++) {
      mo++; if (mo > 12) { mo = 1; y++ }
      data.push({ month: `${String(y).slice(2)}-${String(mo).padStart(2, '0')}`, count: null, proj: avg })
    }
  }
  return data
}

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

// ── سجلّ النشاط الحيّ ──────────────────────────────────────────────────────────
function ActivityFeed({ token }) {
  const [feed, setFeed] = useState(null)
  const load = useCallback(async () => {
    try { const { feed } = await callFn('activity-feed', { limit: 40 }, token); setFeed(feed || []) } catch { setFeed([]) }
  }, [token])
  useEffect(() => {
    load()
    const iv = setInterval(load, 20000) // تحديث تلقائي كل 20 ثانية
    return () => clearInterval(iv)
  }, [load])

  const META = {
    signup:       { icon: UserPlus,   color: C.success, label: 'تسجيل جديد' },
    subscription: { icon: CreditCard, color: C.gold,    label: 'اشتراك جديد' },
  }

  return (
    <PremiumCard tone="success">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconChip icon={Radio} color={C.success} size={32} radius={10} pulse />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>النشاط المباشر</div>
          <div style={{ fontSize: 10, color: C.textDim }}>يتحدّث تلقائياً كل ٢٠ ثانية</div>
        </div>
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
      </div>
      {!feed ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><Loader2 size={26} style={{ animation: 'spin .8s linear infinite', color: C.primary }} /></div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: C.textDim, padding: '30px 0' }}>لا نشاط بعد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {feed.map((e, i) => {
            const m = META[e.type] || META.signup
            return (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${m.color}1c`, border: `1px solid ${m.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <m.icon size={15} color={m.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.label}{e.detail ? ` · ${PLAN_LABELS[e.detail] || e.detail}` : ''}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.textDim, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name || e.email}</div>
                </div>
                <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>{timeAgo(e.at)}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </PremiumCard>
  )
}

// ── بطاقة الأهداف + التقدّم ────────────────────────────────────────────────────
function TargetsCard({ token, stats }) {
  const [t, setT] = useState(stats.targets || {})
  const [edit, setEdit] = useState(false)
  const [tu, setTu] = useState(t.users || '')
  const [tm, setTm] = useState(t.mrr || '')
  const [busy, setBusy] = useState(false)

  const curUsers = stats.users?.total || 0
  const curMrr = stats.subscriptions?.mrr || 0
  const hasTargets = t.users || t.mrr

  async function save() {
    setBusy(true)
    try {
      await callFn('set-targets', { target_users: tu || null, target_mrr: tm || null }, token)
      setT({ users: tu ? Number(tu) : null, mrr: tm ? Number(tm) : null })
      setEdit(false)
    } catch { /* ignore */ }
    setBusy(false)
  }

  const Bar = ({ label, cur, target, color, money }) => {
    const pct = target ? Math.min(100, Math.round((cur / target) * 100)) : 0
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          <span style={{ color: C.text }}>{label}</span>
          <span style={{ color: C.textDim }}>{money ? '₪' : ''}{fmt(cur)} / {money ? '₪' : ''}{fmt(target)} · <span style={{ color }}>{pct}%</span></span>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: C.card, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 6, background: color, boxShadow: `0 0 12px ${color}66` }} />
        </div>
      </div>
    )
  }

  const inputStyle = { flex: 1, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'ltr', textAlign: 'right' }

  return (
    <PremiumCard tone="cyan" delay={0.39} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconChip icon={Target} color={C.cyan} size={32} radius={10} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>أهدافك</div>
          <div style={{ fontSize: 10, color: C.textDim }}>تقدّمك نحو ما تطمح إليه</div>
        </div>
        {!edit && (
          <button onClick={() => { setTu(t.users || ''); setTm(t.mrr || ''); setEdit(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, display: 'flex' }}><Pencil size={16} /></button>
        )}
      </div>

      {edit ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={tu} onChange={e => setTu(e.target.value.replace(/[^0-9]/g, ''))} placeholder="هدف المستخدمين" style={inputStyle} inputMode="numeric" />
            <input value={tm} onChange={e => setTm(e.target.value.replace(/[^0-9]/g, ''))} placeholder="هدف MRR (₪)" style={inputStyle} inputMode="numeric" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEdit(false)} style={{ flex: 1, padding: '10px', borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <button onClick={save} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 11, background: GRAD.cyan || C.cyan, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {busy ? <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} /> : <Check size={15} />} حفظ
            </button>
          </div>
        </div>
      ) : hasTargets ? (
        <>
          {t.users ? <Bar label="المستخدمون" cur={curUsers} target={t.users} color={C.cyan} /> : null}
          {t.mrr ? <Bar label="الإيراد الشهري" cur={curMrr} target={t.mrr} color={C.success} money /> : null}
        </>
      ) : (
        <button onClick={() => setEdit(true)}
          style={{ width: '100%', padding: '12px', borderRadius: 12, background: `${C.cyan}14`, border: `1px dashed ${C.cyan}44`, color: C.cyan, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Rocket size={16} /> حدّد هدفك الأول
        </button>
      )}
    </PremiumCard>
  )
}

function downloadUsersCSV(users) {
  const head = ['name', 'email', 'plan', 'confirmed', 'banned', 'created_at', 'last_sign_in_at']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = users.map(u => [u.name, u.email, u.plan, u.confirmed ? 'yes' : 'no', u.banned ? 'yes' : 'no', u.created_at, u.last_sign_in_at].map(esc).join(','))
  const csv = '﻿' + [head.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `contractor-pro-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function grid(cols) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 160px), 1fr))`,
    gap: 12,
    marginBottom: 12,
  }
}

function btnStyle(color) {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11,
    background: `${color}16`, border: `1px solid ${color}33`, color, fontSize: 12, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
