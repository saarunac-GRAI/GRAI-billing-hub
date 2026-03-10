'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { GmailIngestReview } from '@/components/subscriptions/GmailIngestReview'
import { ImapIngestReview } from '@/components/subscriptions/ImapIngestReview'
import { Mail, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || []))
  }, [])

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6 max-w-3xl space-y-6">
        {/* Gmail connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-indigo-600" />
              <CardTitle>Gmail Billing Import</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <GmailIngestReview />
          </CardContent>
        </Card>

        {/* Yahoo IMAP */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-purple-600" />
              <CardTitle>Yahoo Mail Billing Import</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
              <p className="font-medium">Setup required:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to <strong>Yahoo Account Security</strong> → Generate App Password</li>
                <li>Select "Other App" → name it "Billing Hub"</li>
                <li>Copy the 16-char password into <code className="bg-amber-100 px-1 rounded">.env.local</code> as <code className="bg-amber-100 px-1 rounded">YAHOO_APP_PASSWORD</code></li>
                <li>Restart the dev server</li>
              </ol>
            </div>
            <p className="text-sm text-gray-600">
              Account: <span className="font-medium">{process.env.NEXT_PUBLIC_YAHOO_EMAIL || 'arunachalamsandeep@yahoo.com'}</span>
            </p>
            <ImapIngestReview projects={projects} />
          </CardContent>
        </Card>

        {/* Gmail connect */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-600" />
              <CardTitle>Gmail API Connection</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Connected account: <span className="font-medium">saarunac@gmail.com</span>
            </p>
            <p className="text-xs text-gray-400">
              Read-only access to billing emails. Emails are never stored — only amounts, dates, and service names are extracted.
            </p>
            <a
              href="/api/gmail/auth"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reconnect Gmail
            </a>
          </CardContent>
        </Card>

        {/* n8n webhook info */}
        <Card>
          <CardHeader>
            <CardTitle>n8n Alert Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">Configure your n8n workflow to call these endpoints daily:</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2 font-mono text-xs text-gray-700">
              <p><span className="text-indigo-600">GET</span> {typeof window !== 'undefined' ? window.location.origin : ''}/api/alerts/pending</p>
              <p><span className="text-emerald-600">POST</span> {typeof window !== 'undefined' ? window.location.origin : ''}/api/alerts/send</p>
            </div>
            <p className="text-xs text-gray-400">
              Set <code className="bg-gray-100 px-1 py-0.5 rounded">Authorization: Bearer YOUR_N8N_WEBHOOK_SECRET</code> header on both requests.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
