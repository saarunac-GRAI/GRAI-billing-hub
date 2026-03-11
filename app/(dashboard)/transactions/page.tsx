'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Transaction, Project } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { RefreshCw, Link2, Pencil } from 'lucide-react'

const classVariant: Record<string, 'success' | 'warning' | 'muted' | 'danger'> = {
  project: 'success',
  personal: 'warning',
  uncategorized: 'muted',
}

function PlaidConnectButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then(r => r.json())
      .then(d => setLinkToken(d.link_token))
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken || '',
    onSuccess: async (public_token, metadata) => {
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          institution_name: metadata.institution?.name,
          institution_id: metadata.institution?.institution_id,
        }),
      })
      onSuccess()
    },
  })

  return (
    <Button size="sm" variant="secondary" onClick={() => open()} disabled={!ready || !linkToken}>
      <Link2 size={14} /> Connect Bank
    </Button>
  )
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editClass, setEditClass] = useState('')
  const [editProject, setEditProject] = useState('')

  async function loadTransactions(cls?: string) {
    const params = new URLSearchParams()
    if (cls) params.set('classification', cls)
    const res = await fetch('/api/transactions?' + params)
    const data = await res.json()
    setTransactions(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function loadProjects() {
    const data = await fetch('/api/projects').then(r => r.json())
    setProjects(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadProjects()
    loadTransactions()
  }, [])

  async function handleRefresh() {
    setSyncing(true)
    const res = await fetch('/api/plaid/transactions', { method: 'POST' })
    const data = await res.json()
    if (data.error) alert('Sync error: ' + data.error)
    await loadTransactions(filter || undefined)
    setSyncing(false)
  }

  async function saveOverride(id: string) {
    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        classification: editClass,
        project_id: editProject || null,
      }),
    })
    setEditingId(null)
    await loadTransactions(filter || undefined)
  }

  const handleFilterChange = useCallback((cls: string) => {
    setFilter(cls)
    loadTransactions(cls || undefined)
  }, [])

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
            <PlaidConnectButton onSuccess={handleRefresh} />
            <Button size="sm" onClick={handleRefresh} loading={syncing}>
              <RefreshCw size={14} /> Refresh Transactions
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Merchant</th>
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
                      <p className="mb-2">No transactions yet.</p>
                      <p className="text-xs">Connect a bank account and click Refresh Transactions.</p>
                    </td>
                  </tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{tx.merchant_name || tx.description}</p>
                      {tx.merchant_name && tx.description !== tx.merchant_name && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(tx.amount)}
                      {tx.pending && <span className="ml-1 text-xs text-amber-500">pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <select
                          value={editClass}
                          onChange={e => setEditClass(e.target.value)}
                          className={selectCls}
                        >
                          <option value="project">Project</option>
                          <option value="personal">Personal</option>
                          <option value="uncategorized">Uncategorized</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant={classVariant[tx.classification] || 'muted'}>
                            {tx.classification}
                          </Badge>
                          {tx.is_manual && (
                            <span className="text-xs text-indigo-400" title="Manually classified">✎</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <select
                          value={editProject}
                          onChange={e => setEditProject(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">None</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      ) : tx.project ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tx.project.color }} />
                          <span className="text-gray-600">{tx.project.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === tx.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" onClick={() => saveOverride(tx.id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(tx.id)
                            setEditClass(tx.classification)
                            setEditProject(tx.project_id || '')
                          }}
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
