import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useWorkerPortal(empId) {
  const [worker,   setWorker]   = useState(null)
  const [projects, setProjects] = useState([])
  const [workDays, setWorkDays] = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true)
    setError('')
    try {
      const [wRes, pRes, dRes, pyRes] = await Promise.all([
        supabase.rpc('get_worker_by_id',   { emp_id: empId }),
        supabase.rpc('get_worker_projects', { emp_id: empId }),
        supabase.rpc('get_worker_days',    { emp_id: empId }),
        supabase.rpc('get_worker_payments', { emp_id: empId }),
      ])

      if (wRes.error) throw new Error(wRes.error.message)
      if (!wRes.data) { setError('رمز العامل غير صحيح'); setLoading(false); return }

      setWorker(wRes.data)
      setProjects(pRes.data || [])
      setWorkDays(dRes.data || [])
      setPayments(pyRes.data || [])
    } catch (e) {
      setError(e.message || 'خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [empId])

  useEffect(() => { load() }, [load])

  async function submitDay(form) {
    const { data, error: err } = await supabase.rpc('submit_worker_day', {
      emp_id:     empId,
      p_date:     form.date,
      p_day_type: form.day_type,
      p_hours:    parseFloat(form.hours) || 8,
      p_proj_id:  form.project_id || null,
    })
    if (err) throw new Error(err.message)
    if (data?.error) throw new Error(data.error)
    await load()
    return data
  }

  const earned = workDays.reduce((s, d) => s + (d.amount || 0), 0)
  const paid   = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const owed   = Math.max(0, earned - paid)

  return { worker, projects, workDays, payments, loading, error, submitDay, reload: load, earned, paid, owed }
}
