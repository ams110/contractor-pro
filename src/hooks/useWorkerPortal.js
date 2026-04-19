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
  const stored                      = loadSession()
  const [worker,   setWorker]       = useState(stored)
  const [workDays, setWorkDays]     = useState([])
  const [payments, setPayments]     = useState([])
  const [loading,  setLoading]      = useState(!!stored)
  const [loginErr, setLoginErr]     = useState('')
  const [loggingIn, setLoggingIn]   = useState(false)

  const loadData = useCallback(async (empId) => {
    setLoading(true)
    try {
      const [dRes, pyRes] = await Promise.all([
        supabase.rpc('get_worker_days',     { emp_id: empId }),
        supabase.rpc('get_worker_payments', { emp_id: empId }),
      ])
      setWorkDays(dRes.data || [])
      setPayments(pyRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (stored?.id) loadData(stored.id)
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
  }

  // حساب الملخص الشهري
  const monthlyBreakdown = (() => {
    const map = {}
    workDays.forEach(d => {
      const month = String(d.date).substring(0, 7)
      if (!map[month]) map[month] = { days: 0, amount: 0 }
      map[month].days++
      map[month].amount += d.amount || 0
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  })()

  const totalEarned = workDays.reduce((s, d) => s + (d.amount || 0), 0)
  const totalPaid   = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOwed   = Math.max(0, totalEarned - totalPaid)

  return {
    worker, workDays, payments, loading, loginErr, loggingIn,
    login, logout,
    monthlyBreakdown, totalEarned, totalPaid, totalOwed,
  }
}

// دالة لتعيين بيانات دخول العامل (تستدعيها من شاشة الأدمن)
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
