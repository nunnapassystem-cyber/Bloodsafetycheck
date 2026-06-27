import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wardId = user.user_metadata?.ward_id
  if (!wardId) return NextResponse.json({ error: 'No ward_id in token' }, { status: 400 })

  const body = await request.json()
  const { error } = await supabase.from('transfusion_logs').insert({
    ward_id: wardId,
    wristband_id: body.wristband_id,
    blood_bag_id: body.blood_bag_id,
    blood_component: body.blood_component,
    blood_group_bag: body.blood_group_bag,
    match_result: body.match_result,
    alert_reason: body.alert_reason ?? null,
    nurse_1_name: body.nurse_1_name,
    nurse_2_name: body.nurse_2_name,
    started_at: body.started_at,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')   // YYYY-MM-DD
  const result = searchParams.get('result') // PASS | FAIL | all

  let query = supabase
    .from('transfusion_logs')
    .select('*')
    .order('started_at', { ascending: false })

  if (date) {
    query = query.gte('started_at', `${date}T00:00:00Z`).lte('started_at', `${date}T23:59:59Z`)
  }
  if (result && result !== 'all') {
    query = query.eq('match_result', result)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
