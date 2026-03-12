-- ============================================================
-- Migration 003: Add category column to transactions and classification_rules
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE classification_rules ADD COLUMN IF NOT EXISTS category TEXT;

-- Seed comprehensive keyword rules with categories
-- Replace UUIDs below with your actual project IDs:
--   GRAI project: f6e21e05-eec2-4356-b495-25cf1418499a
--   Personal project: 390352e4-42f7-4772-9591-a4ae664b5913 (or NULL for personal)

INSERT INTO classification_rules (keyword, project_id, classification, category, priority) VALUES
  -- GRAI / Software
  ('anthropic',     'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('claude',        'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('sinch',         'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('mailgun',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('heygen',        'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('namecheap',     'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('netlify',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('lovable',       'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('n8n',           'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('openai',        'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('github',        'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',     5),
  ('vercel',        'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  ('supabase',      'f6e21e05-eec2-4356-b495-25cf1418499a', 'project',  'Software',    10),
  -- Food / Dining
  ('marhaba',       NULL, 'personal', 'Food',         8),
  ('stan''s donut', NULL, 'personal', 'Food',         8),
  ('famous meat',   NULL, 'personal', 'Food',         8),
  ('tst*',          NULL, 'personal', 'Food',         3),
  ('sq *',          NULL, 'personal', 'Food',         3),
  ('donut',         NULL, 'personal', 'Food',         3),
  ('restaurant',    NULL, 'personal', 'Food',         3),
  ('mcdonald',      NULL, 'personal', 'Food',         5),
  ('chipotle',      NULL, 'personal', 'Food',         5),
  ('starbucks',     NULL, 'personal', 'Food',         5),
  ('dunkin',        NULL, 'personal', 'Food',         5),
  ('panera',        NULL, 'personal', 'Food',         5),
  ('amk river',     NULL, 'personal', 'Food',         8),
  -- Groceries
  ('indiaco',       NULL, 'personal', 'Groceries',    8),
  ('costco whse',   NULL, 'personal', 'Groceries',    9),
  ('whole food',    NULL, 'personal', 'Groceries',    5),
  ('jewel',         NULL, 'personal', 'Groceries',    5),
  ('aldi',          NULL, 'personal', 'Groceries',    5),
  ('trader joe',    NULL, 'personal', 'Groceries',    5),
  ('walmart',       NULL, 'personal', 'Groceries',    5),
  -- Gas
  ('costco gas',    NULL, 'personal', 'Gas',          10),
  ('shell',         NULL, 'personal', 'Gas',          5),
  ('bp ',           NULL, 'personal', 'Gas',          5),
  ('marathon',      NULL, 'personal', 'Gas',          5),
  ('mobil',         NULL, 'personal', 'Gas',          5),
  ('speedway',      NULL, 'personal', 'Gas',          5),
  -- Fitness
  ('la fitn',       NULL, 'personal', 'Fitness',      8),
  ('british swim',  NULL, 'personal', 'Fitness',      8),
  ('planet fit',    NULL, 'personal', 'Fitness',      5),
  ('ymca',          NULL, 'personal', 'Fitness',      5),
  -- Utilities
  ('elgin util',    NULL, 'personal', 'Utilities',    8),
  ('comed',         NULL, 'personal', 'Utilities',    5),
  ('nicor',         NULL, 'personal', 'Utilities',    5),
  ('at&t',          NULL, 'personal', 'Utilities',    5),
  ('verizon',       NULL, 'personal', 'Utilities',    5),
  ('comcast',       NULL, 'personal', 'Utilities',    5),
  ('xfinity',       NULL, 'personal', 'Utilities',    5),
  -- Tuition / Education
  ('mega',          NULL, 'personal', 'Tuition',      8),
  ('udemy',         NULL, 'personal', 'Tuition',      5),
  ('coursera',      NULL, 'personal', 'Tuition',      5),
  -- Shopping
  ('amazon',        NULL, 'personal', 'Shopping',     5),
  ('amzn',          NULL, 'personal', 'Shopping',     5),
  ('target',        NULL, 'personal', 'Shopping',     5),
  ('costco',        NULL, 'personal', 'Shopping',     4)
ON CONFLICT DO NOTHING;

-- Update existing rules that lack category
UPDATE classification_rules SET category = 'Software'
WHERE classification = 'project' AND category IS NULL;
