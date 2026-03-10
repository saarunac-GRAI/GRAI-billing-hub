import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')
  const cycle = searchParams.get('billing_cycle')

  let query = supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .order('next_renewal_date', { ascending: true })

  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('status', status)
  if (cycle) query = query.eq('billing_cycle', cycle)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(body)
    .select('*, project:projects(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log event
  await supabase.from('logs').insert({
    event_type: 'subscription_created',
    entity_type: 'subscription',
    entity_id: data.id,
    project_id: data.project_id,
    description: `Subscription "${data.name}" created`,
    metadata: { source: body.source || 'manual' },
  })

  return NextResponse.json(data, { status: 201 })
}
