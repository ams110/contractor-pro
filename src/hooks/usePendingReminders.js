import { useEffect, useRef } from 'react'
import { insertOnce, runDailyOnce } from '../lib/notifyOnce.js'

// تذكير المالك بطلبات العمال المعلّقة أكثر من 24 ساعة بلا رد — من محاكاة
// بوّابة العامل: العامل الخجول ما رح يلاحق المعلم («رح أضل ساكت وقلقان»)،
// فالتطبيق يذكّر المعلم عنه. نفس نمط useDailyDigest (مرة/يوم + dedup قاعدة).
const CHECK_KEY = 'pending_reminder_checked'
const STALE_MS  = 24 * 60 * 60 * 1000

/** عدّ الطلبات المعلقة الأقدم من 24 ساعة — دالة نقية قابلة للاختبار */
export function countStalePending({ workDays = [], expenses = [], payments = [] }, now = Date.now()) {
  const stale = rows => rows.filter(r =>
    r.status === 'pending' && r.created_at && (now - new Date(r.created_at).getTime()) > STALE_MS
  ).length
  const days = stale(workDays), exp = stale(expenses), pay = stale(payments)
  return { days, exp, pay, total: days + exp + pay }
}

export function usePendingReminders(userId, { workDays = [], expenses = [], payments = [] } = {}) {
  const ran = useRef(false)

  useEffect(() => {
    if (!userId || ran.current) return
    ran.current = true

    runDailyOnce(CHECK_KEY, async () => {
      const { days, exp, pay, total } = countStalePending({ workDays, expenses, payments })
      if (total === 0) return

      const sub = []
      if (days) sub.push(`${days} أيام عمل`)
      if (exp)  sub.push(`${exp} مصاريف`)
      if (pay)  sub.push(`${pay} طلبات دفعة`)

      await insertOnce({
        userId,
        type:  'stale_pending',
        title: `${total} طلبات ناطرة عليك من أكثر من يوم`,
        body:  `${sub.join(' · ')} — العامل ناطر ردك وما رح يلاحقك، افتح الطابور ورد عليه.`,
      })
    })
  }, [userId, workDays?.length, expenses?.length, payments?.length])
}
