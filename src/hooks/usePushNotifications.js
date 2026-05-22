import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const PREF_KEY        = 'cpro_notif_prefs'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') } catch { return {} }
}
export function setNotifPref(key, val) {
  const prefs = getNotifPrefs()
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, [key]: val }))
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Returns 'ok' | 'no_vapid' | 'sw_error' | 'subscribe_error' | 'db_error'
export async function subscribePush(userId) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set — skipping subscribe')
    return 'no_vapid'
  }
  try {
    const reg = await navigator.serviceWorker.ready
    // Always unsubscribe stale subscription and re-subscribe to refresh keys
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const json = sub.toJSON()
    if (!json?.keys?.p256dh || !json?.keys?.auth) {
      console.warn('[Push] Subscription missing keys')
      return 'subscribe_error'
    }
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: json.endpoint,
      p256dh:   json.keys.p256dh,
      auth:     json.keys.auth,
    }, { onConflict: 'endpoint' })
    if (error) {
      console.warn('[Push] DB upsert error:', error.message)
      return 'db_error'
    }
    console.info('[Push] Subscription saved ✓')
    return 'ok'
  } catch (e) {
    console.warn('[Push] Subscribe error:', e.message || e)
    return 'subscribe_error'
  }
}

export async function unsubscribePush(userId) {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await supabase.from('push_subscriptions').delete()
        .eq('user_id', userId).eq('endpoint', sub.endpoint)
    }
  } catch (e) {
    console.warn('[Push] Unsubscribe error:', e)
  }
}

export async function getPushSubscriptionCount(userId) {
  const { count } = await supabase.from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count || 0
}

export function usePushNotifications(userId) {
  const supported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'denied'
  )
  const [subStatus, setSubStatus] = useState('idle') // idle | subscribing | ok | error | no_vapid

  // Subscribe whenever permission is granted and user is logged in
  useEffect(() => {
    if (!supported || permission !== 'granted' || !userId) return
    setSubStatus('subscribing')
    subscribePush(userId).then(result => {
      setSubStatus(result === 'ok' ? 'ok' : result)
    })
  }, [userId, permission, supported])

  async function requestPermission() {
    if (!supported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && userId) {
      setSubStatus('subscribing')
      const status = await subscribePush(userId)
      setSubStatus(status === 'ok' ? 'ok' : status)
    }
    return result
  }

  async function forceResubscribe() {
    if (!supported || !userId) return
    // Unsubscribe existing then resubscribe fresh
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
    } catch {}
    setSubStatus('subscribing')
    const status = await subscribePush(userId)
    setSubStatus(status === 'ok' ? 'ok' : status)
    return status
  }

  // In-app foreground notification (only when app is open)
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

  return { supported, permission, subStatus, requestPermission, forceResubscribe, notify }
}
