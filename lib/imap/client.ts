import { ImapFlow } from 'imapflow'

export function createImapClient() {
  return new ImapFlow({
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.YAHOO_EMAIL!,
      pass: process.env.YAHOO_APP_PASSWORD!,
    },
    logger: false,
  })
}

export function getYahooAccount() {
  return {
    email: process.env.YAHOO_EMAIL!,
    defaultProjectId: process.env.YAHOO_DEFAULT_PROJECT_ID!,
  }
}
