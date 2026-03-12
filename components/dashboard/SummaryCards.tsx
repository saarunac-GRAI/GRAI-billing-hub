'use client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { DashboardSummary, Project } from '@/types'
import { TrendingUp, CreditCard, AlertTriangle, Calendar, ShoppingCart, Briefcase } from 'lucide-react'

export function SummaryCards({
  summary,
  selectedProject,
  projects,
}: {
  summary: DashboardSummary
  selectedProject?: string
  projects?: Project[]
}) {
  const nextRenewal = summary.upcomingRenewals[0]
  const tx = summary.thisMonthTx ?? { projectSpend: 0, personalSpend: 0, total: 0, count: 0 }
  const projectLabel = selectedProject && projects
    ? projects.find(p => p.id === selectedProject)?.name ?? 'All'
    : 'All'

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Cost</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(summary.totalMonthlyCost)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary.totalYearlyCost)} / year</p>
          </div>
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-indigo-600" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.activeSubscriptions}</p>
            <p className="text-xs text-gray-400 mt-1">across all projects</p>
          </div>
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
            <CreditCard size={18} className="text-emerald-600" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.overdueCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              {summary.overdueCount === 0 ? 'All up to date' : 'need attention'}
            </p>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${summary.overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <AlertTriangle size={18} className={summary.overdueCount > 0 ? 'text-red-500' : 'text-gray-400'} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Renewal</p>
            {nextRenewal ? (
              <>
                <p className="text-sm font-bold text-gray-900 mt-1 truncate max-w-[140px]">
                  {nextRenewal.subscription.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={nextRenewal.daysUntil <= 3 ? 'danger' : nextRenewal.daysUntil <= 7 ? 'warning' : 'success'}>
                    {nextRenewal.daysUntil <= 0 ? 'Today' : `${nextRenewal.daysUntil}d`}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {nextRenewal.subscription.next_renewal_date && formatDate(nextRenewal.subscription.next_renewal_date)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No upcoming renewals</p>
            )}
          </div>
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <Calendar size={18} className="text-amber-600" />
          </div>
        </div>
      </Card>
    </div>

    {/* Transaction spend row */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month — Project Spend {selectedProject ? `(${projectLabel})` : ''}</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(tx.projectSpend)}</p>
            <p className="text-xs text-gray-400 mt-1">from imported transactions</p>
          </div>
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
            <Briefcase size={18} className="text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month — Personal Spend</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(tx.personalSpend)}</p>
            <p className="text-xs text-gray-400 mt-1">from imported transactions</p>
          </div>
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <ShoppingCart size={18} className="text-amber-600" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month — Total Spend</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(tx.total)}</p>
            <p className="text-xs text-gray-400 mt-1">{tx.count} transaction{tx.count !== 1 ? 's' : ''}</p>
          </div>
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
            <CreditCard size={18} className="text-indigo-600" />
          </div>
        </div>
      </Card>
    </div>
    </div>
  )
}
