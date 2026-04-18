import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useProfile(userId) {
  const [profile,  setProfile]  = useState({ full_name: '', avatar_url: '' })
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [uploading,setUploading]= useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase.from('profiles').select('*').eq('id', userId).single()
      .then(({ data }) => { if (data) setProfile(data) })
      .finally(() => setLoading(false))
  }, [userId])

  async function saveName(full_name) {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles')
        .upsert({ id: userId, full_name, avatar_url: profile.avatar_url }, { onConflict: 'id' })
      if (error) throw error
      setProfile(prev => ({ ...prev, full_name }))
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatar(file) {
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatar_url = data.publicUrl + '?t=' + Date.now()

      const { error: dbErr } = await supabase.from('profiles')
        .upsert({ id: userId, full_name: profile.full_name, avatar_url }, { onConflict: 'id' })
      if (dbErr) throw dbErr

      setProfile(prev => ({ ...prev, avatar_url }))
      return avatar_url
    } finally {
      setUploading(false)
    }
  }

  return { profile, loading, saving, uploading, saveName, uploadAvatar }
}
