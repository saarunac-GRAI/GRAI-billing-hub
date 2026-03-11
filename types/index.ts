export type BillingCycle = 'monthly' | 'yearly' | 'one-time' | 'quarterly'
export type SubscriptionStatus = 'active' | 'cancelled' | 'overdue' | 'paused'
export type SubscriptionCategory = 'tool' | 'api' | 'domain' | 'saas' | 'hosting' | 'other'
export type AlertType = 'renewal' | 'overdue' | 'cost_increase' | 'cancelled'
export type AlertChannel = 'email' | 'push' | 'both'
export type AlertStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  name: string
  project_id: string | null
  category: SubscriptionCategory
  cost_usd: number
  billing_cycle: BillingCycle
  next_renewal_date: string | null
  start_date: string | null
  status: SubscriptionStatus
  auto_renews: boolean
  taxes_included: boolean
  tax_amount: number
  overage_notes: string | null
  notes: string | null
  website_url: string | null
  metadata: Record<string, unknown>
  source: 'manual' | 'gmail'
  gmail_thread_id: string | null
  created_at: string
  updated_at: string
  project?: Project
}

export interface SpendingHistory {
  id: string
  subscription_id: string
  amount_usd: number
  billed_at: string
  source: 'manual' | 'gmail'
  invoice_ref: string | null
  gmail_message_id: string | null
  notes: string | null
  created_at: string
  subscription?: Subscription
}

export interface Alert {
  id: string
  subscription_id: string
  alert_type: AlertType
  days_before: number | null
  channel: AlertChannel
  status: AlertStatus
  sent_at: string | null
  error_message: string | null
  created_at: string
  subscription?: Subscription
}

export interface Log {
  id: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  project_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Dashboard computed types
export interface DashboardSummary {
  totalMonthlyCost: number
  totalYearlyCost: number
  activeSubscriptions: number
  overdueCount: number
  upcomingRenewals: UpcomingRenewal[]
  costByProject: CostByProject[]
  monthlyTrend: MonthlyTrend[]
}

export interface UpcomingRenewal {
  subscription: Subscription
  daysUntil: number
}

export interface CostByProject {
  project: Project | null
  projectName: string
  monthlyCost: number
  yearlyCost: number
  count: number
}

export interface MonthlyTrend {
  month: string   // e.g. "Jan 2025"
  amount: number
}

// Gmail parsing
export interface ParsedBillingEmail {
  gmailMessageId: string
  gmailThreadId: string
  subject: string
  sender: string
  senderEmail: string
  date: string
  amount: number | null
  currency: string
  serviceName: string
  invoiceRef: string | null
  rawSnippet: string
  matchedSubscriptionId?: string
}

export interface ParsedImapEmail {
  messageId: string
  from: string
  subject: string
  date: Date | string
  amount: number
  currency: string
  serviceName: string
  billingPeriod: string
  confidence: number
  rawSnippet: string
  suggestedProjectId: string
}

// ── Transactions ──────────────────────────────────────────────
export type TransactionClassification = 'project' | 'personal' | 'uncategorized'

export interface Transaction {
  id: string
  date: string
  amount: number
  merchant_name: string | null
  description: string
  category_raw: string[] | null
  project_id: string | null
  classification: TransactionClassification
  matched_rule_id: string | null
  is_manual: boolean
  pending: boolean
  account_id: string | null
  currency: string
  created_at: string
  project?: Project
}

export interface ClassificationRule {
  id: string
  keyword: string
  project_id: string | null
  classification: 'project' | 'personal'
  priority: number
  created_at: string
  project?: Project
}

export interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

// ── Forms ─────────────────────────────────────────────────────
export interface SubscriptionFormValues {
  name: string
  project_id: string
  category: SubscriptionCategory
  cost_usd: number
  billing_cycle: BillingCycle
  next_renewal_date: string
  start_date: string
  status: SubscriptionStatus
  auto_renews: boolean
  taxes_included: boolean
  tax_amount: number
  overage_notes: string
  notes: string
  website_url: string
}
