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
  if (diff < 60)    return 'الآن'
  if (diff < 3600)  return `${Math.floor(diff / 60)} د`
  if (diff < 86400) return `${Math.floor(diff / 3600)} س`
  return `${Math.floor(diff / 86400)} يوم`
}

export default function NotificationsPanel({ open, onClose, notifications, unreadCount, markAllRead, markRead, deleteAll, onNav }) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      />

      {/*
        Centering wrapper: direction LTR so justify-content:center works
        correctly on both RTL and LTR pages
      */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'center',
        direction: 'ltr',
      }}>
        {/* Panel — direction rtl for Arabic content */}
        <div
          className="slide-up"
          style={{
            width: '100%',
            maxWidth: 430,
            background: C.bg,
            borderRadius: '22px 22px 0 0',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            direction: 'rtl',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            {/* Title — RIGHT in RTL (first DOM child) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>الإشعارات</span>
              {unreadCount > 0 && (
                <span style={{
                  background: C.accent, borderRadius: 20,
                  padding: '2px 8px', fontSize: 11, fontWeight: 800, color: '#fff',
                }}>
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {/* Buttons — LEFT in RTL (second DOM child) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: 11, color: C.primary, background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 8px',
                }}>
                  قراءة الكل
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={deleteAll} style={{
                  fontSize: 11, color: C.textDim, background: 'none',
                  border: 'none', cursor: 'pointer', padding: '4px 8px',
                }}>
                  مسح الكل
                </button>
              )}
              <button onClick={onClose} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                cursor: 'pointer', fontSize: 13, color: C.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                ✕
              </button>
            </div>
          </div>

          {/* ── List ── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '52px 0', color: C.textDim }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>🔔</div>
                <div style={{ fontSize: 13 }}>ما في إشعارات</div>
              </div>
            ) : notifications.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id)
                  const dest = TYPE_NAV[n.type]
                  if (dest) onNav(dest)
                  onClose()
                }}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  background: n.read ? 'transparent' : `${C.primary}0A`,
                  border: 'none',
                  borderBottom: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  textAlign: 'right',
                  direction: 'rtl',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

                  {/* Icon — first in DOM → RIGHT in RTL */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: n.read ? 'rgba(255,255,255,0.05)' : `${C.primary}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {TYPE_ICON[n.type] || '💡'}
                  </div>

                  {/* Content — middle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: n.read ? 500 : 700,
                        color: C.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        display: 'block',
                        textAlign: 'right',
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {/* Body */}
                    {n.body && (
                      <div style={{
                        fontSize: 12, color: C.textDim, lineHeight: 1.5,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {n.body}
                      </div>
                    )}
                  </div>

                  {/* Unread dot — last in DOM → LEFT in RTL */}
                  <div style={{ width: 8, flexShrink: 0, paddingTop: 6 }}>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary }} />
                    )}
                  </div>

                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
