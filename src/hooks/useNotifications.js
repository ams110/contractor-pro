import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { usePushNotifications } from './usePushNotifications.js'

const TYPE_TAG = {
  advance_request: 'advance',
  pending_advance: 'advance',
  pending_day:     'workday',
  pending_expense: 'expense',
  pending_payment: 'payment',
  work_day:        'workday',
  salary:          'salary',
  team:            'team',
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const { notify } = usePushNotifications()
  const initialized = useRef(false)

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

  const handleNew = useCallback((payload) => {
    fetch()
    if (!initialized.current) return
    const n = payload.new
    if (!n) return
    const tag = TYPE_TAG[n.type] || 'general'
    notify(n.title || 'Contractor Pro', n.body || n.message || '', tag)
  }, [fetch, notify])

  useEffect(() => {
    if (!userId) return
    fetch().then(() => { initialized.current = true })
    const channel = supabase
      .channel(`notif_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handleNew)
      .subscribe()
    return () => { supabase.removeChannel(channel); initialized.current = false }
  }, [fetch, handleNew, userId])

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

