import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Users, ArrowLeft, Calendar, Banknote,
  TrendingUp, Phone, Star, BarChart3, CreditCard,
  Check, AlertTriangle, Trash2, ChevronRight, CalendarDays,
  Link2, Copy, CheckCheck, UserPlus, UserMinus, MessageCircle, GitCommitHorizontal,
  Wallet, X, HardHat, Clock, Activity, Lock, KeyRound, RefreshCw, Pencil, ShieldCheck,
  Building2, CalendarClock, HandCoins,
} from 'lucide-react'
import { C, GRAD, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { openWhatsApp, waMessages } from '../../lib/whatsapp.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useHasFeature, useWorkerLimit } from '../../store/usePlanStore.js'
import { navigate } from '../../Router.jsx'
import { calcMustahaq, calcPaid, calcAdvances, calcMutabqi, calcEarned } from '../../lib/calculations.js'
import { computeWorkerDNA } from '../../lib/insights.js'
import {
  buildAttendanceHeatmap, buildFleetDna, buildRadarData,
  detectWorkerAnomalies, buildWorkerTimeline, buildFleetLeaderboard,
} from '../../lib/workerInsights.js'
import {
  AttendanceHeatmap, PerformanceRadar, AnomalyAlerts, WorkerTimeline, FleetLeaderboard,
} from '../../components/WorkerInsights.jsx'
import WorkDaysScreen from '../WorkDaysScreen.jsx'
import WorkerDNA, { WorkerDNABadge } from '../../components/WorkerDNA.jsx'
import WorkerActivityLog from '../../components/WorkerActivityLog.jsx'
import WorkerCard from '../../components/WorkerCard.jsx'
import PortalUpsell from '../../components/PortalUpsell.jsx'
import WorkDayTicket from '../../components/WorkDayTicket.jsx'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { setWorkerCredentials, resetWorkerPassword } from '../../hooks/useWorkerPortal.js'
import { PremiumCard, IconChip, PremiumStat } from '../../ui/Premium.jsx'
import QRCode from 'qrcode'

// ─── توليد بيانات دخول العامل (اسم مستخدم لاتيني فريد + كلمة مرور سهلة القراءة) ───
function genWorkerUsername(worker) {
  const base = (worker?.name || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'worker'
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`   // مثال: worker4821
}
function genWorkerPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'   // بلا أحرف ملتبسة (0/O/1/l)
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── بصمة العامل: يبني مدخلات المحرّك من البيانات الخام ──────────────────────────
function buildWorkerDNA(worker, { workDays, payments, advances, expenses, fleetAvgPerDay }) {
  const eid = worker.id
  const wds      = workDays.filter(w => w.employee_id === eid)
  const wdsApp   = wds.filter(w => w.status === 'approved')
  const expApp   = expenses.filter(e => e.employee_id === eid && e.status === 'approved')
  const advTotal = advances.filter(a => a.employee_id === eid).reduce((s, a) => s + (a.amount || 0), 0)

  const daysEarned = calcEarned(wdsApp)
  const earned     = calcMustahaq(wdsApp, expApp)
  const avgPerDay  = wdsApp.length > 0 ? daysEarned / wdsApp.length : 0

  // أيام/شهر (للانتظام) + مدى الاستمرارية بالأشهر
  const byMonth = {}
  let minKey = null, maxKey = null
  for (const w of wds) {
    if (!w.date) continue
    const key = w.date.slice(0, 7)
    if (w.status === 'approved') byMonth[key] = (byMonth[key] || 0) + 1
    if (!minKey || key < minKey) minKey = key
    if (!maxKey || key > maxKey) maxKey = key
  }
  const daysPerMonth = Object.values(byMonth)
  let tenureMonths = 0
  if (minKey && maxKey) {
    const [y1, m1] = minKey.split('-').map(Number)
    const [y2, m2] = maxKey.split('-').map(Number)
    tenureMonths = (y2 - y1) * 12 + (m2 - m1) + 1
  }

  return computeWorkerDNA({
    name: worker.name, earned, advances: advTotal,
    avgPerDay, fleetAvgPerDay,
    approvedDays: wdsApp.length,
    pendingDays:  wds.filter(w => w.status === 'pending').length,
    rejectedDays: wds.filter(w => w.status === 'rejected').length,
    daysPerMonth, tenureMonths,
  })
}

// ─── Worker avatar initials ───────────────────────────────────────────────────
function Avatar({ name, size = 42, color = C.primary }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: `${color}20`, border: `1.5px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.35, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{initials}</span>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, label, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px',
      background: active ? `${C.primary}18` : 'transparent', border: `1px solid ${active ? C.primary+'40' : 'transparent'}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', flex: 1,
    }}>
      <Icon size={15} color={active ? C.primary : C.textDim} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.primary : C.textDim, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

// ─── Add Worker Modal ─────────────────────────────────────────────────────────
function AddWorkerModal({ open, onClose, onSave, specs = [], language }) {
  const [form, setForm] = useState({ name: '', specialization: specs[0] || '', phone: '', daily_rate: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const { confirm: bioConfirm } = useBiometricConfirm()

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const sig = await bioConfirm(`إضافة عامل: ${form.name.trim()}`, 'employees')
      if (!sig) { setSaving(false); return }
      await onSave({ ...form, daily_rate: Number(form.daily_rate) || 0 })
      setForm({ name: '', specialization: specs[0] || '', phone: '', daily_rate: '', notes: '' })
      onClose()
    } catch (e) {
      setError(e.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()} dir={dir}
            style={{ width: '100%', maxWidth: 500, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: '24px 24px 0 0', padding: '20px 18px 24px', marginBottom: 'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))', maxHeight: 'calc(92vh - 80px)', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 18 }}>
              {language === 'he' ? 'עובד חדש' : language === 'en' ? 'New Worker' : 'عامل جديد'}
            </div>

            {[
              { key: 'name', label: language === 'he' ? 'שם' : language === 'en' ? 'Name' : 'الاسم', type: 'text' },
              { key: 'phone', label: language === 'he' ? 'טלפון' : language === 'en' ? 'Phone' : 'الهاتف', type: 'tel' },
              { key: 'daily_rate', label: language === 'he' ? 'שכר יומי' : language === 'en' ? 'Daily Rate' : 'الأجر اليومي', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{label}</label>
                <input value={form[key]} onChange={f(key)} type={type}
                  style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}

            {specs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
                  {language === 'he' ? 'התמחות' : language === 'en' ? 'Specialty' : 'التخصص'}
                </label>
                <select value={form.specialization} onChange={f('specialization')}
                  style={{ width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {specs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 12, background: `${C.accent}1F`, border: `1px solid ${C.accent}4D`, color: C.accent, fontSize: 12, marginBottom: 10 }}>
                <AlertTriangle size={14} strokeWidth={2.3} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {language === 'he' ? 'ביטול' : language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: '12px', borderRadius: 14, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(124,58,237,0.35)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'جاري الحفظ...' : language === 'he' ? 'שמור' : language === 'en' ? 'Save' : 'حفظ'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Worker Detail ────────────────────────────────────────────────────────────
const PORTAL_URL = `${window.location.origin}${window.location.pathname}?portal`

// مفتاح تبديل صغير (RTL-safe عبر flex + layout)
function Switch({ on, onChange, disabled = false }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!on)} disabled={disabled}
      style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: disabled ? 'default' : 'pointer', flexShrink: 0, padding: 3, background: on ? C.success : 'rgba(255,255,255,0.14)', transition: 'background .2s', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', opacity: disabled ? 0.5 : 1 }}>
      <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
    </button>
  )
}

// ─── شيت تعديل العامل الموحّد: بيانات + صلاحيات البوّابة + تفعيل/إيقاف + بيانات الدخول ───
function EditWorkerSheet({ open, worker, onClose, onUpdate, specs = [], projects = [], language }) {
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const [form, setForm] = useState(null)
  const [creds, setCreds] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [credsCopied, setCredsCopied] = useState(false)

  useEffect(() => {
    if (open && worker) {
      setForm({
        name: worker.name || '', phone: worker.phone || '', daily_rate: worker.daily_rate ?? '',
        specialization: worker.specialization || (specs[0] || ''), id_number: worker.id_number || '', notes: worker.notes || '',
        can_submit_workday:  worker.can_submit_workday  !== false,
        can_submit_expenses: worker.can_submit_expenses !== false,
        can_log_materials:   worker.can_log_materials   !== false,
        can_request_payment: worker.can_request_payment !== false,
        can_access_portal:   worker.can_access_portal   !== false,
        allowed_project_ids: Array.isArray(worker.allowed_project_ids) ? worker.allowed_project_ids : [],
        max_advance_amount:  worker.max_advance_amount ?? '',
        require_expense_receipt: worker.require_expense_receipt === true,
        portal_access_until: worker.portal_access_until || '',
      })
      setCreds(null); setErr('')
    }
  }, [open, worker?.id]) // eslint-disable-line

  if (!open || !form) return null
  const hasAccount = !!worker.worker_username
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    setBusy(true); setErr('')
    try {
      const patch = {
        name: form.name.trim(), phone: form.phone.trim(), daily_rate: Number(form.daily_rate) || 0,
        specialization: form.specialization, id_number: form.id_number.trim(), notes: form.notes,
        can_submit_workday: form.can_submit_workday, can_submit_expenses: form.can_submit_expenses,
        can_log_materials: form.can_log_materials, can_request_payment: form.can_request_payment,
        can_access_portal: form.can_access_portal,
        allowed_project_ids: form.allowed_project_ids.length ? form.allowed_project_ids : null,  // فارغ = كل المشاريع
        max_advance_amount: form.max_advance_amount === '' ? null : Number(form.max_advance_amount) || null,
        require_expense_receipt: form.require_expense_receipt,
        portal_access_until: form.portal_access_until || null,
      }
      // إيقاف الوصول (يدوي أو بانتهاء المدّة) يقطع الجلسة الحالية
      const suspended = !form.can_access_portal || (form.portal_access_until && form.portal_access_until < new Date().toISOString().slice(0, 10))
      if (suspended) patch.worker_session_token = null
      await onUpdate(worker.id, patch)
      onClose()
    } catch (e) { setErr(e.message || 'تعذّر الحفظ') }
    setBusy(false)
  }

  async function genCreds() {
    setBusy(true); setErr('')
    const password = genWorkerPassword()
    let lastErr
    for (let i = 0; i < 4; i++) {
      const username = genWorkerUsername(worker)
      try { await setWorkerCredentials(worker.id, username, password); setCreds({ username, password }); setBusy(false); return }
      catch (e) { lastErr = e; if (!/مستخدم بالفعل/.test(e.message || '')) break }
    }
    setErr(lastErr?.message || 'تعذّر إنشاء بيانات الدخول'); setBusy(false)
  }

  async function resetPass() {
    setBusy(true); setErr('')
    const password = genWorkerPassword()
    try { await resetWorkerPassword(worker.id, password); setCreds({ username: worker.worker_username, password }) }
    catch (e) { setErr(e.message || 'تعذّر إعادة التعيين') }
    setBusy(false)
  }

  function shareCreds() {
    if (!creds) return
    openWhatsApp(form.phone || worker.phone, waMessages.portalInvite({ workerName: form.name || worker.name, url: PORTAL_URL, username: creds.username, password: creds.password }))
  }
  function copyCreds() {
    if (!creds) return
    navigator.clipboard.writeText(`الرابط: ${PORTAL_URL}\nاسم المستخدم: ${creds.username}\nكلمة المرور: ${creds.password}`).then(() => { setCredsCopied(true); setTimeout(() => setCredsCopied(false), 2000) })
  }

  const inputStyle = { width: '100%', padding: '10px 13px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim, marginBottom: 6 }
  const sectionTitle = { fontSize: 11, fontWeight: 800, color: C.textDim, letterSpacing: '0.04em', margin: '18px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }
  const PERMS = [
    { k: 'can_submit_workday',  label: 'تسجيل يوم عمل' },
    { k: 'can_submit_expenses', label: 'تسجيل مصروف' },
    { k: 'can_log_materials',   label: 'تسجيل بضاعة' },
    { k: 'can_request_payment', label: 'طلب راتب / سلفة' },
  ]

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={e => e.stopPropagation()} dir={dir}
          style={{ width: '100%', maxWidth: 500, background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: '24px 24px 0 0', padding: '20px 18px 24px', marginBottom: 'max(72px, calc(66px + env(safe-area-inset-bottom, 0px)))', maxHeight: 'calc(92vh - 80px)', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 18px' }} />
          <div style={{ fontSize: 17, fontWeight: 900, color: C.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={17} color={C.primary} strokeWidth={2.2} /> تعديل العامل
          </div>

          {/* بيانات أساسية */}
          {[
            { k: 'name', label: 'الاسم', type: 'text' },
            { k: 'phone', label: 'الهاتف', type: 'tel' },
            { k: 'daily_rate', label: 'الأجر اليومي', type: 'number' },
            { k: 'id_number', label: 'رقم الهوية', type: 'text' },
          ].map(({ k, label, type }) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{label}</label>
              <input value={form[k]} type={type} onChange={e => set(k, e.target.value)} style={inputStyle} />
            </div>
          ))}
          {specs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>التخصص</label>
              <select value={form.specialization} onChange={e => set('specialization', e.target.value)} style={{ ...inputStyle, fontSize: 13 }}>
                {specs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* صلاحيات البوّابة */}
          <div style={sectionTitle}><ShieldCheck size={13} strokeWidth={2.2} /> صلاحيات البوّابة</div>
          {PERMS.map(({ k, label }) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
              <Switch on={form[k]} onChange={v => set(k, v)} disabled={!form.can_access_portal} />
            </div>
          ))}

          {/* حصر بالمشاريع */}
          <div style={sectionTitle}><Building2 size={13} strokeWidth={2.2} /> المشاريع المتاحة للعامل</div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, lineHeight: 1.5 }}>بلا اختيار = كل المشاريع. باختيار مشاريع = يرى ويسجّل على المختارة فقط.</div>
          {projects.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textDim, padding: '4px 0 8px' }}>لا توجد مشاريع</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {projects.map(pr => {
                const on = form.allowed_project_ids.includes(pr.id)
                return (
                  <button key={pr.id} type="button"
                    onClick={() => set('allowed_project_ids', on ? form.allowed_project_ids.filter(x => x !== pr.id) : [...form.allowed_project_ids, pr.id])}
                    style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${on ? C.primary : C.border}`, background: on ? `${C.primary}22` : C.card, color: on ? C.primary : C.textDim }}>
                    {pr.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* حدود الطلبات */}
          <div style={sectionTitle}><HandCoins size={13} strokeWidth={2.2} /> حدود الطلبات</div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>الحد الأقصى للسلفة (₪) — فارغ = بلا حد</label>
            <input type="number" min="0" value={form.max_advance_amount} onChange={e => set('max_advance_amount', e.target.value)} placeholder="مثال: 1000" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>إلزام صورة فاتورة مع المصروف</span>
            <Switch on={form.require_expense_receipt} onChange={v => set('require_expense_receipt', v)} disabled={!form.can_access_portal} />
          </div>

          {/* تفعيل/إيقاف الوصول */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', background: form.can_access_portal ? `${C.success}10` : `${C.accent}10`, border: `1px solid ${form.can_access_portal ? C.success + '33' : C.accent + '33'}`, borderRadius: 12, marginTop: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: form.can_access_portal ? C.success : C.accent }}>
                {form.can_access_portal ? 'الوصول للبوّابة مُفعّل' : 'الوصول للبوّابة موقوف'}
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>إيقافه يمنع الدخول ويُنهي جلسته الحالية</div>
            </div>
            <Switch on={form.can_access_portal} onChange={v => set('can_access_portal', v)} />
          </div>

          {/* انتهاء صلاحية الوصول بتاريخ (إيقاف تلقائي — لعامل موسمي/مؤقّت) */}
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}><CalendarClock size={12} strokeWidth={2.2} style={{ verticalAlign: '-2px', marginInlineEnd: 4 }} /> انتهاء صلاحية الوصول بتاريخ (اختياري)</label>
            <input type="date" value={form.portal_access_until || ''} onChange={e => set('portal_access_until', e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 10, color: form.portal_access_until ? C.warning : C.textDim, marginTop: 4 }}>
              {form.portal_access_until ? `بعد ${form.portal_access_until} يتوقّف وصول العامل تلقائياً.` : 'بلا تاريخ = وصول دائم (طالما مُفعّل).'}
            </div>
          </div>

          {/* بيانات الدخول */}
          <div style={sectionTitle}><KeyRound size={13} strokeWidth={2.2} /> بيانات الدخول</div>
          {creds ? (
            <div style={{ background: `${C.success}10`, border: `1px solid ${C.success}33`, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.success, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.5 }}>
                <Check size={12} strokeWidth={2.6} /> جاهزة — احفظها الآن (كلمة المرور لن تظهر مرّة ثانية)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text, marginBottom: 4 }}>
                <span style={{ color: C.textDim }}>اسم المستخدم</span><span style={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{creds.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text, marginBottom: 10 }}>
                <span style={{ color: C.textDim }}>كلمة المرور</span><span style={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{creds.password}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={shareCreds} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 10, background: `${C.success}18`, border: `1.5px solid ${C.success}44`, color: C.success, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <MessageCircle size={13} strokeWidth={2} /> مشاركة عبر واتساب
                </button>
                <button onClick={copyCreds} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 10, background: credsCopied ? `${C.success}22` : `${C.primary}18`, border: `1.5px solid ${credsCopied ? C.success + '55' : C.primary + '44'}`, color: credsCopied ? C.success : C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {credsCopied ? <CheckCheck size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />} {credsCopied ? 'تم' : 'نسخ'}
                </button>
              </div>
            </div>
          ) : hasAccount ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, fontSize: 12, color: C.text, minWidth: 0 }}>
                <span style={{ color: C.textDim }}>اسم المستخدم: </span><span style={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{worker.worker_username}</span>
              </div>
              <button onClick={resetPass} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 10, background: `${C.primary}18`, border: `1.5px solid ${C.primary}44`, color: C.primary, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}>
                <RefreshCw size={13} strokeWidth={2} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} /> كلمة مرور جديدة
              </button>
            </div>
          ) : (
            <button onClick={genCreds} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 12, background: GRAD.brand, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
              {busy ? <RefreshCw size={15} strokeWidth={2.4} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={15} strokeWidth={2.4} />}
              {busy ? 'جارٍ الإنشاء…' : 'تفعيل البوّابة وإنشاء بيانات الدخول'}
            </button>
          )}

          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 12, background: `${C.accent}1F`, border: `1px solid ${C.accent}4D`, color: C.accent, fontSize: 12, marginTop: 12 }}>
              <AlertTriangle size={14} strokeWidth={2.3} /> {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={busy}
              style={{ flex: 2, padding: '12px', borderRadius: 14, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(124,58,237,0.35)', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function WorkerDetail({ worker, dna, fleetDna, workDays, payments, advances, projects, expenses, onClose, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, addPayment, deletePayment, addAdvance, deleteAdvance, payMethods, permissions, language, appCfg, onDeleteWorker, updateEmployee, specs }) {
  const [tab, setTab] = useState('overview')
  const [advRequests, setAdvRequests] = useState([])
  const [advProject, setAdvProject] = useState({})   // req.id → project_id (اختياري)
  const portalEnabled = useHasFeature('pro')          // بوّابة العامل ميزة خطة Pro
  const showAmounts = permissions?.viewAmounts !== false   // إخفاء المبالغ عن عضو فريق مقيّد

  useEffect(() => {
    if (!worker?.id || !permissions?.isOwner) return
    import('../../lib/supabase.js').then(({ supabase }) => {
      supabase.from('worker_advance_requests')
        .select('*').eq('employee_id', worker.id).eq('status', 'pending')
        .order('created_at', { ascending: false })
        .then(({ data }) => setAdvRequests(data || []))
    })
  }, [worker?.id, permissions?.isOwner])

  async function approveAdvanceRequest(req) {
    const { supabase } = await import('../../lib/supabase.js')
    await supabase.from('worker_advance_requests')
      .update({ status: 'approved', responded_at: new Date().toISOString() })
      .eq('id', req.id)
    await addAdvance({ employee_id: req.employee_id, amount: req.amount, notes: req.notes || 'سلفة مطلوبة من العامل', date: new Date().toISOString().slice(0, 10), project_id: advProject[req.id] || null })
    setAdvRequests(r => r.filter(x => x.id !== req.id))
  }

  async function rejectAdvanceRequest(req) {
    const { supabase } = await import('../../lib/supabase.js')
    await supabase.from('worker_advance_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', req.id)
    setAdvRequests(r => r.filter(x => x.id !== req.id))
  }
  const [copied, setCopied] = useState(false)

  function copyPortalLink() {
    navigator.clipboard.writeText(PORTAL_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const [showEdit, setShowEdit] = useState(false)   // شيت تعديل العامل الموحّد (بيانات + صلاحيات + بوّابة + دخول)
  const hasPortalAccount = !!worker.worker_username

  function shareStatementWhatsApp() {
    openWhatsApp(worker.phone, waMessages.workerStatement({
      workerName: worker.name,
      earned:     totalEarned,
      paid:       totalPaid,
      advances:   totalAdvances,
      balance,
    }))
  }
  const dir = language === 'en' ? 'ltr' : 'rtl'

  const eid = worker.id
  const wWorkers  = workDays.filter(w => w.employee_id === eid)
  const wWorksApp = wWorkers.filter(w => w.status === 'approved')
  const wPayments = payments.filter(p => p.employee_id === eid)
  const wAdvances = advances.filter(a => a.employee_id === eid)

  const wWorkerExp    = expenses.filter(e => e.employee_id === eid && e.status === 'approved')
  const totalEarned   = calcMustahaq(wWorksApp, wWorkerExp)
  const totalPaid     = calcPaid(wPayments)
  const totalAdvances = calcAdvances(wAdvances)
  const balance       = calcMutabqi(wWorksApp, wWorkerExp, wPayments, wAdvances)

  // ── الميزات الذكية: خريطة حضور · رادار · شذوذ · خطّ زمني ──
  const heatmap   = useMemo(() => buildAttendanceHeatmap(wWorkers, { weeks: 26 }), [wWorkers])
  const radarData = useMemo(() => buildRadarData(dna, fleetDna), [dna, fleetDna])
  const anomalies = useMemo(() => detectWorkerAnomalies(worker, { workDays, advances, expenses }), [worker, workDays, advances, expenses])
  const timeline  = useMemo(() => buildWorkerTimeline(worker, { workDays, payments, advances, expenses, projects }), [worker, workDays, payments, advances, expenses, projects])

  const TABS = [
    { id: 'overview', icon: BarChart3, label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'ملخص' },
    { id: 'timeline', icon: GitCommitHorizontal, label: language === 'he' ? 'ציר זמן' : language === 'en' ? 'Timeline' : 'الخط الزمني' },
    { id: 'workdays', icon: Calendar,  label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'payments', icon: Banknote,  label: language === 'he' ? 'שכר' : language === 'en' ? 'Salary' : 'رواتب' },
    { id: 'advances', icon: CreditCard, label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'سلف' },
    ...(permissions?.isOwner ? [{ id: 'activity', icon: Activity, label: language === 'he' ? 'פעילות' : language === 'en' ? 'Activity' : 'نشاط' }] : []),
  ]

  const colors = [C.secondary, C.primary, C.gold, C.cyan]

  return (
    <div dir={dir} style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}`, background: C.surface, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} color={C.textDim} style={{ transform: dir === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </button>
        <Avatar name={worker.name} size={38} color={C.secondary} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{worker.name}</div>
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{worker.specialty || ''}</div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: balance >= 0 ? C.warning : C.success }}>
            {balance >= 0 ? language === 'he' ? 'חייב' : language === 'en' ? 'Owed' : 'مستحق' : language === 'he' ? 'دفعت زيادة' : language === 'en' ? 'Overpaid' : 'دفعت زيادة'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: balance >= 0 ? C.warning : C.success }}>{showAmounts ? `₪${fmt(Math.abs(balance))}` : '•••'}</div>
        </div>
        {permissions?.isOwner && (
          <button
            onClick={() => setShowEdit(true)}
            style={{ width: 36, height: 36, borderRadius: 11, background: `${C.primary}14`, border: `1px solid ${C.primary}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Pencil size={15} color={C.primary} />
          </button>
        )}
        {onDeleteWorker && permissions?.isOwner && (
          <button
            onClick={() => onDeleteWorker(worker)}
            style={{ width: 36, height: 36, borderRadius: 11, background: `${C.accent}12`, border: `1px solid ${C.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <UserMinus size={15} color={C.accent} />
          </button>
        )}
      </div>

      {/* شيت التعديل الموحّد */}
      <EditWorkerSheet open={showEdit} worker={worker} onClose={() => setShowEdit(false)} onUpdate={updateEmployee} specs={specs} projects={projects} language={language} />


      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            {/* بصمة العامل — تحليل ذكي */}
            <WorkerDNA dna={dna} />

            {/* كشف الشذوذ الذكي */}
            <AnomalyAlerts anomalies={anomalies} lang={language} />

            {/* رادار الأداء مقابل الأسطول */}
            <PerformanceRadar data={radarData} lang={language} />

            {/* خريطة الحضور الحرارية */}
            <AttendanceHeatmap heatmap={heatmap} lang={language} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'סה"כ הרוויח' : language === 'en' ? 'Total Earned' : 'إجمالي المستحق', value: showAmounts ? `₪${fmt(totalEarned)}` : '•••', color: C.success, icon: TrendingUp },
                { label: language === 'he' ? 'שולם' : language === 'en' ? 'Paid' : 'المدفوع', value: showAmounts ? `₪${fmt(totalPaid)}` : '•••', color: C.secondary, icon: Banknote },
                { label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'السلف', value: showAmounts ? `₪${fmt(totalAdvances)}` : '•••', color: C.accent, icon: CreditCard },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: wWorkers.length, color: C.primary, icon: Calendar },
              ].map(({ label, value, color, icon }, i) => (
                <PremiumStat key={label} label={label} value={value} icon={icon} color={color} delay={i * 0.04} />
              ))}
            </div>

            {worker.phone && (
              <PremiumCard tone="cyan" glow={false} radius={14} padding="12px" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconChip icon={Phone} tone="cyan" size={32} radius={10} />
                  <span style={{ flex: 1, fontSize: 13, color: C.text, direction: 'ltr', textAlign: 'start' }}>{worker.phone}</span>
                  <button onClick={shareStatementWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: `${C.success}18`, border: `1.5px solid ${C.success}44`, color: C.success, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    <MessageCircle size={13} strokeWidth={2} />
                    كشف حساب
                  </button>
                </div>
              </PremiumCard>
            )}

            {/* Portal link — ميزة Pro */}
            <PremiumCard tone={portalEnabled ? 'brand' : 'premium'} glow={false} radius={14} padding="12px 14px">
              {portalEnabled ? (<>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Link2 size={10} strokeWidth={2} /> بورتال العامل
                </div>

                {/* حالة البوّابة + إدارة (بيانات الدخول والصلاحيات في شيت التعديل) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, fontSize: 12, color: C.text, minWidth: 0 }}>
                    {worker.can_access_portal === false ? (
                      <span style={{ color: C.accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={12} strokeWidth={2.4} /> موقوفة</span>
                    ) : hasPortalAccount ? (
                      <><span style={{ color: C.textDim }}>اسم المستخدم: </span><span style={{ fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{worker.worker_username}</span></>
                    ) : (
                      <span style={{ color: C.textDim }}>لم تُفعّل بعد</span>
                    )}
                  </div>
                  <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, background: `${C.primary}18`, border: `1.5px solid ${C.primary}44`, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    <KeyRound size={13} strokeWidth={2} /> إدارة الدخول والصلاحيات
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 11, color: C.textDim, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{PORTAL_URL}</span>
                  <button onClick={copyPortalLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: copied ? `${C.success}22` : `${C.primary}18`, border: `1.5px solid ${copied ? C.success+'55' : C.primary+'44'}`, color: copied ? C.success : C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                    {copied ? <CheckCheck size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                    {copied ? 'تم النسخ' : 'نسخ الرابط'}
                  </button>
                </div>
              </>) : (
                <PortalUpsell lang={language} />
              )}
            </PremiumCard>
          </div>
        )}

        {tab === 'timeline' && (
          <WorkerTimeline timeline={timeline} lang={language} />
        )}

        {tab === 'workdays' && (
          <div>
            {wWorkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days' : 'لا توجد أيام عمل'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {wWorkers.slice().reverse().map((wd, i) => {
                  const project = projects?.find(p => p.id === wd.project_id)
                  return (
                    <WorkDayTicket key={wd.id} wd={wd} hideName
                      projectName={project?.name || ''} lang={language}
                      notchColor={C.bg} delay={Math.min(i * 0.03, 0.3)} />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            {wPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין תשלומים' : language === 'en' ? 'No payments' : 'لا توجد رواتب'}
              </div>
            ) : wPayments.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((pay, i) => (
              <PremiumCard key={pay.id} tone="excellent" glow={false} radius={14} padding="10px 12px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconChip icon={Banknote} tone="excellent" size={32} radius={10} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{pay.method || ''}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)}</div>
                  {pay.ref_number && <div style={{ fontSize: 9, fontWeight: 700, color: C.primary, marginTop: 2, letterSpacing: '0.04em' }}>{pay.ref_number}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.success }}>{showAmounts ? `₪${fmt(pay.amount || 0)}` : '•••'}</div>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}

        {tab === 'advances' && (
          <div>
            {/* Pending advance requests */}
            {advRequests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.warning, letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={11} color={C.warning} strokeWidth={2.3} />
                  طلبات سلف معلّقة ({advRequests.length})
                </div>
                {advRequests.map(req => (
                  <div key={req.id} style={{ background: `${C.warning}0A`, border: `1px solid ${C.warning}30`, borderRadius: 14, marginBottom: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{showAmounts ? `₪${fmt(req.amount || 0)}` : '•••'}</div>
                        {req.notes && <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{req.notes}</div>}
                        <div style={{ fontSize: 9, color: C.textDim }}>{req.requested_date || new Date(req.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <button onClick={() => approveAdvanceRequest(req)} style={{ padding: '6px 10px', borderRadius: 8, background: `${C.success}20`, border: `1px solid ${C.success}40`, color: C.success, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        موافقة
                      </button>
                      <button onClick={() => rejectAdvanceRequest(req)} style={{ padding: '6px 10px', borderRadius: 8, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, color: C.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        رفض
                      </button>
                    </div>
                    {/* نسب السلفة لمشروع (اختياري) — يدخل في حساب "متبقي بيد المالك" */}
                    <select
                      value={advProject[req.id] || ''}
                      onChange={e => setAdvProject(m => ({ ...m, [req.id]: e.target.value }))}
                      style={{ marginTop: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 11, fontFamily: 'inherit' }}>
                      <option value="">سلفة عامة (بدون مشروع)</option>
                      {(projects || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {wAdvances.length === 0 && advRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין מקדמות' : language === 'en' ? 'No advances' : 'لا توجد سلف'}
              </div>
            ) : wAdvances.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((adv, i) => (
              <PremiumCard key={adv.id} tone="critical" glow={false} radius={14} padding="10px 12px" delay={Math.min(i * 0.03, 0.3)} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconChip icon={CreditCard} tone="critical" size={32} radius={10} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{adv.notes || (language === 'en' ? 'Advance' : language === 'he' ? 'מקדמה' : 'سلفة')}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(adv.date)}</div>
                  {adv.ref_number && <div style={{ fontSize: 9, fontWeight: 700, color: C.primary, marginTop: 2, letterSpacing: '0.04em' }}>{adv.ref_number}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{showAmounts ? `-₪${fmt(adv.amount || 0)}` : '•••'}</div>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}

        {tab === 'activity' && permissions?.isOwner && (
          <div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, lineHeight: 1.6 }}>
              {language === 'he' ? 'כל הפעולות שהעובד ביצע דרך הפורטל' : language === 'en' ? 'Everything this worker did via the portal' : 'كل ما قام به العامل من بوّابته (دخول، أيام، مصاريف، طلبات، بضاعة)'}
            </div>
            <WorkerActivityLog empId={worker.id} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkersScreen({
  employees = [], workDays = [], payments = [], advances = [], expenses = [],
  projects = [],
  addEmployee, updateEmployee, deleteEmployee,
  addAdvance, deleteAdvance,
  addWorkDay, bulkAddWorkDays, updateWorkDay, bulkUpdateWorkDays, deleteWorkDay,
  approveWorkDay, rejectWorkDay,
  addPayment, updatePayment, deletePayment,
  specs = [], permissions, holidays = [], addHoliday, deleteHoliday,
  teamMembers = [], addMember, updateMember, removeMember, blockMember,
  resetMemberPassword, getActivity, teamLoadError, reloadTeam,
  payMethods = [], profile, appCfg,
}) {
  const { t } = useTranslation()
  const { language } = useAppStore()
  const dir = language === 'en' ? 'ltr' : 'rtl'
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [mainTab, setMainTab] = useState('workers')
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showLimit, setShowLimit] = useState(false)   // نافذة تجاوز حدّ خطة Starter
  const [selected, setSelected] = useState(null)

  const portalEnabled = useHasFeature('pro')          // بوّابة العامل ميزة خطة Pro
  const showAmounts = permissions?.viewAmounts !== false   // إخفاء المبالغ عن عضو فريق مقيّد

  // حدّ عدد العمّال حسب الخطة: تجربة → 1 · Starter → 10 · Pro/Business → غير محدود
  const workerLimit = useWorkerLimit()
  const unlimitedWorkers = workerLimit === Infinity
  const atWorkerLimit = !unlimitedWorkers && employees.length >= workerLimit
  const isTrialLimit = workerLimit === 1
  const [confirmDelete, setConfirmDelete] = useState(null) // worker to delete
  const [portalQr, setPortalQr] = useState('')             // QR رابط البوّابة (مشترك للبطاقات)

  useEffect(() => {
    QRCode.toDataURL(PORTAL_URL, { margin: 1, width: 320, color: { dark: '#0D0F1C', light: '#ffffff' } })
      .then(setPortalQr).catch(() => {})
  }, [])

  async function handleDeleteWorker(worker) {
    const sig = await bioConfirm(`حذف العامل: ${worker.name}`, 'employees')
    if (!sig) return
    try {
      await deleteEmployee(worker.id)
      if (selected?.id === worker.id) setSelected(null)
    } catch (e) {
      console.error('حذف العامل فشل:', e.message)
    }
    setConfirmDelete(null)
  }

  const allSpecs = useMemo(() => ['all', ...new Set(employees.map(e => e.specialty).filter(Boolean))], [employees])

  const filtered = useMemo(() => {
    let list = employees
    if (search) list = list.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()) || e.specialty?.toLowerCase().includes(search.toLowerCase()))
    if (specFilter !== 'all') list = list.filter(e => e.specialty === specFilter)
    return list
  }, [employees, search, specFilter])

  // Per-worker stats
  const workerStats = useMemo(() => {
    const map = {}
    for (const e of employees) {
      const eid = e.id
      const wds    = workDays.filter(w => w.employee_id === eid)
      const wdsApp = wds.filter(w => w.status === 'approved')
      const expApp = expenses.filter(ex => ex.employee_id === eid && ex.status === 'approved')
      const paid   = payments.filter(p => p.employee_id === eid).reduce((s, p) => s + (p.amount || 0), 0)
      const adv    = advances.filter(a => a.employee_id === eid).reduce((s, a) => s + (a.amount || 0), 0)
      const earned = calcMustahaq(wdsApp, expApp)
      map[eid] = { earned, paid, adv, balance: earned - paid - adv, days: wdsApp.length, pending: wds.filter(w => w.status === 'pending').length }
    }
    return map
  }, [employees, workDays, payments, advances])

  // ── بصمة العامل: متوسّط الفريق (مرجع) + بصمة لكل عامل ──────────────────────────
  const dnaMap = useMemo(() => {
    const approvedWDs = workDays.filter(w => w.status === 'approved')
    const totalDays   = approvedWDs.length
    const fleetAvgPerDay = totalDays > 0 ? calcEarned(approvedWDs) / totalDays : 0
    const ctx = { workDays, payments, advances, expenses, fleetAvgPerDay }
    const map = {}
    for (const e of employees) map[e.id] = buildWorkerDNA(e, ctx)
    return map
  }, [employees, workDays, payments, advances, expenses])

  // متوسّط بصمة الأسطول (مرجع الرادار)
  const fleetDna = useMemo(() => buildFleetDna(Object.values(dnaMap)), [dnaMap])

  // عدد ملاحظات الشذوذ لكل عامل (شارة على بطاقة الروستر)
  const anomalyMap = useMemo(() => {
    const map = {}
    for (const e of employees) {
      const a = detectWorkerAnomalies(e, { workDays, advances, expenses })
      map[e.id] = { total: a.length, high: a.filter(x => x.severity === 'high').length }
    }
    return map
  }, [employees, workDays, advances, expenses])

  // لوحة شرف الأسطول
  const leaderboard = useMemo(() => buildFleetLeaderboard(employees, dnaMap, workerStats), [employees, dnaMap, workerStats])

  if (selected) {
    // العامل الحيّ من أحدث قائمة (يعكس تعديلات الصلاحيات/البيانات بعد الحفظ بدل نسخة قديمة)
    const liveWorker = employees.find(e => e.id === selected.id) || selected
    return (
      <WorkerDetail
        worker={liveWorker}
        dna={dnaMap[selected.id]}
        fleetDna={fleetDna}
        workDays={workDays} payments={payments} advances={advances} projects={projects} expenses={expenses}
        onClose={() => setSelected(null)}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        addPayment={addPayment} deletePayment={deletePayment}
        addAdvance={addAdvance} deleteAdvance={deleteAdvance}
        payMethods={payMethods} permissions={permissions} language={language}
        appCfg={appCfg}
        onDeleteWorker={handleDeleteWorker}
        updateEmployee={updateEmployee} specs={specs}
      />
    )
  }

  if (mainTab === 'workdays') {
    return (
      <div dir={dir}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', marginBottom: 4 }}>
          {[
            { id: 'workers',  label: 'العمال',     Icon: Users },
            { id: 'workdays', label: 'أيام العمل', Icon: CalendarDays, badge: workDays.filter(w => w.status === 'pending').length },
          ].map(({ id, label, Icon, badge }) => (
            <button key={id} onClick={() => setMainTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 12, border: `1px solid ${mainTab === id ? C.primary + '60' : C.border}`,
              background: mainTab === id ? `${C.primary}15` : 'transparent',
              color: mainTab === id ? C.primary : C.textDim,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
            }}>
              <Icon size={14} strokeWidth={2} />
              {label}
              {badge > 0 && (
                <span style={{ background: C.accent, color: '#fff', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 7, minWidth: 16, textAlign: 'center' }}>{badge}</span>
              )}
            </button>
          ))}
        </div>
        <WorkDaysScreen
          workDays={workDays} employees={employees} projects={projects}
          addWorkDay={addWorkDay} bulkAddWorkDays={bulkAddWorkDays}
          updateWorkDay={updateWorkDay} bulkUpdateWorkDays={bulkUpdateWorkDays}
          deleteWorkDay={deleteWorkDay} approveWorkDay={approveWorkDay}
          rejectWorkDay={rejectWorkDay} permissions={permissions} holidays={holidays}
        />
      </div>
    )
  }

  const totalOwed = Object.values(workerStats).reduce((s, v) => s + Math.max(0, v.balance), 0)
  const pendingWD = workDays.filter(w => w.status === 'pending').length

  return (
    <div dir={dir} style={{ padding: '16px 16px 8px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'workers',  label: 'العمال',     Icon: Users },
          { id: 'workdays', label: 'أيام العمل', Icon: CalendarDays, badge: pendingWD },
        ].map(({ id, label, Icon, badge }) => (
          <button key={id} onClick={() => setMainTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 12, border: `1px solid ${mainTab === id ? C.primary + '60' : C.border}`,
            background: mainTab === id ? `${C.primary}15` : 'transparent',
            color: mainTab === id ? C.primary : C.textDim,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Icon size={14} strokeWidth={2} />
            {label}
            {badge > 0 && (
              <span style={{ background: C.accent, color: '#fff', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 7, minWidth: 16, textAlign: 'center' }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.02em' }}>{t('workers.title')}</div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
            {employees.length}{!unlimitedWorkers && ` / ${workerLimit}`} {language === 'he' ? 'עובדים' : language === 'en' ? 'workers' : 'عامل'}
          </div>
        </div>
        {permissions?.addWorkers !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => atWorkerLimit ? setShowLimit(true) : setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 14, background: GRAD.premium, border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' }}>
            <Plus size={15} strokeWidth={2.5} />
            {language === 'he' ? 'חדש' : language === 'en' ? 'New' : 'جديد'}
          </motion.button>
        )}
      </div>

      {/* Summary */}
      {employees.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: language === 'he' ? 'עובדים' : language === 'en' ? 'Workers' : 'عمال', value: employees.length, color: C.secondary, icon: Users },
            { label: language === 'he' ? 'חייבים' : language === 'en' ? 'Owed' : 'مستحق', value: showAmounts ? `₪${fmt(totalOwed)}` : '•••', color: C.warning, icon: Wallet },
            { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: workDays.length, color: C.primary, icon: Calendar },
          ].map(({ label, value, color, icon }, i) => (
            <PremiumStat key={label} label={label} value={value} icon={icon} color={color} delay={i * 0.04} />
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color={C.textDim} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'he' ? 'חפש עובד...' : language === 'en' ? 'Search workers...' : 'ابحث عن عامل...'}
          style={{ width: '100%', padding: '10px 12px 10px 36px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
      </div>

      {/* Spec filter */}
      {allSpecs.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {allSpecs.map(s => (
            <button key={s} onClick={() => setSpecFilter(s)}
              style={{ padding: '5px 12px', borderRadius: 10, background: specFilter === s ? GRAD.premium : 'rgba(255,255,255,0.05)', border: `1px solid ${specFilter === s ? 'transparent' : C.border}`, color: specFilter === s ? '#fff' : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
              {s === 'all' ? (language === 'he' ? 'הכל' : language === 'en' ? 'All' : 'الكل') : s}
            </button>
          ))}
        </div>
      )}

      {/* لوحة شرف الأسطول — تظهر بلا بحث/فلترة */}
      {!search && specFilter === 'all' && (
        <FleetLeaderboard rows={leaderboard} onSelect={(id) => setSelected(employees.find(e => e.id === id))} lang={language} />
      )}

      {/* Worker list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <IconChip icon={Users} tone="premium" size={56} radius={18} iconSize={26} strokeWidth={1.5} style={{ margin: '0 auto 14px' }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('workers.empty')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((worker, i) => (
            <WorkerCard key={worker.id}
              worker={worker}
              stats={workerStats[worker.id] || {}}
              dna={dnaMap[worker.id]}
              anomaly={anomalyMap[worker.id]}
              lang={language}
              qr={portalQr}
              portalUrl={PORTAL_URL}
              portalEnabled={portalEnabled}
              showAmounts={showAmounts}
              onOpen={setSelected}
              delay={Math.min(i * 0.04, 0.3)}
            />
          ))}
        </div>
      )}

      <AddWorkerModal open={showAdd} onClose={() => setShowAdd(false)} onSave={addEmployee} specs={specs} language={language} />

      {/* نافذة تجاوز حدّ عمّال خطة Starter */}
      <AnimatePresence>
        {showLimit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowLimit(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', overflow: 'hidden', maxWidth: 380, width: '100%', background: `linear-gradient(135deg, ${C.secondary}14, ${C.surface} 70%)`, border: `1px solid ${C.secondary}33`, borderRadius: 22, padding: '28px 22px', textAlign: 'center' }}>
              <div style={{ position: 'absolute', insetInlineEnd: -40, top: -40, width: 160, height: 160, background: `radial-gradient(circle, ${C.secondary}45, transparent 70%)`, opacity: 0.35, pointerEvents: 'none' }} />
              <div style={{ width: 58, height: 58, borderRadius: 17, background: `${C.secondary}1c`, border: `1px solid ${C.secondary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={27} color={C.secondary} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>
                {isTrialLimit ? 'التجربة المجانية تسمح بعامل واحد' : 'وصلت حدّ خطة Starter'}
              </div>
              <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, marginBottom: 22 }}>
                {isTrialLimit
                  ? 'خلال التجربة المجانية يمكنك إضافة عامل واحد. اشترك بخطة مدفوعة لإضافة المزيد من العمّال.'
                  : `خطة Starter تسمح بحتى ${workerLimit} عمّال. رقِّ إلى خطة Pro لإضافة عمّال غير محدودين.`}
              </p>
              <button onClick={() => navigate('/pricing')}
                style={{ width: '100%', background: GRAD.premium, border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: '13px', borderRadius: 14, marginBottom: 10 }}>
                عرض الخطط والترقية
              </button>
              <button onClick={() => setShowLimit(false)}
                style={{ width: '100%', background: 'transparent', border: 'none', color: C.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px' }}>
                لاحقاً
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
