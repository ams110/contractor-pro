import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useMaterialLogs(ownerId) {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    const { data } = await supabase
      .from('material_logs')
      .select('*')
      .eq('owner_id', ownerId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { fetch() }, [fetch])

  async function addLog(form) {
    const { error } = await supabase.from('material_logs').insert({ ...form, owner_id: ownerId })
    if (error) throw error
    await fetch()
  }

  async function updateLog(id, updates) {
    const { error } = await supabase.from('material_logs').update(updates).eq('id', id).eq('owner_id', ownerId)
    if (error) throw error
    await fetch()
  }

  async function deleteLog(id) {
    const { error } = await supabase.from('material_logs').delete().eq('id', id).eq('owner_id', ownerId)
    if (error) throw error
    setLogs(l => l.filter(x => x.id !== id))
  }

  async function approveLog(id) {
    await updateLog(id, { status: 'approved' })
  }

  return { logs, loading, addLog, updateLog, deleteLog, approveLog, reload: fetch }
}

// للعمال — يضيفون بدون owner_id check
export async function workerAddMaterialLog(form) {
  const { error } = await supabase.from('material_logs').insert(form)
  if (error) throw error
}
