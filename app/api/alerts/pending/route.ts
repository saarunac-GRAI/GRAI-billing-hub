import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDaysUntil, getAlertDaysThresholds } from '@/lib/utils'

// n8n calls this endpoint daily to get pending alerts
export async function GET(request: NextRequest) {
  // Verify n8n secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`
  if (process.env.N8N_WEBHOOK_SECRET && authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const thresholds = getAlertDaysThresholds() // [14, 7, 3, 1]

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .in('status', ['active', 'overdue'])
    .not('next_renewal_date', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const pendingAlerts = []

  for (const sub of subscriptions || []) {
    const days = getDaysUntil(sub.next_renewal_date)

    // Overdue
    if (days < 0) {
      // Check if overdue alert was already sent today
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('alert_type', 'overdue')
        .eq('status', 'sent')
        .gte('created_at', today)
        .limit(1)

      if (!existing?.length) {
        pendingAlerts.push({ subscription: sub, alert_type: 'overdue', days_before: days })
      }
      continue
    }

    // Upcoming renewal thresholds
    for (const threshold of thresholds) {
      if (days <= threshold) {
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('alert_type', 'renewal')
          .eq('days_before', threshold)
          .eq('status', 'sent')
          .limit(1)

        if (!existing?.length) {
          pendingAlerts.push({ subscription: sub, alert_type: 'renewal', days_before: threshold })
          break // Only send for the closest threshold
        }
      }
    }
  }

  return NextResponse.json({ alerts: pendingAlerts, count: pendingAlerts.length })
}
