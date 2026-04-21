import React, { useState, useRef } from 'react'
import { C, EXP_CATS } from '../constants/index.js'
import { fmt, fmtDate, todayStr } from '../lib/helpers.js'
import { useWorkerPortal } from '../hooks/useWorkerPortal.js'
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

function SummaryCard({ earned, paid, owed, pendingCount }) {
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
      {pendingCount > 0 && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: `${C.warning}18`, borderRadius: 8, fontSize: 12, color: C.warning, fontWeight: 700, textAlign: 'center' }}>
          ⏳ {pendingCount} يوم بانتظار موافقة المشرف
        </div>
      )}
      {owed === 0 && earned > 0 && pendingCount === 0 && (
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
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>👷</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>بوابة العمال</div>
        <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Contractor Pro</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>اسم المستخدم</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="أدخل اسم المستخدم" autoComplete="username"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <input value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onLogin(username, password)}
              type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
              style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
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

        <button onClick={() => onLogin(username, password)}
          disabled={loading || !username || !password}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: loading || !username || !password ? C.border : C.primary, border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: loading || !username || !password ? 'default' : 'pointer', transition: 'background .2s' }}>
          {loading ? 'جاري التحقق...' : '→ دخول'}
        </button>
      </div>
    </div>
  )
}

// ─── فورم إرسال يوم عمل ──────────────────────────────────────────────────────
function SubmitDayForm({ projects, dailyRate, onSubmit, submitting, submitErr, setSubmitErr }) {
  const [form, setForm]         = useState({ date: todayStr(), projectId: '', dayType: 'كامل', hours: '8' })
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
      const res  = await onSubmit({ projectId: form.projectId, date: form.date, dayType: form.dayType, hours: form.hours })
      const proj = projects.find(p => p.id === form.projectId)
      setAmount(res.amount)
      setProjName(proj?.name || '')
      setSubmittedDate(form.date)
      setDone(true)
    } catch { /* error shown via submitErr */ }
  }

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
        <button onClick={() => { setDone(false); setForm({ date: todayStr(), projectId: '', dayType: 'كامل', hours: '8' }) }}
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
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          {/* المشروع */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {projects.map(p => (
                <button key={p.id} onClick={() => setForm(prev => ({ ...prev, projectId: p.id }))}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${form.projectId === p.id ? C.primary : C.border}`, background: form.projectId === p.id ? `${C.primary}22` : C.bg, color: form.projectId === p.id ? C.primary : C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

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
            style={{ width: '100%', padding: 14, borderRadius: 14, background: submitting || !form.projectId ? C.border : C.primary, border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: submitting || !form.projectId ? 'default' : 'pointer' }}>
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
    if (!receiptFile)    return setSubmitErr('يجب رفع صورة الفاتورة')
    setSubmitErr('')
    setUploading(true)
    let receiptUrl = ''
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

  const canSubmit = !submitting && !uploading && form.category && form.amount && receiptFile

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

      {/* المشروع (اختياري) */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المشروع (اختياري)</label>
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

      {/* المحل / ملاحظة */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.textDim, display: 'block', marginBottom: 6 }}>المحل / ملاحظة (اختياري)</label>
        <input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
          placeholder="مثال: مستودع الجابر"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* صورة الفاتورة - إجبارية */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 12 }}>
            <span style={{ color: C.accent, fontWeight: 700 }}>📎 صورة الفاتورة *</span>
            <span style={{ color: C.textDim, fontWeight: 400 }}> (إجباري)</span>
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

// ─── البوابة الرئيسية ─────────────────────────────────────────────────────────
export default function WorkerPortalScreen() {
  const {
    worker, workDays, payments, projects, loading, loginErr, loggingIn,
    submitting, submitErr, setSubmitErr,
    workerExpenses, submittingExp, submitExpErr, setSubmitExpErr,
    login, logout, submitWorkDay, submitExpense,
    monthlyBreakdown, totalEarned, totalPaid, totalOwed, pendingDays,
  } = useWorkerPortal()

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

  const tabs = [
    { id: 'submit',   label: '📤 يوم عمل' },
    { id: 'expense',  label: '💸 مصروف' },
    { id: 'monthly',  label: '📅 شهري' },
    { id: 'payments', label: '💰 الرواتب' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}22, ${C.surface})`, padding: '20px 16px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: C.primary }}>
              {worker.name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textDim }}>أهلاً 👋</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{worker.name}</div>
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
        <SummaryCard earned={totalEarned} paid={totalPaid} owed={totalOwed} pendingCount={pendingDays.length} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${tab === t.id ? C.primary : C.border}`, background: tab === t.id ? `${C.primary}22` : 'transparent', color: tab === t.id ? C.primary : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{fmtDate(d.date)} • {d.day_type}</div>
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
