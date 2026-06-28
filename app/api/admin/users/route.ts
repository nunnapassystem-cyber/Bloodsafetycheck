import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, nurse_name, ward_id, ward_name } = body
  if (!email || !password || !nurse_name || !ward_id) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { ward_id, ward_name, nurse_name, role: 'nurse' },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    const thaiMsg = msg.includes('already been registered') || msg.includes('already registered') || msg.includes('already exists')
      ? 'Email นี้มีในระบบแล้ว — กรุณาใช้ Email อื่น'
      : msg.includes('invalid email')
        ? 'รูปแบบ Email ไม่ถูกต้อง'
        : msg.includes('password')
          ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
          : 'สร้าง User ไม่สำเร็จ — กรุณาลองใหม่'
    return NextResponse.json({ error: thaiMsg }, { status: 400 })
  }
  return NextResponse.json({ ok: true, id: data.user.id })
}

export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, password, nurse_name, ward_id, ward_name } = body
  if (!userId) return NextResponse.json({ error: 'กรุณาระบุ userId' }, { status: 400 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (password) {
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (nurse_name || ward_id) {
    const { data: existing } = await adminClient.auth.admin.getUserById(userId)
    const meta = existing?.user?.user_metadata ?? {}
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        ...(nurse_name ? { nurse_name } : {}),
        ...(ward_id ? { ward_id, ward_name: ward_name ?? ward_id } : {}),
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nurses = data.users
    .filter(u => u.user_metadata?.role === 'nurse')
    .map(u => ({
      id: u.id,
      email: u.email,
      nurse_name: u.user_metadata?.nurse_name ?? '',
      ward_id: u.user_metadata?.ward_id ?? '',
      ward_name: u.user_metadata?.ward_name ?? '',
    }))

  return NextResponse.json(nurses)
}
