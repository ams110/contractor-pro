import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, Trash2, AlertTriangle, ReceiptText, CreditCard, Calendar, X, Flame } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { supabase } from '../../lib/supabase.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'

const L = {
  ar: {
    title:          'ماذا تريد أن تفعل بهذا المشروع؟',
    loading:        'جاري التحقق من البيانات...',
    receipts:       'قبضة مدخول',
    expenses:       'مصروف',
    workdays:       'يوم عمل',
    warn_data:      'هذا المشروع يحتوي على بيانات مرتبطة',
    warn_clean:     'هذا المشروع ليس فيه بيانات مرتبطة',
    archive_title:  'أرشفة المشروع',
    archive_desc:   'المشروع سيُخفى من القوائم وتبقى بياناته محفوظة بالكامل — يمكن استعادته لاحقاً',
    delete_title:   'حذف المشروع فقط',
    delete_desc:    'يُحذف المشروع وتبقى القبضات والمصاريف (بدون ربط مشروع)',
    delete_all_title:'حذف المشروع مع كل بياناته',
    delete_all_desc: 'يُحذف المشروع + كل قبضاته + كل مصاريفه + كل أيام العمل — لا رجعة',
    cancel:         'إلغاء',
    signing:        'في انتظار التوقيع...',
    working:        'جاري التنفيذ...',
  },
  he: {
    title:          'מה תרצה לעשות עם הפרויקט הזה?',
    loading:        'בודק נתונים...',
    receipts:       'קבלה',
    expenses:       'הוצאה',
    workdays:       'יום עבודה',
    warn_data:      'לפרויקט זה יש נתונים מקושרים',
    warn_clean:     'לפרויקט זה אין נתונים מקושרים',
    archive_title:  'ארכיון פרויקט',
    archive_desc:   'הפרויקט יוסתר מהרשימות, הנתונים ישמרו — ניתן לשחזר מאוחר יותר',
    delete_title:   'מחק פרויקט בלבד',
    delete_desc:    'הפרויקט יימחק, הקבלות וההוצאות יישארו (ללא קישור לפרויקט)',
    delete_all_title:'מחק פרויקט + כל הנתונים',
    delete_all_desc: 'הפרויקט + קבלות + הוצאות + ימי עבודה — מחיקה בלתי הפיכה',
    cancel:         'ביטול',
    signing:        'ממתין לחתימה...',
    working:        'מבצע...',
  },
  en: {
    title:          'What would you like to do with this project?',
    loading:        'Checking linked data...',
    receipts:       'receipt',
    expenses:       'expense',
    workdays:       'work day',
    warn_data:      'This project has linked records',
    warn_clean:     'This project has no linked records',
    archive_title:  'Archive Project',
    archive_desc:   'Project is hidden from lists but all data is preserved — can be restored later',
    delete_title:   'Delete Project Only',
    delete_desc:    'Project is deleted; receipts & expenses remain (without a project link)',
    delete_all_title:'Delete Project + All Data',
    delete_all_desc: 'Project + all receipts + all expenses + all work days — irreversible',
    cancel:         'Cancel',
    signing:        'Waiting for signature...',
    working:        'Working...',
  },
}

export default function DeleteProjectModal({ project, userId, onArchive, onDelete, onDeleteAll, onClose, language = 'ar' }) {
  const t = L[language] ?? L.ar
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [counts, setCounts] = useState(null)   // { receipts, expenses, workdays }
  const [busy,   setBusy]   = useState(false)
  const [phase,  setPhase]  = useState('loading') // loading | choice | signing | working

  /* ── جلب الأرقام ── */
  useEffect(() => {
    if (!project?.id || !userId) return
    ;(async () => {
      const [r, e, w] = await Promise.all([
        supabase.from('client_receipts').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('user_id', userId),
        supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('user_id', userId),
        supabase.from('work_days').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('user_id', userId),
      ])
      setCounts({ receipts: r.count ?? 0, expenses: e.count ?? 0, workdays: w.count ?? 0 })
      setPhase('choice')
    })()
  }, [project?.id, userId])

  const total   = counts ? (counts.receipts + counts.expenses + counts.workdays) : 0
  const hasData = total > 0

  async function doArchive() {
    setPhase('signing')
    const sig = await bioConfirm(`أرشفة المشروع: ${project.name}`, 'projects')
    if (!sig) { setPhase('choice'); return }
    setPhase('working'); setBusy(true)
    try { await onArchive(project.id) } finally { setBusy(false) }
  }

  async function doDelete() {
    setPhase('signing')
    const sig = await bioConfirm(`حذف المشروع: ${project.name}`, 'projects')
    if (!sig) { setPhase('choice'); return }
    setPhase('working'); setBusy(true)
    try { await onDelete(project.id) } finally { setBusy(false) }
  }

  async function doDeleteAll() {
    setPhase('signing')
    const sig = await bioConfirm(`حذف المشروع مع كل بياناته: ${project.name} (${total} سجل)`, 'projects')
    if (!sig) { setPhase('choice'); return }
    setPhase('working'); setBusy(true)
    try { await onDeleteAll(project.id) } finally { setBusy(false) }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        onClick={e => { if (e.target === e.currentTarget && phase === 'choice') onClose() }}
      >
        <motion.div
          initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          style={{ width: '100%', maxWidth: 480, background: C.surface,
            borderRadius: '24px 24px 0 0', padding: '8px 0 40px',
            border: `1px solid ${C.border}`, borderBottom: 'none' }}
        >
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '8px auto 20px' }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{t.title}</span>
            {phase === 'choice' && (
              <button onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={C.textDim} />
              </button>
            )}
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* Loading */}
            {phase === 'loading' && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.textDim, fontSize: 13 }}>
                <div style={{ width: 24, height: 24, border: `2.5px solid ${C.border}`, borderTopColor: C.primary,
                  borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
                {t.loading}
              </div>
            )}

            {/* Signing / Working */}
            {(phase === 'signing' || phase === 'working') && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.textDim, fontSize: 13 }}>
                <div style={{ width: 24, height: 24, border: `2.5px solid ${C.border}`, borderTopColor: C.primary,
                  borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
                {phase === 'signing' ? t.signing : t.working}
              </div>
            )}

            {/* Choice */}
            {phase === 'choice' && counts && (
              <>
                {/* ملخص البيانات المرتبطة */}
                <div style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 16,
                  background: hasData ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.07)',
                  border: `1px solid ${hasData ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasData ? 10 : 0 }}>
                    <AlertTriangle size={14} color={hasData ? C.warning : C.success} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: hasData ? C.warning : C.success }}>
                      {hasData ? t.warn_data : t.warn_clean}
                    </span>
                  </div>
                  {hasData && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {counts.receipts > 0 && <Chip icon={ReceiptText} count={counts.receipts} label={t.receipts} color='#22C55E' />}
                      {counts.expenses > 0 && <Chip icon={CreditCard}  count={counts.expenses} label={t.expenses} color='#EF4444' />}
                      {counts.workdays > 0 && <Chip icon={Calendar}    count={counts.workdays} label={t.workdays} color={C.primary} />}
                    </div>
                  )}
                </div>

                {/* خيار 1: أرشفة ← موصى به دائماً */}
                <ActionCard
                  icon={Archive} iconColor={C.primary} iconBg={`${C.primary}18`}
                  title={t.archive_title} desc={t.archive_desc}
                  recommended onClick={doArchive} disabled={busy}
                />

                {/* خيار 2: حذف المشروع فقط */}
                <ActionCard
                  icon={Trash2} iconColor='#EF4444' iconBg='rgba(239,68,68,0.12)'
                  title={t.delete_title} desc={t.delete_desc}
                  danger onClick={doDelete} disabled={busy}
                />

                {/* خيار 3: حذف المشروع مع كل بياناته ← يظهر فقط إذا في بيانات */}
                {hasData && (
                  <ActionCard
                    icon={Flame} iconColor='#FF4500' iconBg='rgba(255,69,0,0.1)'
                    title={t.delete_all_title} desc={t.delete_all_desc}
                    nuclear onClick={doDeleteAll} disabled={busy}
                  />
                )}

                {/* إلغاء */}
                <button onClick={onClose}
                  style={{ width: '100%', padding: '13px', borderRadius: 14, marginTop: 6,
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                    color: C.textDim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t.cancel}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Chip ── */
function Chip({ icon: Icon, count, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 20, background: `${color}18`, border: `1px solid ${color}30` }}>
      <Icon size={11} color={color} strokeWidth={2} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{count} {label}</span>
    </div>
  )
}

/* ── ActionCard ── */
function ActionCard({ icon: Icon, iconColor, iconBg, title, desc, recommended, danger, nuclear, onClick, disabled }) {
  const borderColor = recommended ? C.primary + '40' : nuclear ? 'rgba(255,69,0,0.4)' : danger ? 'rgba(239,68,68,0.3)' : C.border
  const bg          = recommended ? `${C.primary}10`  : nuclear ? 'rgba(255,69,0,0.07)'  : danger ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.04)'
  const titleColor  = nuclear ? '#FF4500' : danger ? '#EF4444' : C.text

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', textAlign: 'right', padding: '14px 14px', marginBottom: 10,
        borderRadius: 16, cursor: disabled ? 'not-allowed' : 'pointer',
        background: bg, border: `1.5px solid ${borderColor}`,
        fontFamily: 'inherit', transition: 'all .15s', opacity: disabled ? 0.6 : 1,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 13, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={19} color={iconColor} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: titleColor, marginBottom: 3 }}>
          {title}
          {recommended && (
            <span style={{ fontSize: 9, fontWeight: 700, color: C.primary,
              background: `${C.primary}20`, padding: '2px 6px', borderRadius: 6, marginRight: 8 }}>
              ✦ موصى به
            </span>
          )}
          {nuclear && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FF4500',
              background: 'rgba(255,69,0,0.15)', padding: '2px 6px', borderRadius: 6, marginRight: 8 }}>
              ⚠ لا رجعة
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </motion.button>
  )
}
