import { getAuthenticatedGmailClient } from '@/lib/gmail/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Subscription } from '@/types'

function encodeEmailRFC2822(to: string, subject: string, htmlBody: string): string {
  const raw = [
    `To: ${to}`,
    `From: Billing Hub <${process.env.GMAIL_USER}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
  ].join('\r\n')

  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildRenewalEmailHtml(sub: Subscription, daysUntil: number): string {
  const urgencyColor = daysUntil <= 1 ? '#dc2626' : daysUntil <= 3 ? '#ea580c' : '#d97706'
  const renewalDate = sub.next_renewal_date ? formatDate(sub.next_renewal_date) : 'Unknown'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
  <div style="border-left: 4px solid ${urgencyColor}; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 4px; color: ${urgencyColor};">
      ${daysUntil <= 0 ? 'Subscription Overdue' : `Renewal in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
    </h2>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Billing Hub Alert</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr style="background: #f9fafb;">
      <td style="padding: 12px; font-weight: 600; border: 1px solid #e5e7eb;">Service</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${sub.name}</td>
    </tr>
    <tr>
      <td style="padding: 12px; font-weight: 600; border: 1px solid #e5e7eb;">Amount</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatCurrency(sub.cost_usd)} / ${sub.billing_cycle}</td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 12px; font-weight: 600; border: 1px solid #e5e7eb;">Renewal Date</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${renewalDate}</td>
    </tr>
    ${sub.project ? `
    <tr>
      <td style="padding: 12px; font-weight: 600; border: 1px solid #e5e7eb;">Project</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${sub.project.name}</td>
    </tr>` : ''}
  </table>

  <a href="${appUrl}/subscriptions" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
    View in Billing Hub
  </a>

  <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
    This alert was sent by Billing Hub.
    <a href="${appUrl}/settings" style="color: #6366f1;">Manage alerts</a>
  </p>
</body>
</html>`
}

export async function sendRenewalAlert(
  sub: Subscription,
  daysUntil: number,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const gmail = getAuthenticatedGmailClient()
    const subject = daysUntil <= 0
      ? `[Billing Hub] OVERDUE: ${sub.name}`
      : `[Billing Hub] Renewal in ${daysUntil} day${daysUntil === 1 ? '' : 's'}: ${sub.name}`

    const html = buildRenewalEmailHtml(sub, daysUntil)
    const raw = encodeEmailRFC2822(toEmail, subject, html)

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
