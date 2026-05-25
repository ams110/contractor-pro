import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * useProjectBusinessLinks
 * يُدير جدول project_businesses (ربط المشاريع بالمصالح).
 *
 * يُرجع:
 *  - links[]                   كل الروابط { project_id, business_id }
 *  - loading                   حالة التحميل
 *  - addLink(pid, bid)         ربط مشروع بمصلحة
 *  - removeLink(pid, bid)      إلغاء الربط
 *  - setProjectLinks(pid, bids) مزامنة كاملة: يحدث روابط مشروع دفعة واحدة
 *  - getProjectsForBusiness(bid) → string[]  معرفات المشاريع لمصلحة معينة
 *  - getBusinessesForProject(pid) → string[] معرفات المصالح لمشروع معين
 *  - reload                    إعادة جلب البيانات يدوياً
 */
export function useProjectBusinessLinks(userId) {
  const [links,   setLinks]   = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_businesses')
        .select('project_id, business_id')
        .eq('user_id', userId)
      if (error) throw error
      setLinks(data ?? [])
    } catch (e) {
      console.error('useProjectBusinessLinks.load:', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // ── ربط مشروع بمصلحة ────────────────────────────────────────────────────
  async function addLink(projectId, businessId) {
    const { error } = await supabase
      .from('project_businesses')
      .upsert(
        { project_id: projectId, business_id: businessId, user_id: userId },
        { onConflict: 'project_id,business_id' }
      )
    if (error) throw error
    setLinks(prev => {
      if (prev.some(l => l.project_id === projectId && l.business_id === businessId)) return prev
      return [...prev, { project_id: projectId, business_id: businessId }]
    })
  }

  // ── إلغاء ربط مشروع بمصلحة ──────────────────────────────────────────────
  async function removeLink(projectId, businessId) {
    const { error } = await supabase
      .from('project_businesses')
      .delete()
      .eq('project_id', projectId)
      .eq('business_id', businessId)
      .eq('user_id', userId)
    if (error) throw error
    setLinks(prev =>
      prev.filter(l => !(l.project_id === projectId && l.business_id === businessId))
    )
  }

  /**
   * setProjectLinks — يزامن المصالح المرتبطة بمشروع دفعةً واحدة.
   * يُضيف الجديدة ويحذف المُزالة.
   */
  async function setProjectLinks(projectId, businessIds) {
    const current = links
      .filter(l => l.project_id === projectId)
      .map(l => l.business_id)

    const toAdd    = businessIds.filter(bid => !current.includes(bid))
    const toRemove = current.filter(bid => !businessIds.includes(bid))

    const inserts = toAdd.map(bid => ({
      project_id:  projectId,
      business_id: bid,
      user_id:     userId,
    }))

    const ops = []
    if (inserts.length) {
      ops.push(
        supabase.from('project_businesses').upsert(inserts, { onConflict: 'project_id,business_id' })
      )
    }
    for (const bid of toRemove) {
      ops.push(
        supabase.from('project_businesses')
          .delete()
          .eq('project_id', projectId)
          .eq('business_id', bid)
          .eq('user_id', userId)
      )
    }

    const results = await Promise.all(ops)
    for (const { error } of results) {
      if (error) throw error
    }

    // حدّث الـ state محلياً
    setLinks(prev => {
      const withoutThis = prev.filter(l => l.project_id !== projectId)
      const newLinks    = businessIds.map(bid => ({ project_id: projectId, business_id: bid }))
      return [...withoutThis, ...newLinks]
    })
  }

  // ── helpers للاستعلام ────────────────────────────────────────────────────
  function getProjectsForBusiness(businessId) {
    return links
      .filter(l => l.business_id === businessId)
      .map(l => l.project_id)
  }

  function getBusinessesForProject(projectId) {
    return links
      .filter(l => l.project_id === projectId)
      .map(l => l.business_id)
  }

  return {
    links,
    loading,
    addLink,
    removeLink,
    setProjectLinks,
    getProjectsForBusiness,
    getBusinessesForProject,
    reload: load,
  }
}
