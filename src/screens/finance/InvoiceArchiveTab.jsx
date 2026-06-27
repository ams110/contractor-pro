import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, FolderOpen, FileText, Camera, Paperclip,
  Check, Trash2, Eye, Download, Search, ChevronDown,
  TrendingUp, TrendingDown, Link2, ImageOff,
} from 'lucide-react'
import { C, GRAD, EXP_CATS } from '../../constants/index.js'
import { HolographicSheen } from '../../ui/Premium.jsx'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { uploadReceipt, openSignedUrl } from '../../lib/storage.js'
import { SignedImg } from '../../hooks/useSignedUrl.jsx'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm.js'
import { tl, tEnum } from '../../lib/labels.js'

// ─── Manual archive document types ──────────────────────────────────────────────
// label/desc translated via archiveTypes(language) — canonical id stays stable
function archiveTypes(language) {
  return [
    { id: 'received',     label: tl(language, 'فاتورة واردة', 'חשבונית נכנסת', 'Incoming invoice'), desc: tl(language, 'من مورّد أو جهة خارجية', 'מספק או גורם חיצוני', 'From a supplier or external party'),     color: '#F59E0B' },
    { id: 'income_proof', label: tl(language, 'إثبات دفع', 'אישור תשלום', 'Payment proof'),    desc: tl(language, 'تحويل / إيصال وردك من عميل', 'העברה / קבלה שקיבלת מלקוח', 'Transfer / receipt you got from a client'), color: '#22C55E' },
  ]
}

// ─── Source / type meta (موحّد للمصادر الثلاثة) ─────────────────────────────────
// income  = قبضة من المدخولات   · expense = مصروف   · archive = مرفوع يدوياً
function itemMeta(it, language) {
  if (it.source === 'income')  return { label: tl(language, 'دخل', 'הכנסה', 'Income'),          color: C.success, Icon: TrendingUp   }
  if (it.source === 'expense') return { label: tl(language, 'مصروف', 'הוצאה', 'Expense'),        color: C.accent,  Icon: TrendingDown }
  if (it.archiveType === 'income_proof') return { label: tl(language, 'إثبات دفع', 'אישור תשלום', 'Payment proof'),   color: '#22C55E', Icon: FileText }
  return { label: tl(language, 'فاتورة واردة', 'חשבונית נכנסת', 'Incoming invoice'), color: C.primary, Icon: FileText }
}
function sourceLabel(src, language) {
  return src === 'income' ? tl(language, 'من المدخولات', 'מההכנסות', 'From income') : src === 'expense' ? tl(language, 'من المصاريف', 'מההוצאות', 'From expenses') : tl(language, 'أرشيف يدوي', 'ארכיון ידני', 'Manual archive')
}

function isPdf(url) {
  if (!url) return false
  return url.split('?')[0].toLowerCase().endsWith('.pdf')
}

function monthLabel(ym, language) {
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  const locale = language === 'he' ? 'he' : language === 'en' ? 'en' : 'ar'
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

// ─── Normalizers: كل مصدر → شكل موحّد (mirror — بدون نسخ) ────────────────────────
function normIncome(r) {
  return {
    uid: `inc-${r.id}`, source: 'income', id: r.id,
    date: r.date, amount: Number(r.amount) || 0, vat: 0,
    title: r.payer_name || null, category: null,
    note: r.notes || null, fileUrl: r.receipt_url || null,
    refNumber: r.ref_number || null, projectId: r.project_id || null,
  }
}
function normExpense(r) {
  return {
    uid: `exp-${r.id}`, source: 'expense', id: r.id,
    date: r.date, amount: Number(r.amount) || 0, vat: Number(r.vat_amount) || 0,
    title: r.vendor || null, category: r.category || null,
    note: r.notes || null, fileUrl: r.receipt_url || null,
    refNumber: r.ref_number || null, projectId: r.project_id || null,
  }
}
function normArchive(r) {
  return {
    uid: `arc-${r.id}`, source: 'archive', id: r.id, archiveType: r.type,
    date: r.date, amount: Number(r.amount) || 0, vat: Number(r.vat_amount) || 0,
    title: r.vendor_name || null, category: r.category || null,
    note: r.note || null, fileUrl: r.file_url || null,
    refNumber: null, projectId: r.project_id || null,
    sentToAccountant: !!r.sent_to_accountant,
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const inp = (focus, key) => ({
  width: '100%', padding: '11px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${focus === key ? C.primary : C.border}`,
  borderRadius: 12, color: C.text, fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .2s',
})

// ─── Unified document card ──────────────────────────────────────────────────────
function DocCard({ it, projectName, onToggleSent, onDelete, onPreview, language }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const meta = itemMeta(it, language)
  const { color } = meta
  const sent = it.source === 'archive' && it.sentToAccountant
  const hasFile = !!it.fileUrl

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        background: `linear-gradient(135deg, ${color}10, ${C.card} 62%)`,
        border: `1px solid ${sent ? '#22C55E44' : color + '2e'}`,
        borderRadius: 16, padding: '12px 14px', marginBottom: 9,
        position: 'relative', overflow: 'hidden',
        boxShadow: `0 8px 22px ${color}12`,
      }}
    >
      <HolographicSheen opacity={0.12} />
      {sent && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: '#22C55E', borderRadius: '0 16px 16px 0' }} />
      )}

      <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
        {/* Thumbnail / icon */}
        <div
          onClick={() => hasFile && onPreview(it)}
          style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0,
            background: hasFile ? 'transparent' : `${color}10`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: hasFile ? 'pointer' : 'default', overflow: 'hidden',
          }}
        >
          {hasFile && !isPdf(it.fileUrl) ? (
            <SignedImg src={it.fileUrl} alt="doc"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          ) : null}
          <div style={{ display: (hasFile && !isPdf(it.fileUrl)) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {!hasFile
              ? <ImageOff size={18} color={`${color}99`} />
              : isPdf(it.fileUrl)
                ? <><Paperclip size={16} color={color} /><span style={{ fontSize: 7, fontWeight: 800, color, letterSpacing: '0.05em' }}>PDF</span></>
                : <FileText size={20} color={color} />}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <meta.Icon size={10} /> {meta.label}
            </span>
            <div style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>{fmtDate(it.date)}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {it.title || sourceLabel(it.source, language)}
            </div>
            {it.amount > 0 && (
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, flexShrink: 0 }}>
                ₪{fmt(it.amount)}
                {it.vat > 0 && <span style={{ fontSize: 9, color: '#22C55E', marginRight: 4 }}>+ ₪{fmt(it.vat)}</span>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {it.refNumber && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.primary, background: `${C.primary}15`, padding: '1px 6px', borderRadius: 6, fontFamily: 'monospace' }}>{it.refNumber}</span>
            )}
            {projectName && (
              <span style={{ fontSize: 9, fontWeight: 700, color: C.primary, background: `${C.primary}12`, padding: '1px 6px', borderRadius: 6 }}>{projectName}</span>
            )}
            {it.category && (
              <span style={{ fontSize: 9, color: C.textDim, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 6 }}>{tEnum(it.category, language)}</span>
            )}
          </div>
          {it.note && <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic', marginTop: 3 }}>{it.note}</div>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
        {/* يسار: حالة الإرسال للمحاسب (أرشيف يدوي) أو شارة المصدر */}
        {it.source === 'archive' ? (
          <button
            onClick={() => onToggleSent(it.id, !sent)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
              background: sent ? '#22C55E18' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${sent ? '#22C55E44' : C.border}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s',
            }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: sent ? '#22C55E' : 'transparent', border: `1.5px solid ${sent ? '#22C55E' : C.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sent && <Check size={8} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: sent ? '#22C55E' : C.textDim }}>
              {sent ? tl(language, 'أُرسلت للمحاسب', 'נשלח לרואה חשבון', 'Sent to accountant') : tl(language, 'إرسال للمحاسب', 'שליחה לרואה חשבון', 'Send to accountant')}
            </span>
          </button>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: C.textDim }}>
            <Link2 size={10} /> {sourceLabel(it.source, language)}
          </span>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {it.fileUrl && (
            <button onClick={() => onPreview(it)}
              style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
              <Eye size={12} /> {tl(language, 'عرض', 'הצגה', 'View')}
            </button>
          )}
          {!it.fileUrl && (
            <span style={{ fontSize: 9, color: C.textDim, opacity: 0.7 }}>{tl(language, 'بلا مرفق', 'ללא קובץ מצורף', 'No attachment')}</span>
          )}

          {/* الحذف فقط للأرشيف اليدوي — المدخولات/المصاريف تُحذف من تبويبها */}
          {it.source === 'archive' && (
            !delConfirm ? (
              <button onClick={() => setDelConfirm(true)}
                style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setDelConfirm(false)}
                  style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}>{tl(language, 'لا', 'לא', 'No')}</button>
                <button onClick={() => onDelete(it.id)}
                  style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>{tl(language, 'احذف', 'מחיקה', 'Delete')}</button>
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ it, onClose, language }) {
  if (!it) return null
  const title = it.title || sourceLabel(it.source, language)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={e => e.stopPropagation()}
          style={{ position: 'relative', maxWidth: 480, width: '100%' }}
        >
          <button onClick={onClose}
            style={{ position: 'absolute', top: -40, left: 0, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
          {isPdf(it.fileUrl) ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <Paperclip size={48} color={C.primary} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(it.date)} {it.amount > 0 && `· ₪${fmt(it.amount)}`}</div>
            </div>
          ) : (
            <>
              <SignedImg src={it.fileUrl} alt="preview"
                style={{ width: '100%', borderRadius: 16, maxHeight: '75dvh', objectFit: 'contain' }}
                onError={e => e.target.src = ''} />
              <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '0 0 16px 16px', padding: '10px 14px', marginTop: -4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{title}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {fmtDate(it.date)} {it.amount > 0 && `· ₪${fmt(it.amount)}`}
                </div>
              </div>
            </>
          )}
          <a href={it.fileUrl} target="_blank" rel="noreferrer" onClick={e => { e.preventDefault(); openSignedUrl(it.fileUrl) }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: '10px', background: `${C.primary}20`, border: `1px solid ${C.primary}40`, borderRadius: 12, color: C.primary, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Download size={14} /> {isPdf(it.fileUrl) ? tl(language, 'فتح ملف PDF', 'פתיחת קובץ PDF', 'Open PDF file') : tl(language, 'تحميل الصورة', 'הורדת התמונה', 'Download image')}
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Add Sheet (أرشفة يدوية → invoice_archive) ──────────────────────────────────
function AddInvoiceSheet({ open, onClose, onSave, businessId, projects, userId, language }) {
  const [form, setForm] = useState({
    type: 'received', vendor_name: '', amount: '', vat_amount: '',
    date: todayStr(), category: '', note: '', project_id: '', sent_to_accountant: false,
  })
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [fileName, setFileName] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [focus,    setFocus]    = useState('')
  const photoRef = useRef()
  const fileRef  = useRef()
  const { confirm: bioConfirm, hasAnyMethod } = useBiometricConfirm()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function reset() {
    setForm({ type: 'received', vendor_name: '', amount: '', vat_amount: '', date: todayStr(), category: '', note: '', project_id: '', sent_to_accountant: false })
    setFile(null); setPreview(null); setFileName(null); setSaving(false)
    if (photoRef.current) photoRef.current.value = ''
    if (fileRef.current)  fileRef.current.value  = ''
  }
  function handleClose() { reset(); onClose() }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) { setPreview(URL.createObjectURL(f)); setFileName(null) }
    else { setPreview(null); setFileName(f.name) }
  }
  function clearFile() {
    setFile(null); setPreview(null); setFileName(null)
    if (photoRef.current) photoRef.current.value = ''
    if (fileRef.current)  fileRef.current.value  = ''
  }

  async function handleSave() {
    if (hasAnyMethod()) {
      const sig = await bioConfirm(tl(language, 'أرشفة فاتورة / وثيقة', 'ארכוב חשבונית / מסמך', 'Archive invoice / document'), 'invoice_archive')
      if (!sig) return
    }
    setSaving(true)
    try {
      let file_url = null
      if (file && userId) file_url = await uploadReceipt(userId, file)
      await onSave({
        business_id: businessId, user_id: userId, type: form.type,
        vendor_name: form.vendor_name.trim() || null,
        amount: Number(form.amount) || null, vat_amount: Number(form.vat_amount) || 0,
        date: form.date, category: form.category || null,
        project_id: form.project_id || null, note: form.note.trim() || null,
        file_url, sent_to_accountant: form.sent_to_accountant,
      })
      handleClose()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom,0px)))',
              left: 0, right: 0, maxWidth: 480, margin: '0 auto',
              background: C.surface, border: `1px solid ${C.borderMid}`,
              borderRadius: 24, maxHeight: 'calc(90dvh - 80px)', display: 'flex', flexDirection: 'column',
            }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{tl(language, 'أرشفة فاتورة / وثيقة', 'ארכוב חשבונית / מסמך', 'Archive invoice / document')}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{tl(language, 'للوثائق اللي مالها قيد بالمدخولات أو المصاريف', 'למסמכים שאין להם רישום בהכנסות או בהוצאות', 'For documents with no record in income or expenses')}</div>
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {/* نوع الوثيقة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{tl(language, 'نوع الوثيقة', 'סוג המסמך', 'Document type')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {archiveTypes(language).map(t => {
                    const active = form.type === t.id
                    return (
                      <button key={t.id} onClick={() => set('type', t.id)}
                        style={{ flex: 1, padding: '10px 8px', background: active ? `${t.color}18` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? t.color : C.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: active ? t.color : C.text, marginBottom: 3 }}>{t.label}</div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{t.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* رفع الملف */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>{tl(language, 'إرفاق إيصال / فاتورة', 'צירוף קבלה / חשבונית', 'Attach receipt / invoice')}</div>
                <input ref={photoRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
                <input ref={fileRef}  type="file" accept=".pdf,application/pdf" onChange={pickFile} style={{ display: 'none' }} />
                {preview && (
                  <div style={{ position: 'relative' }}>
                    <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}`, display: 'block' }} />
                    <button onClick={clearFile} style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} color="#fff" />
                    </button>
                  </div>
                )}
                {fileName && !preview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: `${C.primary}10`, border: `1px solid ${C.primary}25`, borderRadius: 12 }}>
                    <Paperclip size={20} color={C.primary} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                    <button onClick={clearFile} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                {!preview && !fileName && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => photoRef.current?.click()}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '18px 10px', background: 'rgba(255,255,255,0.03)', border: `2px dashed ${C.borderMid}`, borderRadius: 14, color: C.textDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Camera size={22} color={C.primary} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{tl(language, 'صورة', 'תמונה', 'Image')}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>JPG · PNG · HEIC</div>
                      </div>
                    </button>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '18px 10px', background: 'rgba(255,255,255,0.03)', border: `2px dashed ${C.borderMid}`, borderRadius: 14, color: C.textDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Paperclip size={22} color={C.secondary} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{tl(language, 'ملف PDF', 'קובץ PDF', 'PDF file')}</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>PDF</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* الجهة / المورّد */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                  {form.type === 'income_proof' ? tl(language, 'اسم العميل / الجهة', 'שם הלקוח / הגורם', 'Client / party name') : tl(language, 'اسم المورّد / الجهة', 'שם הספק / הגורם', 'Supplier / party name')}
                </div>
                <input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)}
                  placeholder={tl(language, 'مثال: مواد بناء X', 'לדוגמה: חומרי בניין X', 'e.g. Building materials X')}
                  onFocus={() => setFocus('vendor')} onBlur={() => setFocus('')}
                  style={inp(focus, 'vendor')} />
              </div>

              {/* المبلغ + מע"מ */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'المبلغ (₪)', 'סכום (₪)', 'Amount (₪)')}</div>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={form.amount} onChange={e => set('amount', e.target.value)}
                    onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'amount'), direction: 'ltr', textAlign: 'left' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'ضريبة القيمة المضافة (₪)', 'מע"מ (₪)', 'VAT (₪)')}</div>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={form.vat_amount} onChange={e => set('vat_amount', e.target.value)}
                    onFocus={() => setFocus('vat')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'vat'), direction: 'ltr', textAlign: 'left', color: '#22C55E' }} />
                </div>
              </div>

              {/* التاريخ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'تاريخ الفاتورة', 'תאריך החשבונית', 'Invoice date')}</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  style={{ ...inp(focus, 'date'), direction: 'ltr' }} />
              </div>

              {/* الفئة */}
              {form.type === 'received' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'الفئة (اختياري)', 'קטגוריה (אופציונלי)', 'Category (optional)')}</div>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    style={{ ...inp(focus, 'cat'), cursor: 'pointer' }}>
                    <option value="">{tl(language, '— اختر فئة —', '— בחר קטגוריה —', '— Select category —')}</option>
                    {EXP_CATS.map(c => <option key={c} value={c}>{tEnum(c, language)}</option>)}
                  </select>
                </div>
              )}

              {/* المشروع */}
              {projects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'ربط بمشروع (اختياري)', 'קישור לפרויקט (אופציונלי)', 'Link to project (optional)')}</div>
                  <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">{tl(language, '— بدون مشروع —', '— ללא פרויקט —', '— No project —')}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* ملاحظة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{tl(language, 'ملاحظة (اختياري)', 'הערה (אופציונלי)', 'Note (optional)')}</div>
                <input value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder={tl(language, 'أي تفاصيل...', 'פרטים נוספים...', 'Any details...')}
                  onFocus={() => setFocus('note')} onBlur={() => setFocus('')}
                  style={inp(focus, 'note')} />
              </div>

              {/* أُرسلت للمحاسب */}
              <button onClick={() => set('sent_to_accountant', !form.sent_to_accountant)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: form.sent_to_accountant ? '#22C55E12' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${form.sent_to_accountant ? '#22C55E44' : C.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, transition: 'all .2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: form.sent_to_accountant ? '#22C55E' : 'transparent', border: `2px solid ${form.sent_to_accountant ? '#22C55E' : C.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                  {form.sent_to_accountant && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: form.sent_to_accountant ? '#22C55E' : C.textDim }}>{tl(language, 'تم إرسالها للمحاسب', 'נשלחה לרואה חשבון', 'Sent to accountant')}</span>
              </button>
            </div>

            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '13px', background: saving ? 'rgba(255,255,255,0.06)' : GRAD.warm, border: 'none', borderRadius: 14, color: saving ? C.textDim : '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? tl(language, 'جاري الحفظ...', 'שומר...', 'Saving...') : tl(language, '+ أرشفة الفاتورة', '+ ארכוב החשבונית', '+ Archive invoice')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Year section (collapsible) ─────────────────────────────────────────────────
function YearSection({ year, items, open, onToggle, projectMap, onToggleSent, onDelete, onPreview, language }) {
  const fileCount = items.filter(i => i.fileUrl).length
  const incSum = items.filter(i => i.source === 'income').reduce((s, i) => s + i.amount, 0)
  const expSum = items.filter(i => i.source === 'expense').reduce((s, i) => s + i.amount, 0)

  // فواصل شهرية داخل السنة
  const rows = []
  let curMonth = null
  items.forEach(it => {
    const ym = it.date ? it.date.slice(0, 7) : '—'
    if (ym !== curMonth) {
      curMonth = ym
      rows.push({ divider: true, key: `m-${ym}`, label: ym === '—' ? tl(language, 'بدون تاريخ', 'ללא תאריך', 'No date') : monthLabel(ym, language) })
    }
    rows.push({ key: it.uid, it })
  })

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: open ? 10 : 0 }}>
        <ChevronDown size={16} color={C.primary} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s', flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 900, color: C.text, fontFamily: 'monospace' }}>{year === 'بدون تاريخ' ? tl(language, 'بدون تاريخ', 'ללא תאריך', 'No date') : year}</span>
        <span style={{ fontSize: 10, color: C.textDim }}>{items.length} {tl(language, 'سجل', 'רשומות', 'records')} · {fileCount} {tl(language, 'مرفق', 'קבצים', 'files')}</span>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8 }}>
          {incSum > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.success }}>+₪{fmt(incSum)}</span>}
          {expSum > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>−₪{fmt(expSum)}</span>}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            {rows.map(r => r.divider ? (
              <div key={r.key} style={{ fontSize: 10, fontWeight: 700, color: C.textDim, margin: '6px 2px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{r.label}</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            ) : (
              <DocCard key={r.key} it={r.it} projectName={projectMap[r.it.projectId]}
                onToggleSent={onToggleSent} onDelete={onDelete} onPreview={onPreview} language={language} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function InvoiceArchiveTab({ projects = [], userId }) {
  const language = useAppStore(s => s.language)
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()
  const { confirm: bioConfirm } = useBiometricConfirm()

  const [income,  setIncome]  = useState([])
  const [expense, setExpense] = useState([])
  const [archive, setArchive] = useState([])
  const [loading, setLoading] = useState(true)

  const [addOpen,    setAddOpen]    = useState(false)
  const [previewIt,  setPreviewIt]  = useState(null)
  const [filterType, setFilterType] = useState('')   // '' | income | expense | archive
  const [onlyFiles,  setOnlyFiles]  = useState(false)
  const [search,     setSearch]     = useState('')
  const [openYears,  setOpenYears]  = useState({})

  const bizId = activeBusiness?.id

  const projectMap = useMemo(() => {
    const m = {}
    projects.forEach(p => { m[p.id] = p.name })
    return m
  }, [projects])

  // ─── Load (المصادر الثلاثة بالتوازي) ─────────────────────────────────────
  async function load() {
    if (!bizId) { setLoading(false); return }
    setLoading(true)
    try {
      const [inc, exp, arc] = await Promise.all([
        userId
          ? supabase.from('client_receipts').select('*').eq('user_id', userId).eq('business_id', bizId)
          : Promise.resolve({ data: [] }),
        userId
          ? supabase.from('expenses').select('*').eq('user_id', userId).eq('business_id', bizId)
          : Promise.resolve({ data: [] }),
        supabase.from('invoice_archive').select('*').eq('business_id', bizId),
      ])
      setIncome((inc.data ?? []).map(normIncome))
      setExpense((exp.data ?? []).map(normExpense))
      setArchive((arc.data ?? []).map(normArchive))
    } catch (e) { console.error('InvoiceArchive load error:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bizId, userId]) // eslint-disable-line

  // ─── Unified list ────────────────────────────────────────────────────────
  const all = useMemo(() => [...income, ...expense, ...archive], [income, expense, archive])

  const withFile = useMemo(() => all.filter(i => i.fileUrl).length, [all])

  // ─── Filtered ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = all
    if (filterType) res = res.filter(i => i.source === filterType)
    if (onlyFiles)  res = res.filter(i => i.fileUrl)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      res = res.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.note?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.refNumber?.toLowerCase().includes(q)
      )
    }
    return res
  }, [all, filterType, onlyFiles, search])

  // ─── Group by year (تنازلي) ──────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(it => {
      const y = it.date ? it.date.slice(0, 4) : 'بدون تاريخ'
      ;(map[y] ||= []).push(it)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => (b.date || '').localeCompare(a.date || '')))
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  function isYearOpen(year, idx) {
    if (year in openYears) return openYears[year]
    return idx === 0  // أحدث سنة مفتوحة تلقائياً
  }
  function toggleYear(year, idx) {
    setOpenYears(p => ({ ...p, [year]: !(year in p ? p[year] : idx === 0) }))
  }

  // ─── Actions (الأرشيف اليدوي فقط) ─────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase.from('invoice_archive').insert(fields).select().single()
    if (error) throw error
    setArchive(prev => [normArchive(data), ...prev])
    showToast(tl(language, 'تم أرشفة الفاتورة', 'החשבונית אורכבה', 'Invoice archived'))
  }
  async function handleToggleSent(id, val) {
    await supabase.from('invoice_archive').update({ sent_to_accountant: val }).eq('id', id)
    setArchive(prev => prev.map(e => e.id === id ? { ...e, sentToAccountant: val } : e))
    if (val) showToast(tl(language, 'تم تعليمها مرسلة للمحاسب', 'סומנה כנשלחה לרואה חשבון', 'Marked as sent to accountant'))
  }
  async function handleDelete(id) {
    const entry = archive.find(e => e.id === id)
    const sig = await bioConfirm(`${tl(language, 'حذف فاتورة', 'מחיקת חשבונית', 'Delete invoice')}: ${entry?.vendor_name || entry?.type || tl(language, 'فاتورة', 'חשבונית', 'Invoice')}`, 'invoice_archive')
    if (!sig) return
    await supabase.from('invoice_archive').delete().eq('id', id)
    setArchive(prev => prev.filter(e => e.id !== id))
    showToast(tl(language, 'تم الحذف', 'נמחק', 'Deleted'))
  }

  const TYPE_CHIPS = [
    { id: '',        label: tl(language, 'الكل', 'הכול', 'All'),     color: C.primary },
    { id: 'income',  label: tl(language, 'دخل', 'הכנסה', 'Income'),      color: C.success },
    { id: 'expense', label: tl(language, 'مصروف', 'הוצאה', 'Expense'),    color: C.accent  },
    { id: 'archive', label: tl(language, 'مستندات', 'מסמכים', 'Documents'),  color: C.primary },
  ]

  if (!activeBusiness) return null

  return (
    <div>
      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: `${C.primary}0F`, border: `1px solid ${C.primary}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>{all.length}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'إجمالي السجلات', 'סך הרשומות', 'Total records')}</div>
        </div>
        <div style={{ flex: 1, background: '#22C55E0F', border: '1px solid #22C55E22', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E' }}>{withFile}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'مع مرفق', 'עם קובץ מצורף', 'With attachment')}</div>
        </div>
        {all.length - withFile > 0 && (
          <div style={{ flex: 1, background: `${C.accent}0F`, border: `1px solid ${C.accent}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{all.length - withFile}</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>{tl(language, 'بدون مرفق', 'ללא קובץ מצורף', 'No attachment')}</div>
          </div>
        )}
      </div>

      {/* ─── Search ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tl(language, 'بحث بالاسم / الفئة / الرقم المرجعي...', 'חיפוש לפי שם / קטגוריה / מספר אסמכתא...', 'Search by name / category / reference no...')}
          style={{ width: '100%', padding: '10px 36px 10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {TYPE_CHIPS.map(c => {
          const active = filterType === c.id
          return (
            <button key={c.id || 'all'} onClick={() => setFilterType(c.id)}
              style={{ padding: '5px 12px', borderRadius: 20, background: active ? `${c.color}18` : 'transparent', border: `1px solid ${active ? c.color + '50' : C.border}`, color: active ? c.color : C.textDim, fontSize: 11, fontWeight: active ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {c.label}
            </button>
          )
        })}
        <button onClick={() => setOnlyFiles(v => !v)}
          style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: onlyFiles ? `${C.primary}18` : 'transparent', border: `1px solid ${onlyFiles ? C.primary + '50' : C.border}`, color: onlyFiles ? C.primary : C.textDim, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Paperclip size={11} /> {tl(language, 'مع مرفق فقط', 'עם קובץ מצורף בלבד', 'With attachment only')}
        </button>
      </div>

      {/* ─── List (مجمّعة بالسنة) ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>{tl(language, 'تحميل...', 'טוען...', 'Loading...')}</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FolderOpen size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {search || filterType || onlyFiles
              ? tl(language, 'لا توجد سجلات لهذا الفلتر', 'אין רשומות לסינון זה', 'No records for this filter')
              : tl(language, 'لا توجد سجلات — سجّل مدخولات/مصاريف أو ارفع فاتورة', 'אין רשומות — רשום הכנסות/הוצאות או העלה חשבונית', 'No records — log income/expenses or upload an invoice')}
          </div>
        </div>
      ) : (
        grouped.map(([year, items], idx) => (
          <YearSection
            key={year}
            year={year}
            items={items}
            open={isYearOpen(year, idx)}
            onToggle={() => toggleYear(year, idx)}
            projectMap={projectMap}
            onToggleSent={handleToggleSent}
            onDelete={handleDelete}
            onPreview={setPreviewIt}
            language={language}
          />
        ))
      )}

      {/* ─── FAB ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom, 0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setAddOpen(true)}
          style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', background: GRAD.warm, border: 'none', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${C.primary}44` }}>
          <Plus size={16} strokeWidth={2.5} />
          {tl(language, 'أرشفة فاتورة', 'ארכוב חשבונית', 'Archive invoice')}
        </motion.button>
      </div>

      <AddInvoiceSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} businessId={bizId} projects={projects} userId={userId} language={language} />
      <PreviewModal it={previewIt} onClose={() => setPreviewIt(null)} language={language} />
    </div>
  )
}
