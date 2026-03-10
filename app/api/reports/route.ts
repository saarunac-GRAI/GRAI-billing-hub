import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toMonthlyCost, toYearlyCost } from '@/lib/utils'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'monthly'
  const projectId = searchParams.get('project_id')

  if (type === 'spending') {
    // Spending history grouped by month
    let query = supabase
      .from('spending_history')
      .select('amount_usd, billed_at, subscription:subscriptions(name, project_id, project:projects(name, color))')
      .order('billed_at', { ascending: false })

    if (projectId) {
      query = query.eq('subscription.project_id', projectId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by month
    const byMonth = new Map<string, number>()
    for (const record of data || []) {
      const key = format(new Date(record.billed_at), 'MMM yyyy')
      byMonth.set(key, (byMonth.get(key) || 0) + record.amount_usd)
    }

    return NextResponse.json({
      type: 'spending',
      data: Array.from(byMonth.entries()).map(([month, amount]) => ({ month, amount })),
      raw: data,
    })
  }

  if (type === 'projection') {
    // Current subscriptions → projected monthly/yearly costs
    let query = supabase
      .from('subscriptions')
      .select('*, project:projects(*)')
      .in('status', ['active'])

    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let totalMonthly = 0
    let totalYearly = 0
    const byProject = new Map<string, { name: string; color: string; monthly: number; yearly: number }>()

    for (const sub of data || []) {
      const monthly = toMonthlyCost(sub.cost_usd, sub.billing_cycle)
      const yearly = toYearlyCost(sub.cost_usd, sub.billing_cycle)
      totalMonthly += monthly
      totalYearly += yearly

      const key = sub.project?.name || 'Unassigned'
      if (!byProject.has(key)) {
        byProject.set(key, { name: key, color: sub.project?.color || '#6b7280', monthly: 0, yearly: 0 })
      }
      byProject.get(key)!.monthly += monthly
      byProject.get(key)!.yearly += yearly
    }

    // 12-month projection
    const months = []
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), -i)
      months.push({ month: format(d, 'MMM yyyy'), amount: totalMonthly })
    }

    return NextResponse.json({
      type: 'projection',
      totalMonthly,
      totalYearly,
      byProject: Array.from(byProject.values()),
      projectedMonths: months,
    })
  }

  return NextResponse.json({ error: 'Invalid type. Use: spending or projection' }, { status: 400 })
}
