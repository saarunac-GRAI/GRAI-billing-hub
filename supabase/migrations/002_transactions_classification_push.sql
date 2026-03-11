-- ============================================================
-- Migration 002: Transactions, Classification Rules, Push Subscriptions
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Plaid access tokens (one per connected bank account) ────
CREATE TABLE IF NOT EXISTS plaid_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          TEXT NOT NULL UNIQUE,
  access_token     TEXT NOT NULL,
  institution_name TEXT,
  institution_id   TEXT,
  cursor           TEXT,           -- for incremental transaction sync
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Credit card transactions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id    UUID REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_tx_id      TEXT UNIQUE,           -- Plaid transaction_id (dedup key)
  date             DATE NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  merchant_name    TEXT,
  description      TEXT,
  category_raw     TEXT[],                -- Plaid's own category array
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  classification   TEXT DEFAULT 'personal' CHECK (classification IN ('project','personal','uncategorized')),
  matched_rule_id  UUID,                  -- which rule matched
  is_manual        BOOLEAN DEFAULT FALSE, -- user manually overrode classification
  pending          BOOLEAN DEFAULT FALSE,
  account_id       TEXT,
  currency         TEXT DEFAULT 'USD',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS transactions_project_idx ON transactions(project_id);
CREATE INDEX IF NOT EXISTS transactions_classification_idx ON transactions(classification);

-- ── Auto-classification keyword rules ───────────────────────
CREATE TABLE IF NOT EXISTS classification_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword      TEXT NOT NULL,             -- case-insensitive keyword to match
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  classification TEXT DEFAULT 'project' CHECK (classification IN ('project','personal')),
  priority     INT DEFAULT 0,             -- higher = checked first
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(keyword, project_id)
);

-- Seed default rules based on known services
INSERT INTO classification_rules (keyword, project_id, classification, priority) VALUES
  ('anthropic',    'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('heygen',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('namecheap',    'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('netlify',      'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('lovable',      'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('n8n',          'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('openai',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('github',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 5),
  ('vercel',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project', 10),
  ('supabase',     '390352e4-42f7-4772-9591-a4ae664b5913', 'project', 10)
ON CONFLICT DO NOTHING;

-- ── Browser push subscriptions ───────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS policies ─────────────────────────────────────────────
ALTER TABLE plaid_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;

-- Service role (API routes) gets full access
CREATE POLICY "service_role_plaid_items"          ON plaid_items          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_transactions"         ON transactions         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_classification_rules" ON classification_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_push_subscriptions"   ON push_subscriptions   FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read/write
CREATE POLICY "auth_plaid_items"          ON plaid_items          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_transactions"         ON transactions         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_classification_rules" ON classification_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_push_subscriptions"   ON push_subscriptions   FOR ALL TO authenticated USING (true) WITH CHECK (true);
