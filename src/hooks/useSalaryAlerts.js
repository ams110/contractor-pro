import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmt } from '../lib/helpers.js'
import { calcMutabqi } from '../lib/calculations.js'

const OVERDUE_DAYS = 14
const CHECK_KEY    = 'salary_alert_checked'

export function useSalaryAlerts(userId, employees, workDays, payments, advances = [], expenses = [], enabled = true) {
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || !userId || !employees?.length || ran.current) return

    // تحقق مرة واحدة كل يوم فقط
    const lastCheck = localStorage.getItem(CHECK_KEY)
    const today     = new Date().toISOString().slice(0, 10)
    if (lastCheck === today) return

    ran.current = true

    async function check() {
      const today = new Date()
      const overdueWorkers = []

      employees.forEach(emp => {
        const wds  = workDays.filter(w => w.employee_id === emp.id && w.status !== 'pending')
        const wExp = expenses.filter(e => e.employee_id === emp.id && e.status === 'approved')
        const pays = payments.filter(p => p.employee_id === emp.id)
        const advs = advances.filter(a => a.employee_id === emp.id)
        const owed = calcMutabqi(wds, wExp, pays, advs)
        if (owed <= 0) return

        const lastWorkDate = workDays
          .filter(w => w.employee_id === emp.id && w.status !== 'pending')
          .map(w => new Date(w.date))
          .sort((a, b) => b - a)[0]

        if (!lastWorkDate) return
        const daysSince = Math.floor((today - lastWorkDate) / 86400000)
        if (daysSince >= OVERDUE_DAYS) {
          overdueWorkers.push({ emp, owed, daysSince })
        }
      })

      if (!overdueWorkers.length) {
        localStorage.setItem(CHECK_KEY, today.toISOString().slice(0, 10))
        return
      }

      // تحقق إذا في إشعارات رواتب متأخرة اليوم مسبقاً
      const todayStr = today.toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'salary_overdue')
        .gte('created_at', `${todayStr}T00:00:00`)
        .limit(1)

      if (existing?.length) {
        localStorage.setItem(CHECK_KEY, todayStr)
        return
      }

      // أنشئ إشعار واحد يجمع كل العمال المتأخرين
      const names = overdueWorkers.map(o => `${o.emp.name} (${fmt(o.owed)}₪)`).join('، ')
      await supabase.from('notifications').insert({
        user_id: userId,
        title:   `رواتب متأخرة 🔴 (${overdueWorkers.length} عمال)`,
        body:    names,
        type:    'salary_overdue',
      })

      localStorage.setItem(CHECK_KEY, todayStr)
    }

    check().catch(() => {})
  }, [userId, employees?.length, workDays?.length, payments?.length])
}
