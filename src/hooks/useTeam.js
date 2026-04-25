import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export const OWNER_PERMS = {
  isOwner: true,
  viewProjects: true,  editProjects: true,
  viewWorkers:  true,  editWorkers:  true,
  viewExpenses: true,  addExpenses:  true,
  viewPayments: true,  addPayments:  true,
  canDelete:    true,  manageTeam:   true,
  viewAmounts:  true,  viewActivity: true,
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
    viewAmounts:  row.can_view_amounts !== false,
    viewActivity: row.can_view_activity || false,
  }
}

export function useTeam(userId, userEmail) {
  const [membership,    setMembership]   = useState(null)
  const [teamMembers,   setTeamMembers]  = useState([])
  const [loading,       setLoading]      = useState(false)
  const [isBlocked,     setIsBlocked]    = useState(false)
  const [isExpired,     setIsExpired]    = useState(false)

  useEffect(() => {
    if (!userId || !userEmail) return
    load()
  }, [userId, userEmail])

  async function load() {
    setLoading(true)
    const [{ data: active }, { data: team }] = await Promise.all([
      supabase.from('team_members').select('*').eq('member_id', userId).eq('status', 'active').maybeSingle(),
      supabase.from('team_members').select('*').eq('owner_id', userId),
    ])

    if (active?.is_blocked) {
      setIsBlocked(true)
      setMembership(null)
    } else if (active?.expires_at && new Date(active.expires_at) < new Date()) {
      setIsExpired(true)
      setMembership(null)
      await supabase.auth.signOut()
    } else {
      setIsBlocked(false)
      setIsExpired(false)
      setMembership(active || null)
      if (active) {
        supabase.rpc('update_member_last_seen', { p_owner_id: active.owner_id })
      }
    }

    setTeamMembers(team || [])
    setLoading(false)
  }

  // إضافة عضو عبر Edge Function (يتجاوز تأكيد الإيميل)
  async function addMember({ displayName, username, password, role, expiresAt, perms }) {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-team-member', {
      body: { displayName, username, password, role, expiresAt, perms, ownerId: userId },
    })
    if (fnErr) throw new Error(fnErr.message)
    if (fnData?.error) throw new Error(fnData.error)
    await load()
  }

  // إعادة تعيين الباسورد عبر Edge Function (يحدّث الحساب مباشرة بدون orphans)
  async function resetMemberPassword(memberId, newPassword) {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke('update-member-password', {
      body: { memberId, newPassword, ownerId: userId },
    })
    if (fnErr) throw new Error(fnErr.message)
    if (fnData?.error) throw new Error(fnData.error)
  }

  async function updateMember(id, perms) {
    const { error } = await supabase.from('team_members').update(perms).eq('id', id).eq('owner_id', userId)
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

  async function getAllActivity() {
    const { data, error } = await supabase.rpc('get_all_activity', { p_limit: 200 })
    if (error) throw error
    return data || []
  }

  const permissions      = membership ? rowToPerms(membership) : OWNER_PERMS
  const effectiveOwnerId = membership ? membership.owner_id : userId

  return {
    membership, teamMembers, permissions, effectiveOwnerId,
    loading, isBlocked, isExpired,
    addMember, resetMemberPassword, updateMember, removeMember, blockMember,
    getActivity, getAllActivity,
    reload: load,
  }
}

// دخول عضو الفريق بالـ username
export async function teamMemberSignIn(username, password) {
  // 1. جلب الإيميل الداخلي
  const { data: authEmail, error } = await supabase.rpc('get_team_auth_email', { p_username: username })
  if (error || !authEmail) throw new Error('اسم المستخدم غير موجود أو الحساب غير نشط')

  // 2. تسجيل الدخول بـ Supabase Auth
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: authEmail, password })
  if (signInErr) throw new Error('كلمة المرور غير صحيحة')
}
