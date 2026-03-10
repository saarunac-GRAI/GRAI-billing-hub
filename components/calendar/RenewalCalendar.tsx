'use client'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, getRenewalUrgency } from '@/lib/utils'
import type { Subscription } from '@/types'

export function RenewalCalendar({ subscriptions }: { subscriptions: Subscription[] }) {
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const days = eachDayOfInterval({
    start: startOfMonth(current),
    end: endOfMonth(current),
  })

  // Pad to start on Sunday
  const startPad = startOfMonth(current).getDay()
  const paddedDays = [
    ...Array(startPad).fill(null),
    ...days,
  ]

  function getRenewalsForDay(date: Date): Subscription[] {
    return subscriptions.filter(s =>
      s.next_renewal_date && isSameDay(parseISO(s.next_renewal_date), date)
    )
  }

  const selectedRenewals = selected ? getRenewalsForDay(selected) : []

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{format(current, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1.5 text-xs rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, i) => {
          if (!day) return <div key={i} />
          const renewals = getRenewalsForDay(day)
          const isToday = isSameDay(day, new Date())
          const isSelected = selected && isSameDay(day, selected)
          const hasRenewals = renewals.length > 0
          const firstUrgency = hasRenewals ? getRenewalUrgency(Math.ceil((day.getTime() - new Date().getTime()) / 86400000)) : 'ok'
          const dotColor = firstUrgency === 'overdue' || firstUrgency === 'critical' ? 'bg-red-500' : firstUrgency === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'

          return (
            <button
              key={i}
              onClick={() => setSelected(isSelected ? null : day)}
              className={`min-h-[48px] p-1.5 rounded-lg text-sm transition-colors flex flex-col items-center gap-1 ${
                !isSameMonth(day, current) ? 'opacity-30' : ''
              } ${isToday ? 'bg-indigo-600 text-white' : isSelected ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <span className="text-xs font-medium">{format(day, 'd')}</span>
              {hasRenewals && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {renewals.slice(0, 3).map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : dotColor}`} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day details */}
      {selected && selectedRenewals.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">{format(selected, 'MMMM d, yyyy')}</p>
          {selectedRenewals.map(sub => (
            <div key={sub.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.project?.color || '#6b7280' }} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                  <p className="text-xs text-gray-400">{sub.project?.name || 'Unassigned'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(sub.cost_usd)}</p>
                <p className="text-xs text-gray-400 capitalize">{sub.billing_cycle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
