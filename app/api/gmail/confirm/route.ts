import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ConfirmItem {
  gmailMessageId: string
  gmailThreadId: string
  serviceName: string
  amount: number
  date: string
  invoiceRef: string | null
  subscriptionId?: string        // existing subscription to link
  createSubscription?: {         // or create a new one
    name: string
    project_id: string
    category: string
    billing_cycle: string
    cost_usd: number
    next_renewal_date: string
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const { items }: { items: ConfirmItem[] } = await request.json()

  const results = []

  for (const item of items) {
    let subscriptionId = item.subscriptionId

    // Create new subscription if requested
    if (!subscriptionId && item.createSubscription) {
      const { data: newSub, error } = await supabase
        .from('subscriptions')
        .insert({ ...item.createSubscription, source: 'gmail', gmail_thread_id: item.gmailThreadId })
        .select()
        .single()

      if (error) {
        results.push({ gmailMessageId: item.gmailMessageId, success: false, error: error.message })
        continue
      }
      subscriptionId = newSub.id
    }

    // Save spending history record
    const { data: histRecord, error: histError } = await supabase
      .from('spending_history')
      .insert({
        subscription_id: subscriptionId,
        amount_usd: item.amount,
        billed_at: item.date,
        source: 'gmail',
        invoice_ref: item.invoiceRef,
        gmail_message_id: item.gmailMessageId,
      })
      .select()
      .single()

    if (histError) {
      results.push({ gmailMessageId: item.gmailMessageId, success: false, error: histError.message })
      continue
    }

    // Log
    await supabase.from('logs').insert({
      event_type: 'gmail_ingested',
      entity_type: 'spending_history',
      entity_id: histRecord.id,
      description: `Gmail billing email ingested: ${item.serviceName} $${item.amount}`,
      metadata: { gmail_message_id: item.gmailMessageId },
    })

    results.push({ gmailMessageId: item.gmailMessageId, success: true })
  }

  return NextResponse.json({ results })
}
