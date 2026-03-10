import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchImapBillingEmails } from '@/lib/imap/parser'
import { getYahooAccount } from '@/lib/imap/client'

export const dynamic = 'force-dynamic'

// GET /api/imap/ingest — preview Yahoo emails (no save)
export async function GET() {
  try {
    const { defaultProjectId } = getYahooAccount()

    if (!process.env.YAHOO_APP_PASSWORD || process.env.YAHOO_APP_PASSWORD === 'PASTE_YAHOO_APP_PASSWORD_HERE') {
      return NextResponse.json({ error: 'Yahoo App Password not configured' }, { status: 400 })
    }

    const emails = await fetchImapBillingEmails(defaultProjectId)
    return NextResponse.json({ emails, count: emails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'IMAP fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/imap/ingest — save confirmed subscriptions
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { emails } = body as {
      emails: Array<{
        serviceName: string
        amount: number
        billingPeriod: string
        projectId: string
        date: string
      }>
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const saved: string[] = []

    for (const email of emails) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          project_id: email.projectId,
          service_name: email.serviceName,
          amount: email.amount,
          currency: 'USD',
          billing_period: email.billingPeriod,
          next_renewal_date: email.date,
          status: 'active',
          source: 'imap',
        })
        .select('id')
        .single()

      if (!error && data) saved.push(data.id)
    }

    return NextResponse.json({ saved: saved.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
