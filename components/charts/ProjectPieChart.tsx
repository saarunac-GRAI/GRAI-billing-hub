'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { CostByProject } from '@/types'

export function ProjectPieChart({ projects }: { projects: CostByProject[] }) {
  const data = projects.map(p => ({
    name: p.projectName,
    value: p.monthlyCost,
    color: p.project?.color || '#6b7280',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: unknown) => [formatCurrency(value as number), 'Monthly']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#6b7280' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
