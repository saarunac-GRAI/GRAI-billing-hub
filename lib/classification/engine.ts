export interface ClassificationRule {
  id: string
  keyword: string
  project_id: string | null
  classification: 'project' | 'personal'
  priority: number
}

export interface ClassificationResult {
  classification: 'project' | 'personal' | 'uncategorized'
  project_id: string | null
  rule_id: string | null
}

/**
 * Classify a transaction by matching its name/merchant against keyword rules.
 * Rules are pre-sorted by priority descending (highest first).
 */
export function classifyTransaction(
  name: string,
  rules: ClassificationRule[]
): ClassificationResult {
  if (!name) return { classification: 'uncategorized', project_id: null, rule_id: null }

  const lower = name.toLowerCase()

  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return {
        classification: rule.classification,
        project_id: rule.project_id,
        rule_id: rule.id,
      }
    }
  }

  return { classification: 'uncategorized', project_id: null, rule_id: null }
}
