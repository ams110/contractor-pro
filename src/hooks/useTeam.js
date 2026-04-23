import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export const OWNER_PERMS = {
  isOwner: true,
  viewProjects: true,  editProjects: true,
  viewWorkers:  true,  editWorkers:  true,
  viewExpenses: true,  addExpenses:  true,
  viewPayments: true,  addPayments:  true,
  canDelete:    true,  manageTeam:   true,
}

function rowToPerms(row) {
  return {
    isOwner:      false,
    viewProjects: row.can_view_projects,
    editProjects: row.can_edit_projects,
    viewWorkers:  row.can_view_workers,
    editWorkers:  row.can_edit_workers,
    viewExpenses: row.can_view_expenses,
    addExpenses:  row.can_add_expenses,
    viewPayments: row.can_view_payments,
    addPayments:  row.can_add_payments,
    canDelete:    row.can_delete,
    manageTeam:   row.can_manage_team,
  }
}

export function useTeam(userId, userEmail) {
  const [membership,    setMembership]   = useState(null)
  const [teamMembers,   setTeamMembers]  = useState([])
  const [pendingInvite, setPendingInvite]= useState(null)
  const [loading,       setLoading]      = useState(false)
  const [isBlocked,     setIsBlocked]    = useState(false)

  useEffect(() => {
    if (!userId || !userEmail) return
    load()
  }, [userId, userEmail])

  async function load() {
    setLoading(true)
    const [{ data: active }, { data: team }, { data: pending }] = await Promise.all([
      supabase.from('team_members').select('*').eq('member_id', userId).eq('status', 'active').maybeSingle(),
      supabase.from('team_members').select('*').eq('owner_id', userId),
      supabase.from('team_members').select('*').eq('email', userEmail).eq('status', 'pending').maybeSingle(),
    ])

    if (active?.is_blocked) {
      setIsBlocked(true)
      setMembership(null)
    } else {
      setIsBlocked(false)
      setMembership(active || null)
      if (active) {
        // تحديث last_seen بدون انتظار
        supabase.rpc('update_member_last_seen', { p_owner_id: active.owner_id })
      }
    }

    setTeamMembers(team || [])
    setPendingInvite(pending || null)
    setLoading(false)
  }

  async function acceptInvite(inviteId) {
    const { error } = await supabase.from('team_members')
      .update({ member_id: userId, status: 'active' }).eq('id', inviteId)
    if (error) throw error
    await load()
  }

  async function inviteMember(email, perms) {
    const { allowed_project_ids, allowed_employee_ids, ...boolPerms } = perms
    const row = {
      owner_id: userId, email, status: 'pending', ...boolPerms,
      allowed_project_ids:  allowed_project_ids?.length  ? allowed_project_ids  : null,
      allowed_employee_ids: allowed_employee_ids?.length ? allowed_employee_ids : null,
    }
    const { error } = await supabase.from('team_members').insert(row)
    if (error) throw error
    await load()
  }

  async function updateMember(id, perms) {
    const { allowed_project_ids, allowed_employee_ids, ...rest } = perms
    const updates = {
      ...rest,
      allowed_project_ids:  allowed_project_ids?.length  ? allowed_project_ids  : null,
      allowed_employee_ids: allowed_employee_ids?.length ? allowed_employee_ids : null,
    }
    const { error } = await supabase.from('team_members').update(updates).eq('id', id).eq('owner_id', userId)
    if (error) throw error
    await load()
  }

  async function removeMember(id) {
    const { error } = await supabase.from('team_members').delete().eq('id', id).eq('owner_id', userId)
    if (error) throw error
    await load()
  }

  async function blockMember(rowId, blocked) {
    const { error } = await supabase.rpc('set_member_blocked', { p_row_id: rowId, p_blocked: blocked })
    if (error) throw error
    await load()
  }

  async function getActivity(email) {
    const { data, error } = await supabase.rpc('get_member_activity', { p_actor_email: email, p_limit: 40 })
    if (error) throw error
    return data || []
  }

  const permissions      = membership ? rowToPerms(membership) : OWNER_PERMS
  const effectiveOwnerId = membership ? membership.owner_id : userId

  return {
    membership, teamMembers, pendingInvite, permissions, effectiveOwnerId,
    loading, isBlocked,
    acceptInvite, inviteMember, updateMember, removeMember, blockMember, getActivity,
  }
}
