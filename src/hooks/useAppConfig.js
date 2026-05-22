import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAppConfig(ownerId) {
  const [config, setConfig] = useState({
    is_read_only:      false,
    daily_spend_limit: 0,
    session_timeout:   30,
  })

  useEffect(() => { if (ownerId) load() }, [ownerId])

  async function load() {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .eq('owner_id', ownerId)
      .single()
    if (data) setConfig(data)
  }

  async function update(changes) {
    setConfig(c => ({ ...c, ...changes }))
    await supabase.rpc('upsert_app_config', {
      p_owner_id:          ownerId,
      p_is_read_only:      changes.is_read_only      ?? config.is_read_only,
      p_daily_spend_limit: changes.daily_spend_limit ?? config.daily_spend_limit,
      p_session_timeout:   changes.session_timeout   ?? config.session_timeout,
    })
  }

  async function logLogin(userId, email, role, device) {
    if (!ownerId) return
    await supabase.from('login_log').insert({
      owner_id: ownerId, user_id: userId, email, role,
      device_info: device || navigator.userAgent.slice(0, 120),
    })
  }

  async function getLoginLog(limit = 30) {
    const { data } = await supabase
      .from('login_log')
      .select('*')
      .eq('owner_id', ownerId)
      .order('logged_at', { ascending: false })
      .limit(limit)
    return data || []
  }

  async function getLockedPeriods() {
    const { data } = await supabase
      .from('locked_periods')
      .select('*')
      .eq('owner_id', ownerId)
    return data || []
  }

  async function lockPeriod(year, month, lockedBy) {
    const { error } = await supabase.from('locked_periods').insert({
      owner_id: ownerId, year, month, locked_by: lockedBy,
    })
    if (error) throw error
  }

  async function unlockPeriod(year, month) {
    const { error } = await supabase.from('locked_periods')
      .delete().match({ owner_id: ownerId, year, month })
    if (error) throw error
  }

  return { config, update, logLogin, getLoginLog, getLockedPeriods, lockPeriod, unlockPeriod, reload: load }
}
