import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Hook عام لجلب بيانات من Supabase مع تحديث تلقائي
 * @param {string} table - اسم الجدول
 * @param {string} userId - معرّف المستخدم
 */
function useTable(table, userId) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    const { data: rows, error: err } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else     setData(rows || [])
    setLoading(false)
  }, [table, userId])

  useEffect(() => {
    if (!userId) return
    fetch()
    const channel = supabase
      .channel(`${table}_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch, userId])

  return { data, loading, error, refetch: fetch, setData }
}

/* ─── Projects ─── */
export function useProjects(userId) {
  const { data, loading, error, refetch } = useTable('projects', userId)

  async function addProject(form) {
    const { error } = await supabase.from('projects').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function updateProject(id, form) {
    const { error } = await supabase.from('projects').update(form).eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function deleteProject(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { projects: data, loading, error, addProject, updateProject, deleteProject, refetch }
}

/* ─── Employees ─── */
export function useEmployees(userId) {
  const { data, loading, error, refetch } = useTable('employees', userId)

  async function addEmployee(form) {
    const { error } = await supabase.from('employees').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function updateEmployee(id, form) {
    const { error } = await supabase.from('employees').update(form).eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function deleteEmployee(id) {
    const { error } = await supabase.from('employees').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { employees: data, loading, error, addEmployee, updateEmployee, deleteEmployee, refetch }
}

/* ─── WorkDays ─── */
export function useWorkDays(userId) {
  const { data, loading, error, refetch } = useTable('work_days', userId)

  async function addWorkDay(form) {
    const { error } = await supabase.from('work_days').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteWorkDay(id) {
    const { error } = await supabase.from('work_days').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function approveWorkDay(id) {
    const { error } = await supabase.from('work_days').update({ status: 'approved' }).eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function rejectWorkDay(id) {
    const { error } = await supabase.from('work_days').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { workDays: data, loading, error, addWorkDay, deleteWorkDay, approveWorkDay, rejectWorkDay, refetch }
}

/* ─── Expenses ─── */
export function useExpenses(userId) {
  const { data, loading, error, refetch } = useTable('expenses', userId)

  async function addExpense(form) {
    const { error } = await supabase.from('expenses').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function approveExpense(id) {
    const { error } = await supabase.from('expenses').update({ status: 'approved' }).eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  async function rejectExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { expenses: data, loading, error, addExpense, deleteExpense, approveExpense, rejectExpense, refetch }
}

/* ─── Payments ─── */
export function usePayments(userId) {
  const { data, loading, error, refetch } = useTable('payments', userId)

  async function addPayment(form) {
    const { error } = await supabase.from('payments').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deletePayment(id) {
    const { error } = await supabase.from('payments').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { payments: data, loading, error, addPayment, deletePayment, refetch }
}

/* ─── Holidays ─── */
export function useHolidays(userId) {
  const { data, loading, error, refetch } = useTable('holidays', userId)

  async function addHoliday(form) {
    const { error } = await supabase.from('holidays').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteHoliday(id) {
    const { error } = await supabase.from('holidays').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { holidays: data, loading, error, addHoliday, deleteHoliday }
}
/* ─── Tax Advances (מקדמות) ─── */
export function useTaxAdvances(userId) {
  const { data, loading, error, refetch } = useTable('tax_advances', userId)

  async function addTaxAdvance(form) {
    const { error } = await supabase.from('tax_advances').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteTaxAdvance(id) {
    const { error } = await supabase.from('tax_advances').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { taxAdvances: data, loading, error, addTaxAdvance, deleteTaxAdvance }
}

/* ─── Advances (سلف) ─── */
export function useAdvances(userId) {
  const { data, loading, error, refetch } = useTable('advances', userId)

  async function addAdvance(form) {
    const { error } = await supabase.from('advances').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteAdvance(id) {
    const { error } = await supabase.from('advances').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { advances: data, loading, error, addAdvance, deleteAdvance }
}

export function useClientReceipts(userId) {
  const { data, loading, error, refetch } = useTable('client_receipts', userId)

  async function addReceipt(form) {
    const { error } = await supabase.from('client_receipts').insert({ ...form, user_id: userId })
    if (error) throw error
    await refetch()
  }

  async function deleteReceipt(id) {
    const { error } = await supabase.from('client_receipts').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    await refetch()
  }

  return { clientReceipts: data, loading, error, addReceipt, deleteReceipt, refetch }
}
