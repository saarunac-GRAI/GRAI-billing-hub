'use client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { CostByProject } from '@/types'

export function ProjectBreakdown({ projects }: { projects: CostByProject[] }) {
  const total = projects.reduce((s, p) => s + p.monthlyCost, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by Project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No data</p>
        ) : (
          projects.map((p) => {
            const pct = total > 0 ? (p.monthlyCost / total) * 100 : 0
            const color = p.project?.color || '#6b7280'
            return (
              <div key={p.projectName}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-gray-700 font-medium">{p.projectName}</span>
                    <span className="text-xs text-gray-400">({p.count})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.monthlyCost)}/mo</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })
        )}
        {total > 0 && (
          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{formatCurrency(total)}/mo</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
