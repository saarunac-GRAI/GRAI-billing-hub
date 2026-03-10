import { NextRequest, NextResponse } from 'next/server'
import { getGmailOAuth2Client } from '@/lib/gmail/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const oauth2Client = getGmailOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  // In production, store refresh_token securely (e.g., Supabase secrets or env var)
  // For now, display it so you can add it to your .env.local
  return NextResponse.json({
    message: 'Gmail connected successfully. Copy the refresh_token to your .env.local as GMAIL_REFRESH_TOKEN.',
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
  })
}
