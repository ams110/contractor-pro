import { useEffect, useRef } from 'react'
import { fmt } from '../lib/helpers.js'
import { calcMutabqi } from '../lib/calculations.js'
import { insertOnce, runDailyOnce } from '../lib/notifyOnce.js'

const OVERDUE_DAYS = 14
const CHECK_KEY    = 'salary_alert_checked'

export function useSalaryAlerts(userId, employees, workDays, payments, advances = [], expenses = [], enabled = true) {
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || !userId || !employees?.length || ran.current) return
    ran.current = true

    runDailyOnce(CHECK_KEY, async () => {
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

      if (!overdueWorkers.length) return

      // إشعار واحد يجمع كل العمال المتأخرين — والأكثر تأخيراً أولاً
      overdueWorkers.sort((a, b) => b.daysSince - a.daysSince)
      const totalOwed = overdueWorkers.reduce((s, o) => s + o.owed, 0)
      const names = overdueWorkers.map(o => `${o.emp.name} (${fmt(o.owed)}₪ · ${o.daysSince} يوم)`).join('، ')

      await insertOnce({
        userId,
        type:  'salary_overdue',
        title: overdueWorkers.length === 1
          ? `راتب متأخّر: ${overdueWorkers[0].emp.name}`
          : `${overdueWorkers.length} عمّال مستحقّين ${fmt(totalOwed)}₪`,
        body:  names,
      })
    })
  }, [userId, employees?.length, workDays?.length, payments?.length, enabled])
}
