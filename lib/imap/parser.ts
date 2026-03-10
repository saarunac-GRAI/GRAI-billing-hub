import { simpleParser } from 'mailparser'
import { createImapClient } from './client'
import type { ParsedImapEmail } from '@/types'

const BILLING_KEYWORDS = [
  'invoice', 'receipt', 'payment', 'subscription', 'billing', 'charge',
  'renewal', 'plan', 'order confirmation', 'purchase', 'transaction',
]

const AMOUNT_PATTERNS = [
  /\$\s?([\d,]+\.?\d{0,2})/,
  /USD\s?([\d,]+\.?\d{0,2})/,
  /([\d,]+\.?\d{0,2})\s?USD/,
  /total[:\s]+\$?([\d,]+\.?\d{0,2})/i,
  /amount[:\s]+\$?([\d,]+\.?\d{0,2})/i,
  /charged[:\s]+\$?([\d,]+\.?\d{0,2})/i,
]

function extractAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''))
      if (amount > 0 && amount < 10000) return amount
    }
  }
  return null
}

function extractServiceName(from: string, subject: string): string {
  // Try to get domain from email address
  const emailMatch = from.match(/@([\w.-]+)/)
  if (emailMatch) {
    const domain = emailMatch[1]
    const parts = domain.split('.')
    if (parts.length >= 2) {
      return parts[parts.length - 2]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    }
  }
  return subject.substring(0, 40)
}

function isBillingEmail(subject: string, text: string): boolean {
  const combined = (subject + ' ' + text).toLowerCase()
  return BILLING_KEYWORDS.some(kw => combined.includes(kw))
}

export async function fetchImapBillingEmails(
  defaultProjectId: string,
  maxMessages = 50
): Promise<ParsedImapEmail[]> {
  const client = createImapClient()
  const results: ParsedImapEmail[] = []

  await client.connect()

  try {
    await client.mailboxOpen('INBOX')

    // Search for emails with billing keywords in the last 90 days
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const messages = client.fetch(
      { since },
      { source: true, uid: true, envelope: true },
      { uid: true }
    )

    let count = 0
    for await (const msg of messages) {
      if (count >= maxMessages) break

      try {
        if (!msg.source) continue
        const parsed = await simpleParser(msg.source)
        const subject = parsed.subject || ''
        const textContent = parsed.text || ''
        const htmlContent = parsed.html || ''
        const bodyText = textContent || htmlContent.replace(/<[^>]+>/g, ' ')
        const fromAddress = parsed.from?.text || ''

        if (!isBillingEmail(subject, bodyText)) continue

        const amount = extractAmount(bodyText)
        if (!amount) continue

        const serviceName = extractServiceName(fromAddress, subject)

        results.push({
          messageId: `yahoo-${msg.uid}`,
          from: fromAddress,
          subject,
          date: parsed.date || new Date(),
          amount,
          currency: 'USD',
          serviceName,
          billingPeriod: 'monthly',
          confidence: 0.7,
          rawSnippet: bodyText.substring(0, 300),
          suggestedProjectId: defaultProjectId,
        })

        count++
      } catch {
        // skip unparseable messages
      }
    }
  } finally {
    await client.logout()
  }

  return results
}
