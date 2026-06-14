import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Lock, User, Loader2, Eye, EyeOff, LogOut, RefreshCw,
  Users, UserPlus, TrendingUp, Wallet, CreditCard, Clock,
  Building2, Briefcase, CalendarDays, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { C, GRAD } from '../constants/index.js'
import { fmt } from '../lib/helpers.js'
import { PremiumCard, PremiumStat, IconChip } from '../ui/Premium.jsx'
import { navigate } from '../Router.jsx'

const TOKEN_KEY = 'cp_admin_token'
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const PLAN_LABELS = { free: 'مجاني', starter: 'المبتدئ', pro: 'المحترف', business: 'الأعمال' }
const PLAN_COLORS = { free: C.textDim, starter: C.cyan, pro: C.primary, business: C.secondary }

async function callFn(action, { token, username, password } = {}) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, username, password }),
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

  const loadStats = useCallback(async (tk) => {
    setLoading(true); setError('')
    try {
      const { stats } = await callFn('stats', { token: tk })
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: GRAD.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(249,115,22,0.35)' }}>
              <ShieldCheck size={24} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em' }}>مركز القيادة</div>
              <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>لوحة تحكّم المنصّة · Admin</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadStats(token)} disabled={loading}
              style={btnStyle(C.cyan)}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} /> : <RefreshCw size={15} />}
              تحديث
            </button>
            <button onClick={logout} style={btnStyle(C.accent)}>
              <LogOut size={15} /> خروج
            </button>
          </div>
        </div>

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

        {stats && <Dashboard stats={stats} />}
      </div>
    </div>
  )
}

// ── الإحصائيات ────────────────────────────────────────────────────────────────
function Dashboard({ stats }) {
  const u = stats.users || {}
  const s = stats.subscriptions || {}
  const tr = stats.trials || {}
  const tot = stats.totals || {}
  const plans = stats.plans || []
  const chart = (stats.signups_monthly || []).map(m => ({ month: m.month.slice(2), count: m.count }))
  const recent = stats.recent_users || []

  return (
    <>
      {/* الصف الأول — الأرقام الكبرى */}
      <div style={grid(4)}>
        <PremiumStat icon={Users}     tone="cyan"    label="إجمالي المستخدمين" value={fmt(u.total)}     sub={`${u.confirmed || 0} مفعّل`} delay={0} />
        <PremiumStat icon={UserPlus}  tone="success" label="جدد هذا الشهر"      value={fmt(u.new_30d)}   sub={`${fmt(u.new_7d)} هذا الأسبوع`} delay={0.05} />
        <PremiumStat icon={Wallet}    tone="warning" label="الإيراد الشهري (MRR)" value={fmt(s.mrr)} money sub={`${s.active || 0} اشتراك نشط`} delay={0.1} />
        <PremiumStat icon={CreditCard} tone="brand"  label="اشتراكات مدفوعة"    value={fmt(s.active)}    sub={s.past_due ? `${s.past_due} متعثّر` : 'لا متعثّرين'} delay={0.15} />
      </div>

      {/* الصف الثاني — التجارب + إجماليات */}
      <div style={grid(4)}>
        <PremiumStat icon={Clock}        tone="warning" label="تجارب نشطة"   value={fmt(tr.active)}   sub={`${fmt(tr.expired)} منتهية`} delay={0.2} />
        <PremiumStat icon={UserPlus}     tone="brand"   label="جدد اليوم"     value={fmt(u.new_today)} delay={0.25} />
        <PremiumStat icon={Briefcase}    tone="cyan"    label="مشاريع"        value={fmt(tot.projects)} delay={0.3} />
        <PremiumStat icon={CalendarDays} tone="success" label="أيام عمل"      value={fmt(tot.work_days)} delay={0.35} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 12, marginTop: 4 }} className="admin-cols">
        {/* مخطّط النمو */}
        <PremiumCard tone="brand" delay={0.4}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconChip icon={TrendingUp} color={C.primary} size={32} radius={10} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>نمو التسجيلات</div>
              <div style={{ fontSize: 10, color: C.textDim }}>آخر 12 شهراً</div>
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
                formatter={(v) => [v, 'تسجيلات']}
              />
              <Area type="monotone" dataKey="count" stroke={C.primary} strokeWidth={2.5} fill="url(#adminGrad)" />
              <Line type="monotone" dataKey="count" stroke={C.primary} strokeWidth={0} dot={{ r: 3, fill: C.primary }} />
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

          <button type="button" onClick={() => navigate('/')}
            style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← العودة للموقع
          </button>
        </form>
      </motion.div>
    </div>
  )
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
