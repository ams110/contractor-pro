import { useEffect, useRef } from 'react'
import { fmt } from '../lib/helpers.js'
import { OSEK_PATUR_THRESHOLD } from '../constants/index.js'
import { insertOnce, runDailyOnce } from '../lib/notifyOnce.js'

const CHECK_KEY = 'patur_cap_checked'

/**
 * حالة سقف עוסק פטור لمصلحة واحدة — دالة نقيّة قابلة للاختبار.
 * تعيد أعلى عتبة متجاوزة (90 قبل 70) أو null، مع النسبة والمجموع السنوي.
 *
 * @param {Array}  receipts   كل مقبوضات المالك (client_receipts)
 * @param {object} business   المصلحة (تُفحص فقط لو business_type==='osek_patur')
 * @param {object} opts       { threshold, now, singleBusiness } — singleBusiness=true
 *                            يشمل مقبوضات بلا business_id (صفوف قديمة قبل تعدد المصالح)
 */
export function paturCapStatus(receipts, business, { threshold = OSEK_PATUR_THRESHOLD, now = new Date(), singleBusiness = false } = {}) {
  if (!business || business.business_type !== 'osek_patur') return null
  const year = now.getFullYear()
  const totalYear = (receipts || [])
    .filter(r => r.business_id === business.id || (singleBusiness && !r.business_id))
    .filter(r => new Date(r.date).getFullYear() === year)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const pct = (totalYear / threshold) * 100
  const level = pct >= 90 ? 90 : pct >= 70 ? 70 : null
  return { totalYear, pct, level, remaining: Math.max(0, threshold - totalYear) }
}

/**
 * تنبيه push عند اقتراب مصلحة עוסק פטור من السقف السنوي (₪122,833).
 * بانر IncomeTab عرضٌ فقط — هذا الـhook يوصل التحذير لبيت المستخدم
 * (صف notifications → trigger call_send_push → Web Push).
 *
 * dedup **بالسنة** لا باليوم: كل عتبة (70%/90%) تُنبَّه مرة واحدة في السنة لكل مصلحة.
 * فحص localStorage يومي فقط لتوفير الاستعلامات.
 */
export function usePaturCapAlerts(userId, clientReceipts, businesses, enabled = true) {
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || !userId || !businesses?.length || !clientReceipts?.length || ran.current) return
    ran.current = true

    runDailyOnce(CHECK_KEY, async () => {
      const year = new Date().getFullYear()
      const singleBusiness = businesses.length === 1

      for (const biz of businesses) {
        const status = paturCapStatus(clientReceipts, biz, { singleBusiness })
        if (!status?.level) continue

        const type = `patur_cap_${status.level}`
        const title = status.level >= 90
          ? `تحذير: ${biz.name} تجاوزت 90% من سقف עוסק פטור`
          : `انتبه: ${biz.name} وصلت ${Math.round(status.pct)}% من سقف עוסק פטור`
        const body = status.level >= 90
          ? `باقي لك ${fmt(status.remaining)}₪ فقط قبل السقف السنوي — احكِ مع محاسبك قبل ما توصل غرامة.`
          : `مجموع مقبوضات ${year}: ${fmt(status.totalYear)}₪ من أصل ${fmt(OSEK_PATUR_THRESHOLD)}₪ — باقي ${fmt(status.remaining)}₪.`

        // dedup بالسنة: كل عتبة (70%/90%) تُنبَّه مرة واحدة/سنة لكل مصلحة
        await insertOnce({ userId, type, title, body, refId: biz.id, scope: 'year' })
      }
    })
  }, [userId, clientReceipts?.length, businesses?.length, enabled])
}
