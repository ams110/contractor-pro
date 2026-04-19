import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    const rows = data || []
    setNotifications(rows)
    setUnreadCount(rows.filter(n => !n.read).length)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetch()
    const channel = supabase
      .channel(`notif_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, userId])

  async function markAllRead() {
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function deleteAll() {
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifications([])
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAllRead, markRead, deleteAll, refetch: fetch }
}
