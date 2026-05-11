import React from 'react'
import { KeyRound } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { Btn, GlassCard, EmptyState, ConfirmDialog } from '../../components/index.jsx'
import { useTeamManager } from './useTeamManager.js'
import { MemberCard } from './MemberCard.jsx'
import { AddMemberModal } from './AddMemberModal.jsx'
import { EditPermsPanel } from './EditPermsPanel.jsx'

export default function TeamScreen({
  teamMembers = [], permissions, projects = [],
  addMember, updateMember, removeMember, blockMember, resetMemberPassword,
  getActivity, teamLoadError, reloadTeam,
}) {
  const manager = useTeamManager()

  // Inject getActivity so MemberActivity can call it
  manager._getActivity = getActivity

  // ── Bridge: UI state → data hooks ──────────────────────────────────────────

  async function handleAddMember() {
    const { memberForm, setAddingMember, setAddMemberErr, closeAddMember,
            addRestrictProjects, addAllowedProjects } = manager
    setAddMemberErr('')
    setAddingMember(true)
    try {
      await addMember({
        displayName:      memberForm.displayName,
        username:         memberForm.username,
        password:         memberForm.password,
        role:             memberForm.selectedRole === 'مخصص' ? 'عضو' : memberForm.selectedRole,
        expiresAt:        memberForm.expiresAt || null,
        perms:            memberForm.perms,
        allowedProjectIds: addRestrictProjects ? addAllowedProjects : [],
      })
      closeAddMember()
    } catch (e) {
      manager.setAddMemberErr(e.message)
    } finally {
      setAddingMember(false)
    }
  }

  async function handleUpdatePerms() {
    const { editingMemberId, editPerms, setEditPermsSaving, setEditPermsErr, closeEditPerms,
            editRestrictProjects, editAllowedProjects } = manager
    setEditPermsErr('')
    setEditPermsSaving(true)
    try {
      await updateMember(editingMemberId, editPerms, editRestrictProjects ? editAllowedProjects : [])
      closeEditPerms()
    } catch (e) {
      manager.setEditPermsErr(e.message)
    } finally {
      setEditPermsSaving(false)
    }
  }

  async function handleBlock() {
    const { confirmBlock, setConfirmBlock } = manager
    try {
      await blockMember(confirmBlock.id, confirmBlock.blocked)
    } finally {
      setConfirmBlock(null)
    }
  }

  async function handleRemove() {
    const { confirmRemove, setConfirmRemove } = manager
    try {
      await removeMember(confirmRemove.id)
    } catch (e) {
      alert(e.message)
    } finally {
      setConfirmRemove(null)
    }
  }

  async function handleResetPass() {
    const { resetPassTarget, newPass, setResetPassSaving, setResetPassErr, setResetPassTarget } = manager
    if (newPass.length < 6) return manager.setResetPassErr('6 أحرف على الأقل')
    setResetPassErr('')
    setResetPassSaving(true)
    try {
      await resetMemberPassword(resetPassTarget.id, newPass)
      setResetPassTarget(null)
    } catch (e) {
      manager.setResetPassErr(e.message)
    } finally {
      setResetPassSaving(false)
    }
  }

  if (!permissions?.manageTeam) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
        <div style={{ fontSize: 14, color: C.textDim }}>ليس لديك صلاحية إدارة الفريق</div>
      </div>
    )
  }

  const activeCount  = teamMembers.filter(m => !m.is_blocked && !(m.expires_at && new Date(m.expires_at) < new Date())).length
  const blockedCount = teamMembers.filter(m => m.is_blocked).length
  const editingMember = teamMembers.find(m => m.id === manager.editingMemberId)

  return (
    <div>
      {/* ── Error banner ── */}
      {teamLoadError && (
        <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 12, background: '#ff444415', border: '1px solid #ff444433', fontSize: 11, color: C.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {teamLoadError}</span>
          {reloadTeam && <button onClick={reloadTeam} style={{ background: 'none', border: `1px solid ${C.accent}55`, borderRadius: 8, color: C.accent, fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>إعادة تحميل</button>}
        </div>
      )}

      {/* ── Summary bar ── */}
      {teamMembers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'إجمالي الأعضاء', value: teamMembers.length, color: C.primary },
            { label: 'نشطون',           value: activeCount,         color: C.success },
            { label: 'محجوبون',         value: blockedCount,        color: blockedCount > 0 ? C.accent : C.textDim },
          ].map((s, i) => (
            <GlassCard key={i} style={{ marginBottom: 0, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: C.textDim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
              <div style={{ height: 2, background: `${s.color}66` }} />
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Add button (shown when list is empty too) ── */}
      <div style={{ marginBottom: 12 }}>
        <Btn onClick={manager.openAddMember} full>+ إضافة عضو جديد</Btn>
      </div>

      {/* ── Member list ── */}
      {teamMembers.length === 0 ? (
        <EmptyState icon="👥" text="لا يوجد أعضاء فريق بعد — أضف أول عضو الآن" />
      ) : (
        teamMembers.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            manager={manager}
            onResetPass={() => { manager.setResetPassTarget(m); manager.setNewPass(''); manager.setResetPassErr('') }}
            onBlock={() => manager.setConfirmBlock({ id: m.id, blocked: !m.is_blocked, name: m.display_name || m.username })}
            onEditPerms={() => manager.openEditPerms(m)}
            onRemove={() => manager.setConfirmRemove(m)}
          />
        ))
      )}

      {/* ── Add member modal ── */}
      <AddMemberModal manager={manager} onSubmit={handleAddMember} projects={projects} />

      {/* ── Edit perms panel ── */}
      <EditPermsPanel member={editingMember} manager={manager} onSave={handleUpdatePerms} projects={projects} />

      {/* ── Reset password modal ── */}
      {manager.resetPassTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) manager.setResetPassTarget(null) }}
        >
          <div style={{ width: '100%', maxWidth: 360, background: C.surface, borderRadius: 20, padding: 22, border: `1px solid ${C.borderMid}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2, display:'flex', alignItems:'center', gap:6 }}><KeyRound size={14} strokeWidth={2} /> تغيير كلمة المرور</div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>
              {manager.resetPassTarget.display_name || manager.resetPassTarget.username}
            </div>
            <input
              type="password"
              value={manager.newPass}
              onChange={e => manager.setNewPass(e.target.value)}
              placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
              style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.06)', color: C.text, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
            />
            {manager.resetPassErr && (
              <div style={{ fontSize: 11, color: C.accent, marginBottom: 10 }}>⚠ {manager.resetPassErr}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleResetPass} full disabled={manager.resetPassSaving}>
                {manager.resetPassSaving ? '...' : '✓ حفظ'}
              </Btn>
              <Btn onClick={() => manager.setResetPassTarget(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm block/unblock ── */}
      <ConfirmDialog
        open={!!manager.confirmBlock}
        onClose={() => manager.setConfirmBlock(null)}
        onConfirm={handleBlock}
        message={manager.confirmBlock?.blocked
          ? `سيُمنع "${manager.confirmBlock?.name}" من الدخول فوراً`
          : `سيستعيد "${manager.confirmBlock?.name}" صلاحياته`}
      />

      {/* ── Confirm remove ── */}
      <ConfirmDialog
        open={!!manager.confirmRemove}
        onClose={() => manager.setConfirmRemove(null)}
        onConfirm={handleRemove}
        message={`سيتم حذف "${manager.confirmRemove?.display_name || manager.confirmRemove?.username}" نهائياً`}
      />
    </div>
  )
}
