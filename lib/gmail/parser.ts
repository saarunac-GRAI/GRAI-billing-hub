import { getAuthenticatedGmailClient } from './client'
import type { ParsedBillingEmail } from '@/types'

// Known billing senders mapped to service names
const SERVICE_PATTERNS: Record<string, string> = {
  'hackenapp': 'HackenApp',
  'namecheap': 'Namecheap',
  'natify': 'Natify',
  'lovable': 'Lovable.dev',
  'n8n': 'n8n',
  'anthropic': 'Cloud Chat / Cloud Code',
  'claude': 'Cloud Chat / Cloud Code',
  'netlify': 'Netlify',
  'vercel': 'Vercel',
  'supabase': 'Supabase',
  'github': 'GitHub',
  'google': 'Google',
  'aws': 'AWS',
  'stripe': '',  // pass-through — use subject
  'paypal': '',  // pass-through — use subject
}

const BILLING_SEARCH_QUERY =
  'subject:(receipt OR invoice OR subscription OR renewal OR "payment confirmation" OR "billing" OR "charged" OR "order confirmation") newer_than:365d'

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractAmount(text: string): number | null {
  // Match patterns like $9.99, USD 29.00, 99.00 USD
  const patterns = [
    /\$\s?([\d,]+\.?\d{0,2})/,
    /USD\s?([\d,]+\.?\d{0,2})/i,
    /([\d,]+\.?\d{0,2})\s?USD/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(amount) && amount > 0 && amount < 100000) return amount
    }
  }
  return null
}

function extractServiceFromSender(senderEmail: string, subject: string): string {
  const emailLower = senderEmail.toLowerCase()
  for (const [key, name] of Object.entries(SERVICE_PATTERNS)) {
    if (emailLower.includes(key)) return name || subject
  }
  // Fallback: extract domain name
  const domainMatch = senderEmail.match(/@([^.]+)\./)
  if (domainMatch) {
    return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1)
  }
  return subject
}

function extractInvoiceRef(text: string): string | null {
  const patterns = [
    /invoice\s?#?\s?([A-Z0-9-]{4,20})/i,
    /order\s?#?\s?([A-Z0-9-]{4,20})/i,
    /receipt\s?#?\s?([A-Z0-9-]{4,20})/i,
    /#([A-Z0-9-]{6,20})/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return null
}

export async function fetchBillingEmails(maxResults = 100): Promise<ParsedBillingEmail[]> {
  const gmail = getAuthenticatedGmailClient()

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: BILLING_SEARCH_QUERY,
    maxResults,
  })

  const messages = listRes.data.messages || []
  const parsed: ParsedBillingEmail[] = []

  for (const msg of messages) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })

      const payload = msgRes.data.payload
      if (!payload) continue

      const headers = payload.headers || []
      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const date = headers.find(h => h.name === 'Date')?.value || ''

      // Extract sender name and email
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
      const senderName = fromMatch ? fromMatch[1].trim().replace(/"/g, '') : from
      const senderEmail = fromMatch ? fromMatch[2] : from

      // Get body text
      let bodyText = msgRes.data.snippet || ''
      if (payload.body?.data) {
        bodyText = decodeBase64(payload.body.data)
      } else if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText = decodeBase64(part.body.data)
            break
          }
        }
      }

      const amount = extractAmount(bodyText) || extractAmount(subject)
      const serviceName = extractServiceFromSender(senderEmail, senderName || subject)
      const invoiceRef = extractInvoiceRef(bodyText)

      // Skip if no amount found and subject doesn't look like billing
      if (!amount) continue

      parsed.push({
        gmailMessageId: msg.id!,
        gmailThreadId: msgRes.data.threadId || msg.id!,
        subject,
        sender: senderName,
        senderEmail,
        date: new Date(date).toISOString().split('T')[0],
        amount,
        currency: 'USD',
        serviceName,
        invoiceRef,
        rawSnippet: msgRes.data.snippet || '',
      })
    } catch {
      // Skip individual message errors
      continue
    }
  }

  // Deduplicate by gmailMessageId
  const seen = new Set<string>()
  return parsed.filter(p => {
    if (seen.has(p.gmailMessageId)) return false
    seen.add(p.gmailMessageId)
    return true
  })
}
