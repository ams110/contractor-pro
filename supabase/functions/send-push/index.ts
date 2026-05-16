import webPush from "npm:web-push@3.6.7"

const VAPID_PUBLIC_KEY  = "BO6PvgB5GmV_Sq8g0pxYJm2T0F_JYRdtgCUkFmpb_KfYIaUjc0ytKxTI3GpoNZrH5gkvUhh4vUqjhpooZkX3l_k"
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")
if (!VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY env var is not set")
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

webPush.setVapidDetails("mailto:admin@contractor-pro.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })

  let payload: { user_id: string; title: string; body: string; type?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response("Bad Request", { status: 400 })
  }

  const { user_id, title, body } = payload
  if (!user_id || !title) return new Response("Missing fields", { status: 400 })

  // جلب كل اشتراكات هذا المستخدم
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user_id}&select=endpoint,p256dh,auth`,
    {
      headers: {
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    }
  )

  if (!res.ok) return new Response("DB error", { status: 500 })

  const subs: Array<{ endpoint: string; p256dh: string; auth: string }> = await res.json()
  if (!subs.length) return new Response("No subscriptions", { status: 200 })

  const notification = JSON.stringify({ title, body, icon: "/pwa-192.png", badge: "/pwa-192.png" })

  await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      ).catch(async (err: { statusCode?: number }) => {
        // اشتراك منتهي الصلاحية → احذفه
        if (err.statusCode === 404 || err.statusCode === 410) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            {
              method: "DELETE",
              headers: { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` },
            }
          )
        }
      })
    )
  )

  return new Response("ok", { status: 200 })
})
