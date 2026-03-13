'use client'
import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { YearlyProjectionChart } from '@/components/charts/YearlyProjectionChart'
import { ProjectPieChart } from '@/components/charts/ProjectPieChart'
import { formatCurrency } from '@/lib/utils'
import { RefreshCw, Download } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import type { Project } from '@/types'

const CATEGORIES = ['Food', 'Groceries', 'Gas', 'Fitness', 'Utilities', 'Software', 'Shopping', 'Tuition', 'Healthcare', 'Entertainment', 'Other']

const DATE_PRESETS = [
  { label: 'This Month', from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { label: 'Last Month', from: () => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: () => format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
  { label: 'Last 3 Months', from: () => format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { label: 'Last 6 Months', from: () => format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'), to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd') },
  { label: 'This Year', from: () => format(startOfYear(new Date()), 'yyyy-MM-dd'), to: () => format(endOfYear(new Date()), 'yyyy-MM-dd') },
  { label: 'Custom', from: () => '', to: () => '' },
]

type TxReport = {
  total: number
  count: number
  avgPerTx: number
  byMonth: { month: string; amount: number }[]
  byCategory: { name: string; amount: number }[]
  byProject: { name: string; color: string; amount: number; count: number }[]
  raw: any[]
}

type ProjReport = {
  totalMonthly: number
  totalYearly: number
  byProject: { name: string; color: string; monthly: number; yearly: number }[]
  projectedMonths: { month: string; amount: number }[]
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [txReport, setTxReport] = useState<TxReport | null>(null)
  const [projReport, setProjReport] = useState<ProjReport | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedClassification, setSelectedClassification] = useState('')
  const [datePreset, setDatePreset] = useState('Last 3 Months')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  function getDateRange() {
    if (datePreset === 'Custom') {
      return { from: customFrom, to: customTo }
    }
    const preset = DATE_PRESETS.find(p => p.label === datePreset)!
    return { from: preset.from(), to: preset.to() }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { from, to } = getDateRange()
    if (!from || !to) { setLoading(false); return }

    const params = new URLSearchParams({ from, to })
    if (selectedProject) params.set('project_id', selectedProject)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedClassification) params.set('classification', selectedClassification)

    const [txRes, projRes] = await Promise.all([
      fetch('/api/reports?type=transactions&' + params),
      fetch('/api/reports?type=projection&' + (selectedProject ? `project_id=${selectedProject}` : '')),
    ])
    setTxReport(await txRes.json())
    setProjReport(await projRes.json())
    setLoading(false)
  }, [selectedProject, selectedCategory, selectedClassification, datePreset, customFrom, customTo])

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { load() }, [selectedProject, selectedCategory, selectedClassification, datePreset])

  function exportCSV() {
    if (!txReport?.raw?.length) return
    const rows = txReport.raw.map((r: any) =>
      `"${r.date}","${r.description?.replace(/"/g, '""') || ''}","${r.category || ''}","${r.classification || ''}","${(r.project as any)?.name || ''}",${r.amount}`
    )
    const csv = ['Date,Description,Category,Classification,Project,Amount', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billing-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div>
      <Header title="Reports" />
      <div className="p-6 max-w-7xl space-y-5">

        {/* Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap items-end gap-4">

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase">Date Range</label>
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setDatePreset(p.label)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      datePreset === p.label
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {datePreset === 'Custom' && (
                <div className="flex items-center gap-2 mt-1">
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={selectCls} />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={selectCls} />
                  <Button size="sm" onClick={load}>Apply</Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase">Project</label>
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className={selectCls}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase">Category</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={selectCls}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium uppercase">Type</label>
              <select value={selectedClassification} onChange={e => setSelectedClassification(e.target.value)} className={selectCls}>
                <option value="">All</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
                <option value="uncategorized">Uncategorized</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={load} loading={loading}>
                <RefreshCw size={13} /> Refresh
              </Button>
              <Button size="sm" variant="secondary" onClick={exportCSV} disabled={!txReport?.count}>
                <Download size={13} /> Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Spend', value: formatCurrency(txReport?.total ?? 0) },
            { label: 'Transactions', value: txReport?.count ?? 0 },
            { label: 'Avg per Transaction', value: formatCurrency(txReport?.avgPerTx ?? 0) },
            { label: 'Subscription Run Rate', value: `${formatCurrency(projReport?.totalMonthly ?? 0)}/mo` },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Spending by Month</CardTitle></CardHeader>
            <CardContent>
              {loading
                ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : txReport?.byMonth?.length
                  ? <MonthlyTrendChart data={txReport.byMonth} />
                  : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No transaction data for this period</div>
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Spend by Category</CardTitle></CardHeader>
            <CardContent>
              {loading
                ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : txReport?.byCategory?.length
                  ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {txReport.byCategory.map(c => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-gray-600 truncate">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="w-24 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (c.amount / (txReport?.total || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-medium text-gray-900 w-16 text-right">{formatCurrency(c.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No category data</div>
              }
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Spend by Project</CardTitle></CardHeader>
            <CardContent>
              {loading
                ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : txReport?.byProject?.length
                  ? <ProjectPieChart projects={txReport.byProject.map(p => ({
                      project: { id: '', name: p.name, color: p.color, description: null, created_at: '', updated_at: '' } as any,
                      projectName: p.name,
                      monthlyCost: p.amount,
                      yearlyCost: p.amount * 12,
                      count: p.count,
                    }))} />
                  : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No project data</div>
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>12-Month Subscription Forecast</CardTitle></CardHeader>
            <CardContent>
              {loading || !projReport
                ? <div className="h-[220px] flex items-center justify-center text-gray-400">Loading...</div>
                : <YearlyProjectionChart data={projReport.projectedMonths || []} />
              }
            </CardContent>
          </Card>
        </div>

        {/* Top Transactions Table */}
        {txReport?.raw && txReport.raw.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transactions ({txReport.count})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Category</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Project</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {txReport.raw.slice().reverse().map((tx: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-2 text-gray-900 max-w-xs truncate">{tx.description}</td>
                        <td className="px-4 py-2">
                          {tx.category
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tx.category}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{(tx.project as any)?.name || (tx.classification === 'personal' ? 'Personal' : '—')}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
