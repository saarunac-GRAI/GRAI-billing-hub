import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyTransaction } from '@/lib/classification/engine'

export const dynamic = 'force-dynamic'

// ── CSV parsers ────────────────────────────────────────────────

interface RawTx {
  date: string
  description: string
  amount: number  // positive = expense, negative = credit/refund
  merchant?: string
}

function detectFormat(headers: string[]): 'capitalone' | 'chase' | 'generic' {
  const h = headers.map(h => h.toLowerCase().trim())
  if (h.includes('transaction date') && h.includes('debit') && h.includes('credit')) return 'capitalone'
  if (h.includes('transaction date') && h.includes('post date') && h.includes('amount')) return 'chase'
  return 'generic'
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current || row.length) {
        row.push(current.trim().replace(/^"|"$/g, ''))
        rows.push(row)
        row = []
        current = ''
      }
      if (ch === '\r' && text[i + 1] === '\n') i++ // skip \r\n
    } else {
      current += ch
    }
  }
  if (current || row.length) {
    row.push(current.trim().replace(/^"|"$/g, ''))
    rows.push(row)
  }
  return rows.filter(r => r.some(c => c))
}

function parseCapitalOne(rows: string[][], headers: string[]): RawTx[] {
  const hi = (name: string) => headers.findIndex(h => h.toLowerCase().trim() === name)
  const dateIdx = hi('transaction date')
  const descIdx = hi('description')
  const debitIdx = hi('debit')
  const creditIdx = hi('credit')

  return rows.slice(1).flatMap(row => {
    const date = row[dateIdx]?.trim()
    const desc = row[descIdx]?.trim()
    const debit = parseFloat(row[debitIdx]?.trim() || '0') || 0
    const credit = parseFloat(row[creditIdx]?.trim() || '0') || 0
    if (!date || !desc) return []
    const amount = debit > 0 ? debit : -credit  // credits are negative (refunds)
    return [{ date: normalizeDate(date), description: desc, amount }]
  })
}

function parseChase(rows: string[][], headers: string[]): RawTx[] {
  const hi = (name: string) => headers.findIndex(h => h.toLowerCase().trim() === name)
  const dateIdx = hi('transaction date')
  const descIdx = hi('description')
  const amtIdx = hi('amount')

  return rows.slice(1).flatMap(row => {
    const date = row[dateIdx]?.trim()
    const desc = row[descIdx]?.trim()
    const amount = parseFloat(row[amtIdx]?.trim() || '0') || 0
    if (!date || !desc) return []
    // Chase: negative = expense, positive = credit
    return [{ date: normalizeDate(date), description: desc, amount: -amount }]
  })
}

function parseGeneric(rows: string[][], headers: string[]): RawTx[] {
  const h = headers.map(h => h.toLowerCase().trim())
  const dateIdx = h.findIndex(x => x.includes('date'))
  const descIdx = h.findIndex(x => x.includes('desc') || x.includes('merchant') || x.includes('payee') || x.includes('name'))
  const amtIdx = h.findIndex(x => x.includes('amount') || x.includes('debit'))
  if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) return []

  return rows.slice(1).flatMap(row => {
    const date = row[dateIdx]?.trim()
    const desc = row[descIdx]?.trim()
    const amount = Math.abs(parseFloat(row[amtIdx]?.trim().replace(/[^0-9.-]/g, '') || '0') || 0)
    if (!date || !desc || !amount) return []
    return [{ date: normalizeDate(date), description: desc, amount }]
  })
}

function normalizeDate(raw: string): string {
  // Handle MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
  const dash = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dash) return `${dash[3]}-${dash[1].padStart(2, '0')}-${dash[2].padStart(2, '0')}`
  return raw // assume already YYYY-MM-DD
}

// ── Route handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const source = (formData.get('source') as string) || 'csv'

  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) return NextResponse.json({ error: 'CSV appears empty or invalid' }, { status: 400 })

  const headers = rows[0]
  const format = detectFormat(headers)

  let rawTxs: RawTx[]
  if (format === 'capitalone') rawTxs = parseCapitalOne(rows, headers)
  else if (format === 'chase') rawTxs = parseChase(rows, headers)
  else rawTxs = parseGeneric(rows, headers)

  if (!rawTxs.length) return NextResponse.json({ error: 'No transactions found in CSV. Check the format.' }, { status: 400 })

  // Load classification rules
  const { data: rules } = await supabase
    .from('classification_rules')
    .select('*')
    .order('priority', { ascending: false })

  // Build insert rows
  const toInsert = rawTxs.map(tx => {
    const { classification, project_id, rule_id } = classifyTransaction(
      tx.merchant || tx.description,
      rules || []
    )
    return {
      plaid_tx_id: null,
      date: tx.date,
      amount: tx.amount,
      merchant_name: null,
      description: tx.description,
      category_raw: [source],
      project_id: project_id || null,
      classification,
      matched_rule_id: rule_id || null,
      pending: false,
      account_id: source,
      currency: 'USD',
    }
  })

  // Insert (skip duplicates by checking date+description+amount)
  let inserted = 0
  let skipped = 0

  for (const tx of toInsert) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('date', tx.date)
      .eq('description', tx.description)
      .eq('amount', tx.amount)
      .eq('account_id', source)
      .limit(1)

    if (existing?.length) { skipped++; continue }

    const { error } = await supabase.from('transactions').insert(tx)
    if (!error) inserted++
  }

  await supabase.from('logs').insert({
    event_type: 'csv_imported',
    entity_type: 'transaction',
    description: `CSV import (${format}): ${inserted} imported, ${skipped} duplicates skipped`,
  })

  return NextResponse.json({ imported: inserted, skipped, total: rawTxs.length, format })
}
