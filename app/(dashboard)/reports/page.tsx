'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { YearlyProjectionChart } from '@/components/charts/YearlyProjectionChart'
import { ProjectPieChart } from '@/components/charts/ProjectPieChart'
import { formatCurrency } from '@/lib/utils'

export default function ReportsPage() {
  const [spending, setSpending] = useState<{ month: string; amount: number }[]>([])
  const [projection, setProjection] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=spending').then(r => r.json()),
      fetch('/api/reports?type=projection').then(r => r.json()),
    ]).then(([s, p]) => {
      setSpending(s.data || [])
      setProjection(p)
      setLoading(false)
    })
  }, [])

  async function exportCSV() {
    const res = await fetch('/api/reports?type=spending')
    const data = await res.json()
    const rows = (data.raw || []).map((r: any) =>
      `"${r.subscription?.name || ''}","${r.subscription?.project?.name || ''}",${r.amount_usd},"${r.billed_at}","${r.invoice_ref || ''}"`
    )
    const csv = ['Service,Project,Amount,Date,Invoice Ref', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'billing-history.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header title="Reports" />
      <div className="p-6 max-w-7xl space-y-6">

        {/* Summary stats */}
        {projection && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Run Rate', value: formatCurrency(projection.totalMonthly) },
              { label: 'Yearly Run Rate', value: formatCurrency(projection.totalYearly) },
              { label: 'Avg per month', value: formatCurrency(projection.totalMonthly) },
              { label: 'Projects tracked', value: projection.byProject?.length || 0 },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Actual Spending History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : <MonthlyTrendChart data={spending} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12-Month Projection</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !projection ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : <YearlyProjectionChart data={projection.projectedMonths || []} />}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Project</CardTitle>
            </CardHeader>
            <CardContent>
              {loading || !projection ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : <ProjectPieChart projects={(projection.byProject || []).map((p: any) => ({
                    project: { name: p.name, color: p.color },
                    projectName: p.name,
                    monthlyCost: p.monthly,
                    yearlyCost: p.yearly,
                    count: 0,
                  }))} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Export Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">Download your billing history as CSV for use in spreadsheets or accounting tools.</p>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Download CSV
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
