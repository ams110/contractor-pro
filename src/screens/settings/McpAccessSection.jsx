// قسم «ربط الذكاء (MCP)» بالإعدادات — إدارة مفاتيح API لربط Claude بالمصلحة.
// المفتاح يُولَّد محلياً (crypto.getRandomValues) ويُخزَّن هاشه فقط عبر RLS؛
// البلينتكست يظهر مرة واحدة (نفس نمط بيانات دخول العامل في EditWorkerSheet).
import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  KeyRound, Plus, Copy, CheckCheck, RefreshCw, Trash2, Bot,
  ChevronDown, ChevronUp, AlertTriangle, Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { C, GRAD } from '../../constants/index.js'
import { tl } from '../../lib/labels.js'
import { fmtDate } from '../../lib/helpers.js'

const MAX_ACTIVE_KEYS = 3
const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`

const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return hex(new Uint8Array(buf))
}

function CopyBtn({ text, lang, small }) {
  const [done, setDone] = useState(false)
  return (
    <motion.button whileTap={{ scale: 0.92 }}
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: small ? '5px 9px' : '7px 12px', borderRadius: 9,
        background: done ? `${C.success}1c` : C.card, border: `1px solid ${done ? C.success + '44' : C.borderMid}`,
        color: done ? C.success : C.text, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
      {done ? <CheckCheck size={13} /> : <Copy size={13} />}
      {done ? tl(lang, 'تم', 'הועתק', 'Copied') : tl(lang, 'نسخ', 'העתק', 'Copy')}
    </motion.button>
  )
}

function CodeBox({ code, lang }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 11, padding: '9px 11px', marginTop: 7 }}>
      <code dir="ltr" style={{ flex: 1, fontSize: 10.5, color: C.cyan, wordBreak: 'break-all', textAlign: 'left',
        fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}>{code}</code>
      <CopyBtn text={code} lang={lang} small />
    </div>
  )
}

export default function McpAccessSection({ language: lang, userId }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [freshKey, setFreshKey] = useState(null)   // البلينتكست — يظهر مرة واحدة
  const [busy, setBusy] = useState(false)
  const [showHow, setShowHow] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(null)

  const loadKeys = useCallback(async () => {
    const { data } = await supabase.from('api_keys')
      .select('id, label, key_prefix, created_at, last_used_at')
      .is('revoked_at', null).order('created_at', { ascending: false })
    setKeys(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { loadKeys() }, [loadKeys])

  async function generateKey() {
    if (busy || keys.length >= MAX_ACTIVE_KEYS) return
    setBusy(true)
    try {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      const key = 'cpk_' + hex(bytes)
      const { error } = await supabase.from('api_keys').insert({
        user_id: userId,
        label: 'Claude MCP',
        key_prefix: key.slice(0, 12),
        key_hash: await sha256hex(key),
      })
      if (!error) { setFreshKey(key); await loadKeys() }
    } finally { setBusy(false) }
  }

  async function revokeKey(id) {
    if (confirmRevoke !== id) {
      setConfirmRevoke(id)
      setTimeout(() => setConfirmRevoke(null), 4000)
      return
    }
    setConfirmRevoke(null)
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (freshKey) setFreshKey(null)
    await loadKeys()
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* ── بطاقة تعريفية ── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '16px',
        background: `linear-gradient(135deg, ${C.secondary}14, ${C.surface} 70%)`,
        border: `1px solid ${C.secondary}2e`, marginBottom: 12 }}>
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', insetInlineEnd: -40, top: -40,
          background: `radial-gradient(circle, ${C.secondary}45, transparent 70%)`, opacity: 0.35 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.4 }}
            style={{ width: 38, height: 38, borderRadius: 12, background: `${C.secondary}22`, border: `1px solid ${C.secondary}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={19} color={C.secondary} strokeWidth={2.2} />
          </motion.div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>
              {tl(lang, 'اربط Claude بمصلحتك', 'חבר את Claude לעסק שלך', 'Connect Claude to your business')}
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, lineHeight: 1.5 }}>
              {tl(lang,
                'اسأل وأمُر بلغة طبيعية: «كم مستحق للعمال؟» · «سجّل مصروف 500₪ سولار» — من Claude مباشرة',
                'שאל ופקוד בשפה טבעית ישירות מ-Claude',
                'Ask and command in natural language, straight from Claude')}
            </div>
          </div>
          <Sparkles size={15} color={C.secondary} style={{ flexShrink: 0 }} />
        </div>
      </div>

      {/* ── المفتاح الجديد — يظهر مرة واحدة ── */}
      {freshKey && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: `${C.success}10`, border: `1px solid ${C.success}3a`, borderRadius: 14,
            padding: '13px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <AlertTriangle size={14} color={C.success} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.success }}>
              {tl(lang, 'انسخ المفتاح هلق — ما رح يظهر مرة ثانية!', 'העתק עכשיו — לא יוצג שוב!', 'Copy now — shown only once!')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code dir="ltr" style={{ flex: 1, fontSize: 11, color: C.text, wordBreak: 'break-all', textAlign: 'left',
              fontFamily: 'ui-monospace, monospace', background: C.bg, borderRadius: 9, padding: '8px 10px' }}>{freshKey}</code>
            <CopyBtn text={freshKey} lang={lang} />
          </div>
        </motion.div>
      )}

      {/* ── قائمة المفاتيح ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
        {loading ? (
          <div style={{ padding: 16, fontSize: 12, color: C.textDim }}>{tl(lang, 'تحميل...', 'טוען...', 'Loading...')}</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: '18px 16px', textAlign: 'center' }}>
            <KeyRound size={22} color={C.textDim} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: C.textDim }}>
              {tl(lang, 'ما في مفاتيح بعد — ولّد مفتاحك الأول', 'אין מפתחות עדיין', 'No keys yet — generate your first')}
            </div>
          </div>
        ) : keys.map((k, i) => (
          <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px',
            borderBottom: i === keys.length - 1 ? 'none' : `1px solid ${C.border}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.secondary}18`, border: `1px solid ${C.secondary}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <KeyRound size={15} color={C.secondary} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <code dir="ltr" style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                {k.key_prefix}…
              </code>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                {tl(lang, 'أُنشئ', 'נוצר', 'Created')} {fmtDate(k.created_at)}
                {k.last_used_at && ` · ${tl(lang, 'آخر استخدام', 'שימוש אחרון', 'Last used')} ${fmtDate(k.last_used_at)}`}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => revokeKey(k.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9,
                background: confirmRevoke === k.id ? `${C.accent}22` : 'rgba(239,68,68,0.08)',
                border: `1px solid ${C.accent}${confirmRevoke === k.id ? '66' : '26'}`,
                color: C.accent, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Trash2 size={12} />
              {confirmRevoke === k.id ? tl(lang, 'متأكد؟', 'בטוח?', 'Sure?') : tl(lang, 'إلغاء', 'ביטול', 'Revoke')}
            </motion.button>
          </div>
        ))}
      </div>

      {/* ── زر التوليد ── */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={generateKey}
        disabled={busy || keys.length >= MAX_ACTIVE_KEYS}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          background: keys.length >= MAX_ACTIVE_KEYS ? C.card : GRAD.premium,
          color: keys.length >= MAX_ACTIVE_KEYS ? C.textDim : '#fff',
          fontSize: 13, fontWeight: 900, marginBottom: 12,
          boxShadow: keys.length >= MAX_ACTIVE_KEYS ? 'none' : '0 4px 16px rgba(124,58,237,0.35)' }}>
        {busy ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.6} />}
        {keys.length >= MAX_ACTIVE_KEYS
          ? tl(lang, `الحد الأقصى ${MAX_ACTIVE_KEYS} مفاتيح — ألغِ واحداً أولاً`, `מקסימום ${MAX_ACTIVE_KEYS} מפתחות`, `Max ${MAX_ACTIVE_KEYS} keys — revoke one first`)
          : tl(lang, 'توليد مفتاح جديد', 'צור מפתח חדש', 'Generate new key')}
      </motion.button>

      {/* ── تحذير ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12,
        background: `${C.warning}0e`, border: `1px solid ${C.warning}26`, marginBottom: 12 }}>
        <AlertTriangle size={13} color={C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 10.5, color: C.textDim, lineHeight: 1.55 }}>
          {tl(lang,
            'المفتاح يعطي وصولاً كاملاً لبيانات مصلحتك (قراءة وكتابة) — لا تشاركه مع أحد. الحذف النهائي غير متاح عبر الربط، والضوابط (وضع القراءة، قفل الفترات، حد الصرف) مفروضة دائماً.',
            'המפתח נותן גישה מלאה לנתוני העסק — אל תשתף אותו.',
            'The key grants full read/write access to your business data — never share it.')}
        </span>
      </div>

      {/* ── تعليمات الربط ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <button onClick={() => setShowHow(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: C.text, textAlign: 'start' }}>
            {tl(lang, 'طريقة الربط', 'איך מתחברים', 'How to connect')}
          </span>
          {showHow ? <ChevronUp size={15} color={C.textDim} /> : <ChevronDown size={15} color={C.textDim} />}
        </button>
        {showHow && (
          <div style={{ padding: '0 15px 15px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginTop: 12 }}>
              {tl(lang, '① تطبيق/موقع Claude — موصّل مخصّص (Custom Connector)', '① Claude — מחבר מותאם', '① claude.ai — Custom Connector')}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 3, lineHeight: 1.5 }}>
              {tl(lang, 'الإعدادات ← Connectors ← Add custom connector، والصق الرابط (بدّل YOUR_KEY بمفتاحك):',
                'הגדרות ← Connectors ← הדבק את הקישור:', 'Settings → Connectors → Add custom connector:')}
            </div>
            <CodeBox code={`${MCP_URL}?key=YOUR_KEY`} lang={lang} />

            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginTop: 14 }}>
              {tl(lang, '② Claude Desktop — (الأفضل: المفتاح خارج الرابط)', '② Claude Desktop', '② Claude Desktop (preferred)')}
            </div>
            <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 3, lineHeight: 1.5 }}>
              {tl(lang, 'أضف لملف claude_desktop_config.json:', 'הוסף ל-claude_desktop_config.json:', 'Add to claude_desktop_config.json:')}
            </div>
            <CodeBox lang={lang} code={`{"mcpServers":{"contractor-pro":{"command":"npx","args":["mcp-remote","${MCP_URL}","--header","Authorization: Bearer YOUR_KEY"]}}}`} />
          </div>
        )}
      </div>
    </div>
  )
}
