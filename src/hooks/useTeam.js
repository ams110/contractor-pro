import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rvhjrzbhugvytvktdhor.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_StYQEWIn705_V2lNNSITtg_ty04ZO5E'

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

  // إضافة عضو مباشرة (بدون إيميل دعوة)
  async function addMember({ displayName, username, password, role, expiresAt, perms }) {
    // 1. تحقق أن اليوزر ما مستخدم
    const { data: existing } = await supabase
      .from('team_members').select('id').eq('username', username).maybeSingle()
    if (existing) throw new Error('اسم المستخدم مستخدم مسبقاً')

    // 2. إنشاء حساب Supabase Auth بإيميل داخلي
    const authEmail = `tm_${userId.slice(0, 8)}_${username}_${Date.now()}@contractor.app`
    const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: authData, error: signupErr } = await tempClient.auth.signUp({
      email: authEmail,
      password,
    })
    if (signupErr) throw new Error(signupErr.message)
    if (!authData.user?.id) throw new Error('فعّل "تعطيل تأكيد الإيميل" في إعدادات Supabase → Authentication → Email')

    // 3. أضف للـ team_members
    const { error } = await supabase.from('team_members').insert({
      owner_id:     userId,
      member_id:    authData.user.id,
      display_name: displayName,
      username,
      auth_email:   authEmail,
      role:         role || 'عضو',
      status:       'active',
      expires_at:   expiresAt || null,
      email:        authEmail,
      ...perms,
    })
    if (error) throw new Error(error.message)
    await load()
  }

  // إعادة تعيين الباسورد: حذف وإعادة الإضافة
  async function resetMemberPassword(memberId, newPassword) {
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) throw new Error('العضو غير موجود')
    // حذف السجل القديم (الـ auth user يبقى orphan — لا يضر)
    await supabase.from('team_members').delete().eq('id', memberId).eq('owner_id', userId)
    // إنشاء سجل جديد بنفس البيانات وباسورد جديد
    const authEmail = `tm_${userId.slice(0, 8)}_${member.username}_${Date.now()}@contractor.app`
    const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: authData, error: signupErr } = await tempClient.auth.signUp({
      email: authEmail, password: newPassword,
    })
    if (signupErr) throw new Error(signupErr.message)
    if (!authData.user?.id) throw new Error('فشل إنشاء الحساب')

    const { error } = await supabase.from('team_members').insert({
      owner_id:           userId,
      member_id:          authData.user.id,
      display_name:       member.display_name,
      username:           member.username,
      auth_email:         authEmail,
      email:              authEmail,
      role:               member.role,
      status:             'active',
      expires_at:         member.expires_at || null,
      can_view_projects:  member.can_view_projects,
      can_edit_projects:  member.can_edit_projects,
      can_view_workers:   member.can_view_workers,
      can_edit_workers:   member.can_edit_workers,
      can_view_expenses:  member.can_view_expenses,
      can_add_expenses:   member.can_add_expenses,
      can_view_payments:  member.can_view_payments,
      can_add_payments:   member.can_add_payments,
      can_delete:         member.can_delete,
      can_manage_team:    member.can_manage_team,
      can_view_amounts:   member.can_view_amounts,
      can_view_activity:  member.can_view_activity,
    })
    if (error) throw new Error(error.message)
    await load()
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
    const { data, error } = await supabase.rpc('get_all_activity', { p_owner_id: userId, p_limit: 200 })
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
