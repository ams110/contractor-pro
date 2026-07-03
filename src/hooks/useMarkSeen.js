import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * يسم الطلبات المعلّقة «شوهدت» (seen_at) دفعة واحدة عند فتح طابور الموافقات —
 * بوّابة العامل تعرضها للعامل كـ«المعلم شاف طلبك» بدل التعليق الصامت.
 *
 * كتابة واحدة لكل mount (حارس useRef) — لا عاصفة تحديثات، ولا انتظار للنتيجة.
 * فشلها صامت (عمود seen_at قد يغيب قبل تطبيق migration ثقة البوّابة).
 *
 * @param {string} table       'work_days' | 'expenses' | 'payments'
 * @param {Array}  pendingRows الصفوف المعلّقة الظاهرة بالطابور
 */
export function useMarkSeen(table, pendingRows) {
  const marked = useRef(false)

  useEffect(() => {
    if (marked.current || !pendingRows?.length) return
    const ids = pendingRows.filter(r => !r.seen_at).map(r => r.id)
    if (!ids.length) return
    marked.current = true
    supabase.from(table).update({ seen_at: new Date().toISOString() })
      .in('id', ids).is('seen_at', null)
      .then(() => {})
      .catch(() => {})
  }, [table, pendingRows?.length])
}
