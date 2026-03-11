import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAll } from '@/lib/push/send'

// POST /api/push/subscribe  — save browser push subscription
// POST /api/push/send       — test send push (admin)
// DELETE /api/push          — unsubscribe

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()
  const { action } = body

  if (action === 'subscribe') {
    const { endpoint, p256dh, auth } = body
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'endpoint, p256dh, auth required' }, { status: 400 })
    }
    const ua = request.headers.get('user-agent') || null
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh, auth, user_agent: ua }, { onConflict: 'endpoint' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'send-test') {
    await sendPushToAll('Billing Hub', 'Push notifications are working!', '/')
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient()
  const { endpoint } = await request.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
