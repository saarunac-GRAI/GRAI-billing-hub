import { NextRequest, NextResponse } from 'next/server'
import { fetchBillingEmails } from '@/lib/gmail/parser'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const maxResults = parseInt(searchParams.get('max') || '100')

  try {
    const emails = await fetchBillingEmails(maxResults)

    // Check which gmail_message_ids are already in spending_history
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('spending_history')
      .select('gmail_message_id')
      .not('gmail_message_id', 'is', null)

    const existingIds = new Set((existing || []).map(e => e.gmail_message_id))
    const newEmails = emails.filter(e => !existingIds.has(e.gmailMessageId))

    // Try to match to existing subscriptions by service name
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, name')

    for (const email of newEmails) {
      const match = (subscriptions || []).find(s =>
        s.name.toLowerCase().includes(email.serviceName.toLowerCase()) ||
        email.serviceName.toLowerCase().includes(s.name.toLowerCase())
      )
      if (match) email.matchedSubscriptionId = match.id
    }

    return NextResponse.json({ emails: newEmails, total: newEmails.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
