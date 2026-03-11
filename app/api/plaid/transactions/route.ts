import { NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { classifyTransaction } from '@/lib/classification/engine'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createAdminClient()

  // Get all connected Plaid items
  const { data: items, error: itemsError } = await supabase
    .from('plaid_items')
    .select('*')

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  if (!items?.length) return NextResponse.json({ synced: 0, message: 'No connected bank accounts' })

  // Load classification rules once
  const { data: rules } = await supabase
    .from('classification_rules')
    .select('*')
    .order('priority', { ascending: false })

  let totalSynced = 0

  for (const item of items) {
    try {
      const request: Parameters<typeof plaidClient.transactionsSync>[0] = {
        access_token: item.access_token,
      }
      if (item.cursor) request.cursor = item.cursor

      const response = await plaidClient.transactionsSync(request)
      const { added, modified, removed, next_cursor, has_more } = response.data

      // Process added transactions
      const toInsert = added.map(tx => {
        const { classification, project_id, rule_id } = classifyTransaction(
          tx.merchant_name || tx.name,
          rules || []
        )
        return {
          plaid_item_id: item.id,
          plaid_tx_id: tx.transaction_id,
          date: tx.date,
          amount: tx.amount,
          merchant_name: tx.merchant_name || null,
          description: tx.name,
          category_raw: tx.personal_finance_category
            ? [tx.personal_finance_category.primary]
            : (tx.category || []),
          project_id: project_id || null,
          classification,
          matched_rule_id: rule_id || null,
          pending: tx.pending,
          account_id: tx.account_id,
          currency: tx.iso_currency_code || 'USD',
        }
      })

      if (toInsert.length) {
        await supabase.from('transactions').upsert(toInsert, { onConflict: 'plaid_tx_id' })
        totalSynced += toInsert.length
      }

      // Update modified
      for (const tx of modified) {
        const { classification, project_id, rule_id } = classifyTransaction(
          tx.merchant_name || tx.name,
          rules || []
        )
        await supabase
          .from('transactions')
          .update({
            amount: tx.amount,
            merchant_name: tx.merchant_name || null,
            description: tx.name,
            pending: tx.pending,
            classification,
            project_id: project_id || null,
            matched_rule_id: rule_id || null,
          })
          .eq('plaid_tx_id', tx.transaction_id)
          .eq('is_manual', false) // don't override manual classifications
      }

      // Remove deleted
      if (removed.length) {
        const ids = removed.map(r => r.transaction_id)
        await supabase.from('transactions').delete().in('plaid_tx_id', ids)
      }

      // Update cursor
      await supabase
        .from('plaid_items')
        .update({ cursor: next_cursor, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (has_more) {
        // In production you'd loop; for simplicity we stop here and next sync picks up
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync error'
      console.error(`Plaid sync error for item ${item.id}:`, msg)
    }
  }

  await supabase.from('logs').insert({
    event_type: 'transactions_synced',
    entity_type: 'transaction',
    description: `Synced ${totalSynced} new transactions from ${items.length} account(s)`,
  })

  return NextResponse.json({ synced: totalSynced, accounts: items.length })
}
