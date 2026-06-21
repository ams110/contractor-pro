import React, { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DraftingCompass, Ruler, FileText, FileImage, Plus, Trash2, Package,
  Upload, X, AlertTriangle, Layers, Truck, CheckCircle2, Clock, ShoppingCart,
  ShieldCheck, CalendarClock, FileCheck, HardHat, Link2,
} from 'lucide-react'
import { C } from '../../constants/index.js'
import { fmt, fmtDate } from '../../lib/helpers.js'
import { openSignedUrl } from '../../lib/storage.js'
import { Modal, Input, Btn } from '../../components/index.jsx'
import { useProjectVault } from '../../hooks/useProjectVault.js'
import SiteMapTab from './SiteMapTab.jsx'

// ─── الطابع الهندسي: خلفية مخطط أزرق ─────────────────────────────────────────
const BLUE = C.cyan
const blueprintBg = {
  backgroundColor: C.surface,
  backgroundImage: `linear-gradient(${BLUE}10 1px, transparent 1px), linear-gradient(90deg, ${BLUE}10 1px, transparent 1px)`,
  backgroundSize: '16px 16px',
}

// علامات الزوايا (corner ticks) — لمسة ورقة المخطط
function CornerTicks({ color = BLUE }) {
  const t = { position: 'absolute', width: 9, height: 9, pointerEvents: 'none' }
  return (
    <>
      <div style={{ ...t, top: 5, left: 5, borderTop: `1.5px solid ${color}66`, borderLeft: `1.5px solid ${color}66` }} />
      <div style={{ ...t, top: 5, right: 5, borderTop: `1.5px solid ${color}66`, borderRight: `1.5px solid ${color}66` }} />
      <div style={{ ...t, bottom: 5, left: 5, borderBottom: `1.5px solid ${color}66`, borderLeft: `1.5px solid ${color}66` }} />
      <div style={{ ...t, bottom: 5, right: 5, borderBottom: `1.5px solid ${color}66`, borderRight: `1.5px solid ${color}66` }} />
    </>
  )
}

// ─── حالة المادة → لون + أيقونة ───────────────────────────────────────────────
const MAT_STATUS = [
  { id: 'مطلوب', color: C.textDim, icon: Clock },
  { id: 'طلب',   color: C.warning, icon: ShoppingCart },
  { id: 'وصل',   color: C.cyan,    icon: Truck },
  { id: 'مركّب', color: C.success, icon: CheckCircle2 },
]
const statusMeta = (s) => MAT_STATUS.find(x => x.id === s) || MAT_STATUS[0]
const nextStatus = (s) => {
  const i = MAT_STATUS.findIndex(x => x.id === s)
  return MAT_STATUS[(i + 1) % MAT_STATUS.length].id
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ProjectVaultTab({ project, userId, expenses = [] }) {
  const {
    drawings, materials, siteUnits, documents, deliveries, loading, error, reload,
    addDrawing, deleteDrawing, addMaterial, updateMaterial, deleteMaterial,
    addSiteUnit, addSiteUnitsBulk, updateSiteUnit, deleteSiteUnit, addDocument, deleteDocument,
  } = useProjectVault(userId, project.id)

  const [sub, setSub] = useState('drawings') // drawings | materials | site | docs

  // ── تكلفة المواد التقديرية مقابل الفعلية (من مصاريف المشروع) ──
  const estTotal = useMemo(
    () => materials.reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.est_price) || 0), 0),
    [materials],
  )
  const actualMaterialSpend = useMemo(() => {
    const matCats = ['مواد', 'بضاعة', 'أدوات', 'معدات']
    return expenses
      .filter(e => matCats.some(c => (e.category || '').includes(c)))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  }, [expenses])

  return (
    <div style={{ direction: 'rtl' }}>
      {/* ── جدول العنوان (Title Block) ── */}
      <TitleBlock project={project} drawings={drawings} materials={materials} />

      {/* ── مبدّل الأقسام ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
        <SubTab active={sub === 'drawings'} onClick={() => setSub('drawings')} icon={DraftingCompass} label="المخططات" count={drawings.length} />
        <SubTab active={sub === 'materials'} onClick={() => setSub('materials')} icon={Package} label="المواد" count={materials.length} />
        <SubTab active={sub === 'site'} onClick={() => setSub('site')} icon={Layers} label="الموقع" count={siteUnits.filter(u => u.level === 'building').length} />
        <SubTab active={sub === 'docs'} onClick={() => setSub('docs')} icon={ShieldCheck} label="الوثائق" count={documents.length} />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: `${C.accent}15`, borderRadius: 13, border: `1px solid ${C.accent}33`, color: C.accent, fontSize: 13, marginBottom: 12 }}>
          <AlertTriangle size={15} /> {error}
          <button onClick={reload} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>إعادة</button>
        </div>
      )}

      {!loading && !error && sub === 'drawings' && (
        <DrawingsSection drawings={drawings} addDrawing={addDrawing} deleteDrawing={deleteDrawing} />
      )}
      {!loading && !error && sub === 'materials' && (
        <MaterialsSection
          materials={materials} addMaterial={addMaterial} updateMaterial={updateMaterial} deleteMaterial={deleteMaterial}
          estTotal={estTotal} actualSpend={actualMaterialSpend} deliveries={deliveries}
        />
      )}
      {!loading && !error && sub === 'site' && (
        <SiteMapTab units={siteUnits} addSiteUnit={addSiteUnit} addSiteUnitsBulk={addSiteUnitsBulk} updateSiteUnit={updateSiteUnit} deleteSiteUnit={deleteSiteUnit} />
      )}
      {!loading && !error && sub === 'docs' && (
        <DocumentsSection documents={documents} addDocument={addDocument} deleteDocument={deleteDocument} />
      )}
    </div>
  )
}

// ─── جدول العنوان ─────────────────────────────────────────────────────────────
function TitleBlock({ project, drawings, materials }) {
  const cells = [
    { l: 'المشروع', v: project.name },
    { l: 'النوع', v: project.type || '—' },
    { l: 'الحالة', v: project.status || '—' },
    { l: 'الأوراق', v: String(drawings.length).padStart(2, '0') },
    { l: 'بنود المواد', v: String(materials.length).padStart(2, '0') },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'relative', ...blueprintBg, border: `1px solid ${BLUE}33`, borderRadius: 14, padding: '14px 14px 10px', overflow: 'hidden' }}>
      <CornerTicks />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${BLUE}1c`, border: `1px solid ${BLUE}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DraftingCompass size={16} color={BLUE} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: C.text, letterSpacing: '-0.01em' }}>دفتر المشروع</div>
          <div style={{ fontSize: 9.5, color: BLUE, fontFamily: 'monospace', letterSpacing: '0.12em', marginTop: 1 }}>DRAWING SET · المخططات والمواد</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: 1, border: `1px solid ${BLUE}22`, borderRadius: 9, overflow: 'hidden', background: `${BLUE}22` }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: C.card, padding: '7px 9px' }}>
            <div style={{ fontSize: 8.5, color: C.textDim, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{c.l}</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.v}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SubTab({ active, onClick, icon: Icon, label, count }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px',
      background: active ? `${BLUE}15` : C.surface, border: `1px solid ${active ? BLUE + '55' : C.borderMid}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <Icon size={15} color={active ? BLUE : C.textDim} strokeWidth={2.2} />
      <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? BLUE : C.textDim }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: active ? BLUE : C.textDim, background: active ? `${BLUE}22` : C.card, borderRadius: 6, padding: '1px 6px', fontFamily: 'monospace' }}>{count}</span>
    </motion.button>
  )
}

// ═══ قسم المخططات ═══════════════════════════════════════════════════════════
function DrawingsSection({ drawings, addDrawing, deleteDrawing }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [upErr, setUpErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  async function onPick(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploading(true); setUpErr('')
    try { await addDrawing(file) }
    catch (err) { setUpErr(err.message || 'فشل الرفع') }
    finally { setUploading(false) }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onPick} style={{ display: 'none' }} />
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => fileRef.current?.click()} disabled={uploading}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginBottom: 12,
          background: `${BLUE}12`, border: `1.5px dashed ${BLUE}55`, borderRadius: 13, color: BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        {uploading
          ? <><div style={{ width: 15, height: 15, border: `2px solid ${BLUE}44`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> جاري الرفع...</>
          : <><Upload size={16} strokeWidth={2.3} /> رفع مخطط / وثيقة (صورة أو PDF)</>}
      </motion.button>

      {upErr && <div style={{ color: C.accent, fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{upErr}</div>}

      {drawings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <DraftingCompass size={40} color={`${BLUE}88`} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>لا مخططات بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>ارفع مخططات المشروع لتُعرض كأوراق CP</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {drawings.map((d, i) => (
            <SheetCard key={d.id} d={d} index={i} onOpen={() => openSignedUrl(d.file_url)} onDelete={() => setConfirmDel(d)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDel && (
          <Modal open onClose={() => setConfirmDel(null)} title="حذف المخطط"
            action={<Btn variant="danger" full onClick={async () => { await deleteDrawing(confirmDel); setConfirmDel(null) }}>حذف نهائي</Btn>}>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>
              حذف الورقة <b style={{ color: C.text }}>CP-{String(confirmDel.sheet_no).padStart(2, '0')}</b> «{confirmDel.title}»؟ لا يمكن التراجع.
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function SheetCard({ d, index, onOpen, onDelete }) {
  const isPdf = d.file_type === 'pdf'
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.3) }}
      style={{ position: 'relative', ...blueprintBg, border: `1px solid ${BLUE}33`, borderRadius: 12, overflow: 'hidden' }}>
      <CornerTicks />
      {/* رقم الورقة */}
      <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 2, fontSize: 10, fontWeight: 800, color: BLUE, fontFamily: 'monospace', background: C.bg + 'cc', border: `1px solid ${BLUE}44`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.05em' }}>
        CP-{String(d.sheet_no).padStart(2, '0')}
      </div>
      {/* حذف */}
      <button onClick={onDelete} style={{ position: 'absolute', top: 8, insetInlineStart: 8, zIndex: 2, width: 24, height: 24, borderRadius: 7, background: C.bg + 'cc', border: `1px solid ${C.accent}44`, color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Trash2 size={12} strokeWidth={2.3} />
      </button>
      {/* المعاينة */}
      <button onClick={onOpen} style={{ display: 'block', width: '100%', height: 120, border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }}>
        {isPdf
          ? <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FileText size={34} color={BLUE} strokeWidth={1.6} />
              <span style={{ fontSize: 10, color: BLUE, fontFamily: 'monospace', fontWeight: 700 }}>PDF</span>
            </div>
          : <img src={d.file_url} alt={d.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }} loading="lazy" />}
      </button>
      {/* جدول عنوان مصغّر */}
      <div style={{ borderTop: `1px solid ${BLUE}22`, padding: '7px 9px', background: C.card, display: 'flex', alignItems: 'center', gap: 6 }}>
        {isPdf ? <FileText size={12} color={C.textDim} /> : <FileImage size={12} color={C.textDim} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title || 'بدون عنوان'}</span>
      </div>
    </motion.div>
  )
}

// ═══ قسم المواد (BOQ) ════════════════════════════════════════════════════════
function MaterialsSection({ materials, addMaterial, updateMaterial, deleteMaterial, estTotal, actualSpend, deliveries = [] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const blank = { name: '', quantity: '1', unit: 'قطعة', est_price: '', supplier: '', status: 'مطلوب', notes: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await addMaterial({
        name: form.name.trim(), quantity: Number(form.quantity) || 1, unit: form.unit || 'قطعة',
        est_price: Number(form.est_price) || 0, supplier: form.supplier.trim(), status: form.status, notes: form.notes.trim(),
      })
      setForm(blank); setShowAdd(false)
    } finally { setSaving(false) }
  }

  const diff = actualSpend - estTotal

  return (
    <div>
      {/* ملخّص: تقديري مقابل فعلي */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <SummaryBox label="تكلفة المواد التقديرية" value={`₪${fmt(estTotal)}`} color={BLUE} icon={Ruler} />
        <SummaryBox label="الصرف الفعلي (مواد)" value={`₪${fmt(actualSpend)}`} color={diff > 0 ? C.accent : C.success} icon={ShoppingCart}
          hint={estTotal > 0 ? (diff > 0 ? `زيادة ₪${fmt(diff)}` : `ضمن التقدير`) : null} />
      </div>

      <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setForm(blank); setShowAdd(true) }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', marginBottom: 12,
          background: `${BLUE}12`, border: `1.5px dashed ${BLUE}55`, borderRadius: 13, color: BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={16} strokeWidth={2.5} /> إضافة بند مواد
      </motion.button>

      {materials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <Package size={40} color={`${BLUE}88`} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>لا بنود مواد بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>أضف المواد المطلوبة وكمياتها وتابع توريدها</div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${BLUE}22`, borderRadius: 12, overflow: 'hidden' }}>
          {materials.map((m, i) => (
            <MaterialRow key={m.id} m={m} last={i === materials.length - 1}
              onCycle={() => updateMaterial(m.id, { status: nextStatus(m.status) })}
              onDelete={() => setConfirmDel(m)} />
          ))}
        </div>
      )}

      {/* توريدات مسجّلة من بوّابة العامل */}
      {deliveries.length > 0 && (
        <DeliveriesFeed deliveries={deliveries} materials={materials} addMaterial={addMaterial} updateMaterial={updateMaterial} />
      )}

      {/* نموذج الإضافة */}
      <AnimatePresence>
        {showAdd && (
          <Modal open onClose={() => setShowAdd(false)} title="بند مواد جديد"
            action={<Btn full onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'جاري الحفظ...' : 'إضافة'}</Btn>}>
            <Input label="اسم المادة" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required placeholder="مثال: حديد تسليح 12مم" />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><Input label="الكمية" type="number" min="0" value={form.quantity} onChange={v => setForm(p => ({ ...p, quantity: v }))} /></div>
              <div style={{ flex: 1 }}><Input label="الوحدة" value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))} placeholder="قطعة / متر / كيس" /></div>
            </div>
            <Input label="سعر الوحدة التقديري (₪)" type="number" min="0" value={form.est_price} onChange={v => setForm(p => ({ ...p, est_price: v }))} />
            <Input label="المورّد" value={form.supplier} onChange={v => setForm(p => ({ ...p, supplier: v }))} placeholder="اختياري" />
            <Input label="الحالة" value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={MAT_STATUS.map(s => s.id)} />
            <Input label="ملاحظات" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} />
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDel && (
          <Modal open onClose={() => setConfirmDel(null)} title="حذف البند"
            action={<Btn variant="danger" full onClick={async () => { await deleteMaterial(confirmDel.id); setConfirmDel(null) }}>حذف</Btn>}>
            <div style={{ fontSize: 13, color: C.textDim }}>حذف «{confirmDel.name}»؟</div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}

function SummaryBox({ label, value, color, icon: Icon, hint }) {
  return (
    <div style={{ position: 'relative', ...blueprintBg, border: `1px solid ${color}33`, borderRadius: 12, padding: '11px 12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} color={color} strokeWidth={2.2} />
        <span style={{ fontSize: 9.5, color: C.textDim, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 9.5, color, marginTop: 2, fontWeight: 700 }}>{hint}</div>}
    </div>
  )
}

function MaterialRow({ m, last, onCycle, onDelete }) {
  const meta = statusMeta(m.status)
  const SIcon = meta.icon
  const lineTotal = (Number(m.quantity) || 0) * (Number(m.est_price) || 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.card, borderBottom: last ? 'none' : `1px solid ${BLUE}1a` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 10.5, color: C.textDim, fontFamily: 'monospace' }}>{fmt(Number(m.quantity) || 0)} {m.unit}</span>
          {lineTotal > 0 && <span style={{ fontSize: 10.5, color: C.gold, fontWeight: 700 }}>₪{fmt(lineTotal)}</span>}
          {m.supplier && <span style={{ fontSize: 10, color: C.textDim, opacity: 0.8 }}>· {m.supplier}</span>}
        </div>
      </div>
      <motion.button whileTap={{ scale: 0.94 }} onClick={onCycle}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        <SIcon size={11} strokeWidth={2.4} /> {m.status}
      </motion.button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 4, display: 'flex' }}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── توريدات العامل (من material_logs) + مطابقة مع بنود BOQ ─────────────────────
const norm = (s) => (s || '').trim().toLowerCase()
function findMatch(materials, name) {
  const n = norm(name)
  return materials.find(m => norm(m.name) === n) || materials.find(m => norm(m.name).includes(n) || n.includes(norm(m.name)))
}

function DeliveriesFeed({ deliveries, materials, addMaterial, updateMaterial }) {
  const [busy, setBusy] = useState(null)
  async function markArrived(del) {
    setBusy(del.id)
    try {
      const match = findMatch(materials, del.item_name)
      if (match) {
        if (match.status !== 'وصل' && match.status !== 'مركّب') await updateMaterial(match.id, { status: 'وصل' })
      } else {
        await addMaterial({ name: del.item_name, quantity: del.quantity || 1, unit: del.unit || 'قطعة', status: 'وصل' })
      }
    } finally { setBusy(null) }
  }
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <HardHat size={14} color={C.primary} strokeWidth={2.3} />
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.text }}>توريدات سجّلها العمّال</span>
        <span style={{ fontSize: 10, color: C.textDim, background: C.card, borderRadius: 6, padding: '1px 7px' }}>{deliveries.length}</span>
      </div>
      <div style={{ border: `1px solid ${C.primary}22`, borderRadius: 12, overflow: 'hidden' }}>
        {deliveries.map((del, i) => {
          const match = findMatch(materials, del.item_name)
          const done = match && (match.status === 'وصل' || match.status === 'مركّب')
          return (
            <div key={del.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: C.card, borderBottom: i === deliveries.length - 1 ? 'none' : `1px solid ${C.primary}14` }}>
              <Truck size={14} color={C.primary} strokeWidth={2} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{del.item_name}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                  {fmt(del.quantity)} {del.unit}{del.employees?.name ? ` · ${del.employees.name}` : ''} · {fmtDate(del.date)}
                </div>
              </div>
              {done ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: C.success }}>
                  <CheckCircle2 size={13} /> مطابق
                </span>
              ) : (
                <motion.button whileTap={{ scale: 0.94 }} disabled={busy === del.id} onClick={() => markArrived(del)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 8, background: `${C.cyan}16`, border: `1px solid ${C.cyan}44`, color: C.cyan, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  <Link2 size={12} strokeWidth={2.4} /> {match ? 'تحديد كوصل' : 'أضف كبند'}
                </motion.button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══ قسم الوثائق والتصاريح ═══════════════════════════════════════════════════
const DOC_TYPES = ['تصريح بناء', 'عقد', 'رخصة', 'تأمين', 'أخرى']

// حالة الوثيقة من تاريخ الانتهاء
function docStatus(expiry) {
  if (!expiry) return { label: 'دائم', color: C.textDim }
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000)
  if (days < 0)  return { label: 'منتهٍ', color: C.accent }
  if (days <= 30) return { label: `ينتهي خلال ${days}ي`, color: C.warning }
  return { label: 'سارٍ', color: C.success }
}

function DocumentsSection({ documents, addDocument, deleteDocument }) {
  const fileRef = useRef()
  const [pendingFile, setPendingFile] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const blank = { title: '', doc_type: 'تصريح بناء', expiry_date: '', notes: '' }
  const [form, setForm] = useState(blank)

  function onPick(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setForm({ ...blank, title: file.name.replace(/\.[^.]+$/, '') })
    setPendingFile(file); setErr('')
  }
  async function save() {
    if (!pendingFile) return
    setSaving(true); setErr('')
    try {
      await addDocument(pendingFile, { title: form.title.trim(), doc_type: form.doc_type, expiry_date: form.expiry_date || null, notes: form.notes.trim() })
      setPendingFile(null); setForm(blank)
    } catch (e) { setErr(e.message || 'فشل الرفع') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onPick} style={{ display: 'none' }} />
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => fileRef.current?.click()}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginBottom: 12,
          background: `${BLUE}12`, border: `1.5px dashed ${BLUE}55`, borderRadius: 13, color: BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Upload size={16} strokeWidth={2.3} /> رفع وثيقة / تصريح
      </motion.button>

      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textDim }}>
          <ShieldCheck size={40} color={`${BLUE}88`} style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>لا وثائق بعد</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>ارفع تصاريح البناء والعقود والرخص مع تواريخ انتهائها</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {documents.map(doc => {
            const st = docStatus(doc.expiry_date)
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', background: C.card, border: `1px solid ${st.color}2e`, borderRadius: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${st.color}16`, border: `1px solid ${st.color}3a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {doc.file_type === 'pdf' ? <FileText size={16} color={st.color} /> : <FileCheck size={16} color={st.color} />}
                </div>
                <button onClick={() => openSignedUrl(doc.file_url)} style={{ flex: 1, minWidth: 0, textAlign: 'start', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                    <span style={{ fontSize: 9.5, color: C.textDim, background: C.surface, borderRadius: 5, padding: '1px 6px' }}>{doc.doc_type}</span>
                    {doc.expiry_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: C.textDim }}><CalendarClock size={10} /> {fmtDate(doc.expiry_date)}</span>}
                  </div>
                </button>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: st.color, background: `${st.color}16`, border: `1px solid ${st.color}3a`, borderRadius: 7, padding: '3px 8px', whiteSpace: 'nowrap' }}>{st.label}</span>
                <button onClick={() => setConfirmDel(doc)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', padding: 3, display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* نموذج تفاصيل الوثيقة بعد اختيار الملف */}
      <AnimatePresence>
        {pendingFile && (
          <Modal open onClose={() => !saving && setPendingFile(null)} title="تفاصيل الوثيقة"
            action={<Btn full onClick={save} disabled={saving}>{saving ? 'جاري الرفع...' : 'حفظ الوثيقة'}</Btn>}>
            <Input label="العنوان" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} required />
            <Input label="النوع" value={form.doc_type} onChange={v => setForm(p => ({ ...p, doc_type: v }))} options={DOC_TYPES} />
            <Input label="تاريخ الانتهاء (اختياري)" type="date" value={form.expiry_date} onChange={v => setForm(p => ({ ...p, expiry_date: v }))} />
            <Input label="ملاحظات" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} />
            {err && <div style={{ color: C.accent, fontSize: 12, marginTop: 6 }}>{err}</div>}
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDel && (
          <Modal open onClose={() => setConfirmDel(null)} title="حذف الوثيقة"
            action={<Btn variant="danger" full onClick={async () => { await deleteDocument(confirmDel); setConfirmDel(null) }}>حذف نهائي</Btn>}>
            <div style={{ fontSize: 13, color: C.textDim }}>حذف «{confirmDel.title}»؟ لا يمكن التراجع.</div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
