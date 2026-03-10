-- ============================================================
-- Billing Hub — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROJECTS
-- ============================================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed initial projects
insert into projects (name, description, color) values
  ('Global Reach AI', 'Main GRAI product and infrastructure', '#6366f1'),
  ('Personal', 'Personal tools and subscriptions', '#10b981'),
  ('Billing Hub', 'Billing Hub app itself', '#f59e0b')
on conflict (name) do nothing;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  project_id uuid references projects(id) on delete set null,
  category text not null check (category in ('tool','api','domain','saas','hosting','other')),
  cost_usd numeric(10,2) not null default 0,
  billing_cycle text not null check (billing_cycle in ('monthly','yearly','one-time','quarterly')),
  next_renewal_date date,
  start_date date,
  status text not null default 'active' check (status in ('active','cancelled','overdue','paused')),
  auto_renews boolean default true,
  taxes_included boolean default false,
  tax_amount numeric(10,2) default 0,
  overage_notes text,
  notes text,
  website_url text,
  metadata jsonb default '{}',
  source text default 'manual' check (source in ('manual','gmail')),
  gmail_thread_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SPENDING HISTORY
-- Individual billing events / invoices
-- ============================================================
create table if not exists spending_history (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  amount_usd numeric(10,2) not null,
  billed_at date not null,
  source text default 'manual' check (source in ('manual','gmail')),
  invoice_ref text,
  gmail_message_id text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ALERTS
-- Log of sent/pending alerts
-- ============================================================
create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  alert_type text not null check (alert_type in ('renewal','overdue','cost_increase','cancelled')),
  days_before integer,
  channel text not null default 'email' check (channel in ('email','push','both')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now()
);

-- ============================================================
-- LOGS
-- Audit trail for all actions — unlimited retention
-- ============================================================
create table if not exists logs (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  project_id uuid references projects(id) on delete set null,
  description text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_subscriptions_project on subscriptions(project_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_subscriptions_renewal on subscriptions(next_renewal_date);
create index if not exists idx_spending_subscription on spending_history(subscription_id);
create index if not exists idx_spending_billed_at on spending_history(billed_at);
create index if not exists idx_alerts_subscription on alerts(subscription_id);
create index if not exists idx_alerts_status on alerts(status);
create index if not exists idx_logs_event_type on logs(event_type);
create index if not exists idx_logs_project on logs(project_id);
create index if not exists idx_logs_created_at on logs(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

create or replace trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table projects enable row level security;
alter table subscriptions enable row level security;
alter table spending_history enable row level security;
alter table alerts enable row level security;
alter table logs enable row level security;

-- Allow authenticated users full access (single-user app)
create policy "authenticated_all" on projects for all to authenticated using (true) with check (true);
create policy "authenticated_all" on subscriptions for all to authenticated using (true) with check (true);
create policy "authenticated_all" on spending_history for all to authenticated using (true) with check (true);
create policy "authenticated_all" on alerts for all to authenticated using (true) with check (true);
create policy "authenticated_all" on logs for all to authenticated using (true) with check (true);

-- Allow service role (used by API routes + n8n) full access
create policy "service_role_all" on projects for all to service_role using (true) with check (true);
create policy "service_role_all" on subscriptions for all to service_role using (true) with check (true);
create policy "service_role_all" on spending_history for all to service_role using (true) with check (true);
create policy "service_role_all" on alerts for all to service_role using (true) with check (true);
create policy "service_role_all" on logs for all to service_role using (true) with check (true);
