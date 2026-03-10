'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SubscriptionForm } from './SubscriptionForm'
import { formatCurrency, formatDate, getDaysUntil, getRenewalUrgency } from '@/lib/utils'
import type { Subscription, SubscriptionStatus, BillingCycle, Project } from '@/types'
import { Pencil, Trash2, Plus, ExternalLink } from 'lucide-react'

const statusVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  active: 'success',
  paused: 'muted',
  cancelled: 'muted',
  overdue: 'danger',
}

interface Props {
  subscriptions: Subscription[]
  projects: Project[]
  onAdd: (data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onEdit: (id: string, data: Partial<Subscription>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SubscriptionTable({ subscriptions, projects, onAdd, onEdit, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCycle, setFilterCycle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = subscriptions.filter(s => {
    if (filterProject && s.project_id !== filterProject) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (filterCycle && s.billing_cycle !== filterCycle) return false
    return true
  })

  const selectCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={selectCls} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {['active', 'paused', 'cancelled', 'overdue'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select className={selectCls} value={filterCycle} onChange={e => setFilterCycle(e.target.value)}>
            <option value="">All Cycles</option>
            {['monthly', 'yearly', 'quarterly', 'one-time'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          {(filterProject || filterStatus || filterCycle) && (
            <button
              className="text-xs text-indigo-600 hover:underline"
              onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterCycle('') }}
            >
              Clear filters
            </button>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Subscription
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cycle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Renewal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    No subscriptions found.
                  </td>
                </tr>
              ) : filtered.map(sub => {
                const daysUntil = sub.next_renewal_date ? getDaysUntil(sub.next_renewal_date) : null
                const urgency = daysUntil !== null ? getRenewalUrgency(daysUntil) : 'ok'
                return (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{sub.name}</span>
                        {sub.website_url && (
                          <a href={sub.website_url} target="_blank" rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{sub.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      {sub.project ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.project.color }} />
                          <span className="text-gray-600">{sub.project.name}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(sub.cost_usd)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{sub.billing_cycle}</td>
                    <td className="px-4 py-3">
                      {sub.next_renewal_date ? (
                        <div>
                          <p className="text-gray-700">{formatDate(sub.next_renewal_date)}</p>
                          {daysUntil !== null && (
                            <p className={`text-xs ${urgency === 'overdue' || urgency === 'critical' ? 'text-red-500' : urgency === 'warning' ? 'text-amber-500' : 'text-gray-400'}`}>
                              {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `in ${daysUntil}d`}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[sub.status]}>{sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditing(sub)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sub.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} subscription{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== subscriptions.length && ` (filtered from ${subscriptions.length})`}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Subscription" size="lg">
        <SubscriptionForm
          onSave={async (data) => { await onAdd(data as any); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Subscription" size="lg">
        <SubscriptionForm
          subscription={editing}
          onSave={async (data) => { if (editing) { await onEdit(editing.id, data as any); setEditing(null) } }}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Subscription" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          Are you sure? This will permanently delete the subscription and all associated spending history.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            if (deleteConfirm) { await onDelete(deleteConfirm); setDeleteConfirm(null) }
          }}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
