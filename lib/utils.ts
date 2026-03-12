import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO } from 'date-fns'
import type { BillingCycle } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function getDaysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM yyyy')
}

export function getRenewalUrgency(daysUntil: number): 'overdue' | 'critical' | 'warning' | 'ok' {
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 3) return 'critical'
  if (daysUntil <= 14) return 'warning'
  return 'ok'
}

export function toMonthlyCost(costUsd: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly': return costUsd
    case 'yearly': return costUsd / 12
    case 'quarterly': return costUsd / 3
    case 'one-time': return 0
    default: return costUsd
  }
}

export function toYearlyCost(costUsd: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly': return costUsd * 12
    case 'yearly': return costUsd
    case 'quarterly': return costUsd * 4
    case 'one-time': return costUsd
    default: return costUsd
  }
}

export function getAlertDaysThresholds(): number[] {
  return [14, 7, 3, 2, 1]
}
