import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { CountryCode, Products } from 'plaid'

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'billing-hub-user' },
      client_name: 'GRAI Billing Hub',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    return NextResponse.json({ link_token: response.data.link_token })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create link token'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
