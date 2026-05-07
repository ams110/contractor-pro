import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Fetches the current user's organization and exposes plan/trial helpers.
 * Subscribes to Supabase Realtime so plan changes pushed by the Paddle
 * webhook (Phase 2) are reflected in the UI without a page reload.
 */
export function useOrganization(userId) {
  const [org,     setOrg]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchOrg = useCallback(async () => {
    if (!userId) { setOrg(null); setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: rpcErr } = await supabase.rpc('get_my_organization')

    if (rpcErr) {
      // Table might not exist yet (migration not applied) — fail silently
      if (rpcErr.code !== '42P01') setError(rpcErr.message)
      setOrg(null)
    } else {
      setOrg(data)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchOrg()
    if (!userId) return

    // Realtime: when the webhook updates organizations.plan, re-fetch immediately.
    // Filter by owner_id so we only react to our own org's changes.
    const channel = supabase
      .channel(`org:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'organizations', filter: `owner_id=eq.${userId}` },
        () => fetchOrg()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchOrg])

  // ── Plan helpers ─────────────────────────────────────────────────────────

  /** True if still within the 14-day free trial */
  function isTrialActive() {
    if (!org?.trial_ends_at) return false
    return new Date(org.trial_ends_at) > new Date()
  }

  /** Days remaining in trial (0 if expired or no trial) */
  function trialDaysLeft() {
    if (!org?.trial_ends_at) return 0
    const ms = new Date(org.trial_ends_at) - new Date()
    return Math.max(0, Math.ceil(ms / 86_400_000))
  }

  /**
   * True when the user should be allowed to use the app:
   *   - Active paid plan, OR
   *   - Still within trial
   */
  function isPlanActive() {
    if (!org) return false
    if (org.plan !== 'free') return true
    return isTrialActive()
  }

  /**
   * True when the user has a paid plan (starter / pro / business).
   */
  function isPaid() {
    return org?.plan != null && org.plan !== 'free'
  }

  /**
   * Returns true when a given feature tier is unlocked.
   * Usage: hasFeature('pro') — true for pro + business plans.
   */
  function hasFeature(requiredPlan) {
    const order = { free: 0, starter: 1, pro: 2, business: 3 }
    const current = order[org?.plan ?? 'free'] ?? 0
    const required = order[requiredPlan] ?? 0
    return current >= required
  }

  return {
    org,
    loading,
    error,
    reload: fetchOrg,
    isTrialActive,
    trialDaysLeft,
    isPlanActive,
    isPaid,
    hasFeature,
  }
}
