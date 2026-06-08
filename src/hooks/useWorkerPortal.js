import { useState, useEffect, useCallback } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { supabase, SUPABASE_URL } from '../lib/supabase.js'
import { calcMustahaq, calcPaid, calcAdvances, calcMutabqi } from '../lib/calculations.js'

const SESSION_KEY = 'worker_session'
const PASSKEY_KEY = 'worker_passkey_cred'   // localStorage دائم: { credentialId, empId }

function saveSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ── بصمة العامل (WebAuthn) ──────────────────────────────────────────────────
async function callEdge(path, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function isWorkerPasskeySupported() {
  return typeof window !== 'undefined'
    && window.PublicKeyCredential !== undefined
    && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
}

function getStoredPasskey() {
  try { return JSON.parse(localStorage.getItem(PASSKEY_KEY)) } catch { return null }
}

export function hasWorkerPasskey() {
  return !!getStoredPasskey()?.credentialId
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
  const [workerAdvances,   setWorkerAdvances]   = useState([])
  const [submittingExp,    setSubmittingExp]    = useState(false)
  const [submitExpErr,     setSubmitExpErr]     = useState('')
  const [holidays,         setHolidays]         = useState([])

  const loadData = useCallback(async (empId) => {
    setLoading(true)
    try {
      const session = loadSession()
      const [dRes, pyRes, prRes, exRes, holRes, advRes] = await Promise.all([
        supabase.rpc('get_worker_days',     { emp_id: empId }),
        supabase.rpc('get_worker_payments', { emp_id: empId }),
        supabase.rpc('get_worker_projects', { emp_id: empId }),
        supabase.rpc('get_worker_expenses', { emp_id: empId }),
        supabase.rpc('get_worker_holidays', { p_emp_id: empId, p_token: session?.token || '' }),
        supabase.from('advances').select('*').eq('employee_id', empId),
      ])
      setWorkDays(dRes.data  || [])
      setPayments(pyRes.data || [])
      setProjects(prRes.data || [])
      setWorkerExpenses(exRes.data || [])
      setHolidays(holRes.data || [])
      setWorkerAdvances(advRes.data || [])
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

  // ── دخول بالبصمة (passkey) ────────────────────────────────────────────────
  async function loginWithPasskey() {
    const stored = getStoredPasskey()
    if (!stored?.credentialId) { setLoginErr('لا توجد بصمة مسجلة على هذا الجهاز'); return }
    setLoggingIn(true)
    setLoginErr('')
    try {
      const options = await callEdge('worker-webauthn-auth-options', { credentialId: stored.credentialId })
      if (options.error) throw new Error(options.error)
      let assertion
      try {
        assertion = await startAuthentication(options)
      } catch (e) {
        if (e.name === 'NotAllowedError') throw new Error('تم إلغاء عملية البصمة')
        throw new Error('فشلت البصمة — أعد المحاولة')
      }
      const result = await callEdge('worker-webauthn-auth-verify', { credentialId: stored.credentialId, credential: assertion })
      if (result.error) throw new Error(result.error)
      saveSession(result)
      setWorker(result)
      await loadData(result.id)
    } catch (e) {
      setLoginErr(e.message)
    } finally {
      setLoggingIn(false)
    }
  }

  // ── تسجيل البصمة (من إعدادات البوّابة بعد الدخول) ──────────────────────────
  async function registerPasskey() {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    const options = await callEdge('worker-webauthn-register-options', { emp_id: session.id, token: session.token })
    if (options.error) throw new Error(options.error)
    let credential
    try {
      credential = await startRegistration(options)
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('تم إلغاء التسجيل')
      throw new Error('فشل تسجيل البصمة: ' + (e.message || ''))
    }
    const prev = getStoredPasskey()
    const result = await callEdge('worker-webauthn-register-verify', {
      emp_id: session.id, token: session.token, credential,
      prev_credential_id: prev?.credentialId || null,   // استبدل بصمة هذا الجهاز فقط
    })
    if (result.error) throw new Error(result.error)
    localStorage.setItem(PASSKEY_KEY, JSON.stringify({ credentialId: result.credentialId, empId: session.id }))
    return result
  }

  async function removePasskey() {
    const session = loadSession()
    const stored  = getStoredPasskey()
    if (session?.token) {
      // ألغِ بصمة هذا الجهاز فقط — تبقى الأجهزة الأخرى مفعّلة
      try { await supabase.rpc('worker_remove_passkey', { p_emp_id: session.id, p_token: session.token, p_credential_id: stored?.credentialId || null }) } catch { /* ignore */ }
    }
    localStorage.removeItem(PASSKEY_KEY)
  }

  async function submitWorkDay({ projectId, date, dayType, hours, location }) {
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
        p_location:   location || null,
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

  async function requestPayment({ amount, projectId, method, notes }) {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0)        throw new Error('المبلغ يجب أن يكون أكبر من صفر')
    if (parsedAmount > 999_999)                    throw new Error('المبلغ يتجاوز الحد المسموح')
    const pendingCount = payments.filter(p => p.status === 'pending').length
    if (pendingCount >= 2)                         throw new Error('لديك طلبات دفعة معلقة — انتظر موافقة المشرف أولاً')
    const { data, error } = await supabase.rpc('worker_request_payment', {
      p_emp_id:     session.id,
      p_token:      session.token,
      p_amount:     parseFloat(amount),
      p_project_id: projectId || null,
      p_method:     method || 'كاش',
      p_notes:      notes || '',
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    await loadData(session.id)
    return data
  }

  // الملخص الشهري (الأيام الموافق عليها فقط)
  const monthlyBreakdown = (() => {
    const map = {}
    workDays.filter(d => d.status === 'approved').forEach(d => {
      const month = String(d.date).substring(0, 7)
      if (!map[month]) map[month] = { days: 0, amount: 0, records: [] }
      map[month].days++
      map[month].amount += d.amount || 0
      map[month].records.push({ date: d.date, day_type: d.day_type, amount: d.amount || 0, project_name: d.project_name || '', location: d.location || '' })
    })
    Object.values(map).forEach(m => m.records.sort((a, b) => b.date.localeCompare(a.date)))
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  })()

  const approvedDays  = workDays.filter(d => d.status === 'approved')
  const approvedExp   = workerExpenses.filter(e => e.status === 'approved')
  const totalEarned   = calcMustahaq(approvedDays, approvedExp)
  const totalExpenses = calcPaid(approvedExp)
  const totalPaid     = calcPaid(payments)
  const totalAdvances = calcAdvances(workerAdvances)
  const totalOwed     = Math.max(0, calcMutabqi(approvedDays, approvedExp, payments, workerAdvances))
  const pendingDays   = workDays.filter(d => d.status === 'pending')

  async function requestAdvance({ amount, notes }) {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')
    if (parsedAmount > 999_999)             throw new Error('المبلغ يتجاوز الحد المسموح')
    const { data, error } = await supabase.rpc('worker_request_advance', {
      p_emp_id: session.id,
      p_token:  session.token,
      p_amount: parsedAmount,
      p_notes:  notes || '',
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    await loadData(session.id)
    return data
  }

  async function changePassword(oldPass, newPass) {
    const session = loadSession()
    if (!session?.token) throw new Error('جلسة منتهية، أعد تسجيل الدخول')
    const { data, error } = await supabase.rpc('worker_change_password', {
      p_emp_id:   session.id,
      p_token:    session.token,
      p_old_pass: oldPass,
      p_new_pass: newPass,
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data
  }

  return {
    worker, workDays, payments, projects, holidays, loading, loginErr, loggingIn,
    submitting, submitErr, setSubmitErr,
    workerExpenses, submittingExp, submitExpErr, setSubmitExpErr,
    login, logout, submitWorkDay, submitExpense, changePassword, requestPayment, requestAdvance,
    loginWithPasskey, registerPasskey, removePasskey,
    passkeySupported: isWorkerPasskeySupported(), hasPasskey: hasWorkerPasskey(),
    refetch: () => worker?.id && loadData(worker.id),
    monthlyBreakdown, totalEarned, totalExpenses, totalPaid, totalAdvances, totalOwed, pendingDays,
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

export async function resetWorkerPassword(empId, newPassword) {
  const { data, error } = await supabase.rpc('reset_worker_password', {
    emp_id:       empId,
    new_password: newPassword,
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}
