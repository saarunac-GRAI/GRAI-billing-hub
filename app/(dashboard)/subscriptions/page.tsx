'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { SubscriptionTable } from '@/components/subscriptions/SubscriptionTable'
import type { Subscription, Project } from '@/types'

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const [subs, projs] = await Promise.all([
      fetch('/api/subscriptions').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
    setSubscriptions(subs)
    setProjects(projs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) {
    await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await load()
  }

  async function handleEdit(id: string, data: Partial<Subscription>) {
    await fetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <Header title="Subscriptions" />
      <div className="p-6 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
        ) : (
          <SubscriptionTable
            subscriptions={subscriptions}
            projects={projects}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
