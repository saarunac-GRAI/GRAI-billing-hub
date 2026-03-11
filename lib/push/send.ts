import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToAll(title: string, body: string, url?: string) {
  const supabase = createAdminClient()
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs?.length) return

  const payload = JSON.stringify({ title, body, url: url || '/' })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  // Remove expired/invalid subscriptions
  const expired = results
    .map((r, i) => (r.status === 'rejected' ? subs[i].endpoint : null))
    .filter(Boolean) as string[]

  if (expired.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }
}
