import React, { useState, useRef } from 'react'
import { C, GRAD, EXP_CATS } from '../constants/index.js'
import { fmt, fmtDate, fmtDateFull, todayStr } from '../lib/helpers.js'
import { useWorkerPortal } from '../hooks/useWorkerPortal.js'
import { useMaterialLogs } from '../hooks/useMaterialLogs.js'
import { uploadWorkerReceipt } from '../lib/storage.js'
import { supabase } from '../lib/supabase.js'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const DAY_TYPES = ['كامل', 'نص يوم', 'ساعات']

const EXP_STATUS_BADGE = {
  approved: { label: 'موافق',  color: C.success },
  pending:  { label: 'معلق',   color: C.warning },
}

const STATUS_BADGE = {
  approved: { label: 'موافق',  bg: `${C.success}22`, color: C.success },
  pending:  { label: 'معلق',   bg: `${C.warning}22`, color: C.warning },
  rejected: { label: 'مرفوض', bg: `${C.accent}22`,  color: C.accent  },
}

function fmtMonth(yyyymm) {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_AR[parseInt(m, 10) - 1]} ${y}`
}

function SummaryCard({ earned, expenses, paid, owed, pendingCount }) {
  const totalDue = earned + expenses
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 20, border: `1px solid ${C.borderMid}`, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ height: 3, background: owed > 0 ? GRAD.danger : GRAD.success }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12, fontWeight: 700, letterSpacing: '0.04em' }}>الملخص المالي الإجمالي</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { l: 'مستحق إجمالي', v: `${fmt(totalDue)}₪`, c: C.text },
            { l: 'واصل',         v: `${fmt(paid)}₪`,     c: C.success },
            { l: 'ضايل',         v: `${fmt(owed)}₪`,     c: owed > 0 ? C.accent : C.success },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '10px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textDim, marginBottom: 4, fontWeight: 600 }}>{s.l}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
            </div>
          ))}
        </div>
        {expenses > 0 && (
          <div style={{ marginTop: 8, padding: '6px 12px', background: `${C.warning}12`, borderRadius: 10, fontSize: 11, color: C.warning, fontWeight: 700, textAlign: 'center', border: `1px solid ${C.warning}22`, display: 'flex', justifyContent: 'space-between' }}>
            <span>💸 مصاريف معتمدة مستحقة</span>
            <span>{fmt(expenses)}₪</span>
          </div>
        )}
        {pendingCount > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${C.warning}18`, borderRadius: 10, fontSize: 12, color: C.warning, fontWeight: 700, textAlign: 'center', border: `1px solid ${C.warning}33` }}>
            ⏳ {pendingCount} يوم بانتظار موافقة المشرف
          </div>
        )}
        {owed === 0 && totalDue > 0 && pendingCount === 0 && (
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: C.success, fontWeight: 700 }}>
            ✓ مسدد بالكامل
          </div>
        )}
      </div>
    </div>
  )
}

const DAY_TYPE_COLORS = { 'كامل': C.primary, 'نص يوم': C.warning, 'ساعات': C.blue, 'مبلغ مسكر': C.orange }

function MonthRow({ month, data, payments, holidays = [] }) {
  const [open, setOpen] = useState(false)
  const monthPayments = payments.filter(p => String(p.date).substring(0, 7) === month)

  // map date→holiday for fast lookup
  const holidayMap = {}
  holidays.forEach(h => { holidayMap[String(h.date).slice(0, 10)] = h })

  // holidays in this month that the worker did NOT work
  const workedDates = new Set((data.records || []).map(r => String(r.date).slice(0, 10)))
  const offHolidays = holidays
    .filter(h => String(h.date).slice(0, 7) === month && !workedDates.has(String(h.date).slice(0, 10)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmtMonth(month)}</span>
          <span style={{ fontSize: 10, color: C.textDim, background: `${C.border}88`, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
          {(data.records || []).filter(r => r.day_type !== 'عطلة').length} يوم
          {(data.records || []).filter(r => r.day_type === 'عطلة').length > 0 && ` · 🎉 ${(data.records || []).filter(r => r.day_type === 'عطلة').length} عطلة`}
        </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(data.amount)}₪</span>
          <span style={{ fontSize: 10, color: C.textDim }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
          {/* تفاصيل كل يوم */}
          {data.records && data.records.length > 0 && (
            <div style={{ marginTop: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>تفاصيل الأيام</div>
              {data.records.map((r, i) => {
                const tc = DAY_TYPE_COLORS[r.day_type] || C.primary
                const hol = holidayMap[String(r.date).slice(0, 10)]
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: C.textDim, flexShrink: 0 }}>{fmtDateFull(r.date)}</div>
                      {r.project_name && <div style={{ fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project_name}</div>}
                      {r.location && <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: `${C.primary}18`, padding: '1px 7px', borderRadius: 6, border: `1px solid ${C.primary}30`, flexShrink: 0 }}>📍 {r.location}</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: tc, background: `${tc}18`, padding: '1px 7px', borderRadius: 6, border: `1px solid ${tc}30`, flexShrink: 0 }}>{r.day_type}</span>
                      {hol && <span style={{ fontSize: 10, fontWeight: 700, color: C.warning, background: `${C.warning}18`, padding: '1px 7px', borderRadius: 6, border: `1px solid ${C.warning}30`, flexShrink: 0 }}>🎉 {hol.name}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: tc, fontFamily: 'monospace', flexShrink: 0, marginRight: 4 }}>{fmt(r.amount)}₪</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* أيام الأعياد اللي ما اشتغل فيها */}
          {offHolidays.length > 0 && (
            <div style={{ marginTop: 8, marginBottom: 4 }}>
              {offHolidays.map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: `${C.warning}12`, border: `1px solid ${C.warning}33`, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>🎉</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{fmtDateFull(h.date)} · عطلة رسمية</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {monthPayments.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, fontWeight: 600 }}>المدفوعات هذا الشهر:</div>
              {monthPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}33` }}>
                  <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(p.date)} • {p.method || 'كاش'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.success, fontFamily: 'monospace' }}>+{fmt(p.amount)}₪</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: `${C.primary}15`, borderRadius: 10, border: `1px solid ${C.primary}33` }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>مستحق الشهر</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.primary, fontFamily: 'monospace' }}>{fmt(data.amount)}₪</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── شاشة تسجيل الدخول ───────────────────────────────────────────────────────
function LoginScreen({ onLogin, error, loading }) {
  const [username,   setUsername]   = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, direction: 'rtl', position: 'relative', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      {/* blobs */}
      <div style={{ position: 'absolute', top: '-15%', right: '-15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, #00DDB322 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-15%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, #6366F122 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 76, height: 76, borderRadius: 24, background: GRAD.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, margin: '0 auto 14px', boxShadow: '0 12px 36px #00DDB355', animation: 'float 3s ease-in-out infinite' }}>👷</div>
        <div style={{ fontSize: 24, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>بوابة العمال</div>
        <div style={{ fontSize: 11, color: C.textDim, marginTop: 4, letterSpacing: '0.06em' }}>Contractor Pro</div>
      </div>

      <div style={{ width: '100%', maxWidth: 380, background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 28, padding: 28, border: `1px solid ${C.borderMid}`, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 600 }}>اسم المستخدم</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="أدخل اسم المستخدم" autoComplete="username"
            style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 600 }}>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <input value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onLogin(username, password)}
              type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
              style={{ width: '100%', padding: '13px 44px 13px 14px', borderRadius: 14, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16, padding: 0 }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 12, marginBottom: 16, fontSize: 13, color: C.accent, textAlign: 'center', border: `1px solid ${C.accent}33`, fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={() => onLogin(username, password)}
          disabled={loading || !username || !password}
          style={{ width: '100%', padding: 14, borderRadius: 16, background: loading || !username || !password ? C.border : GRAD.brand, border: 'none', color: loading || !username || !password ? C.textDim : '#000', fontSize: 15, fontWeight: 800, cursor: loading || !username || !password ? 'default' : 'pointer', boxShadow: !loading && username && password ? '0 4px 20px #00DDB344' : 'none', transition: 'all .2s' }}>
          {loading ? 'جاري التحقق...' : '→ دخول'}
        </button>

        <button onClick={() => setShowForgot(s => !s)}
          style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: C.textDim, fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline', padding: 4 }}>
          نسيت كلمة المرور؟
        </button>

        {showForgot && (
          <div style={{ marginTop: 10, padding: '14px 16px', background: `${C.primary}12`, borderRadius: 14, border: `1px solid ${C.primary}33` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 6 }}>🔑 كيف تعيد كلمة مرورك؟</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
              تواصل مع المشرف أو صاحب العمل وأطلب منه إعادة تعيين كلمة مرورك.<br />
              بإمكانه تغييرها من تطبيق <span style={{ color: C.primary, fontWeight: 700 }}>Contractor Pro</span> مباشرةً.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── فورم إرسال يوم عمل ──────────────────────────────────────────────────────
function SubmitDayForm({ projects, dailyRate, onSubmit, submitting, submitErr, setSubmitErr, holidaySet = new Set() }) {
  const [form, setForm]         = useState({ date: todayStr(), projectId: '', dayType: 'كامل', hours: '8', location: '' })
  const [done, setDone]         = useState(false)
  const [amount, setAmount]     = useState(0)
  const [projName, setProjName] = useState('')
  const [submittedDate, setSubmittedDate] = useState('')

  function setDayType(t) {
    const hours = t === 'كامل' ? '8' : t === 'نص يوم' ? '4' : form.hours
    setForm(p => ({ ...p, dayType: t, hours }))
  }

  function preview() {
    const h = parseFloat(form.hours) || 8
    if (form.dayType === 'كامل')    return dailyRate
    if (form.dayType === 'نص يوم') return dailyRate * 0.5
    return Math.round((dailyRate / 8) * h * 100) / 100
  }

  async function handleSubmit() {
    if (!form.projectId) return setSubmitErr('اختر المشروع')
    setSubmitErr('')
    try {
      const res  = await onSubmit({ projectId: form.projectId, date: form.date, dayType: form.dayType, hours: form.hours, location: form.location || null })
      const proj = projects.find(p => p.id === form.projectId)
      setAmount(res.amount)
      setProjName(proj?.name || '')
      setSubmittedDate(form.date)
      setDone(true)
    } catch { /* error shown via submitErr */ }
  }

  const canSubmit = !submitting && !!form.projectId

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم الإرسال!</div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 4 }}>{projName} • {submittedDate}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 16, fontFamily: 'monospace' }}>{fmt(amount)}₪</div>
        <div style={{ padding: '12px 16px', background: `${C.primary}12`, borderRadius: 12, marginBottom: 20, border: `1px solid ${C.primary}33` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 4 }}>🔔 وصل إشعار للمشرف</div>
          <div style={{ fontSize: 12, color: C.textDim }}>المشرف رح يشوف الطلب في التطبيق ويوافق عليه</div>
        </div>
        <button onClick={() => { setDone(false); setForm({ date: todayStr(), projectId: '', dayType: 'كامل', hours: '8', location: '' }) }}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: C.primary, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + أضف يوم آخر
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
          <div>لا توجد مشاريع نشطة</div>
        </div>
      ) : (
        <>
          {/* التاريخ */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>التاريخ *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              max={todayStr()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${holidaySet.has(form.date) ? C.warning : C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            {holidaySet.has(form.date) && (
              <div style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, background: `${C.warning}18`, border: `1px solid ${C.warning}33`, fontSize: 12, color: C.warning, fontWeight: 700 }}>
                🎉 هذا اليوم عطلة رسمية — تأكد قبل الإرسال
              </div>
            )}
          </div>

          {/* المشروع */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setForm(prev => ({ ...prev, projectId: p.id, location: '' }))}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.projectId === p.id ? C.primary : C.border}`, background: form.projectId === p.id ? `${C.primary}22` : C.bg, color: form.projectId === p.id ? C.primary : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {p.name}
                  {p.type === 'يومي' && <span style={{ fontSize: 10, marginRight: 4, opacity: 0.7 }}>📍</span>}
                </button>
              ))}
            </div>
          </div>

          {/* مكان العمل — للمشاريع اليومية */}
          {(() => {
            const selProj = form.projectId ? projects.find(p => p.id === form.projectId) : null
            const locs = selProj?.locations || []
            if (selProj?.type !== 'يومي' || locs.length === 0) return null
            return (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>📍 مكان العمل</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {locs.map(loc => (
                    <button key={loc} onClick={() => setForm(prev => ({ ...prev, location: prev.location === loc ? '' : loc }))}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.location === loc ? C.primary : C.border}`, background: form.location === loc ? `${C.primary}22` : C.bg, color: form.location === loc ? C.primary : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      📍 {loc}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* نوع اليوم */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>نوع اليوم</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {DAY_TYPES.map(t => (
                <button key={t} onClick={() => setDayType(t)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `2px solid ${form.dayType === t ? C.primary : C.border}`, background: form.dayType === t ? `${C.primary}22` : 'transparent', color: form.dayType === t ? C.primary : C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.dayType === 'ساعات' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>عدد الساعات</label>
              <input type="number" value={form.hours} min="0.5" max="24" step="0.5"
                onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          )}

          {/* معاينة المبلغ */}
          <div style={{ padding: '12px 16px', background: `${C.primary}15`, borderRadius: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textDim }}>المبلغ المحسوب</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>{fmt(preview())}₪</span>
          </div>

          {submitErr && (
            <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 12, fontSize: 13, color: C.accent }}>
              ⚠ {submitErr}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !form.projectId}
            style={{ width: '100%', padding: 14, borderRadius: 14, background: submitting || !form.projectId ? C.border : C.primary, border: 'none', color: submitting || !form.projectId ? C.textDim : '#000', fontSize: 15, fontWeight: 800, cursor: submitting || !form.projectId ? 'default' : 'pointer' }}>
            {submitting ? 'جاري الإرسال...' : '📤 أرسل اليوم للمشرف'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── فورم إرسال مصروف ────────────────────────────────────────────────────────
function SubmitExpenseForm({ worker, projects, onSubmit, submitting, submitErr, setSubmitErr }) {
  const emptyForm = { date: todayStr(), amount: '', category: '', projectId: '', vendor: '' }
  const [form,         setForm]         = useState(emptyForm)
  const [receiptFile,  setReceiptFile]  = useState(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [uploading,    setUploading]    = useState(false)
  const [done,         setDone]         = useState(false)
  const [submittedAmt, setSubmittedAmt] = useState(0)
  const [scanning,     setScanning]     = useState(false)
  const [scanMsg,      setScanMsg]      = useState('')
  const fileRef = useRef()

  function pickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setScanMsg('')
    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file))
    } else {
      setReceiptPreview('pdf')
    }
  }

  async function scanReceipt() {
    if (!receiptFile || !receiptFile.type.startsWith('image/')) return
    setScanning(true); setScanMsg('')
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(receiptFile)
      })
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64, mimeType: receiptFile.type },
      })
      if (error) throw new Error(error.message)
      const r = data?.result || {}
      setForm(prev => ({
        ...prev,
        amount:   r.amount   ? String(r.amount)   : prev.amount,
        vendor:   r.vendor   || prev.vendor,
        date:     r.date     || prev.date,
        category: r.category || prev.category,
      }))
      setScanMsg('✓ تم استخراج البيانات تلقائياً')
    } catch (e) {
      setScanMsg(`⚠ ${e.message}`)
    } finally {
      setScanning(false)
    }
  }

  function clearFile() {
    setReceiptFile(null)
    setReceiptPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!form.category)  return setSubmitErr('اختر التصنيف')
    if (!form.amount || parseFloat(form.amount) <= 0) return setSubmitErr('أدخل المبلغ')
    if (!form.projectId) return setSubmitErr('اختر المشروع')
    if (!form.vendor?.trim()) return setSubmitErr('أدخل اسم المحل أو المزود')
    if (!receiptFile) return setSubmitErr('📸 صورة الفاتورة مطلوبة')
    setSubmitErr('')
    let receiptUrl = ''
    setUploading(true)
    try {
      receiptUrl = await uploadWorkerReceipt(worker.id, receiptFile)
    } catch (e) {
      setSubmitErr('فشل رفع الفاتورة: ' + e.message)
      setUploading(false)
      return
    }
    setUploading(false)
    try {
      await onSubmit({ projectId: form.projectId, date: form.date, amount: form.amount, category: form.category, vendor: form.vendor, receiptUrl })
      setSubmittedAmt(parseFloat(form.amount))
      setDone(true)
    } catch { /* error shown via submitErr */ }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم الإرسال!</div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 4 }}>{form.category}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, marginBottom: 16, fontFamily: 'monospace' }}>{fmt(submittedAmt)}₪</div>
        <div style={{ padding: '12px 16px', background: `${C.primary}12`, borderRadius: 12, marginBottom: 20, border: `1px solid ${C.primary}33` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 4 }}>🔔 وصل إشعار للمشرف</div>
          <div style={{ fontSize: 12, color: C.textDim }}>المشرف رح يشوف الطلب والفاتورة ويوافق عليه</div>
        </div>
        <button onClick={() => { setDone(false); setForm(emptyForm); clearFile() }}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: C.primary, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + أضف مصروف آخر
        </button>
      </div>
    )
  }

  const canSubmit = !submitting && !uploading && form.category && form.amount && form.projectId && form.vendor?.trim() && !!receiptFile

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* التاريخ */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>التاريخ *</label>
        <input type="date" value={form.date} max={todayStr()} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* المبلغ */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المبلغ (₪) *</label>
        <input type="number" value={form.amount} min="0.01" step="0.01" placeholder="0.00"
          onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
      </div>

      {/* التصنيف */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>التصنيف *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXP_CATS.map(cat => (
            <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
              style={{ padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${form.category === cat ? C.accent : C.border}`, background: form.category === cat ? `${C.accent}22` : C.bg, color: form.category === cat ? C.accent : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* المشروع - إجباري */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map(p => (
              <button key={p.id} onClick={() => setForm(prev => ({ ...prev, projectId: prev.projectId === p.id ? '' : p.id }))}
                style={{ padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${form.projectId === p.id ? C.primary : C.border}`, background: form.projectId === p.id ? `${C.primary}22` : C.bg, color: form.projectId === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* المحل / المزود - إجباري */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المحل / المزود *</label>
        <input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
          placeholder="مثال: مستودع الجابر"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* صورة الفاتورة - إجبارية */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12 }}>
            <span style={{ color: C.accent, fontWeight: 700 }}>📎 صورة الفاتورة *</span>
          </label>
          {receiptFile && receiptFile.type.startsWith('image/') && (
            <button onClick={scanReceipt} disabled={scanning}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.primary}55`, background: `${C.primary}15`, color: C.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {scanning ? '⏳ مسح...' : '🤖 مسح AI'}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={pickFile} />

        {receiptPreview ? (
          <div style={{ position: 'relative' }}>
            {receiptPreview === 'pdf' ? (
              <div style={{ padding: '14px', borderRadius: 12, border: `1.5px solid ${C.success}55`, background: `${C.success}11`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.success }}>تم رفع الملف</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{receiptFile?.name}</div>
                </div>
              </div>
            ) : (
              <img src={receiptPreview} alt="فاتورة" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, border: `1.5px solid ${C.success}55` }} />
            )}
            <button onClick={clearFile}
              style={{ position: 'absolute', top: 6, left: 6, width: 26, height: 26, borderRadius: '50%', background: `${C.accent}dd`, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current.click()}
            style={{ width: '100%', padding: '18px 14px', borderRadius: 12, border: `2px dashed ${C.accent}66`, background: `${C.accent}08`, color: C.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 28 }}>📷</span>
            <span>اضغط لالتقاط صورة الفاتورة</span>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 400 }}>صورة أو PDF</span>
          </button>
        )}
        {scanMsg && (
          <div style={{ marginTop: 6, fontSize: 11, color: scanMsg.startsWith('✓') ? C.success : C.accent, fontWeight: 600 }}>{scanMsg}</div>
        )}
      </div>

      {submitErr && (
        <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 12, fontSize: 13, color: C.accent }}>
          ⚠ {submitErr}
        </div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{ width: '100%', padding: 14, borderRadius: 14, background: !canSubmit ? C.border : C.accent, border: 'none', color: !canSubmit ? C.textDim : '#fff', fontSize: 15, fontWeight: 800, cursor: !canSubmit ? 'default' : 'pointer' }}>
        {uploading ? '⏳ جاري رفع الفاتورة...' : submitting ? 'جاري الإرسال...' : '💸 أرسل المصروف للمشرف'}
      </button>
    </div>
  )
}

// ─── فورم تغيير كلمة المرور ──────────────────────────────────────────────────
function ChangePasswordForm({ worker, onChangePassword }) {
  const [oldPass,  setOldPass]  = useState('')
  const [newPass,  setNewPass]  = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showOld,  setShowOld]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [success,  setSuccess]  = useState(false)

  async function handleSubmit() {
    setErr('')
    if (!oldPass) return setErr('أدخل كلمة المرور الحالية')
    if (newPass.length < 4) return setErr('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل')
    if (newPass !== confirm) return setErr('كلمة المرور الجديدة غير متطابقة')
    setSaving(true)
    try {
      await onChangePassword(oldPass, newPass)
      setSuccess(true)
      setOldPass(''); setNewPass(''); setConfirm('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.05)', color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 600 }

  return (
    <div>
      {/* بطاقة الملف الشخصي */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: `1px solid ${C.borderMid}`, padding: '18px 16px', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: 3, background: GRAD.brand, margin: '-18px -16px 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ padding: 2, borderRadius: '50%', background: GRAD.brand, flexShrink: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: C.primary }}>
              {worker.name?.[0] || '?'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text }}>{worker.name}</div>
            {worker.specialization && (
              <div style={{ fontSize: 11, color: C.primary, marginTop: 2 }}>{worker.specialization.split(',')[0]}</div>
            )}
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>معدل يومي: <span style={{ color: C.success, fontWeight: 700, fontFamily: 'monospace' }}>{worker.daily_rate || 0}₪</span></div>
          </div>
        </div>
      </div>

      {/* فورم تغيير كلمة المرور */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: `1px solid ${C.borderMid}`, padding: '18px 16px', overflow: 'hidden' }}>
        <div style={{ height: 3, background: GRAD.purple, margin: '-18px -16px 16px' }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 16 }}>🔑 تغيير كلمة المرور</div>

        {success && (
          <div style={{ padding: '12px 14px', background: `${C.success}18`, borderRadius: 12, marginBottom: 16, fontSize: 13, color: C.success, textAlign: 'center', border: `1px solid ${C.success}33`, fontWeight: 700 }}>
            ✓ تم تغيير كلمة المرور بنجاح
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>كلمة المرور الحالية</label>
          <div style={{ position: 'relative' }}>
            <input type={showOld ? 'text' : 'password'} value={oldPass} onChange={e => { setOldPass(e.target.value); setSuccess(false) }}
              placeholder="••••••••" style={inputStyle} />
            <button onClick={() => setShowOld(s => !s)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15, padding: 0 }}>
              {showOld ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>كلمة المرور الجديدة</label>
          <div style={{ position: 'relative' }}>
            <input type={showNew ? 'text' : 'password'} value={newPass} onChange={e => { setNewPass(e.target.value); setSuccess(false) }}
              placeholder="4 أحرف على الأقل" style={inputStyle} />
            <button onClick={() => setShowNew(s => !s)}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 15, padding: 0 }}>
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>تأكيد كلمة المرور الجديدة</label>
          <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setSuccess(false) }}
            placeholder="••••••••" style={{ ...inputStyle, paddingLeft: 14 }} />
          {confirm && newPass && (
            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: confirm === newPass ? C.success : C.accent }}>
              {confirm === newPass ? '✓ متطابقة' : '✗ غير متطابقة'}
            </div>
          )}
        </div>

        {err && (
          <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 14, fontSize: 13, color: C.accent, border: `1px solid ${C.accent}33`, fontWeight: 600 }}>
            ⚠ {err}
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving || !oldPass || !newPass || !confirm}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: saving || !oldPass || !newPass || !confirm ? C.border : GRAD.purple, border: 'none', color: saving || !oldPass || !newPass || !confirm ? C.textDim : '#fff', fontSize: 15, fontWeight: 800, cursor: saving || !oldPass || !newPass || !confirm ? 'default' : 'pointer', transition: 'all .2s', boxShadow: oldPass && newPass && confirm ? '0 4px 20px #6366F144' : 'none' }}>
          {saving ? 'جاري الحفظ...' : '🔐 حفظ كلمة المرور الجديدة'}
        </button>
      </div>
    </div>
  )
}

// ─── البوابة الرئيسية ─────────────────────────────────────────────────────────
// ─── فورم طلب راتب ───────────────────────────────────────────────────────────
function RequestPaymentForm({ worker, onRequest, unpaidDays, totalOwed }) {
  const PAY_M = ['كاش', 'تحويل بنكي', 'شيك']
  const [form,    setForm]    = useState({ amount: '', method: 'كاش', notes: '' })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [done,    setDone]    = useState(false)
  const [sentAmt, setSentAmt] = useState(0)

  async function handleSubmit() {
    if (!form.amount || parseFloat(form.amount) <= 0) return setErr('أدخل المبلغ')
    if (!form.notes?.trim()) return setErr('أدخل ملاحظة (مثال: راتب شهر أبريل)')
    setErr(''); setSaving(true)
    try {
      await onRequest({ amount: form.amount, projectId: null, method: form.method, notes: form.notes })
      setSentAmt(parseFloat(form.amount)); setDone(true)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'30px 16px' }}>
      <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:16, fontWeight:800, color:C.success, marginBottom:6 }}>تم إرسال الطلب!</div>
      <div style={{ fontSize:15, fontWeight:800, color:C.primary, marginBottom:16, fontFamily:'monospace' }}>{fmt(sentAmt)}₪</div>
      <div style={{ padding:'12px 16px', background:`${C.primary}12`, borderRadius:12, marginBottom:20, border:`1px solid ${C.primary}33` }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:4 }}>🔔 وصل إشعار للمشرف</div>
        <div style={{ fontSize:12, color:C.textDim }}>المشرف رح يراجع الطلب ويحدد من أي مشروع</div>
      </div>
      <button onClick={() => { setDone(false); setForm({ amount:'', method:'كاش', notes:'' }) }}
        style={{ width:'100%', padding:'12px 0', borderRadius:12, background:C.primary, border:'none', color:'#000', fontSize:14, fontWeight:700, cursor:'pointer' }}>
        + طلب آخر
      </button>
    </div>
  )

  return (
    <div style={{ paddingBottom:16 }}>

      {/* أيامي غير المدفوعة */}
      {unpaidDays && unpaidDays.length > 0 && (
        <div style={{ marginBottom:16, background:`${C.primary}0a`, borderRadius:16, border:`1px solid ${C.primary}22`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.primary}18`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:800, color:C.primary }}>📋 أيامك غير المدفوعة</span>
            <span style={{ fontSize:15, fontWeight:900, color:C.primary, fontFamily:'monospace' }}>{fmt(totalOwed)}₪</span>
          </div>
          <div style={{ padding:'8px 16px 12px', maxHeight:220, overflowY:'auto' }}>
            {unpaidDays.slice(0, 20).map((d, i) => {
              const tc = DAY_TYPE_COLORS[d.day_type] || C.primary
              return (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}18` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                    <span style={{ fontSize:11, color:C.textDim, flexShrink:0 }}>{fmtDateFull(d.date)}</span>
                    {d.project_name && <span style={{ fontSize:11, color:C.textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.project_name}</span>}
                    <span style={{ fontSize:10, fontWeight:700, color:tc, background:`${tc}18`, padding:'1px 6px', borderRadius:5, border:`1px solid ${tc}25`, flexShrink:0 }}>{d.day_type}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, color:tc, fontFamily:'monospace', flexShrink:0 }}>{fmt(d.amount)}₪</span>
                </div>
              )
            })}
            {unpaidDays.length > 20 && <div style={{ fontSize:10, color:C.textDim, textAlign:'center', paddingTop:6 }}>و {unpaidDays.length - 20} يوم آخر...</div>}
          </div>
          <button onClick={() => setForm(p => ({ ...p, amount: String(Math.round(totalOwed)) }))}
            style={{ width:'100%', padding:'10px 0', background:`${C.primary}15`, border:'none', borderTop:`1px solid ${C.primary}22`, color:C.primary, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            ✓ استخدم المبلغ الكامل {fmt(totalOwed)}₪
          </button>
        </div>
      )}

      <div style={{ padding:'12px 14px', background:`${C.warning}12`, borderRadius:12, marginBottom:16, border:`1px solid ${C.warning}33` }}>
        <div style={{ fontSize:12, color:C.warning, fontWeight:700 }}>⚠ تنبيه</div>
        <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>الطلب يذهب للمشرف للموافقة — الراتب لا يُسجَّل تلقائياً</div>
      </div>

      {/* المبلغ */}
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6 }}>المبلغ المطلوب (₪) *</label>
        <input type="number" value={form.amount} min="1" step="1" placeholder="0"
          onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
          style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:`1px solid ${C.border}`, background:C.surface, color:C.text, fontSize:18, fontWeight:800, boxSizing:'border-box', outline:'none', fontFamily:'monospace' }} />
      </div>

      {/* طريقة الدفع */}
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6 }}>طريقة الدفع المفضلة</label>
        <div style={{ display:'flex', gap:8 }}>
          {PAY_M.map(m => (
            <button key={m} onClick={() => setForm(p => ({ ...p, method: m }))}
              style={{ flex:1, padding:'9px 0', borderRadius:10, border:`1.5px solid ${form.method === m ? C.primary : C.border}`, background:form.method === m ? `${C.primary}22` : 'transparent', color:form.method === m ? C.primary : C.textDim, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ملاحظة */}
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, color:C.textDim, display:'block', marginBottom:6 }}>ملاحظة * <span style={{ fontWeight:400, color:C.textDim, fontSize:10 }}>(مثال: راتب شهر أبريل)</span></label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="راتب شهر أبريل"
          style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1px solid ${C.border}`, background:C.surface, color:C.text, fontSize:14, boxSizing:'border-box', outline:'none' }} />
      </div>

      {err && <div style={{ padding:'10px 14px', background:`${C.accent}18`, borderRadius:10, marginBottom:12, fontSize:13, color:C.accent }}>⚠ {err}</div>}

      <button onClick={handleSubmit} disabled={saving || !form.amount || !form.notes?.trim()}
        style={{ width:'100%', padding:14, borderRadius:14, background:saving || !form.amount || !form.notes?.trim() ? C.border : GRAD.success, border:'none', color:saving || !form.amount || !form.notes?.trim() ? C.textDim : '#000', fontSize:15, fontWeight:800, cursor:saving || !form.amount || !form.notes?.trim() ? 'default' : 'pointer', boxShadow:form.amount && form.notes ? `0 4px 20px ${C.success}44` : 'none' }}>
        {saving ? 'جاري الإرسال...' : '💰 أرسل طلب الراتب للمشرف'}
      </button>
    </div>
  )
}

// ─── فورم طلب سلفة ───────────────────────────────────────────────────────────
function RequestAdvanceForm({ onRequest }) {
  const [amount,   setAmount]   = useState('')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      await onRequest({ amount, notes })
      setSuccess(true)
      setAmount('')
      setNotes('')
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '36px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم إرسال طلب السلفة</div>
      <div style={{ fontSize: 12, color: C.textDim }}>سيراجعه المشرف قريباً</div>
    </div>
  )

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, direction: 'rtl' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>💵 طلب سلفة</div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 18 }}>
        اطلب سلفة من راتبك — ستُخصم تلقائياً من مستحقاتك
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 700 }}>مبلغ السلفة (₪) *</label>
        <input
          type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="أدخل المبلغ"
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 16, fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: C.textDim, display: 'block', marginBottom: 6, fontWeight: 700 }}>السبب / الملاحظات (اختياري)</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="مثال: ضرورة طارئة..."
          rows={3}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          ⚠ {error}
        </div>
      )}

      <button onClick={submit} disabled={loading || !amount}
        style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', cursor: loading || !amount ? 'default' : 'pointer', fontWeight: 800, fontSize: 14, background: loading || !amount ? C.border : GRAD.warm, color: '#000', transition: 'all .2s' }}>
        {loading ? '⏳ جاري الإرسال...' : '💵 إرسال الطلب'}
      </button>
    </div>
  )
}

// ─── فورم تسجيل بضاعة ────────────────────────────────────────────────────────
const MATERIAL_UNITS = ['قطعة', 'كيس', 'م', 'م²', 'م³', 'طن', 'لتر', 'يوم', 'ساعة', 'متر طولي']

function SubmitMaterialForm({ worker, projects }) {
  const { workerAddMaterialLog, loading, error } = useMaterialLogs()
  const [form,    setForm]    = useState({ date: todayStr(), itemName: '', quantity: '', unit: 'قطعة', projectId: '', notes: '' })
  const [done,    setDone]    = useState(false)
  const [formErr, setFormErr] = useState('')

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit() {
    if (!form.itemName.trim())                      return setFormErr('أدخل اسم المادة')
    if (!parseFloat(form.quantity) || parseFloat(form.quantity) <= 0) return setFormErr('أدخل الكمية')
    setFormErr('')
    try {
      await workerAddMaterialLog({
        employeeId: worker.id,
        projectId:  form.projectId || null,
        date:       form.date,
        itemName:   form.itemName.trim(),
        quantity:   parseFloat(form.quantity),
        unit:       form.unit,
        notes:      form.notes,
      })
      setDone(true)
      setForm({ date: todayStr(), itemName: '', quantity: '', unit: 'قطعة', projectId: '', notes: '' })
      setTimeout(() => setDone(false), 3000)
    } catch { /* error from hook */ }
  }

  const canSubmit = !loading && form.itemName.trim() && parseFloat(form.quantity) > 0

  return (
    <div style={{ paddingBottom: 16 }}>
      {done && (
        <div style={{ textAlign: 'center', padding: '30px 16px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.success, marginBottom: 6 }}>تم التسجيل!</div>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 16 }}>تم حفظ سجل البضاعة بنجاح</div>
          <button onClick={() => setDone(false)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: C.primary, border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + تسجيل مادة أخرى
          </button>
        </div>
      )}

      {!done && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>التاريخ</label>
            <input type="date" value={form.date} max={todayStr()} onChange={e => set('date', e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>اسم المادة *</label>
            <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
              placeholder="مثال: أسمنت بورتلاند"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>الكمية *</label>
              <input type="number" min="0" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                placeholder="0"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 15, fontWeight: 700, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>الوحدة</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}>
                {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {projects.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {projects.map(p => (
                  <button key={p.id} onClick={() => set('projectId', form.projectId === p.id ? '' : p.id)}
                    style={{ padding: '7px 12px', borderRadius: 10, border: `1.5px solid ${form.projectId === p.id ? C.primary : C.border}`, background: form.projectId === p.id ? `${C.primary}22` : C.bg, color: form.projectId === p.id ? C.primary : C.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              rows={2}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {(formErr || error) && (
            <div style={{ padding: '10px 14px', background: `${C.accent}18`, borderRadius: 10, marginBottom: 12, fontSize: 13, color: C.accent, border: `1px solid ${C.accent}33` }}>
              ⚠ {formErr || error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ width: '100%', padding: 14, borderRadius: 14, background: !canSubmit ? C.border : GRAD.brand, border: 'none', color: !canSubmit ? C.textDim : '#000', fontSize: 15, fontWeight: 800, cursor: !canSubmit ? 'default' : 'pointer' }}>
            {loading ? '⏳ جاري الحفظ...' : '🪵 سجّل البضاعة'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Blueprint helpers (read-only for workers) ───────────────────────────────
function loadBlueprints(projectId) {
  try { return JSON.parse(localStorage.getItem(`blueprints_${projectId}`)) || [] } catch { return [] }
}

function BlueprintsTab({ projects }) {
  const [selProj, setSelProj] = useState(projects[0]?.id || '')
  const [viewer,  setViewer]  = useState(null)
  const bps = selProj ? loadBlueprints(selProj) : []

  return (
    <div>
      {projects.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {projects.map(p => (
            <button key={p.id} onClick={() => { setSelProj(p.id); setViewer(null) }}
              style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${selProj === p.id ? C.blue : C.border}`, background: selProj === p.id ? `${C.blue}22` : 'transparent', color: selProj === p.id ? C.blue : C.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      {bps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textDim }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📐</div>
          <div style={{ fontSize: 13 }}>لا توجد خرائط لهذا المشروع</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {bps.map((b, idx) => (
            <div key={b.id} onClick={() => setViewer(idx)}
              style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.border}`, aspectRatio: '1.4', cursor: 'pointer', position: 'relative' }}>
              <img src={b.dataUrl} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
              <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: '#fff', fontWeight: 700 }}>{b.date}</div>
            </div>
          ))}
        </div>
      )}
      {viewer !== null && bps[viewer] && (
        <div onClick={() => setViewer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
            <img src={bps[viewer].dataUrl} alt="blueprint" style={{ width: '100%', borderRadius: 16, maxHeight: '80vh', objectFit: 'contain' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '0 4px' }}>
              <button onClick={() => setViewer(v => Math.max(0, v - 1))} disabled={viewer === 0}
                style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: viewer === 0 ? C.border : '#fff', cursor: viewer === 0 ? 'default' : 'pointer', fontSize: 18 }}>‹</button>
              <div style={{ fontSize: 11, color: C.textDim }}>{viewer + 1} / {bps.length}</div>
              <button onClick={() => setViewer(v => Math.min(bps.length - 1, v + 1))} disabled={viewer === bps.length - 1}
                style={{ padding: '8px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: viewer === bps.length - 1 ? C.border : '#fff', cursor: viewer === bps.length - 1 ? 'default' : 'pointer', fontSize: 18 }}>›</button>
            </div>
            <button onClick={() => setViewer(null)} style={{ position: 'absolute', top: -12, left: -12, width: 32, height: 32, borderRadius: '50%', background: C.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── البوابة الرئيسية ─────────────────────────────────────────────────────────
export default function WorkerPortalScreen() {
  const {
    worker, workDays, payments, projects, holidays, loading, loginErr, loggingIn,
    submitting, submitErr, setSubmitErr,
    workerExpenses, submittingExp, submitExpErr, setSubmitExpErr,
    login, logout, submitWorkDay, submitExpense, changePassword, requestPayment, requestAdvance,
    monthlyBreakdown, totalEarned, totalExpenses, totalPaid, totalOwed, pendingDays,
  } = useWorkerPortal()

  const holidaySet = new Set((holidays || []).map(h => String(h.date).slice(0, 10)))

  const [tab, setTab] = useState('submit')

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

  const pendingExpenses = workerExpenses.filter(e => e.status === 'pending')

  const canExpense    = worker.can_submit_expenses !== false
  const canSalary     = worker.can_request_payment !== false
  const canBlueprints = worker.can_view_blueprints === true

  const tabs = [
    { id: 'submit',     label: '📤 يوم'    },
    ...(canExpense     ? [{ id: 'expense',    label: '💸 مصروف'  }] : []),
    { id: 'materials',  label: '🪵 بضاعة'  },
    ...(canSalary      ? [{ id: 'salary',     label: '💰 راتب'   }] : []),
    ...(canSalary      ? [{ id: 'advance',    label: '💵 سلفة'   }] : []),
    { id: 'monthly',    label: '📅 شهري'   },
    ...(canBlueprints  ? [{ id: 'blueprints', label: '📐 خرائط'  }] : []),
    { id: 'account',    label: '⚙️ حساب'   },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'rgba(7,9,13,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '16px 16px 14px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 2, borderRadius: '50%', background: GRAD.brand }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: C.primary }}>
                {worker.name?.[0] || '?'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>أهلاً 👋</div>
              <div style={{ fontSize: 16, fontWeight: 900, background: GRAD.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{worker.name}</div>
              {worker.specialization && (
                <div style={{ fontSize: 10, color: C.primary, fontWeight: 600 }}>{worker.specialization.split(',')[0]}</div>
              )}
            </div>
          </div>
          <button onClick={logout}
            style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.accent}44`, background: `${C.accent}15`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            🚪 خروج
          </button>
        </div>
      </div>

      <div style={{ padding: 16, paddingBottom: 32 }}>
        {/* ملخص إجمالي */}
        <SummaryCard earned={totalEarned} expenses={totalExpenses} paid={totalPaid} owed={totalOwed} pendingCount={pendingDays.length} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '9px 2px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all .2s',
                background: tab === t.id ? GRAD.brand : 'transparent',
                color: tab === t.id ? '#000' : C.textDim,
                boxShadow: tab === t.id ? '0 4px 14px #00DDB344' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* تبويب إضافة يوم */}
        {tab === 'submit' && (
          <SubmitDayForm
            projects={projects}
            dailyRate={worker.daily_rate || 0}
            onSubmit={submitWorkDay}
            submitting={submitting}
            submitErr={submitErr}
            setSubmitErr={setSubmitErr}
            holidaySet={holidaySet}
          />
        )}

        {/* تبويب إضافة مصروف */}
        {tab === 'expense' && (
          <>
            <SubmitExpenseForm
              worker={worker}
              projects={projects}
              onSubmit={submitExpense}
              submitting={submittingExp}
              submitErr={submitExpErr}
              setSubmitErr={setSubmitExpErr}
            />
            {workerExpenses.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>مصاريفي السابقة</div>
                {workerExpenses.map(ex => {
                  const badge = EXP_STATUS_BADGE[ex.status] || EXP_STATUS_BADGE.approved
                  return (
                    <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: ex.status === 'pending' ? `${C.warning}11` : C.card, borderRadius: 10, border: `1px solid ${ex.status === 'pending' ? C.warning + '44' : C.border}`, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ex.category}{ex.vendor ? ` • ${ex.vendor}` : ''}</div>
                        <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(ex.date)}{ex.project_name ? ` • ${ex.project_name}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, fontFamily: 'monospace' }}>{fmt(ex.amount)}₪</div>
                        <div style={{ fontSize: 9, color: badge.color, background: `${badge.color}22`, padding: '2px 6px', borderRadius: 4, marginTop: 2, textAlign: 'center' }}>{badge.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* تبويب شهري */}
        {tab === 'monthly' && (
          <>
            {/* أيام معلقة */}
            {pendingDays.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.warning, marginBottom: 8 }}>⏳ بانتظار الموافقة</div>
                {pendingDays.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${C.warning}11`, borderRadius: 10, border: `1px solid ${C.warning}33`, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{fmtDateFull(d.date)} • {d.day_type}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>{d.project_name || '?'}</div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.warning, fontFamily: 'monospace' }}>{fmt(d.amount)}₪</div>
                      <div style={{ fontSize: 9, color: C.warning, background: `${C.warning}22`, padding: '2px 6px', borderRadius: 4, marginTop: 2 }}>معلق</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {monthlyBreakdown.length === 0 && pendingDays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
                <div>ما في أيام عمل مسجّلة بعد</div>
              </div>
            ) : (
              monthlyBreakdown.map(([month, data]) => (
                <MonthRow key={month} month={month} data={data} payments={payments} holidays={holidays} />
              ))
            )}
          </>
        )}

        {/* تبويب طلب راتب */}
        {tab === 'salary' && (
          <RequestPaymentForm
            worker={worker}
            onRequest={requestPayment}
            unpaidDays={workDays.filter(d => d.status === 'approved').sort((a, b) => b.date.localeCompare(a.date))}
            totalOwed={totalOwed}
          />
        )}

        {/* تبويب طلب سلفة */}
        {tab === 'advance' && (
          <RequestAdvanceForm onRequest={requestAdvance} />
        )}

        {/* تبويب البضاعة */}
        {tab === 'materials' && (
          <SubmitMaterialForm worker={worker} projects={projects} />
        )}

        {/* تبويب خرائط المشاريع */}
        {tab === 'blueprints' && (
          <BlueprintsTab projects={projects} />
        )}

        {/* تبويب الحساب وتغيير كلمة المرور */}
        {tab === 'account' && (
          <ChangePasswordForm worker={worker} onChangePassword={changePassword} />
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
