import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { notifTag, notifMeta, unreadStats, shouldPush } from '../lib/notifications.js'
import { getNotifPrefs } from './usePushNotifications.js'
import { useAppStore } from '../store/useAppStore.js'

const PAGE = 30

/** شارة العدّاد على أيقونة التطبيق (PWA/أندرويد) — صامتة لو غير مدعومة. */
function setAppBadge(count) {
  try {
    if (typeof navigator === 'undefined') return
    if (count > 0) navigator.setAppBadge?.(count)
    else navigator.clearAppBadge?.()
  } catch { /* غير مدعوم */ }
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [hasMore,       setHasMore]       = useState(false)
  const initialized = useRef(false)
  const showToast   = useAppStore(s => s.showToast)

  // العدّاد مشتقّ من الصفوف دائماً — لا نزيد/ننقص يدوياً (كان markRead
  // ينقّص العدّاد حتى لو الصف مقروء أصلاً فيطلع عدّاد سالب الحقيقة).
  const applyRows = useCallback((updater) => {
    setNotifications(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const { total } = unreadStats(next)
      setUnreadCount(total)
      setAppBadge(total)
      return next
    })
  }, [])

  const fetchPage = useCallback(async (offset = 0) => {
    if (!userId) return []
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error) return []
    return data || []
  }, [userId])

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const rows = await fetchPage(0)
    applyRows(rows)
    setHasMore(rows.length === PAGE)
    setLoading(false)
  }, [userId, fetchPage, applyRows])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    setLoading(true)
    const rows = await fetchPage(notifications.length)
    if (rows.length) {
      const seen = new Set(notifications.map(n => n.id))
      applyRows(prev => [...prev, ...rows.filter(r => !seen.has(r.id))])
    }
    setHasMore(rows.length === PAGE)
    setLoading(false)
  }, [hasMore, loading, notifications, fetchPage, applyRows])

  // ── إشعار وارد: أدخله محليّاً (بلا refetch كامل) ثم قرّر كيف نُظهره ────────
  //
  // 🔴 الازدواجية: نفس الصف بيوصل مرّتين للجهاز — realtime (هون) وWeb Push
  // (trigger call_send_push → SW). قبل، الوسمان كانا مختلفين فبيطلع إشعاران.
  // الحل: نفس الوسم `type` بالطرفين، فالمتصفح **يستبدل** بدل ما يكرّر؛
  // وإذا التطبيق مفتوح قدّام المستخدم أصلاً بنكتفي بـtoast داخلي.
  const handleInsert = useCallback((payload) => {
    const n = payload.new
    if (!n) return
    applyRows(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev])
    if (!initialized.current) return

    const visible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    if (visible) {
      showToast?.(n.title || 'كبلان', notifMeta(n.type).priority === 'critical' ? 'error' : 'success')
      return
    }
    if (!shouldPush(n.type, getNotifPrefs())) return
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      new Notification(n.title || 'كبلان', {
        body: n.body || '',
        icon: '/pwa-192.png',
        badge: '/badge-96.png',
        tag: notifTag(n.type),   // ← نفس وسم الـSW = استبدال لا تكرار
        dir: 'rtl',
        lang: 'ar',
      })
    } catch { /* تجاهل */ }
  }, [applyRows, showToast])

  // مزامنة بين الأجهزة: قراءة على جهاز = قراءة على الكل
  const handleUpdate = useCallback((payload) => {
    const n = payload.new
    if (!n) return
    applyRows(prev => prev.map(x => x.id === n.id ? { ...x, ...n } : x))
  }, [applyRows])

  const handleDelete = useCallback((payload) => {
    const id = payload.old?.id
    if (!id) return
    applyRows(prev => prev.filter(x => x.id !== id))
  }, [applyRows])

  useEffect(() => {
    if (!userId) { applyRows([]); return }
    initialized.current = false
    refetch().then(() => { initialized.current = true })

    const channel = supabase
      .channel(`notif_rt_${userId}_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleInsert)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleUpdate)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleDelete)
      .subscribe()

    return () => { supabase.removeChannel(channel); initialized.current = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function markAllRead() {
    if (!userId) return
    const before = notifications
    applyRows(prev => prev.map(n => ({ ...n, read: true })))
    const { error } = await supabase.from('notifications')
      .update({ read: true }).eq('user_id', userId).eq('read', false)
    if (error) applyRows(before)   // تراجع لو فشل — لا نكذب على المستخدم
  }

  async function markRead(id) {
    const row = notifications.find(n => n.id === id)
    if (!row || row.read) return
    applyRows(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) applyRows(prev => prev.map(n => n.id === id ? { ...n, read: false } : n))
  }

  /** قراءة مجموعة كاملة دفعة وحدة (زر «قرأت» على إشعار مجمّع). */
  async function markManyRead(ids = []) {
    const targets = ids.filter(id => notifications.find(n => n.id === id && !n.read))
    if (!targets.length) return
    applyRows(prev => prev.map(n => targets.includes(n.id) ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).in('id', targets)
  }

  async function deleteAll() {
    if (!userId) return
    const before = notifications
    applyRows([])
    setHasMore(false)
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
    if (error) applyRows(before)
  }

  return {
    notifications, unreadCount, loading, hasMore,
    markAllRead, markRead, markManyRead, deleteAll, loadMore, refetch,
  }
}
