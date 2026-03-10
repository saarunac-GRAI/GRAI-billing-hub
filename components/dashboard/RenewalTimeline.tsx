'use client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, getRenewalUrgency } from '@/lib/utils'
import type { DashboardSummary } from '@/types'

export function RenewalTimeline({ renewals }: { renewals: DashboardSummary['upcomingRenewals'] }) {
  const urgencyVariant = {
    overdue: 'danger' as const,
    critical: 'danger' as const,
    warning: 'warning' as const,
    ok: 'success' as const,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Renewals</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {renewals.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No renewals in the next 30 days</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {renewals.map(({ subscription: sub, daysUntil }) => {
              const urgency = getRenewalUrgency(daysUntil)
              return (
                <div key={sub.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sub.project?.color || '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{sub.name}</p>
                      <p className="text-xs text-gray-400">
                        {sub.project?.name || 'Unassigned'} · {sub.next_renewal_date && formatDate(sub.next_renewal_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-sm font-medium text-gray-700">{formatCurrency(sub.cost_usd)}</span>
                    <Badge variant={urgencyVariant[urgency]}>
                      {daysUntil < 0 ? 'Overdue' : daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
