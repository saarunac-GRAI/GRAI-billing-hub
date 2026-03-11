'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Transaction, Project } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Upload, Pencil, RefreshCw } from 'lucide-react'

const classVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  project: 'success',
  personal: 'warning',
  uncategorized: 'muted',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ imported: number; skipped: number; format: string } | null>(null)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editClass, setEditClass] = useState('')
  const [editProject, setEditProject] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadTransactions(cls?: string) {
    const params = new URLSearchParams()
    if (cls) params.set('classification', cls)
    const res = await fetch('/api/transactions?' + params)
    const data = await res.json()
    setTransactions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []))
    loadTransactions()
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)

    const form = new FormData()
    form.append('file', file)
    form.append('source', file.name.toLowerCase().includes('chase') ? 'chase' : 'capitalone')

    const res = await fetch('/api/transactions/csv', { method: 'POST', body: form })
    const data = await res.json()

    if (!res.ok) {
      alert('Import failed: ' + (data.error || 'Unknown error'))
    } else {
      setUploadResult(data)
      await loadTransactions(filter || undefined)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFilterChange = useCallback((cls: string) => {
    setFilter(cls)
    loadTransactions(cls || undefined)
  }, [])

  async function saveOverride(id: string) {
    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, classification: editClass, project_id: editProject || null }),
    })
    setEditingId(null)
    await loadTransactions(filter || undefined)
  }

  const selectCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  const summary = {
    project: transactions.filter(t => t.classification === 'project').reduce((s, t) => s + t.amount, 0),
    personal: transactions.filter(t => t.classification === 'personal').reduce((s, t) => s + t.amount, 0),
    uncategorized: transactions.filter(t => t.classification === 'uncategorized').length,
  }

  return (
    <div>
      <Header title="Transactions" />
      <div className="p-6 max-w-7xl space-y-5">

        {/* How to export guide */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
          <p className="font-semibold mb-1">How to import your transactions:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li><strong>Capital One:</strong> capitalone.com → Account → Download → CSV → last 3 months</li>
            <li><strong>Chase:</strong> chase.com → Account activity → Download → CSV</li>
            <li><strong>Other banks:</strong> Download CSV statement → upload here (date, description, amount columns needed)</li>
          </ol>
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center justify-between">
            <span>
              Imported <strong>{uploadResult.imported}</strong> transactions
              {uploadResult.skipped > 0 && ` · ${uploadResult.skipped} duplicates skipped`}
              {' '}· Format detected: <strong>{uploadResult.format}</strong>
            </span>
            <button onClick={() => setUploadResult(null)} className="text-green-500 hover:text-green-700">✕</button>
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Project spend', value: formatCurrency(summary.project), color: 'text-green-600' },
            { label: 'Personal spend', value: formatCurrency(summary.personal), color: 'text-amber-600' },
            { label: 'Uncategorized', value: `${summary.uncategorized} txns`, color: 'text-gray-500' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className={`text-xl font-semibold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {['', 'project', 'personal', 'uncategorized'].map(cls => (
              <button
                key={cls}
                onClick={() => handleFilterChange(cls)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  filter === cls
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {cls === '' ? 'All' : cls.charAt(0).toUpperCase() + cls.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
              <Upload size={14} /> Import CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={() => loadTransactions(filter || undefined)}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      <p className="mb-1">No transactions yet.</p>
                      <p className="text-xs">Download a CSV from your bank and click Import CSV above.</p>
                    </td>
                  </tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{tx.description}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(tx.amount)}</td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <select value={editClass} onChange={e => setEditClass(e.target.value)} className={selectCls}>
                          <option value="project">Project</option>
                          <option value="personal">Personal</option>
                          <option value="uncategorized">Uncategorized</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant={classVariant[tx.classification] || 'muted'}>{tx.classification}</Badge>
                          {tx.is_manual && <span className="text-xs text-indigo-400" title="Manually set">✎</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <select value={editProject} onChange={e => setEditProject(e.target.value)} className={selectCls}>
                          <option value="">None</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : tx.project ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.project.color }} />
                          <span className="text-gray-600">{tx.project.name}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => saveOverride(tx.id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(tx.id); setEditClass(tx.classification); setEditProject(tx.project_id || '') }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
