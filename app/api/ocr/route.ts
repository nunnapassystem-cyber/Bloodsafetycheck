import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { image } = body   // base64 string ไม่มี data: prefix
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  if (!process.env.GOOGLE_CLOUD_VISION_API_KEY) {
    return NextResponse.json({ error: 'Vision API not configured' }, { status: 500 })
  }

  // ตรวจสอบ quota เดือนนี้ก่อนส่ง Vision API
  const OCR_MONTHLY_LIMIT = 900
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count: scanCount } = await supabase
    .from('ocr_scans')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth)
  if ((scanCount ?? 0) >= OCR_MONTHLY_LIMIT) {
    return NextResponse.json({ error: `OCR เกิน quota เดือนนี้ (${OCR_MONTHLY_LIMIT} ครั้ง) — กรุณากรอก HN เอง` }, { status: 429 })
  }

  const visionRes = await fetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      }],
    }),
  })

  if (!visionRes.ok) {
    const err = await visionRes.text()
    console.error('Vision API error:', err)
    let errMsg = 'Vision API failed'
    try { errMsg = JSON.parse(err)?.error?.message ?? errMsg } catch { /* ignore */ }
    return NextResponse.json({ error: errMsg }, { status: 502 })
  }

  const visionData = await visionRes.json()
  const text: string = visionData.responses?.[0]?.fullTextAnnotation?.text ?? ''

  // Log scan for usage tracking (fire-and-forget)
  const wardId = (user.user_metadata?.ward_id as string) ?? ''
  supabase.from('ocr_scans').insert({ ward_id: wardId }).then(() => {})

  return NextResponse.json({ text })
}
