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
  const [documents, setDocuments] = useState([])
  const [deliveries, setDeliveries] = useState([]) // material_logs المسجّلة من بوّابة العامل لهذا المشروع
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    if (!ownerId || !projectId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [dRes, mRes, sRes, docRes, delRes] = await Promise.all([
        supabase.from('project_drawings')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('project_materials')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('project_site_units')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('project_documents')
          .select('*').eq('owner_id', ownerId).eq('project_id', projectId)
          .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('material_logs')
          .select('id, date, item_name, quantity, unit, notes, created_at, employees ( name )')
          .eq('owner_id', ownerId).eq('project_id', projectId)
          .order('date', { ascending: false }).order('created_at', { ascending: false }),
      ])
      if (dRes.error) throw new Error(dRes.error.message)
      if (mRes.error) throw new Error(mRes.error.message)
      if (sRes.error) throw new Error(sRes.error.message)
      if (docRes.error) throw new Error(docRes.error.message)
      // deliveries غير حرجة — لا نُفشل التحميل لو تعذّرت
      setDrawings(dRes.data || [])
      setMaterials(mRes.data || [])
      setSiteUnits(sRes.data || [])
      setDocuments(docRes.data || [])
      setDeliveries(delRes.error ? [] : (delRes.data || []))
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
  const addSiteUnit = useCallback(async ({ level, name, parent_id = null, status = 'planned' }) => {
    const siblings = siteUnits.filter(u => (u.parent_id || null) === (parent_id || null)).length
    const { data, error: err } = await supabase.from('project_site_units').insert({
      owner_id: ownerId, project_id: projectId,
      level, name, parent_id, status, sort_order: siblings,
    }).select().single()
    if (err) throw new Error(err.message)
    setSiteUnits(p => [...p, data])
    return data
  }, [ownerId, projectId, siteUnits])

  // إدراج عدّة وحدات دفعة واحدة (شقق بالجملة / تكرار بين الطوابق). يحسب sort_order لكل أب.
  const addSiteUnitsBulk = useCallback(async (rows) => {
    if (!rows || !rows.length) return []
    const counts = {}
    for (const u of siteUnits) {
      const k = u.parent_id || 'root'
      counts[k] = (counts[k] || 0) + 1
    }
    const payload = rows.map(r => {
      const k = r.parent_id || 'root'
      const so = counts[k] || 0
      counts[k] = so + 1
      return {
        owner_id: ownerId, project_id: projectId,
        level: r.level, name: r.name, parent_id: r.parent_id ?? null,
        status: r.status || 'planned', trades: r.trades || {}, sort_order: so,
      }
    })
    const { data, error: err } = await supabase.from('project_site_units').insert(payload).select()
    if (err) throw new Error(err.message)
    setSiteUnits(p => [...p, ...(data || [])])
    return data || []
  }, [ownerId, projectId, siteUnits])

  // إدراج شجرة كاملة بمعرّفات مولّدة مسبقاً (قطعة→عمارات→طوابق→شقق من قراءة مخطط).
  // الصفوف مرتّبة «الأب قبل الابن» فالإدراج الواحد يحترم مفاتيح FK.
  const addSiteUnitsTree = useCallback(async (rows) => {
    if (!rows || !rows.length) return []
    const payload = rows.map(r => ({
      id: r.id, owner_id: ownerId, project_id: projectId,
      level: r.level, name: r.name, parent_id: r.parent_id ?? null,
      status: r.status || 'planned', trades: r.trades || {}, sort_order: r.sort_order ?? 0,
    }))
    const { data, error: err } = await supabase.from('project_site_units').insert(payload).select()
    if (err) throw new Error(err.message)
    setSiteUnits(p => [...p, ...(data || [])])
    return data || []
  }, [ownerId, projectId])

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

  // ── الوثائق والتصاريح ────────────────────────────────────────────────────────
  const addDocument = useCallback(async (file, { title, doc_type = 'أخرى', expiry_date = null, notes = '' }) => {
    const isPdf = !file.type.startsWith('image/')
    const url = await uploadProjectFile(ownerId, projectId, file)
    const { data, error: err } = await supabase.from('project_documents').insert({
      owner_id: ownerId, project_id: projectId,
      title: title || file.name.replace(/\.[^.]+$/, ''),
      doc_type, file_url: url, file_type: isPdf ? 'pdf' : 'image',
      expiry_date: expiry_date || null, notes,
    }).select().single()
    if (err) throw new Error(err.message)
    setDocuments(p => [...p, data])
    return data
  }, [ownerId, projectId])

  const deleteDocument = useCallback(async (doc) => {
    const { error: err } = await supabase.from('project_documents').delete().eq('id', doc.id)
    if (err) throw new Error(err.message)
    if (doc.file_url) deleteStorageFile(doc.file_url).catch(() => {})
    setDocuments(p => p.filter(x => x.id !== doc.id))
  }, [])

  return {
    drawings, materials, siteUnits, documents, deliveries, loading, error, reload: load,
    addDrawing, deleteDrawing,
    addMaterial, updateMaterial, deleteMaterial,
    addSiteUnit, addSiteUnitsBulk, addSiteUnitsTree, updateSiteUnit, deleteSiteUnit,
    addDocument, deleteDocument,
  }
}
