import React, { useMemo, useState } from 'react'
import {
  Bell, X, CalendarDays, Banknote, Receipt, HandCoins, Package, Clock,
  AlertCircle, TrendingUp, AlertTriangle, FileWarning, Sunrise, Lightbulb,
  CreditCard, Users, Megaphone, ChevronDown, Loader2,
  UserPlus, BadgeDollarSign, Bot,
} from 'lucide-react'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'
import { C } from '../constants/index.js'
import { notifMeta, groupNotifications, unreadStats, sortSmart } from '../lib/notifications.js'

// اسم أيقونة (من محرّك الإشعارات النقيّ) → مكوّن Lucide
const ICONS = {
  CalendarDays, Banknote, Receipt, HandCoins, Package, Clock, AlertCircle,
  TrendingUp, AlertTriangle, FileWarning, Sunrise, Lightbulb, CreditCard,
  Users, Megaphone, UserPlus, BadgeDollarSign, Bot,
}

function timeAgo(dateStr, language) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return tl(language, 'الآن', 'עכשיו', 'now')
  if (diff < 3600)  return `${Math.floor(diff / 60)} ${tl(language, 'د', 'ד׳', 'm')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${tl(language, 'س', 'ש׳', 'h')}`
  return `${Math.floor(diff / 86400)} ${tl(language, 'يوم', 'ימים', 'd')}`
}

export default function NotificationsPanel({
  open, onClose, notifications, unreadCount,
  markAllRead, markRead, markManyRead, deleteAll, onNav,
  loadMore, hasMore, loading,
}) {
  const language = useAppStore(s => s.language)
  const [filter, setFilter] = useState('all')   // all | unread
  const [expanded, setExpanded] = useState({})

  const rows = useMemo(() => {
    const base = filter === 'unread' ? notifications.filter(n => !n.read) : notifications
    // غير المقروء والحرِج فوق — المالك لازم يشوف «راتب متأخّر» قبل «ملخّص يومي»
    return sortSmart(base)
  }, [notifications, filter])

  const groups = useMemo(() => groupNotifications(rows), [rows])
  const stats  = useMemo(() => unreadStats(notifications), [notifications])

  if (!open) return null

  function openGroup(g) {
    if (g.count > 1 && !expanded[g.key]) {
      setExpanded(p => ({ ...p, [g.key]: true }))
      markManyRead?.(g.items.map(i => i.id))
      return
    }
    markRead(g.latest.id)
    const dest = notifMeta(g.latest.type).nav
    if (dest) onNav(dest)
    onClose()
  }

  const chip = (id, label, count) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
        background: filter === id ? `${C.primary}22` : 'transparent',
        border: `1px solid ${filter === id ? `${C.primary}55` : C.border}`,
        color: filter === id ? C.primary : C.textDim,
      }}
    >
      {label}{count > 0 ? ` (${count})` : ''}
    </button>
  )

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      />

      {/* Centering wrapper: LTR so justify-content:center works on RTL pages */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', justifyContent: 'center', direction: 'ltr',
      }}>
        <div
          className="slide-up"
          style={{
            width: '100%', maxWidth: 430, background: C.bg,
            borderRadius: '22px 22px 0 0', maxHeight: '82vh',
            display: 'flex', flexDirection: 'column', direction: 'rtl', overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} style={{ color: C.primary }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                {tl(language, 'الإشعارات', 'התראות', 'Notifications')}
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: stats.critical > 0 ? C.accent : C.primary, borderRadius: 20,
                  padding: '2px 8px', fontSize: 11, fontWeight: 800, color: '#fff',
                }}>
                  {unreadCount} {tl(language, 'جديد', 'חדש', 'new')}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: 11, color: C.primary, background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 8px', fontFamily: 'inherit',
                }}>
                  {tl(language, 'قراءة الكل', 'סמן הכל כנקרא', 'Mark all read')}
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={deleteAll} style={{
                  fontSize: 11, color: C.textDim, background: 'none',
                  border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
                }}>
                  {tl(language, 'مسح الكل', 'מחק הכל', 'Clear all')}
                </button>
              )}
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                cursor: 'pointer', color: C.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* ── Filters ── */}
          {notifications.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, padding: '9px 16px', flexShrink: 0,
              borderBottom: `1px solid ${C.border}`,
            }}>
              {chip('all',    tl(language, 'الكل', 'הכל', 'All'), 0)}
              {chip('unread', tl(language, 'غير مقروء', 'לא נקרא', 'Unread'), stats.total)}
            </div>
          )}

          {/* ── List ── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '52px 0', color: C.textDim }}>
                <Bell size={42} style={{ margin: '0 auto 10px', display: 'block', color: C.textDim }} />
                <div style={{ fontSize: 13 }}>
                  {filter === 'unread'
                    ? tl(language, 'قرأت كل شي', 'קראת הכל', 'All caught up')
                    : tl(language, 'ما في إشعارات', 'אין התראות', 'No notifications')}
                </div>
              </div>
            ) : groups.map(g => {
              const meta   = notifMeta(g.type)
              const color  = C[meta.color] || C.primary
              const NIcon  = ICONS[meta.icon] || Lightbulb
              const unread = g.unread > 0
              const isOpen = !!expanded[g.key]
              const crit   = meta.priority === 'critical'

              return (
                <div key={g.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <button
                    onClick={() => openGroup(g)}
                    style={{
                      width: '100%', padding: '13px 16px', border: 'none',
                      background: unread ? `${color}0D` : 'transparent',
                      cursor: 'pointer', textAlign: 'right', direction: 'rtl', display: 'block',
                      // شريط جانبي أحمر للحرِج غير المقروء — يميّزه من طرف العين
                      borderInlineStart: crit && unread ? `3px solid ${C.accent}` : '3px solid transparent',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: unread ? `${color}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${unread ? `${color}44` : 'transparent'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}>
                        <NIcon size={18} strokeWidth={2} style={{ color: unread ? color : C.textDim }} />
                        {g.count > 1 && (
                          <span style={{
                            position: 'absolute', top: -5, insetInlineStart: -5,
                            minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                            background: color, color: '#fff', fontSize: 10, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{g.count}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 13, fontWeight: unread ? 800 : 500, color: C.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            flex: 1, display: 'block', textAlign: 'right',
                          }}>
                            {g.latest.title}
                          </span>
                          <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {timeAgo(g.latest.created_at, language)}
                          </span>
                        </div>
                        {g.latest.body && (
                          <div style={{
                            fontSize: 12, color: C.textDim, lineHeight: 1.5,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {g.latest.body}
                          </div>
                        )}
                        {g.count > 1 && (
                          <div style={{
                            fontSize: 10, color, fontWeight: 800, marginTop: 4,
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            <ChevronDown size={11} strokeWidth={3} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                            {isOpen
                              ? tl(language, 'إخفاء', 'הסתר', 'Hide')
                              : `+${g.count - 1} ${tl(language, 'مثله', 'נוספות', 'more')}`}
                          </div>
                        )}
                      </div>

                      <div style={{ width: 8, flexShrink: 0, paddingTop: 6 }}>
                        {unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
                      </div>
                    </div>
                  </button>

                  {/* عناصر المجموعة المطويّة */}
                  {isOpen && g.items.slice(1).map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        markRead(item.id)
                        const dest = notifMeta(item.type).nav
                        if (dest) onNav(dest)
                        onClose()
                      }}
                      style={{
                        width: '100%', padding: '9px 16px 9px 52px', border: 'none',
                        background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                        textAlign: 'right', direction: 'rtl', display: 'block', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{
                          fontSize: 12, color: C.textDim, flex: 1, textAlign: 'right',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.body || item.title}
                        </span>
                        <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>
                          {timeAgo(item.created_at, language)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}

            {/* تحميل المزيد — بدل ما نجيب كل شي دفعة وحدة */}
            {hasMore && filter === 'all' && (
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  width: '100%', padding: '13px 0', background: 'transparent', border: 'none',
                  color: C.primary, fontSize: 12, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                {loading
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <ChevronDown size={14} strokeWidth={3} />}
                {tl(language, 'تحميل المزيد', 'טען עוד', 'Load more')}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
