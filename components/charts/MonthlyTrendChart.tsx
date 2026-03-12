'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyTrend } from '@/types'

interface Props {
  data: MonthlyTrend[]
  forecast?: MonthlyTrend[]
}

export function MonthlyTrendChart({ data, forecast = [] }: Props) {
  const combined = [
    ...data.map(d => ({ ...d, isForecast: false })),
    ...forecast.map(d => ({ ...d, isForecast: true })),
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={combined} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            formatter={(value: unknown) => [formatCurrency(value as number), 'Amount']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {combined.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isForecast ? '#a5b4fc' : '#6366f1'}
                fillOpacity={entry.isForecast ? 0.7 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {forecast.length > 0 && (
        <div className="flex items-center gap-4 mt-2 justify-end">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Actual
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 rounded-sm bg-indigo-300 inline-block" /> Forecast
          </span>
        </div>
      )}
    </div>
  )
}
