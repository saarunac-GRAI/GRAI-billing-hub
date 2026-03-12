import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toMonthlyCost, toYearlyCost } from '@/lib/utils'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'transactions'
  const projectId = searchParams.get('project_id') || null
  const category = searchParams.get('category') || null
  const classification = searchParams.get('classification') || null
  const fromDate = searchParams.get('from') || format(subMonths(new Date(), 5), 'yyyy-MM-01')
  const toDate = searchParams.get('to') || format(endOfMonth(new Date()), 'yyyy-MM-dd')

  // Resolve if selected project is "Personal"
  let isPersonalProject = false
  if (projectId) {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', projectId).single()
    isPersonalProject = (proj?.name ?? '').toLowerCase().includes('personal')
  }

  if (type === 'transactions') {
    // Transactions grouped by month with full breakdown
    let query = supabase
      .from('transactions')
      .select('amount, date, classification, category, project_id, description, project:projects(name, color)')
      .gte('date', fromDate)
      .lte('date', toDate)
      .gt('amount', 0)
      .order('date', { ascending: true })

    if (projectId) {
      if (isPersonalProject) {
        query = query.eq('classification', 'personal')
      } else {
        query = query.eq('project_id', projectId)
      }
    }
    if (category) query = query.eq('category', category)
    if (classification) query = query.eq('classification', classification)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const txns = data || []

    // Group by month
    const byMonth = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      byMonth.set(format(subMonths(new Date(), i), 'MMM yyyy'), 0)
    }
    // Fill all months in range
    const start = parseISO(fromDate)
    const end = parseISO(toDate)
    let cur = startOfMonth(start)
    while (cur <= end) {
      const key = format(cur, 'MMM yyyy')
      if (!byMonth.has(key)) byMonth.set(key, 0)
      cur = startOfMonth(subMonths(cur, -1))
    }

    for (const tx of txns) {
      const key = format(new Date(tx.date), 'MMM yyyy')
      if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) || 0) + tx.amount)
    }

    // Group by category
    const byCategory = new Map<string, number>()
    for (const tx of txns) {
      const cat = tx.category || 'Uncategorized'
      byCategory.set(cat, (byCategory.get(cat) || 0) + tx.amount)
    }

    // Group by project
    const byProject = new Map<string, { name: string; color: string; amount: number; count: number }>()
    for (const tx of txns) {
      const name = (tx.project as any)?.name || (tx.classification === 'personal' ? 'Personal' : 'Unassigned')
      const color = (tx.project as any)?.color || '#f59e0b'
      if (!byProject.has(name)) byProject.set(name, { name, color, amount: 0, count: 0 })
      byProject.get(name)!.amount += tx.amount
      byProject.get(name)!.count += 1
    }

    const total = txns.reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({
      type: 'transactions',
      total,
      count: txns.length,
      avgPerTx: txns.length > 0 ? total / txns.length : 0,
      byMonth: Array.from(byMonth.entries()).map(([month, amount]) => ({ month, amount })),
      byCategory: Array.from(byCategory.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
      byProject: Array.from(byProject.values()).sort((a, b) => b.amount - a.amount),
      raw: txns,
    })
  }

  if (type === 'projection') {
    let query = supabase
      .from('subscriptions')
      .select('*, project:projects(*)')
      .eq('status', 'active')

    if (projectId) {
      if (isPersonalProject) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
      } else {
        query = query.eq('project_id', projectId)
      }
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let totalMonthly = 0
    let totalYearly = 0
    const byProjectMap = new Map<string, { name: string; color: string; monthly: number; yearly: number }>()

    for (const sub of data || []) {
      const monthly = toMonthlyCost(sub.cost_usd, sub.billing_cycle)
      const yearly = toYearlyCost(sub.cost_usd, sub.billing_cycle)
      totalMonthly += monthly
      totalYearly += yearly

      const key = sub.project?.name || 'Unassigned'
      if (!byProjectMap.has(key)) {
        byProjectMap.set(key, { name: key, color: sub.project?.color || '#6b7280', monthly: 0, yearly: 0 })
      }
      byProjectMap.get(key)!.monthly += monthly
      byProjectMap.get(key)!.yearly += yearly
    }

    const projectedMonths = []
    for (let i = 0; i < 12; i++) {
      projectedMonths.push({ month: format(subMonths(new Date(), -i), 'MMM yyyy'), amount: totalMonthly })
    }

    return NextResponse.json({
      type: 'projection',
      totalMonthly,
      totalYearly,
      byProject: Array.from(byProjectMap.values()),
      projectedMonths,
      subscriptions: data || [],
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
