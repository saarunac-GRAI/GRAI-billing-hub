import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toMonthlyCost, toYearlyCost, getDaysUntil } from '@/lib/utils'
import type { DashboardSummary, CostByProject, UpcomingRenewal, MonthlyTrend } from '@/types'
import { format, subMonths, startOfMonth, endOfMonth, addMonths, parseISO, isSameMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id') || null

  // Resolve project name to handle "Personal" project specially
  let isPersonalProject = false
  if (projectId) {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', projectId).single()
    isPersonalProject = (proj?.name ?? '').toLowerCase().includes('personal')
  }

  // Fetch active subscriptions — filter by project if specified
  // Personal project: subscriptions where project_id IS NULL or matches personal project
  let subQuery = supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .in('status', ['active', 'overdue'])
  if (projectId) {
    if (isPersonalProject) {
      subQuery = subQuery.or(`project_id.is.null,project_id.eq.${projectId}`)
    } else {
      subQuery = subQuery.eq('project_id', projectId)
    }
  }
  const { data: subscriptions, error } = await subQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Subscription cost totals
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

  // Monthly trend — last 12 months from transactions (real spend data)
  const since = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
  let txTrendQuery = supabase
    .from('transactions')
    .select('amount, date, classification')
    .gte('date', since)
    .gt('amount', 0)
  if (projectId) {
    if (isPersonalProject) {
      txTrendQuery = txTrendQuery.eq('classification', 'personal')
    } else {
      txTrendQuery = txTrendQuery.eq('project_id', projectId)
    }
  }
  const { data: trendTxns } = await txTrendQuery

  const trendMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    trendMap.set(format(d, 'MMM yyyy'), 0)
  }
  for (const tx of trendTxns || []) {
    const key = format(new Date(tx.date), 'MMM yyyy')
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) || 0) + tx.amount)
    }
  }

  const monthlyTrend: MonthlyTrend[] = Array.from(trendMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }))

  // This month's transaction spend — filtered by project if specified
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  let txQuery = supabase
    .from('transactions')
    .select('amount, classification, project_id')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .gt('amount', 0)
  if (projectId) {
    if (isPersonalProject) {
      txQuery = txQuery.eq('classification', 'personal')
    } else {
      txQuery = txQuery.eq('project_id', projectId)
    }
  }
  const { data: txns } = await txQuery

  const thisMonthTx = {
    projectSpend: (txns || []).filter(t => t.classification === 'project').reduce((s, t) => s + t.amount, 0),
    personalSpend: (txns || []).filter(t => t.classification === 'personal').reduce((s, t) => s + t.amount, 0),
    total: (txns || []).reduce((s, t) => s + t.amount, 0),
    count: (txns || []).length,
  }

  // Forecast next 3 months based on subscription renewal dates + monthly costs
  const forecastMonths: MonthlyTrend[] = [1, 2, 3].map(offset => {
    const targetDate = addMonths(new Date(), offset)
    const monthLabel = format(targetDate, 'MMM yyyy')
    let projected = 0

    for (const sub of subscriptions || []) {
      if (sub.status !== 'active') continue
      if (sub.billing_cycle === 'monthly') {
        projected += sub.cost_usd
      } else if (sub.billing_cycle === 'yearly' && sub.next_renewal_date) {
        try {
          if (isSameMonth(parseISO(sub.next_renewal_date), targetDate)) projected += sub.cost_usd
        } catch { /* skip */ }
      } else if (sub.billing_cycle === 'quarterly' && sub.next_renewal_date) {
        try {
          const renewDate = parseISO(sub.next_renewal_date)
          if (isSameMonth(renewDate, targetDate) ||
              isSameMonth(addMonths(renewDate, 3), targetDate) ||
              isSameMonth(addMonths(renewDate, -3), targetDate)) {
            projected += sub.cost_usd
          }
        } catch { /* skip */ }
      }
    }

    return { month: monthLabel, amount: projected }
  })

  const summary: DashboardSummary = {
    totalMonthlyCost,
    totalYearlyCost,
    activeSubscriptions: (subscriptions || []).filter(s => s.status === 'active').length,
    overdueCount,
    upcomingRenewals,
    costByProject: Array.from(projectMap.values()).sort((a, b) => b.monthlyCost - a.monthlyCost),
    monthlyTrend,
    forecastMonths,
    thisMonthTx,
  }

  return NextResponse.json(summary)
}
