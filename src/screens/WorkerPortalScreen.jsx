import React, { useState } from 'react'
import { C } from '../constants/index.js'
import { fmt, fmtDate } from '../lib/helpers.js'
import { useWorkerPortal } from '../hooks/useWorkerPortal.js'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function fmtMonth(yyyymm) {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_AR[parseInt(m, 10) - 1]} ${y}`
}

function SummaryCard({ earned, paid, owed }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12, fontWeight: 700 }}>الملخص المالي الإجمالي</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { l: 'مستحق إجمالي', v: `${fmt(earned)}₪`, c: C.text },
          { l: 'واصل',         v: `${fmt(paid)}₪`,   c: C.success },
          { l: 'ضايل',         v: `${fmt(owed)}₪`,   c: owed > 0 ? C.warning : C.success },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center', padding: '10px 4px', background: `${C.border}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>
      {owed === 0 && earned > 0 && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: C.success, fontWeight: 700 }}>
          ✓ مسدد بالكامل
        </div>
      )}
    </div>
  )
}

function MonthRow({ month, data, payments }) {
  const [open, setOpen] = useState(false)
  const monthPayments = payments.filter(p => String(p.date).substring(0, 7) === month)

  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtMonth(month)}</span>
          <span style={{ fontSize: 10, color: C.textDim, background: `${C.border}66`, padding: '2px 6px', borderRadius: 6 }}>{data.days} يوم</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>{fmt(data.amount)}₪</span>
          <span style={{ fontSize: 10, color: C.textDim }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.border}` }}>
          {/* مدفوعات هذا الشهر */}
          {monthPayments.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6 }}>المدفوعات هذا الشهر:</div>
              {monthPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}33` }}>
                  <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(p.date)} • {p.method || 'كاش'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.success, fontFamily: 'monospace' }}>+{fmt(p.amount)}₪</span>
                </div>
              ))}
            </div>
          )}
          {/* ملخص الشهر */}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: `${C.border}33`, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: C.textDim }}>مستحق الشهر</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>{fmt(data.amount)}₪</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── شاشة تسجيل الدخول ───────────────────────────────────────────────────────
function LoginScreen({ onLogin, error, loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, direction: 'rtl' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>👷</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>بوابة العمال</div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Contractor Pro</div>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 360, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>اسم المستخدم</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="أدخل اسم المستخدم"
            autoComplete="username"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onLogin(username, password)}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16, padding: 0 }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 16, fontSize: 13, color: C.accent, textAlign: 'center' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={() => onLogin(username, password)}
          disabled={loading || !username || !password}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: loading || !username || !password ? C.border : C.primary, border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: loading || !username || !password ? 'default' : 'pointer', transition: 'background .2s' }}>
          {loading ? 'جاري التحقق...' : '→ دخول'}
        </button>
      </div>
    </div>
  )
}

// ─── البوابة الرئيسية ─────────────────────────────────────────────────────────
export default function WorkerPortalScreen() {
  const {
    worker, workDays, payments, loading, loginErr, loggingIn,
    login, logout,
    monthlyBreakdown, totalEarned, totalPaid, totalOwed,
  } = useWorkerPortal()

  const [tab, setTab] = useState('monthly')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  if (!worker) {
    return <LoginScreen onLogin={login} error={loginErr} loading={loggingIn} />
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}22, ${C.surface})`, padding: '24px 16px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: C.primary }}>
              {worker.name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textDim }}>أهلاً 👋</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{worker.name}</div>
              {worker.specialization && (
                <div style={{ fontSize: 11, color: C.primary }}>{worker.specialization.split(',')[0]}</div>
              )}
            </div>
          </div>
          <button onClick={logout}
            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textDim, fontSize: 11, cursor: 'pointer' }}>
            خروج
          </button>
        </div>
      </div>

      <div style={{ padding: 16, paddingBottom: 32 }}>
        {/* ملخص إجمالي */}
        <SummaryCard earned={totalEarned} paid={totalPaid} owed={totalOwed} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[{ id: 'monthly', label: '📅 شهري' }, { id: 'payments', label: '💰 المدفوعات' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${tab === t.id ? C.primary : C.border}`, background: tab === t.id ? `${C.primary}22` : 'transparent', color: tab === t.id ? C.primary : C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* تبويب شهري */}
        {tab === 'monthly' && (
          <>
            {monthlyBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
                <div>ما في أيام عمل مسجّلة بعد</div>
              </div>
            ) : (
              monthlyBreakdown.map(([month, data]) => (
                <MonthRow key={month} month={month} data={data} payments={payments} />
              ))
            )}
          </>
        )}

        {/* تبويب المدفوعات */}
        {tab === 'payments' && (
          <>
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <div>ما في مدفوعات بعد</div>
              </div>
            ) : (
              payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtDate(p.date)}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{p.method || 'كاش'}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.success, fontFamily: 'monospace' }}>{fmt(p.amount)}₪</div>
                </div>
              ))
            )}
            {/* إجمالي */}
            {payments.length > 0 && (
              <div style={{ padding: '12px 14px', background: `${C.success}15`, borderRadius: 12, border: `1px solid ${C.success}33`, display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>إجمالي الواصل</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: C.success, fontFamily: 'monospace' }}>{fmt(totalPaid)}₪</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
