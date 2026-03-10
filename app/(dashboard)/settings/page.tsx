'use client'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { GmailIngestReview } from '@/components/subscriptions/GmailIngestReview'
import { Mail, Shield } from 'lucide-react'

export default function SettingsPage() {
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
