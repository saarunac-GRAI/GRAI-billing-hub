import { Header } from '@/components/layout/Header'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { RenewalTimeline } from '@/components/dashboard/RenewalTimeline'
import { ProjectBreakdown } from '@/components/dashboard/ProjectBreakdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { ProjectPieChart } from '@/components/charts/ProjectPieChart'
import type { DashboardSummary } from '@/types'

async function getDashboardData(): Promise<DashboardSummary> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/dashboard`, { cache: 'no-store' })
  if (!res.ok) {
    return {
      totalMonthlyCost: 0,
      totalYearlyCost: 0,
      activeSubscriptions: 0,
      overdueCount: 0,
      upcomingRenewals: [],
      costByProject: [],
      monthlyTrend: [],
    }
  }
  return res.json()
}

export default async function DashboardPage() {
  const summary = await getDashboardData()

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 max-w-7xl">
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Monthly trend chart */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Spending (last 12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyTrendChart data={summary.monthlyTrend} />
            </CardContent>
          </Card>

          {/* Project pie */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectPieChart projects={summary.costByProject} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RenewalTimeline renewals={summary.upcomingRenewals} />
          <ProjectBreakdown projects={summary.costByProject} />
        </div>
      </div>
    </div>
  )
}
