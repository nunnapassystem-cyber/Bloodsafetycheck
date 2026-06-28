import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wardId = searchParams.get('ward_id')
  if (!wardId) return NextResponse.json([], { status: 200 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) return NextResponse.json([], { status: 200 })

  const nurses = data.users
    .filter(u => u.user_metadata?.ward_id === wardId)
    .map(u => ({
      nurse_name: u.user_metadata?.nurse_name ?? u.email ?? '',
      email: u.email ?? '',
    }))
    .filter(n => n.nurse_name && n.email)

  return NextResponse.json(nurses)
}
