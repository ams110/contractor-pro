import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Users, ArrowLeft, Calendar, Banknote,
  TrendingUp, Phone, Star, BarChart3, CreditCard,
  Check, AlertTriangle, Trash2, ChevronRight, CalendarDays,
  Link2, Copy, CheckCheck,
} from 'lucide-react'
import { C, GRAD, SPECS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { useAppStore } from '../../store/useAppStore.js'
import { calcMustahaq, calcPaid, calcAdvances, calcMutabqi, calcEarned } from '../../lib/calculations.js'
import WorkDaysScreen from '../WorkDaysScreen.jsx'

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

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
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
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, marginBottom: 10 }}>
                ⚠ {error}
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

function WorkerDetail({ worker, workDays, payments, advances, projects, expenses, onClose, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, addPayment, deletePayment, addAdvance, deleteAdvance, payMethods, permissions, language, appCfg }) {
  const [tab, setTab] = useState('overview')
  const [advRequests, setAdvRequests] = useState([])
  const [advProject, setAdvProject] = useState({})   // req.id → project_id (اختياري)

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

  const TABS = [
    { id: 'overview', icon: BarChart3, label: language === 'he' ? 'סיכום' : language === 'en' ? 'Overview' : 'ملخص' },
    { id: 'workdays', icon: Calendar,  label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام' },
    { id: 'payments', icon: Banknote,  label: language === 'he' ? 'שכר' : language === 'en' ? 'Salary' : 'رواتب' },
    { id: 'advances', icon: CreditCard, label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'سلف' },
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
          <div style={{ fontSize: 14, fontWeight: 900, color: balance >= 0 ? C.warning : C.success }}>₪{fmt(Math.abs(balance))}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => <TabBtn key={t.id} active={tab === t.id} label={t.label} icon={t.icon} onClick={() => setTab(t.id)} />)}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: language === 'he' ? 'סה"כ הרוויח' : language === 'en' ? 'Total Earned' : 'إجمالي المستحق', value: `₪${fmt(totalEarned)}`, color: C.success },
                { label: language === 'he' ? 'שולם' : language === 'en' ? 'Paid' : 'المدفوع', value: `₪${fmt(totalPaid)}`, color: C.secondary },
                { label: language === 'he' ? 'מקדמות' : language === 'en' ? 'Advances' : 'السلف', value: `₪${fmt(totalAdvances)}`, color: C.accent },
                { label: language === 'he' ? 'ימי עבודה' : language === 'en' ? 'Work Days' : 'أيام العمل', value: wWorkers.length, color: C.primary },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {worker.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10 }}>
                <Phone size={15} color={C.cyan} strokeWidth={2} />
                <span style={{ fontSize: 13, color: C.text, direction: 'ltr' }}>{worker.phone}</span>
              </div>
            )}

            {/* Portal link */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Link2 size={10} strokeWidth={2} /> بورتال العامل
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, color: C.textDim, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{PORTAL_URL}</span>
                <button onClick={copyPortalLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: copied ? `${C.success}22` : `${C.primary}18`, border: `1.5px solid ${copied ? C.success+'55' : C.primary+'44'}`, color: copied ? C.success : C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .2s' }}>
                  {copied ? <CheckCheck size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'workdays' && (
          <div>
            {wWorkers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין ימי עבודה' : language === 'en' ? 'No work days' : 'لا توجد أيام عمل'}
              </div>
            ) : wWorkers.slice().reverse().map(wd => {
              const project = projects?.find(p => p.id === wd.project_id)
              return (
                <div key={wd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.secondary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={13} color={C.secondary} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDate(wd.date)}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>{project?.name || ''} · {wd.day_type}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.secondary }}>₪{fmt(wd.daily_rate || 0)}</div>
                    {wd.status === 'pending' && <div style={{ fontSize: 9, color: C.warning, marginTop: 1 }}>{language === 'he' ? 'ממתין' : language === 'en' ? 'Pending' : 'معلق'}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            {wPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                {language === 'he' ? 'אין תשלומים' : language === 'en' ? 'No payments' : 'لا توجد رواتب'}
              </div>
            ) : wPayments.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(pay => (
              <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.success}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Banknote size={13} color={C.success} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{pay.method || ''}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(pay.date)}</div>
                  {pay.ref_number && <div style={{ fontSize: 9, fontWeight: 700, color: C.primary, marginTop: 2, letterSpacing: '0.04em' }}>{pay.ref_number}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.success }}>₪{fmt(pay.amount || 0)}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'advances' && (
          <div>
            {/* Pending advance requests */}
            {advRequests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.warning, letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.warning }} />
                  طلبات سلف معلّقة ({advRequests.length})
                </div>
                {advRequests.map(req => (
                  <div key={req.id} style={{ background: `${C.warning}0A`, border: `1px solid ${C.warning}30`, borderRadius: 14, marginBottom: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>₪{fmt(req.amount || 0)}</div>
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
            ) : wAdvances.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(adv => (
              <div key={adv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={13} color={C.accent} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{adv.notes || (language === 'en' ? 'Advance' : language === 'he' ? 'מקדמה' : 'سلفة')}</div>
                  <div style={{ fontSize: 10, color: C.textDim }}>{fmtDate(adv.date)}</div>
                  {adv.ref_number && <div style={{ fontSize: 9, fontWeight: 700, color: C.primary, marginTop: 2, letterSpacing: '0.04em' }}>{adv.ref_number}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>-₪{fmt(adv.amount || 0)}</div>
              </div>
            ))}
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

  const [mainTab, setMainTab] = useState('workers')
  const [search, setSearch] = useState('')
  const [specFilter, setSpecFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

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

  if (selected) {
    return (
      <WorkerDetail
        worker={selected}
        workDays={workDays} payments={payments} advances={advances} projects={projects} expenses={expenses}
        onClose={() => setSelected(null)}
        addWorkDay={addWorkDay} deleteWorkDay={deleteWorkDay}
        approveWorkDay={approveWorkDay} rejectWorkDay={rejectWorkDay}
        addPayment={addPayment} deletePayment={deletePayment}
        addAdvance={addAdvance} deleteAdvance={deleteAdvance}
        payMethods={payMethods} permissions={permissions} language={language}
        appCfg={appCfg}
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
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{employees.length} {language === 'he' ? 'עובדים' : language === 'en' ? 'workers' : 'عامل'}</div>
        </div>
        {permissions?.addWorkers !== false && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(true)}
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
            { label: language === 'he' ? 'עובדים' : language === 'en' ? 'Workers' : 'عمال', value: employees.length, color: C.secondary },
            { label: language === 'he' ? 'חייבים' : language === 'en' ? 'Owed' : 'مستحق', value: `₪${fmt(totalOwed)}`, color: C.warning, small: true },
            { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: workDays.length, color: C.primary },
          ].map(({ label, value, color, small }) => (
            <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: small ? 12 : 18, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
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

      {/* Worker list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.secondary}18`, border: `1px solid ${C.secondary}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Users size={26} color={C.secondary} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('workers.empty')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((worker, i) => {
            const ws = workerStats[worker.id] || {}
            return (
              <motion.div key={worker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(worker)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: '14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: ws.balance > 0 ? 10 : 0 }}>
                  <Avatar name={worker.name} size={44} color={C.secondary} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{worker.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{worker.specialty || ''} {worker.phone ? `· ${worker.phone}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>
                      {language === 'he' ? 'מאזן' : language === 'en' ? 'Balance' : 'الرصيد'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: ws.balance > 0 ? C.warning : C.success }}>
                      ₪{fmt(Math.abs(ws.balance || 0))}
                    </div>
                  </div>
                </div>

                {(ws.days > 0 || ws.balance > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {[
                      { label: language === 'he' ? 'הרוויח' : language === 'en' ? 'Earned' : 'المستحق', value: `₪${fmt(ws.earned || 0)}`, color: C.success },
                      { label: language === 'he' ? 'שולם' : language === 'en' ? 'Paid' : 'المدفوع', value: `₪${fmt(ws.paid || 0)}`, color: C.secondary },
                      { label: language === 'he' ? 'ימים' : language === 'en' ? 'Days' : 'أيام', value: ws.days || 0, color: C.primary },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: C.card, borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 1 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {ws.pending > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8 }}>
                    <AlertTriangle size={11} color={C.warning} strokeWidth={2} />
                    <span style={{ fontSize: 10, color: C.warning, fontWeight: 700 }}>{ws.pending} {language === 'he' ? 'ממתינים' : language === 'en' ? 'pending' : 'بانتظار الموافقة'}</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <AddWorkerModal open={showAdd} onClose={() => setShowAdd(false)} onSave={addEmployee} specs={specs} language={language} />
    </div>
  )
}
