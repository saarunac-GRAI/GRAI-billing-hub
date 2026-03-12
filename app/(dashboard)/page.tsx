'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { RenewalTimeline } from '@/components/dashboard/RenewalTimeline'
import { ProjectBreakdown } from '@/components/dashboard/ProjectBreakdown'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart'
import { ProjectPieChart } from '@/components/charts/ProjectPieChart'
import type { DashboardSummary, Project } from '@/types'
import { RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(projectId?: string) {
    setRefreshing(true)
    const params = projectId ? `?project_id=${projectId}` : ''
    const [dashRes, projRes] = await Promise.all([
      fetch('/api/dashboard' + params),
      fetch('/api/projects'),
    ])
    setSummary(await dashRes.json())
    const proj = await projRes.json()
    setProjects(Array.isArray(proj) ? proj : (proj.projects || []))
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">Loading dashboard…</div>
      </div>
    )
  }

  if (!summary) return null

  const filteredCostByProject = selectedProject
    ? summary.costByProject.filter(p => p.project?.id === selectedProject)
    : summary.costByProject

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 max-w-7xl">

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Project:</label>
            <select
              value={selectedProject}
              onChange={e => { setSelectedProject(e.target.value); load(e.target.value || undefined) }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="secondary" onClick={() => load(selectedProject || undefined)} loading={refreshing}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>

        <SummaryCards summary={summary} selectedProject={selectedProject} projects={projects} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Spending + 3-Month Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyTrendChart data={summary.monthlyTrend} forecast={summary.forecastMonths ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectPieChart projects={filteredCostByProject} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RenewalTimeline renewals={summary.upcomingRenewals} />
          <ProjectBreakdown projects={filteredCostByProject} />
        </div>
      </div>
    </div>
  )
}
