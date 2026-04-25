import { useState } from 'react'
import { ROLE_PRESETS, DEFAULT_PERMS, PRESET_ROLES, detectRole, PERM_LABELS } from './teamConstants.js'

const EMPTY_FORM = {
  displayName: '',
  username: '',
  password: '',
  selectedRole: 'عضو',
  perms: { ...DEFAULT_PERMS },
  expiresAt: '',
}

export function useTeamManager() {
  // ── Add member form ──
  const [showAddMember,  setShowAddMember]  = useState(false)
  const [memberForm,     setMemberForm]     = useState(EMPTY_FORM)
  const [addingMember,   setAddingMember]   = useState(false)
  const [addMemberErr,   setAddMemberErr]   = useState('')
  const [addStep,        setAddStep]        = useState(1) // 1 = info, 2 = perms

  // ── Edit permissions panel ──
  const [editingMemberId,  setEditingMemberId]  = useState(null)
  const [editPerms,        setEditPerms]        = useState({})
  const [editSelectedRole, setEditSelectedRole] = useState('مخصص')
  const [editPermsSaving,  setEditPermsSaving]  = useState(false)
  const [editPermsErr,     setEditPermsErr]     = useState('')

  // ── Confirmations ──
  const [confirmBlock,  setConfirmBlock]  = useState(null) // { id, blocked }
  const [confirmRemove, setConfirmRemove] = useState(null) // member object

  // ── Reset password ──
  const [resetPassTarget, setResetPassTarget] = useState(null) // member object
  const [newPass,         setNewPass]         = useState('')
  const [resetPassSaving, setResetPassSaving] = useState(false)
  const [resetPassErr,    setResetPassErr]    = useState('')

  // ── Activity (per-member expandable) ──
  const [expandedActivity, setExpandedActivity] = useState(new Set())
  const [activityCache,    setActivityCache]    = useState({})
  const [activityLoading,  setActivityLoading]  = useState({})

  // ── Add member helpers ──
  function openAddMember() {
    setMemberForm(EMPTY_FORM)
    setAddMemberErr('')
    setAddStep(1)
    setShowAddMember(true)
  }

  function closeAddMember() {
    setShowAddMember(false)
    setAddStep(1)
    setAddMemberErr('')
  }

  function handleRoleChange(role) {
    if (role === 'مخصص') {
      setMemberForm(f => ({ ...f, selectedRole: 'مخصص' }))
    } else {
      setMemberForm(f => ({ ...f, selectedRole: role, perms: { ...ROLE_PRESETS[role] } }))
    }
  }

  function togglePerm(key) {
    setMemberForm(f => {
      const newPerms = { ...f.perms, [key]: !f.perms[key] }
      return { ...f, perms: newPerms, selectedRole: detectRole(newPerms) }
    })
  }

  // ── Edit perms helpers ──
  function openEditPerms(member) {
    const perms = Object.fromEntries(PERM_LABELS.map(([k]) => [k, !!member[k]]))
    setEditPerms(perms)
    setEditSelectedRole(detectRole(perms))
    setEditPermsErr('')
    setEditingMemberId(member.id)
  }

  function closeEditPerms() {
    setEditingMemberId(null)
    setEditPermsErr('')
  }

  function handleEditRoleChange(role) {
    if (role === 'مخصص') {
      setEditSelectedRole('مخصص')
    } else {
      setEditPerms({ ...ROLE_PRESETS[role] })
      setEditSelectedRole(role)
    }
  }

  function toggleEditPerm(key) {
    setEditPerms(p => {
      const next = { ...p, [key]: !p[key] }
      setEditSelectedRole(detectRole(next))
      return next
    })
  }

  // ── Activity helpers ──
  async function toggleActivity(memberId, authEmail, getActivity) {
    const next = new Set(expandedActivity)
    if (next.has(memberId)) {
      next.delete(memberId)
      setExpandedActivity(next)
      return
    }
    next.add(memberId)
    setExpandedActivity(next)
    if (!activityCache[memberId]) {
      setActivityLoading(l => ({ ...l, [memberId]: true }))
      try {
        const data = await getActivity(authEmail)
        setActivityCache(c => ({ ...c, [memberId]: data }))
      } catch {
        setActivityCache(c => ({ ...c, [memberId]: [] }))
      } finally {
        setActivityLoading(l => ({ ...l, [memberId]: false }))
      }
    }
  }

  return {
    // add member
    showAddMember, openAddMember, closeAddMember,
    memberForm, setMemberForm,
    addingMember, setAddingMember,
    addMemberErr, setAddMemberErr,
    addStep, setAddStep,
    handleRoleChange, togglePerm,

    // edit perms
    editingMemberId, openEditPerms, closeEditPerms,
    editPerms, editSelectedRole,
    editPermsSaving, setEditPermsSaving,
    editPermsErr, setEditPermsErr,
    handleEditRoleChange, toggleEditPerm,

    // confirmations
    confirmBlock, setConfirmBlock,
    confirmRemove, setConfirmRemove,

    // reset pass
    resetPassTarget, setResetPassTarget,
    newPass, setNewPass,
    resetPassSaving, setResetPassSaving,
    resetPassErr, setResetPassErr,

    // activity
    expandedActivity, activityCache, activityLoading, toggleActivity,
  }
}
