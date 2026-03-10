import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, project:projects(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('subscriptions')
    .update(body)
    .eq('id', id)
    .select('*, project:projects(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('logs').insert({
    event_type: 'subscription_updated',
    entity_type: 'subscription',
    entity_id: id,
    project_id: data.project_id,
    description: `Subscription "${data.name}" updated`,
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Get name before deleting for log
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('name, project_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('subscriptions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('logs').insert({
    event_type: 'subscription_deleted',
    entity_type: 'subscription',
    entity_id: id,
    project_id: sub?.project_id,
    description: `Subscription "${sub?.name}" deleted`,
  })

  return NextResponse.json({ success: true })
}
