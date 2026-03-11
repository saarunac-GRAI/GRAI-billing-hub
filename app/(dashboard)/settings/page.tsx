'use client'
import { useEffect, useRef, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GmailIngestReview } from '@/components/subscriptions/GmailIngestReview'
import { ImapIngestReview } from '@/components/subscriptions/ImapIngestReview'
import { Mail, Shield, Building2, Tag, Bell, Trash2, Plus } from 'lucide-react'
import type { Project, ClassificationRule, PlaidItem } from '@/types'

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

// ── Connected Banks ─────────────────────────────────────────────
function ConnectedBanks() {
  const [items, setItems] = useState<PlaidItem[]>([])

  async function load() {
    // plaid_items don't have a dedicated API yet — inline fetch
    const res = await fetch('/api/plaid/items')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Bank accounts connected via Plaid for automatic transaction import.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No accounts connected yet. Use the Transactions page to connect.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.institution_name || 'Unknown Bank'}</p>
                <p className="text-xs text-gray-400">Connected {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Classification Rules ────────────────────────────────────────
function ClassificationRules({ projects }: { projects: Project[] }) {
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [adding, setAdding] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState('')
  const [classification, setClassification] = useState<'project' | 'personal'>('project')
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await fetch('/api/classification-rules').then(r => r.json())
    setRules(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load() }, [])

  async function addRule() {
    if (!keyword.trim()) return
    setSaving(true)
    await fetch('/api/classification-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, project_id: projectId || null, classification }),
    })
    setKeyword('')
    setProjectId('')
    setClassification('project')
    setAdding(false)
    setSaving(false)
    await load()
  }

  async function deleteRule(id: string) {
    await fetch(`/api/classification-rules?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const selectCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Keywords matched against transaction merchant/description to auto-classify as Project or Personal.
      </p>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Keyword</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Project</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-2 font-mono text-xs text-gray-800">{rule.keyword}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    rule.classification === 'project'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rule.classification}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {rule.project ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.project.color }} />
                      {rule.project.name}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {adding && (
              <tr className="bg-indigo-50/30">
                <td className="px-4 py-2">
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className={inputCls + ' w-full'}
                    placeholder="e.g. anthropic"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') addRule() }}
                  />
                </td>
                <td className="px-4 py-2">
                  <select value={classification} onChange={e => setClassification(e.target.value as 'project' | 'personal')} className={selectCls}>
                    <option value="project">Project</option>
                    <option value="personal">Personal</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={selectCls}>
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" onClick={addRule} loading={saving}>Add</Button>
                    <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>✕</Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!adding && (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={13} /> Add Rule
        </Button>
      )}
    </div>
  )
}

// ── Push Notifications ──────────────────────────────────────────
function PushNotificationSettings() {
  const [status, setStatus] = useState<'unknown' | 'unsupported' | 'denied' | 'granted' | 'subscribing'>('unknown')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported')
      return
    }
    setStatus(Notification.permission as 'denied' | 'granted')
  }, [])

  async function enablePush() {
    setStatus('subscribing')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
      if (!vapidKey) { alert('NEXT_PUBLIC_VAPID_KEY not set'); setStatus('granted'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      })
      setStatus('granted')
    } catch (err) {
      console.error(err)
      setStatus('denied')
    }
  }

  async function testPush() {
    setTesting(true)
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-test' }),
    })
    setTesting(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Browser push notifications for renewal alerts (7, 3, 1 day before). No app install required.
      </p>
      {status === 'unsupported' && (
        <p className="text-sm text-amber-600">Push notifications are not supported in this browser.</p>
      )}
      {status === 'denied' && (
        <p className="text-sm text-red-600">
          Notifications blocked. Reset permission in browser settings → reload this page.
        </p>
      )}
      {(status === 'unknown' || status === 'subscribing') && (
        <Button onClick={enablePush} loading={status === 'subscribing'}>
          <Bell size={14} /> Enable Push Notifications
        </Button>
      )}
      {status === 'granted' && (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Push notifications enabled
          </span>
          <Button size="sm" variant="secondary" onClick={testPush} loading={testing}>
            Send Test
          </Button>
        </div>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)))
}

// ── Main Page ───────────────────────────────────────────────────
export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => {
      setProjects(Array.isArray(d) ? d : (d.projects || []))
    })
  }, [])

  return (
    <div>
      <Header title="Settings" />
      <div className="p-6 max-w-3xl space-y-6">

        {/* Connected Banks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              <CardTitle>Connected Banks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectedBanks />
          </CardContent>
        </Card>

        {/* Classification Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-indigo-600" />
              <CardTitle>Auto-Classification Rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ClassificationRules projects={projects} />
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-indigo-600" />
              <CardTitle>Push Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PushNotificationSettings />
          </CardContent>
        </Card>

        {/* Gmail import */}
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
                <li>Select &quot;Other App&quot; → name it &quot;Billing Hub&quot;</li>
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

        {/* Gmail API */}
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
              Read-only access to billing emails. Only amounts, dates, and service names are extracted.
            </p>
            <a
              href="/api/gmail/auth"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reconnect Gmail
            </a>
          </CardContent>
        </Card>

        {/* n8n */}
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
