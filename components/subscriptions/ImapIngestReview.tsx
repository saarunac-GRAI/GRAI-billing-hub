'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ParsedImapEmail } from '@/types'

interface EmailRow extends ParsedImapEmail {
  selected: boolean
  assignedProjectId: string
}

interface Project {
  id: string
  name: string
}

export function ImapIngestReview({ projects }: { projects: Project[] }) {
  const [rows, setRows] = useState<EmailRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)

  async function scanInbox() {
    setLoading(true)
    setError('')
    setSaved(0)
    try {
      const res = await fetch('/api/imap/ingest')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setRows(
        (data.emails as ParsedImapEmail[]).map(e => ({
          ...e,
          selected: true,
          assignedProjectId: e.suggestedProjectId || projects[0]?.id || '',
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  async function saveSelected() {
    const selected = rows.filter(r => r.selected)
    if (!selected.length) return
    setSaving(true)
    try {
      const res = await fetch('/api/imap/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: selected.map(r => ({
            serviceName: r.serviceName,
            amount: r.amount,
            billingPeriod: r.billingPeriod || 'monthly',
            projectId: r.assignedProjectId,
            date: r.date instanceof Date ? r.date.toISOString() : r.date,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(data.saved)
      setRows([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }

  function setProject(idx: number, projectId: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, assignedProjectId: projectId } : r))
  }

  const selectedCount = rows.filter(r => r.selected).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={scanInbox} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Yahoo Inbox'}
        </Button>
        {saved > 0 && (
          <span className="text-sm text-emerald-600 font-medium">{saved} subscription(s) saved!</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm text-gray-600">
            Found <strong>{rows.length}</strong> billing emails. Select which to import and assign to a project.
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left w-8"></th>
                  <th className="p-3 text-left">Service</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.selected ? '' : 'opacity-40'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(idx)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{row.serviceName}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{row.from}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant={row.confidence >= 0.8 ? 'success' : 'warning'}>
                        {formatCurrency(row.amount)}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-600">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <select
                        value={row.assignedProjectId}
                        onChange={e => setProject(idx, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={saveSelected}
              disabled={saving || selectedCount === 0}
            >
              {saving ? 'Saving...' : `Import ${selectedCount} Subscription(s)`}
            </Button>
            <button
              onClick={() => setRows([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}
