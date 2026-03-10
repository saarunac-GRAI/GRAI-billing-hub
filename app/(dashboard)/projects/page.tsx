'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, toMonthlyCost, toYearlyCost } from '@/lib/utils'
import type { Project, Subscription } from '@/types'
import { FolderOpen, Plus } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  async function load() {
    const [projs, subs] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/subscriptions').then(r => r.json()),
    ])
    setProjects(projs)
    setSubscriptions(subs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createProject() {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, color: newColor }),
    })
    setShowNew(false)
    setNewName('')
    setNewDesc('')
    await load()
  }

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

  return (
    <div>
      <Header title="Projects" />
      <div className="p-6 max-w-5xl space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowNew(true)}><Plus size={14} /> New Project</Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => {
              const subs = subscriptions.filter(s => s.project_id === project.id && s.status === 'active')
              const monthly = subs.reduce((t, s) => t + toMonthlyCost(s.cost_usd, s.billing_cycle), 0)
              const yearly = subs.reduce((t, s) => t + toYearlyCost(s.cost_usd, s.billing_cycle), 0)

              return (
                <Card key={project.id} className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: project.color + '20' }}>
                      <FolderOpen size={20} style={{ color: project.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      </div>
                      {project.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{project.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900">{subs.length}</p>
                      <p className="text-xs text-gray-400">Services</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(monthly)}</p>
                      <p className="text-xs text-gray-400">/ month</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(yearly)}</p>
                      <p className="text-xs text-gray-400">/ year</p>
                    </div>
                  </div>

                  {subs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {subs.slice(0, 5).map(s => (
                        <Badge key={s.id} variant="muted">{s.name}</Badge>
                      ))}
                      {subs.length > 5 && (
                        <Badge variant="muted">+{subs.length - 5} more</Badge>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        <Modal open={showNew} onClose={() => setShowNew(false)} title="New Project" size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Marketing Tools"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={createProject} disabled={!newName.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
