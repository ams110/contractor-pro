import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const SESSION_KEY = 'worker_session'

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function useWorkerPortal() {
  const stored                        = loadSession()
  const [worker,    setWorker]        = useState(stored)
  const [workDays,  setWorkDays]      = useState([])
  const [payments,  setPayments]      = useState([])
  const [projects,  setProjects]      = useState([])
  const [loading,   setLoading]       = useState(!!stored)
  const [loginErr,  setLoginErr]      = useState('')
  const [loggingIn, setLoggingIn]     = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [submitErr,        setSubmitErr]        = useState('')
  const [workerExpenses,   setWorkerExpenses]   = useState([])
  const [submittingExp,    setSubmittingExp]    = useState(false)
  const [submitExpErr,     setSubmitExpErr]     = useState('')

  const loadData = useCallback(async (empId) => {
    setLoading(true)
    try {
      const [dRes, pyRes, prRes, exRes] = await Promise.all([
        supabase.rpc('get_worker_days',     { emp_id: empId }),
        supabase.rpc('get_worker_payments', { emp_id: empId }),
        supabase.rpc('get_worker_projects', { emp_id: empId }),
        supabase.rpc('get_worker_expenses', { emp_id: empId }),
      ])
      setWorkDays(dRes.data  || [])
      setPayments(pyRes.data || [])
      setProjects(prRes.data || [])
      setWorkerExpenses(exRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stored?.id) return
    if (!stored.token) {
      // جلسة قديمة بدون توكن — أجبر على إعادة تسجيل الدخول
      clearSession()
      setWorker(null)
      return
    }
    loadData(stored.id)
  }, []) // eslint-disable-line

  async function login(username, password) {
    setLoggingIn(true)
    setLoginErr('')
    try {
      const { data, error } = await supabase.rpc('worker_login', {
        p_username: username,
        p_password: password,
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      saveSession(data)
      setWorker(data)
      await loadData(data.id)
    } catch (e) {
      setLoginErr(e.message)
    } finally {
      setLoggingIn(false)
    }
  }

  function logout() {
    clearSession()
    setWorker(null)
    setWorkDays([])
    setPayments([])
    setProjects([])
  }

  async function submitWorkDay({ projectId, date, dayType, hours }) {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    setSubmitting(true)
    setSubmitErr('')
    try {
      const { data, error } = await supabase.rpc('worker_submit_day', {
        p_emp_id:     session.id,
        p_token:      session.token,
        p_project_id: projectId,
        p_date:       date,
        p_day_type:   dayType,
        p_hours:      parseFloat(hours) || 8,
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      await loadData(session.id)
      return data
    } catch (e) {
      setSubmitErr(e.message)
      throw e
    } finally {
      setSubmitting(false)
    }
  }

  async function submitExpense({ projectId, date, amount, category, vendor, receiptUrl }) {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    setSubmittingExp(true)
    setSubmitExpErr('')
    try {
      const { data, error } = await supabase.rpc('worker_submit_expense', {
        p_emp_id:      session.id,
        p_token:       session.token,
        p_project_id:  projectId || null,
        p_date:        date,
        p_amount:      parseFloat(amount),
        p_category:    category,
        p_vendor:      vendor || '',
        p_receipt_url: receiptUrl || '',
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      await loadData(session.id)
      return data
    } catch (e) {
      setSubmitExpErr(e.message)
      throw e
    } finally {
      setSubmittingExp(false)
    }
  }

  // الملخص الشهري (الأيام الموافق عليها فقط)
  const monthlyBreakdown = (() => {
    const map = {}
    workDays.filter(d => d.status === 'approved').forEach(d => {
      const month = String(d.date).substring(0, 7)
      if (!map[month]) map[month] = { days: 0, amount: 0 }
      map[month].days++
      map[month].amount += d.amount || 0
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  })()

  const totalEarned = workDays.filter(d => d.status === 'approved').reduce((s, d) => s + (d.amount || 0), 0)
  const totalPaid   = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOwed   = Math.max(0, totalEarned - totalPaid)
  const pendingDays = workDays.filter(d => d.status === 'pending')

  return {
    worker, workDays, payments, projects, loading, loginErr, loggingIn,
    submitting, submitErr, setSubmitErr,
    workerExpenses, submittingExp, submitExpErr, setSubmitExpErr,
    login, logout, submitWorkDay, submitExpense, refetch: () => worker?.id && loadData(worker.id),
    monthlyBreakdown, totalEarned, totalPaid, totalOwed, pendingDays,
  }
}

export async function setWorkerCredentials(empId, username, password) {
  const { data, error } = await supabase.rpc('set_worker_credentials', {
    emp_id:   empId,
    username,
    password,
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}
