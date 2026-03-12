import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)

  const project = searchParams.get('project')
  const classification = searchParams.get('classification')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = supabase
    .from('transactions')
    .select('*, project:projects(id,name,color)')
    .order('date', { ascending: false })
    .limit(limit)

  if (project) query = query.eq('project_id', project)
  if (classification) query = query.eq('classification', classification)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    // Delete single transaction
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: 1 })
  }

  // Clear all transactions
  const { error, count } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient()
  const { id, classification, project_id, category } = await request.json()

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('transactions')
    .update({
      classification,
      project_id: project_id || null,
      category: category || null,
      is_manual: true,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
