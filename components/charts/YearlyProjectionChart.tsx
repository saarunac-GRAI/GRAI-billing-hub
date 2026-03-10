'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ProjectionPoint {
  month: string
  amount: number
  isFuture?: boolean
}

export function YearlyProjectionChart({ data }: { data: ProjectionPoint[] }) {
  const today = new Date()
  const currentMonth = today.toLocaleString('en-US', { month: 'short', year: 'numeric' })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
          width={45}
        />
        <Tooltip
          formatter={(value: unknown) => [formatCurrency(value as number), 'Monthly cost']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
