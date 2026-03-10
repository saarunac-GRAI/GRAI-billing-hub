import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendRenewalAlert } from '@/lib/alerts/email'

export async function POST(request: NextRequest) {
  // Verify n8n secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`
  if (process.env.N8N_WEBHOOK_SECRET && authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { subscription_id, alert_type, days_before } = await request.json()

  // Get full subscription
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .eq('id', subscription_id)
    .single()

  if (error || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  // Create alert record
  const { data: alert } = await supabase
    .from('alerts')
    .insert({
      subscription_id,
      alert_type,
      days_before,
      channel: 'email',
      status: 'pending',
    })
    .select()
    .single()

  // Send email
  const toEmail = process.env.GMAIL_USER!
  const result = await sendRenewalAlert(sub, days_before ?? 0, toEmail)

  // Update alert status
  await supabase
    .from('alerts')
    .update({
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error || null,
    })
    .eq('id', alert?.id)

  await supabase.from('logs').insert({
    event_type: 'alert_sent',
    entity_type: 'alert',
    entity_id: alert?.id,
    subscription_id,
    description: `${alert_type} alert ${result.success ? 'sent' : 'failed'} for ${sub.name}`,
    metadata: { days_before, channel: 'email' },
  })

  return NextResponse.json({ success: result.success, error: result.error })
}
