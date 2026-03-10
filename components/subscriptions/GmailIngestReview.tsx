'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ParsedBillingEmail, Project } from '@/types'
import { Mail, Check, X, RefreshCw } from 'lucide-react'

export function GmailIngestReview() {
  const [emails, setEmails] = useState<ParsedBillingEmail[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  async function fetchEmails() {
    setLoading(true)
    try {
      const res = await fetch('/api/gmail/ingest')
      const data = await res.json()
      if (data.emails) {
        setEmails(data.emails)
        setSelected(new Set(data.emails.map((e: ParsedBillingEmail) => e.gmailMessageId)))
      }
    } finally {
      setLoading(false)
    }
  }

  async function confirmSelected() {
    setSaving(true)
    const items = emails
      .filter(e => selected.has(e.gmailMessageId))
      .map(e => ({
        gmailMessageId: e.gmailMessageId,
        gmailThreadId: e.gmailThreadId,
        serviceName: e.serviceName,
        amount: e.amount || 0,
        date: e.date,
        invoiceRef: e.invoiceRef,
        subscriptionId: e.matchedSubscriptionId,
      }))

    await fetch('/api/gmail/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check size={24} className="text-emerald-600" />
        </div>
        <p className="font-medium text-gray-900">Import complete!</p>
        <p className="text-sm text-gray-500 mt-1">{selected.size} billing records saved to spending history.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setDone(false); setEmails([]) }}>
          Import more
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Gmail Billing Import</h3>
          <p className="text-xs text-gray-500 mt-0.5">Scans saarunac@gmail.com for receipts and invoices</p>
        </div>
        <Button size="sm" onClick={fetchEmails} loading={loading}>
          <RefreshCw size={13} /> {emails.length > 0 ? 'Refresh' : 'Scan Inbox'}
        </Button>
      </div>

      {emails.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Mail size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Click "Scan Inbox" to fetch billing emails</p>
        </div>
      )}

      {emails.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-600">{emails.length} billing emails found</p>
            <button className="text-xs text-indigo-600 hover:underline" onClick={() => setSelected(new Set(emails.map(e => e.gmailMessageId)))}>
              Select all
            </button>
            <button className="text-xs text-gray-500 hover:underline" onClick={() => setSelected(new Set())}>
              Deselect all
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {emails.map(email => (
              <div
                key={email.gmailMessageId}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${selected.has(email.gmailMessageId) ? 'bg-indigo-50/40' : ''}`}
                onClick={() => {
                  const next = new Set(selected)
                  if (next.has(email.gmailMessageId)) next.delete(email.gmailMessageId)
                  else next.add(email.gmailMessageId)
                  setSelected(next)
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(email.gmailMessageId)}
                  readOnly
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{email.serviceName}</p>
                  <p className="text-xs text-gray-400 truncate">{email.subject}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(email.amount || 0)}</p>
                  <p className="text-xs text-gray-400">{email.date}</p>
                </div>
                {email.matchedSubscriptionId && (
                  <Badge variant="success">Matched</Badge>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setEmails([])}>
              <X size={13} /> Clear
            </Button>
            <Button size="sm" onClick={confirmSelected} loading={saving} disabled={selected.size === 0}>
              <Check size={13} /> Import {selected.size} records
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
