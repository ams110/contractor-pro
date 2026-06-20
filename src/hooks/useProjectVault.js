import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { uploadProjectFile, deleteStorageFile } from '../lib/storage.js'

/**
 * دفتر المشروع — تحميل وإدارة المخططات (project_drawings) والمواد (project_materials)
 * لمشروع واحد. مفتاحه owner_id (= uid المالك) + project_id.
 */
export function useProjectVault(ownerId, projectId) {
  const [drawings, setDrawings]   = useState([])
  const [materials, setMaterials] = useState([])
  const [siteUnits, setSiteUnits] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    if (!ownerId || !projectId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [dRes, mRes, sRes] = await Promise.all([
        supabase.from('project_drawings')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('project_materials')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('project_site_units')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      ])
      if (dRes.error) throw new Error(dRes.error.message)
      if (mRes.error) throw new Error(mRes.error.message)
      if (sRes.error) throw new Error(sRes.error.message)
      setDrawings(dRes.data || [])
      setMaterials(mRes.data || [])
      setSiteUnits(sRes.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [ownerId, projectId])

  useEffect(() => { load() }, [load])

  // ── المخططات ───────────────────────────────────────────────────────────────
  const addDrawing = useCallback(async (file, { title = '', notes = '' } = {}) => {
    const isPdf = !file.type.startsWith('image/')
    const url = await uploadProjectFile(ownerId, projectId, file)
    const sheetNo = (drawings.reduce((m, d) => Math.max(m, d.sheet_no || 0), 0)) + 1
    const { data, error: err } = await supabase.from('project_drawings').insert({
      owner_id: ownerId, project_id: projectId,
      title: title || file.name.replace(/\.[^.]+$/, ''),
      sheet_no: sheetNo, file_url: url, file_type: isPdf ? 'pdf' : 'image',
      notes, sort_order: drawings.length,
    }).select().single()
    if (err) throw new Error(err.message)
    setDrawings(p => [...p, data])
    return data
  }, [ownerId, projectId, drawings])

  const deleteDrawing = useCallback(async (d) => {
    const { error: err } = await supabase.from('project_drawings').delete().eq('id', d.id)
    if (err) throw new Error(err.message)
    if (d.file_url) deleteStorageFile(d.file_url).catch(() => {})
    setDrawings(p => p.filter(x => x.id !== d.id))
  }, [])

  // ── المواد ─────────────────────────────────────────────────────────────────
  const addMaterial = useCallback(async (m) => {
    const { data, error: err } = await supabase.from('project_materials').insert({
      owner_id: ownerId, project_id: projectId,
      name: m.name, quantity: m.quantity ?? 1, unit: m.unit || 'قطعة',
      est_price: m.est_price ?? 0, supplier: m.supplier || null,
      status: m.status || 'مطلوب', notes: m.notes || null,
      sort_order: materials.length,
    }).select().single()
    if (err) throw new Error(err.message)
    setMaterials(p => [...p, data])
    return data
  }, [ownerId, projectId, materials.length])

  const updateMaterial = useCallback(async (id, patch) => {
    const { data, error: err } = await supabase.from('project_materials')
      .update(patch).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setMaterials(p => p.map(x => x.id === id ? data : x))
    return data
  }, [])

  const deleteMaterial = useCallback(async (id) => {
    const { error: err } = await supabase.from('project_materials').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setMaterials(p => p.filter(x => x.id !== id))
  }, [])

  // ── وحدات الموقع (قطعة/عمارة/طابق) ───────────────────────────────────────────
  const addSiteUnit = useCallback(async ({ level, name, parent_id = null }) => {
    const siblings = siteUnits.filter(u => (u.parent_id || null) === (parent_id || null)).length
    const { data, error: err } = await supabase.from('project_site_units').insert({
      owner_id: ownerId, project_id: projectId,
      level, name, parent_id, status: 'planned', sort_order: siblings,
    }).select().single()
    if (err) throw new Error(err.message)
    setSiteUnits(p => [...p, data])
    return data
  }, [ownerId, projectId, siteUnits])

  const updateSiteUnit = useCallback(async (id, patch) => {
    const { data, error: err } = await supabase.from('project_site_units')
      .update(patch).eq('id', id).select().single()
    if (err) throw new Error(err.message)
    setSiteUnits(p => p.map(x => x.id === id ? data : x))
    return data
  }, [])

  const deleteSiteUnit = useCallback(async (id) => {
    // ON DELETE CASCADE يحذف الأبناء في القاعدة؛ ننظّفهم محلياً أيضاً
    const { error: err } = await supabase.from('project_site_units').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setSiteUnits(p => {
      const toDrop = new Set([id])
      let changed = true
      while (changed) {
        changed = false
        for (const u of p) {
          if (u.parent_id && toDrop.has(u.parent_id) && !toDrop.has(u.id)) { toDrop.add(u.id); changed = true }
        }
      }
      return p.filter(x => !toDrop.has(x.id))
    })
  }, [])

  return {
    drawings, materials, siteUnits, loading, error, reload: load,
    addDrawing, deleteDrawing,
    addMaterial, updateMaterial, deleteMaterial,
    addSiteUnit, updateSiteUnit, deleteSiteUnit,
  }
}
