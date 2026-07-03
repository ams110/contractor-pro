import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { todayStr } from '../lib/helpers.js'

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
    const today = todayStr()
    if (localStorage.getItem(CHECK_KEY) === today) return
    ran.current = true

    async function run() {
      const { days, exp, pay, total } = countStalePending({ workDays, expenses, payments })
      if (total === 0) { localStorage.setItem(CHECK_KEY, today); return }

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'stale_pending')
        .gte('created_at', `${today}T00:00:00`)
        .limit(1)
      if (existing?.length) { localStorage.setItem(CHECK_KEY, today); return }

      const sub = []
      if (days) sub.push(`${days} أيام عمل`)
      if (exp)  sub.push(`${exp} مصاريف`)
      if (pay)  sub.push(`${pay} طلبات دفعة`)

      await supabase.from('notifications').insert({
        user_id: userId,
        title:   `${total} طلبات ناطرة عليك من أكثر من يوم`,
        body:    `${sub.join(' · ')} — العامل ناطر ردك وما رح يلاحقك، افتح الطابور ورد عليه.`,
        type:    'stale_pending',
      })
      localStorage.setItem(CHECK_KEY, today)
    }

    run().catch(() => {})
  }, [userId, workDays?.length, expenses?.length, payments?.length])
}
