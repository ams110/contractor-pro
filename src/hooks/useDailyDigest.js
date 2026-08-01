import { useEffect, useRef } from 'react'
import { fmt, todayStr } from '../lib/helpers.js'
import { insertOnce, runDailyOnce } from '../lib/notifyOnce.js'

// ملخّص يومي للمالك: مرّة كل يوم عند فتح التطبيق يكتب إشعاراً واحداً يجمّع
// الطلبات المعلّقة + صرف اليوم. خفيف (بلا باكند) — نفس نمط useSalaryAlerts.
const CHECK_KEY = 'daily_digest_checked'

export function useDailyDigest(userId, { workDays = [], expenses = [], payments = [] } = {}, enabled = true) {
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || !userId || ran.current) return
    ran.current = true
    const today = todayStr()

    runDailyOnce(CHECK_KEY, async () => {
      const pendingDays = workDays.filter(w => w.status === 'pending').length
      const pendingExp  = expenses.filter(e => e.status === 'pending').length
      const pendingPay  = payments.filter(p => p.status === 'pending').length
      const todaySpend  =
        expenses.filter(e => e.date === today).reduce((s, e) => s + (Number(e.amount) || 0), 0) +
        payments.filter(p => p.date === today && p.status !== 'pending').reduce((s, p) => s + (Number(p.amount) || 0), 0)

      const totalPending = pendingDays + pendingExp + pendingPay
      // لا تُزعج المالك بإشعار فارغ تماماً
      if (totalPending === 0 && todaySpend === 0) return

      const parts = []
      if (totalPending > 0) {
        const sub = []
        if (pendingDays) sub.push(`${pendingDays} أيام`)
        if (pendingExp)  sub.push(`${pendingExp} مصاريف`)
        if (pendingPay)  sub.push(`${pendingPay} رواتب`)
        parts.push(`بانتظار موافقتك: ${sub.join(' · ')}`)
      }
      if (todaySpend > 0) parts.push(`صرف اليوم: ${fmt(todaySpend)}₪`)

      await insertOnce({
        userId,
        type:  'daily_digest',
        title: 'ملخّصك اليومي',
        body:  parts.join(' — '),
      })
    })
  }, [userId, workDays?.length, expenses?.length, payments?.length, enabled])
}
