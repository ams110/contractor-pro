import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { Search, X, Building2, Users, CreditCard, Banknote, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { C, GRAD } from '../constants/index.js'
import { useAppStore } from '../store/useAppStore.js'
import { fmt } from '../lib/helpers.js'
import { tl, tEnum } from '../lib/labels.js'

function ResultItem({ icon: Icon, color, label, sub, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', outline: 'none' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{sub}</div>}
      </div>
      <ArrowLeft size={13} color={C.textDim} />
    </Command.Item>
  )
}

export default function SmartSearch({ projects = [], employees = [], expenses = [], payments = [], onNav }) {
  const { showSearch, setShowSearch } = useAppStore()
  const language = useAppStore(s => s.language)
  const [q, setQ] = useState('')

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setShowSearch])

  useEffect(() => { if (!showSearch) setQ('') }, [showSearch])

  const ql = q.toLowerCase()
  const fp = projects.filter(p => p.name?.toLowerCase().includes(ql) || p.status?.includes(ql)).slice(0, 5)
  const fe = employees.filter(e => e.name?.toLowerCase().includes(ql) || e.specialty?.includes(ql)).slice(0, 5)

  function go(screen) { onNav?.(screen); setShowSearch(false) }

  return (
    <AnimatePresence>
      {showSearch && (
        <motion.div
          key="search-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setShowSearch(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, paddingInline: 16 }}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560 }}
          >
            <Command
              style={{ background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(249,115,22,0.1) inset' }}
              shouldFilter={false}
            >
              {/* Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                <Search size={17} color={C.primary} strokeWidth={2} />
                <Command.Input
                  value={q}
                  onValueChange={setQ}
                  placeholder={tl(language, 'ابحث عن مشروع أو عامل... (Ctrl+K)', 'חפש פרויקט או עובד... (Ctrl+K)', 'Search project or worker... (Ctrl+K)')}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 15, fontFamily: 'inherit', direction: 'inherit' }}
                  autoFocus
                />
                <button
                  onClick={() => setShowSearch(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textDim }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Results */}
              <Command.List style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 8px 12px' }}>
                <Command.Empty style={{ padding: '32px 16px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>
                  {tl(language, 'لا نتائج — جرب كلمة أخرى', 'אין תוצאות — נסה מילה אחרת', 'No results — try another word')}
                </Command.Empty>

                {!q && (
                  <Command.Group>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tl(language, 'تنقل سريع', 'ניווט מהיר', 'Quick navigation')}</div>
                    <ResultItem icon={Building2} color={C.primary} label={tl(language, 'المشاريع', 'פרויקטים', 'Projects')} sub={tl(language, 'عرض جميع المشاريع', 'הצג את כל הפרויקטים', 'View all projects')} onSelect={() => go('projects')} />
                    <ResultItem icon={Users} color={C.secondary} label={tl(language, 'العمال', 'עובדים', 'Workers')} sub={tl(language, 'عرض جميع العمال', 'הצג את כל העובדים', 'View all workers')} onSelect={() => go('workers')} />
                    <ResultItem icon={CreditCard} color={C.gold} label={tl(language, 'المصاريف', 'הוצאות', 'Expenses')} sub={tl(language, 'المصاريف والفواتير', 'הוצאות וחשבוניות', 'Expenses and invoices')} onSelect={() => go('finance')} />
                    <ResultItem icon={Banknote} color={C.cyan} label={tl(language, 'الرواتب', 'משכורות', 'Salaries')} sub={tl(language, 'كشف رواتب العمال', 'דוח משכורות עובדים', 'Worker payroll')} onSelect={() => go('finance')} />
                  </Command.Group>
                )}

                {fp.length > 0 && (
                  <Command.Group>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tl(language, 'مشاريع', 'פרויקטים', 'Projects')}</div>
                    {fp.map(p => (
                      <ResultItem
                        key={p.id}
                        icon={Building2}
                        color={C.primary}
                        label={p.name}
                        sub={`${p.status ? tEnum(p.status, language) : ''} ${p.type ? tEnum(p.type, language) : ''}`}
                        onSelect={() => go('projects')}
                      />
                    ))}
                  </Command.Group>
                )}

                {fe.length > 0 && (
                  <Command.Group>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 800, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{tl(language, 'عمال', 'עובדים', 'Workers')}</div>
                    {fe.map(e => (
                      <ResultItem
                        key={e.id}
                        icon={Users}
                        color={C.secondary}
                        label={e.name}
                        sub={e.specialty ? tEnum(e.specialty, language) : ''}
                        onSelect={() => go('workers')}
                      />
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, color: C.textDim }}>↑↓ {tl(language, 'تنقل', 'ניווט', 'Navigate')}</span>
                <span style={{ fontSize: 10, color: C.textDim }}>↵ {tl(language, 'اختيار', 'בחירה', 'Select')}</span>
                <span style={{ fontSize: 10, color: C.textDim }}>Esc {tl(language, 'إغلاق', 'סגירה', 'Close')}</span>
                <div style={{ marginInlineStart: 'auto', fontSize: 10, background: `${C.primary}18`, border: `1px solid ${C.primary}30`, borderRadius: 6, padding: '2px 7px', color: C.primary, fontWeight: 700 }}>Ctrl+K</div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
