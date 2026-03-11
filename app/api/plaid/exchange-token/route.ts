import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { public_token, institution_name, institution_id } = await request.json()
  const supabase = createAdminClient()

  try {
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    const { data, error } = await supabase
      .from('plaid_items')
      .upsert({ item_id, access_token, institution_name, institution_id }, { onConflict: 'item_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('logs').insert({
      event_type: 'plaid_connected',
      entity_type: 'plaid_item',
      entity_id: data.id,
      description: `Connected bank: ${institution_name || 'Unknown'}`,
    })

    return NextResponse.json({ success: true, item: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
