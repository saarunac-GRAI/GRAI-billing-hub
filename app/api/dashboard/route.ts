import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toMonthlyCost, toYearlyCost, getDaysUntil } from '@/lib/utils'
import type { DashboardSummary, CostByProject, UpcomingRenewal, MonthlyTrend } from '@/types'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export async function GET() {
  const supabase = createAdminClient()

  // Fetch active subscriptions with projects
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .in('status', ['active', 'overdue'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Totals
  let totalMonthlyCost = 0
  let totalYearlyCost = 0
  const projectMap = new Map<string, CostByProject>()

  for (const sub of subscriptions || []) {
    const monthly = toMonthlyCost(sub.cost_usd, sub.billing_cycle)
    const yearly = toYearlyCost(sub.cost_usd, sub.billing_cycle)
    totalMonthlyCost += monthly
    totalYearlyCost += yearly

    const key = sub.project_id || '__none__'
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        project: sub.project || null,
        projectName: sub.project?.name || 'Unassigned',
        monthlyCost: 0,
        yearlyCost: 0,
        count: 0,
      })
    }
    const entry = projectMap.get(key)!
    entry.monthlyCost += monthly
    entry.yearlyCost += yearly
    entry.count += 1
  }

  // Upcoming renewals (next 30 days)
  const upcomingRenewals: UpcomingRenewal[] = (subscriptions || [])
    .filter(s => s.next_renewal_date)
    .map(s => ({ subscription: s, daysUntil: getDaysUntil(s.next_renewal_date!) }))
    .filter(r => r.daysUntil >= -1 && r.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 10)

  const overdueCount = (subscriptions || []).filter(s => s.status === 'overdue').length

  // Monthly trend — last 12 months from spending_history
  const since = subMonths(new Date(), 12)
  const { data: history } = await supabase
    .from('spending_history')
    .select('amount_usd, billed_at')
    .gte('billed_at', since.toISOString().split('T')[0])

  const trendMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    trendMap.set(format(d, 'MMM yyyy'), 0)
  }

  for (const h of history || []) {
    const key = format(new Date(h.billed_at), 'MMM yyyy')
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) || 0) + h.amount_usd)
    }
  }

  const monthlyTrend: MonthlyTrend[] = Array.from(trendMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }))

  // This month's transaction spend
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, classification')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .gt('amount', 0)

  const thisMonthTx = {
    projectSpend: (txns || []).filter(t => t.classification === 'project').reduce((s, t) => s + t.amount, 0),
    personalSpend: (txns || []).filter(t => t.classification === 'personal').reduce((s, t) => s + t.amount, 0),
    total: (txns || []).reduce((s, t) => s + t.amount, 0),
    count: (txns || []).length,
  }

  const summary: DashboardSummary = {
    totalMonthlyCost,
    totalYearlyCost,
    activeSubscriptions: (subscriptions || []).filter(s => s.status === 'active').length,
    overdueCount,
    upcomingRenewals,
    costByProject: Array.from(projectMap.values()).sort((a, b) => b.monthlyCost - a.monthlyCost),
    monthlyTrend,
    thisMonthTx,
  }

  return NextResponse.json(summary)
}
