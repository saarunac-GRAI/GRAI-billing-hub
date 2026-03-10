'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import type { Subscription, Project, SubscriptionFormValues } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  project_id: z.string().optional(),
  category: z.enum(['tool', 'api', 'domain', 'saas', 'hosting', 'other']),
  cost_usd: z.preprocess(v => Number(v), z.number().min(0, 'Cost must be >= 0')),
  billing_cycle: z.enum(['monthly', 'yearly', 'one-time', 'quarterly']),
  next_renewal_date: z.string().optional(),
  start_date: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'overdue', 'paused']),
  auto_renews: z.boolean(),
  taxes_included: z.boolean(),
  tax_amount: z.preprocess(v => Number(v), z.number().min(0)).default(0),
  overage_notes: z.string().optional(),
  notes: z.string().optional(),
  website_url: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  subscription?: Subscription | null
  onSave: (data: FormValues) => Promise<void>
  onCancel: () => void
}

const labelCls = 'block text-xs font-medium text-gray-700 mb-1'
const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export function SubscriptionForm({ subscription, onSave, onCancel }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: subscription ? {
      name: subscription.name,
      project_id: subscription.project_id || '',
      category: subscription.category,
      cost_usd: subscription.cost_usd,
      billing_cycle: subscription.billing_cycle,
      next_renewal_date: subscription.next_renewal_date || '',
      start_date: subscription.start_date || '',
      status: subscription.status,
      auto_renews: subscription.auto_renews,
      taxes_included: subscription.taxes_included,
      tax_amount: subscription.tax_amount,
      overage_notes: subscription.overage_notes || '',
      notes: subscription.notes || '',
      website_url: subscription.website_url || '',
    } : {
      category: 'saas',
      billing_cycle: 'monthly',
      status: 'active',
      auto_renews: true,
      taxes_included: false,
      tax_amount: 0,
    },
  })

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [])

  async function onSubmit(data: FormValues) {
    setSaving(true)
    try {
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Service Name *</label>
          <input {...register('name')} className={inputCls} placeholder="e.g. Namecheap" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelCls}>Project</label>
          <select {...register('project_id')} className={inputCls}>
            <option value="">Unassigned</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Category *</label>
          <select {...register('category')} className={inputCls}>
            {['tool', 'api', 'domain', 'saas', 'hosting', 'other'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Cost (USD) *</label>
          <input {...register('cost_usd')} type="number" step="0.01" className={inputCls} placeholder="0.00" />
          {errors.cost_usd && <p className="text-xs text-red-500 mt-1">{errors.cost_usd.message}</p>}
        </div>

        <div>
          <label className={labelCls}>Billing Cycle *</label>
          <select {...register('billing_cycle')} className={inputCls}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="quarterly">Quarterly</option>
            <option value="one-time">One-time</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Next Renewal Date</label>
          <input {...register('next_renewal_date')} type="date" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Start Date</label>
          <input {...register('start_date')} type="date" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select {...register('status')} className={inputCls}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Tax Amount (USD)</label>
          <input {...register('tax_amount')} type="number" step="0.01" className={inputCls} placeholder="0.00" />
        </div>

        <div className="col-span-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input {...register('auto_renews')} type="checkbox" className="rounded" />
            Auto-renews
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input {...register('taxes_included')} type="checkbox" className="rounded" />
            Taxes included in cost
          </label>
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Website URL</label>
          <input {...register('website_url')} className={inputCls} placeholder="https://..." />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Overage Notes</label>
          <input {...register('overage_notes')} className={inputCls} placeholder="e.g. $0.01/extra API call" />
        </div>

        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea {...register('notes')} className={inputCls} rows={2} placeholder="Optional notes..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving}>
          {subscription ? 'Save Changes' : 'Add Subscription'}
        </Button>
      </div>
    </form>
  )
}
