import React from 'react'
import { ClipboardList } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { GlassCard } from '../../components/index.jsx'
import { ACTION_MAP, TABLE_MAP, ACTION_COLOR, fmtRelative } from './teamConstants.js'

export function MemberActivity({ memberId, authEmail, manager }) {
  const { expandedActivity, activityCache, activityLoading, toggleActivity } = manager
  const isOpen    = expandedActivity.has(memberId)
  const isLoading = activityLoading[memberId]
  const entries   = activityCache[memberId] || []

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => toggleActivity(memberId, authEmail, manager._getActivity)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: 10, border: `1px solid ${C.border}`,
          background: isOpen ? `${C.blue}10` : 'transparent',
          color: isOpen ? C.blue : C.textDim,
          fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .18s',
        }}
      >
        <span style={{ display:'flex', alignItems:'center', gap:5 }}><ClipboardList size={13} strokeWidth={2} /> سجل النشاط</span>
        <span style={{ fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{ marginTop: 6 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: C.textDim, fontSize: 11 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.blue}`, borderTopColor: 'transparent', animation: 'spin .7s linear infinite', margin: '0 auto 8px' }} />
              جاري التحميل...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', color: C.textDim, fontSize: 11 }}>
              لا يوجد نشاط مسجّل بعد
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {entries.slice(0, 10).map((e, i) => {
                const color = ACTION_COLOR[e.action] || C.textDim
                const tbl   = TABLE_MAP[e.tbl]  || e.tbl
                const act   = ACTION_MAP[e.action] || e.action
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 9,
                    background: `${color}0D`, border: `1px solid ${color}22`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, color, background: `${color}20`,
                        padding: '2px 6px', borderRadius: 5,
                      }}>{act}</span>
                      <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{tbl}</span>
                    </div>
                    <span style={{ fontSize: 10, color: C.textDim }}>{fmtRelative(e.created_at)}</span>
                  </div>
                )
              })}
              {entries.length > 10 && (
                <div style={{ textAlign: 'center', fontSize: 10, color: C.textDim, paddingTop: 4 }}>
                  +{entries.length - 10} مزيد في سجل النشاط الكامل
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
