import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, FolderKanban } from 'lucide-react'
import { C } from '../../constants/index.js'
import ProjectVaultTab from './ProjectVaultTab.jsx'
import BlueprintIntro from '../../components/BlueprintIntro.jsx'

/**
 * دفتر المشروع كشاشة مستقلة (من قسم «المزيد»): مُنتقي مشروع + الدفتر كاملاً.
 * يعيد استعمال ProjectVaultTab نفسه المستعمَل داخل تفاصيل المشروع.
 */
export default function ProjectVaultScreen({ projects = [], expenses = [], userId }) {
  // المشاريع النشطة أولاً (غير المؤرشفة)
  const list = useMemo(
    () => projects.filter(p => !p.archived).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [projects],
  )
  const [selId, setSelId] = useState(list[0]?.id || null)

  // إن تغيّرت القائمة وما عاد المحدّد موجوداً، اختر الأول
  useEffect(() => {
    if (!list.find(p => p.id === selId)) setSelId(list[0]?.id || null)
  }, [list, selId])

  const selected = list.find(p => p.id === selId) || null
  const projExpenses = useMemo(
    () => (selected ? expenses.filter(e => e.project_id === selected.id) : []),
    [expenses, selected],
  )

  return (
    <div style={{ padding: '16px 16px 32px', direction: 'rtl', maxWidth: 900, margin: '0 auto' }}>
      {/* الهيرو المتحرّك — بيت يرسم حاله + قياسات + ختم */}
      <BlueprintIntro />

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '54px 0', color: C.textDim }}>
          <FolderKanban size={42} color={`${C.cyan}88`} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>لا مشاريع بعد</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>أنشئ مشروعاً من تبويب «مشاريع» لتبدأ دفتره</div>
        </div>
      ) : (
        <>
          {/* مُنتقي المشروع — شرائح أفقية */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            {list.map(p => {
              const active = p.id === selId
              return (
                <motion.button key={p.id} whileTap={{ scale: 0.96 }} onClick={() => setSelId(p.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 12, flexShrink: 0,
                    background: active ? `${C.cyan}16` : C.surface, border: `1px solid ${active ? C.cyan + '55' : C.borderMid}`,
                    color: active ? C.cyan : C.textDim, fontSize: 12.5, fontWeight: active ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  <Building2 size={14} strokeWidth={active ? 2.4 : 1.9} />
                  {p.name}
                </motion.button>
              )
            })}
          </div>

          {/* الدفتر */}
          {selected && (
            <ProjectVaultTab key={selected.id} project={selected} userId={userId} expenses={projExpenses} />
          )}
        </>
      )}
    </div>
  )
}
