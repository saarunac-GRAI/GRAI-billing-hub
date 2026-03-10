import { google } from 'googleapis'

export function getGmailOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  )
}

export function getAuthenticatedGmailClient() {
  const auth = getGmailOAuth2Client()
  auth.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
  })
  return google.gmail({ version: 'v1', auth })
}

export function getGmailAuthUrl(): string {
  const oauth2Client = getGmailOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    prompt: 'consent',
  })
}
