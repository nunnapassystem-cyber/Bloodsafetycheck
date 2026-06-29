import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('ward_settings')
    .select('ward_id, enabled')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ward_id, enabled } = await request.json()
  if (!ward_id || typeof enabled !== 'boolean')
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { error } = await supabase
    .from('ward_settings')
    .upsert({ ward_id, enabled })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
