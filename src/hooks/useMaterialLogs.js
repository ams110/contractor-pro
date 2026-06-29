import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useMaterialLogs() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function workerAddMaterialLog({ employeeId, token, projectId, date, itemName, quantity, unit, notes }) {
    setLoading(true)
    setError('')
    try {
      const { data, error: rpcErr } = await supabase.rpc('worker_add_material_log', {
        p_employee_id: employeeId,
        p_token:       token,
        p_project_id:  projectId  || null,
        p_date:        date,
        p_item_name:   itemName,
        p_quantity:    quantity,
        p_unit:        unit       || 'قطعة',
        p_notes:       notes      || '',
      })
      if (rpcErr)     throw new Error(rpcErr.message)
      if (data?.error) throw new Error(data.error)
      return data
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, workerAddMaterialLog }
}
