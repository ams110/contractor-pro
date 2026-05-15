import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const PREF_KEY      = 'cpro_notif_prefs'
const VAPID_PUBLIC  = 'BO6PvgB5GmV_Sq8g0pxYJm2T0F_JYRdtgCUkFmpb_KfYIaUjc0ytKxTI3GpoNZrH5gkvUhh4vUqjhpooZkX3l_k'

export function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}

export function setNotifPref(key, val) {
  const prefs = getNotifPrefs()
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, [key]: val }))
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(userId) {
  const supported   = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (supported) setPermission(Notification.permission)
  }, [supported])

  // اشتراك Web Push حقيقي (يشتغل حتى لو التطبيق مغلق)
  const subscribeToPush = useCallback(async () => {
    if (!supported || !userId) return
    setSubscribing(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })

      const json    = sub.toJSON()
      const p256dh  = json.keys?.p256dh
      const authKey = json.keys?.auth

      if (!p256dh || !authKey) throw new Error('Push subscription missing keys')

      await supabase.from('push_subscriptions').upsert(
        { user_id: userId, endpoint: sub.endpoint, p256dh, auth: authKey },
        { onConflict: 'endpoint' }
      )
    } finally {
      setSubscribing(false)
    }
  }, [supported, userId])

  // إلغاء الاشتراك
  const unsubscribeFromPush = useCallback(async () => {
    if (!supported) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
    setPermission('default')
  }, [supported])

  // إشعار فوري (لما التطبيق مفتوح - fallback)
  const notify = useCallback((title, body, tag) => {
    if (!supported || Notification.permission !== 'granted') return
    const prefs = getNotifPrefs()
    if (prefs[tag] === false) return
    try {
      new Notification(title, {
        body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag, renotify: true,
      })
    } catch { /* ignore */ }
  }, [supported])

  return { supported, permission, subscribing, subscribeToPush, unsubscribeFromPush, notify }
}
