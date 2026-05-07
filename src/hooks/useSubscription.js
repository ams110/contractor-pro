import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Fetches and subscribes to the current user's active Paddle subscription.
 * Updates automatically via Supabase Realtime when the webhook fires.
 */
export function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchSub = useCallback(async () => {
    if (!userId) { setSubscription(null); setLoading(false); return }

    setLoading(true)
    const { data, error: rpcErr } = await supabase.rpc('get_my_subscription')

    if (rpcErr) {
      if (rpcErr.code !== '42P01') setError(rpcErr.message)
      setSubscription(null)
    } else {
      setSubscription(data)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchSub()
    if (!userId) return

    // Real-time: re-fetch whenever the subscriptions row changes.
    // The webhook updates this table, so UI stays in sync automatically.
    const channel = supabase
      .channel(`sub:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
        () => fetchSub()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchSub])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** True when subscription exists and is in an active/trialing state */
  function isActive() {
    return !!subscription && ['active', 'trialing'].includes(subscription.status)
  }

  /** True when scheduled for cancellation at period end */
  function isCanceling() {
    return !!subscription?.cancel_at_period_end
  }

  /** Days until current period ends (billing cycle or cancellation) */
  function daysUntilPeriodEnd() {
    if (!subscription?.current_period_end) return null
    const ms = new Date(subscription.current_period_end) - new Date()
    return Math.max(0, Math.ceil(ms / 86_400_000))
  }

  return {
    subscription,
    loading,
    error,
    reload: fetchSub,
    isActive,
    isCanceling,
    daysUntilPeriodEnd,
  }
}
