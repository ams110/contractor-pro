import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, FolderOpen, FileText, Image as ImageIcon, Camera, Paperclip,
  Check, Send, Trash2, Calendar, Filter,
  ChevronDown, Eye, Download, Search,
} from 'lucide-react'
import { C, GRAD, EXP_CATS } from '../../constants/index.js'
import { fmt, fmtDate, todayStr } from '../../lib/helpers.js'
import { supabase } from '../../lib/supabase.js'
import { uploadReceipt } from '../../lib/storage.js'
import { useBusinessStore } from '../../store/useBusinessStore.js'
import { useAppStore } from '../../store/useAppStore.js'

// ─── Types ────────────────────────────────────────────────────────────────────
const TYPES = [
  { id: 'received',     label: 'فاتورة واردة',      desc: 'من مورّد أو جهة خارجية', color: '#F59E0B' },
  { id: 'income_proof', label: 'إثبات دفع',         desc: 'تحويل / إيصال وردك من عميل', color: '#22C55E' },
]

function typeColor(t) { return TYPES.find(x => x.id === t)?.color ?? C.textDim }
function typeLabel(t) { return TYPES.find(x => x.id === t)?.label ?? t }

function isPdf(url) {
  if (!url) return false
  return url.split('?')[0].toLowerCase().endsWith('.pdf')
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

// ─── Invoice Card ─────────────────────────────────────────────────────────────
function InvoiceCard({ inv, onToggleSent, onDelete, onPreview }) {
  const [delConfirm, setDelConfirm] = useState(false)
  const color = typeColor(inv.type)
  const sent  = inv.sent_to_accountant

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        background: C.surface,
        border: `1px solid ${sent ? '#22C55E22' : C.border}`,
        borderRadius: 16,
        padding: '12px 14px',
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Sent indicator strip */}
      {sent && (
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: '#22C55E', borderRadius: '0 16px 16px 0' }} />
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {/* Thumbnail / icon */}
        <div
          onClick={() => inv.file_url && onPreview(inv)}
          style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0,
            background: inv.file_url ? 'transparent' : `${color}15`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inv.file_url ? 'pointer' : 'default',
            overflow: 'hidden',
          }}
        >
          {inv.file_url && !isPdf(inv.file_url) ? (
            <img
              src={inv.file_url} alt="invoice"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div style={{ display: (inv.file_url && !isPdf(inv.file_url)) ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {isPdf(inv.file_url) ? <Paperclip size={18} color={color} /> : <FileText size={20} color={color} />}
            {isPdf(inv.file_url) && <span style={{ fontSize: 7, fontWeight: 800, color, letterSpacing: '0.05em' }}>PDF</span>}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 7px', borderRadius: 20, display: 'inline-block' }}>
                {typeLabel(inv.type)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>{fmtDate(inv.date)}</div>
          </div>

          {/* Vendor + amount */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {inv.vendor_name || '—'}
            </div>
            {inv.amount > 0 && (
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, flexShrink: 0, marginRight: 8 }}>
                ₪{fmt(inv.amount)}
                {inv.vat_amount > 0 && (
                  <span style={{ fontSize: 9, color: '#22C55E', marginRight: 4 }}>+ ₪{fmt(inv.vat_amount)}</span>
                )}
              </div>
            )}
          </div>

          {inv.category && (
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{inv.category}</div>
          )}
          {inv.note && (
            <div style={{ fontSize: 10, color: C.textDim, fontStyle: 'italic' }}>{inv.note}</div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>

        {/* Sent to accountant toggle */}
        <button
          onClick={() => onToggleSent(inv.id, !sent)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            background: sent ? '#22C55E18' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${sent ? '#22C55E44' : C.border}`,
            borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .2s',
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: sent ? '#22C55E' : 'transparent',
            border: `1.5px solid ${sent ? '#22C55E' : C.textDim}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s',
          }}>
            {sent && <Check size={8} color="#fff" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: sent ? '#22C55E' : C.textDim }}>
            {sent ? 'أُرسلت للمحاسب' : 'إرسال للمحاسب'}
          </span>
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Preview */}
          {inv.file_url && (
            <button
              onClick={() => onPreview(inv)}
              style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
              <Eye size={12} /> عرض
            </button>
          )}

          {/* Delete */}
          {!delConfirm ? (
            <button onClick={() => setDelConfirm(true)}
              style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <Trash2 size={12} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setDelConfirm(false)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textDim, cursor: 'pointer', padding: '2px 6px', fontSize: 9 }}>
                لا
              </button>
              <button onClick={() => onDelete(inv.id)}
                style={{ background: C.accent, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>
                احذف
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ inv, onClose }) {
  if (!inv) return null
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
          {isPdf(inv.file_url) ? (
            <div style={{ background: C.surface, borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <Paperclip size={48} color={C.primary} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{inv.vendor_name || typeLabel(inv.type)}</div>
              <div style={{ fontSize: 11, color: C.textDim }}>{fmtDate(inv.date)} {inv.amount > 0 && `· ₪${fmt(inv.amount)}`}</div>
            </div>
          ) : (
            <>
              <img src={inv.file_url} alt="invoice preview"
                style={{ width: '100%', borderRadius: 16, maxHeight: '75dvh', objectFit: 'contain' }}
                onError={e => e.target.src = ''} />
              <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '0 0 16px 16px', padding: '10px 14px', marginTop: -4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{inv.vendor_name || typeLabel(inv.type)}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  {fmtDate(inv.date)} {inv.amount > 0 && `· ₪${fmt(inv.amount)}`}
                </div>
              </div>
            </>
          )}
          <a href={inv.file_url} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: '10px', background: `${C.primary}20`, border: `1px solid ${C.primary}40`, borderRadius: 12, color: C.primary, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            <Download size={14} /> {isPdf(inv.file_url) ? 'فتح ملف PDF' : 'تحميل الصورة'}
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────
function AddInvoiceSheet({ open, onClose, onSave, businessId, projects, userId }) {
  const [form, setForm] = useState({
    type: 'received', vendor_name: '', amount: '', vat_amount: '',
    date: todayStr(), category: '', note: '',
    project_id: '', sent_to_accountant: false,
  })
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [fileName, setFileName] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [focus,    setFocus]    = useState('')
  const photoRef = useRef()
  const fileRef  = useRef()

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
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
      setFileName(null)
    } else {
      setPreview(null)
      setFileName(f.name)
    }
  }

  function clearFile() {
    setFile(null); setPreview(null); setFileName(null)
    if (photoRef.current) photoRef.current.value = ''
    if (fileRef.current)  fileRef.current.value  = ''
  }

  async function handleSave() {
    setSaving(true)
    try {
      let file_url = null
      if (file && userId) file_url = await uploadReceipt(userId, file)
      await onSave({
        business_id:          businessId,
        user_id:              userId,
        type:                 form.type,
        vendor_name:          form.vendor_name.trim() || null,
        amount:               Number(form.amount) || null,
        vat_amount:           Number(form.vat_amount) || 0,
        date:                 form.date,
        category:             form.category || null,
        project_id:           form.project_id || null,
        note:                 form.note.trim() || null,
        file_url,
        sent_to_accountant:   form.sent_to_accountant,
      })
      handleClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
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
              position: 'absolute',
              bottom: 'max(72px, calc(66px + env(safe-area-inset-bottom,0px)))',
              left: 0, right: 0, maxWidth: 480, margin: '0 auto',
              background: C.surface, border: `1px solid ${C.borderMid}`,
              borderRadius: 24, maxHeight: 'calc(90dvh - 80px)',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>أرشفة فاتورة / وثيقة</div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

              {/* نوع الوثيقة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>نوع الوثيقة</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TYPES.map(t => {
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

              {/* رفع الملف — صورة أو PDF */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 6 }}>
                  إرفاق إيصال / فاتورة
                </div>

                <input ref={photoRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
                <input ref={fileRef}  type="file" accept=".pdf,application/pdf" onChange={pickFile} style={{ display: 'none' }} />

                {/* Preview: image */}
                {preview && (
                  <div style={{ position: 'relative' }}>
                    <img src={preview} alt="preview"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}`, display: 'block' }} />
                    <button onClick={clearFile}
                      style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} color="#fff" />
                    </button>
                  </div>
                )}

                {/* Preview: PDF / file */}
                {fileName && !preview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: `${C.primary}10`, border: `1px solid ${C.primary}25`, borderRadius: 12 }}>
                    <Paperclip size={20} color={C.primary} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                    <button onClick={clearFile}
                      style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', display: 'flex', padding: 2 }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Upload buttons — shown when no file selected */}
                {!preview && !fileName && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => photoRef.current?.click()}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '18px 10px', background: 'rgba(255,255,255,0.03)', border: `2px dashed ${C.borderMid}`, borderRadius: 14, color: C.textDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Camera size={22} color={C.primary} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>صورة</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>JPG · PNG · HEIC</div>
                      </div>
                    </button>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '18px 10px', background: 'rgba(255,255,255,0.03)', border: `2px dashed ${C.borderMid}`, borderRadius: 14, color: C.textDim, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Paperclip size={22} color={C.secondary} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>ملف PDF</div>
                        <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>PDF</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* الجهة / المورّد */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>
                  {form.type === 'income_proof' ? 'اسم العميل / الجهة' : 'اسم المورّد / الجهة'}
                </div>
                <input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)}
                  placeholder="مثال: חומרי בניין X"
                  onFocus={() => setFocus('vendor')} onBlur={() => setFocus('')}
                  style={inp(focus, 'vendor')} />
              </div>

              {/* المبلغ + مع"מ */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>المبلغ (₪)</div>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={form.amount} onChange={e => set('amount', e.target.value)}
                    onFocus={() => setFocus('amount')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'amount'), direction: 'ltr', textAlign: 'left' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>{'מע"מ (₪)'}</div>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={form.vat_amount} onChange={e => set('vat_amount', e.target.value)}
                    onFocus={() => setFocus('vat')} onBlur={() => setFocus('')}
                    style={{ ...inp(focus, 'vat'), direction: 'ltr', textAlign: 'left', color: '#22C55E' }} />
                </div>
              </div>

              {/* التاريخ */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>تاريخ الفاتورة</div>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  style={{ ...inp(focus, 'date'), direction: 'ltr' }} />
              </div>

              {/* الفئة */}
              {form.type === 'received' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>الفئة (اختياري)</div>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    style={{ ...inp(focus, 'cat'), cursor: 'pointer' }}>
                    <option value="">— اختر فئة —</option>
                    {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* المشروع */}
              {projects.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ربط بمشروع (اختياري)</div>
                  <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                    style={{ ...inp(focus, 'proj'), cursor: 'pointer' }}>
                    <option value="">— بدون مشروع —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* ملاحظة */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, marginBottom: 5 }}>ملاحظة (اختياري)</div>
                <input value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="أي تفاصيل..."
                  onFocus={() => setFocus('note')} onBlur={() => setFocus('')}
                  style={inp(focus, 'note')} />
              </div>

              {/* أُرسلت للمحاسب */}
              <button
                onClick={() => set('sent_to_accountant', !form.sent_to_accountant)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: form.sent_to_accountant ? '#22C55E12' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${form.sent_to_accountant ? '#22C55E44' : C.border}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, transition: 'all .2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: form.sent_to_accountant ? '#22C55E' : 'transparent', border: `2px solid ${form.sent_to_accountant ? '#22C55E' : C.textDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                  {form.sent_to_accountant && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: form.sent_to_accountant ? '#22C55E' : C.textDim }}>
                  تم إرسالها للمحاسب
                </span>
              </button>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '13px', background: saving ? 'rgba(255,255,255,0.06)' : GRAD.warm, border: 'none', borderRadius: 14, color: saving ? C.textDim : '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'جاري الحفظ...' : '+ أرشفة الفاتورة'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function InvoiceArchiveTab({ projects = [], userId }) {
  const { activeBusiness } = useBusinessStore()
  const { showToast } = useAppStore()

  const [entries,     setEntries]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [addOpen,     setAddOpen]     = useState(false)
  const [previewInv,  setPreviewInv]  = useState(null)
  const [filterType,  setFilterType]  = useState('')   // '' | 'received' | 'income_proof'
  const [filterSent,  setFilterSent]  = useState('')   // '' | 'sent' | 'unsent'
  const [filterMonth, setFilterMonth] = useState('')
  const [search,      setSearch]      = useState('')

  const bizId = activeBusiness?.id

  // ─── Load ──────────────────────────────────────────────────────────────
  async function load() {
    if (!bizId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoice_archive')
        .select('*')
        .eq('business_id', bizId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bizId])

  // ─── Stats ─────────────────────────────────────────────────────────────
  const unsent     = useMemo(() => entries.filter(e => !e.sent_to_accountant).length, [entries])
  const totalCount = entries.length
  const sentCount  = useMemo(() => entries.filter(e => e.sent_to_accountant).length, [entries])

  // ─── Months for filter ─────────────────────────────────────────────────
  const months = useMemo(() => {
    const seen = new Set()
    entries.forEach(e => { if (e.date) seen.add(e.date.slice(0, 7)) })
    return Array.from(seen).sort().reverse()
  }, [entries])

  // ─── Filtered ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = entries
    if (filterType)  res = res.filter(e => e.type === filterType)
    if (filterSent === 'sent')   res = res.filter(e => e.sent_to_accountant)
    if (filterSent === 'unsent') res = res.filter(e => !e.sent_to_accountant)
    if (filterMonth) res = res.filter(e => e.date?.startsWith(filterMonth))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      res = res.filter(e =>
        e.vendor_name?.toLowerCase().includes(q) ||
        e.note?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      )
    }
    return res
  }, [entries, filterType, filterSent, filterMonth, search])

  // ─── Actions ───────────────────────────────────────────────────────────
  async function handleSave(fields) {
    const { data, error } = await supabase
      .from('invoice_archive').insert(fields).select().single()
    if (error) throw error
    setEntries(prev => [data, ...prev])
    showToast('✅ تم أرشفة الفاتورة')
  }

  async function handleToggleSent(id, val) {
    await supabase.from('invoice_archive').update({ sent_to_accountant: val }).eq('id', id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, sent_to_accountant: val } : e))
    if (val) showToast('✅ تم تعليمها مرسلة للمحاسب')
  }

  async function handleDelete(id) {
    await supabase.from('invoice_archive').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    showToast('تم الحذف')
  }

  if (!activeBusiness) return null

  return (
    <div>
      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: `${C.primary}0F`, border: `1px solid ${C.primary}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.primary }}>{totalCount}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>إجمالي الوثائق</div>
        </div>
        <div style={{ flex: 1, background: '#22C55E0F', border: '1px solid #22C55E22', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22C55E' }}>{sentCount}</div>
          <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>أُرسلت للمحاسب</div>
        </div>
        {unsent > 0 && (
          <div style={{ flex: 1, background: `${C.accent}0F`, border: `1px solid ${C.accent}22`, borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{unsent}</div>
            <div style={{ fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: 600 }}>لم تُرسل بعد</div>
          </div>
        )}
      </div>

      {/* ─── Search ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={13} color={C.textDim} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث في الفواتير..."
          style={{ width: '100%', padding: '10px 36px 10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* ─── Filters ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterType ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الأنواع</option>
          {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <select value={filterSent} onChange={e => setFilterSent(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterSent ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">الكل</option>
          <option value="unsent">لم تُرسل بعد</option>
          <option value="sent">أُرسلت للمحاسب</option>
        </select>

        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: filterMonth ? C.text : C.textDim, fontSize: 11, padding: '5px 8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">كل الفترات</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ marginRight: 'auto', fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center' }}>
          {filtered.length} وثيقة
        </div>
      </div>

      {/* ─── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim, fontSize: 12 }}>تحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FolderOpen size={32} color={C.textDim} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>
            {search || filterType || filterSent || filterMonth
              ? 'لا توجد وثائق لهذا الفلتر'
              : 'الأرشيف فارغ — ارفع أول فاتورة'}
          </div>
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map(inv => (
            <InvoiceCard
              key={inv.id}
              inv={inv}
              onToggleSent={handleToggleSent}
              onDelete={handleDelete}
              onPreview={setPreviewInv}
            />
          ))}
        </AnimatePresence>
      )}

      {/* ─── FAB ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', bottom: 'max(80px, calc(70px + env(safe-area-inset-bottom, 0px)))', display: 'flex', justifyContent: 'flex-end', marginTop: 16, pointerEvents: 'none' }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAddOpen(true)}
          style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px', background: GRAD.warm,
            border: 'none', borderRadius: 50,
            color: '#fff', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 20px ${C.primary}44`,
          }}>
          <Plus size={16} strokeWidth={2.5} />
          أرشفة فاتورة
        </motion.button>
      </div>

      {/* Add sheet */}
      <AddInvoiceSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        businessId={bizId}
        projects={projects}
        userId={userId}
      />

      {/* Preview modal */}
      <PreviewModal inv={previewInv} onClose={() => setPreviewInv(null)} />
    </div>
  )
}
