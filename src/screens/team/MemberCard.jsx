import React from 'react'
import { Ban, Clock, KeyRound, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { PremiumCard } from '../../ui/Premium.jsx'
import { fmtRelative, tRole } from './teamConstants.js'
import { MemberActivity } from './MemberActivity.jsx'
import { tl } from '../../lib/labels.js'

const ROLE_COLOR = {
  'مشرف':  C.primary,
  'محاسب': C.secondary,
  'مساعد': C.warning,
  'عضو':   C.textDim,
}

function ActionBtn({ icon: Icon, label, onClick, color }) {
  const [hov, setHov] = React.useState(false)
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 9px', borderRadius: 10, border: `1px solid ${hov ? color + '55' : C.border}`,
        background: hov ? `${color}15` : 'transparent',
        color: hov ? color : C.textDim, fontSize: 14, cursor: 'pointer', transition: 'all .16s',
      }}
    >
      <Icon size={15} strokeWidth={2.3} color={hov ? color : C.textDim} />
      <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1 }}>{label}</span>
    </button>
  )
}

export function MemberCard({ member, manager, onBlock, onRemove, onEditPerms, onResetPass, language }) {
  const blocked  = !!member.is_blocked
  const expired  = member.expires_at && new Date(member.expires_at) < new Date()
  const lastSeen = fmtRelative(member.last_seen_at, language)
  const roleColor = ROLE_COLOR[member.role] || C.textDim

  const statusGrad = blocked ? GRAD.danger : expired ? GRAD.warm : GRAD.success
  const statusColor = blocked ? C.accent : expired ? C.warning : C.primary
  const statusTone = blocked ? 'critical' : expired ? 'fair' : 'brand'
  const initials = (member.display_name || member.username || '?')[0].toUpperCase()

  return (
    <PremiumCard tone={statusTone} glow={false} radius={18} padding="0" style={{ marginBottom: 10 }}>
      <div style={{ height: 3, background: statusGrad }} />
      <div style={{ padding: '14px 14px 10px' }}>

        {/* ── Identity row ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: blocked ? `${C.accent}33` : expired ? `${C.warning}33` : `${C.primary}22`,
            border: `2px solid ${statusColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900,
            color: statusColor,
          }}>
            {initials}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: blocked ? C.accent : C.text, marginBottom: 4, lineHeight: 1.2 }}>
              {member.display_name || member.username}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
              {member.username && (
                <span style={{ fontSize: 10, color: C.textDim, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>
                  @{member.username}
                </span>
              )}
              {member.role && (
                <span style={{ fontSize: 10, color: roleColor, fontWeight: 700, background: `${roleColor}18`, padding: '2px 7px', borderRadius: 6 }}>
                  {tRole(member.role, language)}
                </span>
              )}
              {blocked && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, background: `${C.accent}18`, padding: '2px 6px', borderRadius: 6, display:'inline-flex', alignItems:'center', gap:3 }}><Ban size={9} strokeWidth={2} /> {tl(language, 'محجوب', 'חסום', 'Blocked')}</span>}
              {!blocked && expired && <span style={{ fontSize: 10, color: C.warning, fontWeight: 700, background: `${C.warning}18`, padding: '2px 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={9} strokeWidth={2.3} /> {tl(language, 'منتهي', 'פג תוקף', 'Expired')}</span>}
              {!blocked && !expired && <span style={{ fontSize: 10, color: C.success, fontWeight: 700, background: `${C.success}18`, padding: '2px 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={9} strokeWidth={2.3} /> {tl(language, 'نشط', 'פעיל', 'Active')}</span>}
            </div>
            {lastSeen && (
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{tl(language, 'آخر ظهور:', 'נראה לאחרונה:', 'Last seen:')} {lastSeen}</div>
            )}
          </div>
        </div>

        {/* ── Action row ── */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <ActionBtn icon={KeyRound} label={tl(language, 'باسورد', 'סיסמה', 'Password')} color={C.warning} onClick={onResetPass} />
          <ActionBtn
            icon={blocked ? CheckCircle2 : Ban}
            label={blocked ? tl(language, 'رفع حجب', 'ביטול חסימה', 'Unblock') : tl(language, 'حجب', 'חסימה', 'Block')}
            color={blocked ? C.success : C.accent}
            onClick={onBlock}
          />
          <ActionBtn icon={Pencil} label={tl(language, 'صلاحيات', 'הרשאות', 'Permissions')} color={C.secondary} onClick={onEditPerms} />
          <ActionBtn icon={Trash2} label={tl(language, 'حذف', 'מחיקה', 'Delete')} color={C.accent} onClick={onRemove} />
        </div>

        {/* ── Activity section ── */}
        <MemberActivity
          memberId={member.id}
          authEmail={member.auth_email}
          manager={manager}
          language={language}
        />
      </div>
    </PremiumCard>
  )
}
