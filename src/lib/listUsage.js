// ─── استخدام القوائم — List Usage ────────────────────────────────────────────────
// يربط عناصر القائمة (تخصصات/فئات/طرق دفع) ببياناتها الحقيقية: كم مرة استُخدم كل
// عنصر، ومجموع المبالغ، مرتّبة حسب الأكثر استخداماً. دالة نقيّة قابلة للاختبار.

/**
 * @param {string[]} items   عناصر القائمة (مثلاً أسماء التخصصات)
 * @param {object[]} records السجلات (عمّال/مصاريف/دفعات)
 * @param {{countKey?:string, amountKey?:string}} keys
 * @returns {{ rows, total, used, maxCount, totalAmount }}
 */
export function computeListUsage(items = [], records = [], { countKey, amountKey } = {}) {
  const map = {}
  items.forEach(label => { map[label] = { label, count: 0, amount: 0 } })

  records.forEach(r => {
    const label = countKey ? r[countKey] : null
    if (label != null && map[label]) {
      map[label].count++
      if (amountKey) map[label].amount += Number(r[amountKey]) || 0
    }
  })

  const rows = Object.values(map).sort((a, b) => b.count - a.count || b.amount - a.amount)
  const used        = rows.filter(r => r.count > 0).length
  const maxCount     = Math.max(1, ...rows.map(r => r.count))
  const totalAmount  = rows.reduce((s, r) => s + r.amount, 0)
  const totalCount   = rows.reduce((s, r) => s + r.count, 0)

  return { rows, total: rows.length, used, maxCount, totalAmount, totalCount }
}
