import React from 'react'
import { C } from '../constants/index.js'

const TYPE_ICON = {
  pending_day:     '📅',
  pending_expense: '💸',
  salary_overdue:  '🔴',
  info:            '💡',
  warning:         '⚠️',
}

const TYPE_NAV = {
  pending_day:     'workdays',
  pending_expense: 'expenses',
  salary_overdue:  'workers',
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return 'الآن'
  if (diff < 3600) return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return `${Math.floor(diff / 86400)} يوم`
}

export default function NotificationsPanel({ open, onClose, notifications, unreadCount, markAllRead, markRead, deleteAll, onNav }) {
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />

      {/* Panel — position:fixed keeps it viewport-relative regardless of RTL parent */}
      <div className="slide-up" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: C.bg, borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>الإشعارات</span>
            {unreadCount > 0 && (
              <div style={{ background: C.accent, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {unreadCount} جديد
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize: 11, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 8px' }}>
                قراءة الكل
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={deleteAll}
                style={{ fontSize: 11, color: C.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                مسح الكل
              </button>
            )}
            <button onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: '50%', background: C.border, border: 'none', cursor: 'pointer', fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: C.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 13 }}>ما في إشعارات</div>
            </div>
          ) : (
            notifications.map(n => (
              <button key={n.id}
                onClick={() => {
                  markRead(n.id)
                  const dest = TYPE_NAV[n.type]
                  if (dest) onNav(dest)
                  onClose()
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: n.read ? 'transparent' : `${C.primary}08`, border: 'none', borderBottom: `1px solid ${C.border}22`, cursor: 'pointer', textAlign: 'right' }}>
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: 12, background: n.read ? `${C.border}44` : `${C.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {TYPE_ICON[n.type] || '💡'}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: n.read ? 600 : 800, color: C.text, flex: 1, textAlign: 'right' }}>{n.title}</span>
                    <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.4, direction: 'rtl', unicodeBidi: 'isolate' }}>{n.body}</div>
                  )}
                </div>
                {/* Unread dot */}
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: 4 }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
