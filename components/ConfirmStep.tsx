'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmationSummary } from '@/components/ConfirmationSummary'
import { AlertBanner } from '@/components/AlertBanner'
import { fmtTime } from '@/lib/format'
import type { usePatientSession } from '@/hooks/usePatientSession'

interface Props { session: ReturnType<typeof usePatientSession> }

interface SavedSummary {
  patientName: string
  patientHN: string
  patientBloodGroup: string
  bagBloodGroup: string
  bagComponent: string
  bagId: string
  volumeMl: number
  nurse1Name: string
  nurse2Name: string
  wardName: string
  savedTime: string
}

function drawSummaryCanvas(s: SavedSummary): HTMLCanvasElement {
  const W = 720, PADDING = 28
  const HEADER_H = 60, BANNER_H = 44, ROW_H = 38, FOOTER_H = 40
  const rows: [string, string][] = [
    ['ชื่อผู้ป่วย / HN', s.patientName || `HN: ${s.patientHN}`],
    ['Blood Group ผู้ป่วย', s.patientBloodGroup],
    ['Blood Group ถุงเลือด', s.bagBloodGroup],
    ['Component', s.bagComponent],
    ['ปริมาณ', `${s.volumeMl} ml`],
    ['Barcode เลือด', s.bagId],
    ['Ward', s.wardName],
    ['พยาบาลคนที่ 1', s.nurse1Name],
    ['พยาบาลคนที่ 2', s.nurse2Name],
  ]
  const H = HEADER_H + BANNER_H + rows.length * ROW_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#185FA5'
  ctx.fillRect(0, 0, W, HEADER_H)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('SRK Safe Blood Transfusion System', PADDING, HEADER_H / 2)

  ctx.fillStyle = '#D5F0E3'
  ctx.fillRect(0, HEADER_H, W, BANNER_H)
  ctx.fillStyle = '#1A7A4A'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText(`✅ บันทึกสำเร็จ — เริ่มให้เลือด ${s.savedTime}`, PADDING, HEADER_H + BANNER_H / 2)

  let y = HEADER_H + BANNER_H
  rows.forEach(([label, value], i) => {
    ctx.fillStyle = i % 2 === 0 ? '#f9fafb' : '#ffffff'
    ctx.fillRect(0, y, W, ROW_H)
    ctx.fillStyle = '#6b7280'
    ctx.font = '13px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, PADDING, y + ROW_H / 2)
    ctx.fillStyle = '#111827'
    ctx.fillText(value, W / 2, y + ROW_H / 2)
    y += ROW_H
  })

  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, y, W, FOOTER_H)
  ctx.fillStyle = '#9ca3af'
  ctx.font = '11px sans-serif'
  ctx.fillText('ระบบตรวจสอบความปลอดภัยการให้เลือด — SRK Hospital', PADDING, y + FOOTER_H / 2)

  return canvas
}

export function ConfirmStep({ session }: Props) {
  const [nurse1Name, setNurse1Name] = useState('')
  const [nurse2Name, setNurse2Name] = useState('')
  const [wardName, setWardName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedTime, setSavedTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.nurse_name) setNurse1Name(user.user_metadata.nurse_name)
      if (user?.user_metadata?.ward_name) setWardName(user.user_metadata.ward_name)
    })
  }, [])

  async function handleShare() {
    if (!savedSummary || sharing) return
    setSharing(true)
    try {
      const canvas = drawSummaryCanvas(savedSummary)
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      )
      if (!blob) return
      const fname = `blood-transfusion-${savedSummary.patientHN}.jpg`
      const file = new File([blob], fname, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'สรุปการให้เลือด' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = fname; a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setSharing(false)
    }
  }

  async function handleConfirm() {
    if (!nurse1Name.trim()) { setError('ไม่สามารถโหลดข้อมูลพยาบาล — กรุณา Logout และ Login ใหม่'); return }
    if (!nurse2Name.trim()) { setError('กรุณากรอกชื่อพยาบาลคนที่ 2'); return }
    if (nurse2Name.trim() === nurse1Name.trim()) { setError('ต้องเป็นพยาบาลคนละคน'); return }
    if (!session.bloodBag || !session.patientData) return

    setSaving(true); setError(null)
    const startedAt = new Date().toISOString()

    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wristband_id: session.patientData.wristbandId,
        blood_bag_id: session.bloodBag.id,
        blood_component: session.bloodBag.component,
        blood_group_bag: session.bloodBag.bloodGroup,
        match_result: 'PASS',
        alert_reason: null,
        nurse_1_name: nurse1Name,
        nurse_2_name: nurse2Name.trim(),
        started_at: startedAt,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'บันทึกไม่สำเร็จ — กรุณาลองใหม่')
      return
    }

    const time = fmtTime(startedAt)
    setSavedSummary({
      patientName: session.patientData.name,
      patientHN: session.patientData.wristbandId,
      patientBloodGroup: session.patientBloodGroup,
      bagBloodGroup: session.bloodBag.bloodGroup,
      bagComponent: session.bloodBag.component,
      bagId: session.bloodBag.id,
      volumeMl: session.bloodBag.volumeMl,
      nurse1Name,
      nurse2Name: nurse2Name.trim(),
      wardName,
      savedTime: time,
    })
    setSavedTime(time)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <AlertBanner type="success" title={`บันทึกสำเร็จ — เริ่มให้เลือด ${savedTime}`} />

        {savedSummary && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <p className="text-xs font-medium text-gray-500">สรุปการให้เลือด</p>
            {([
              ['ชื่อผู้ป่วย / HN', savedSummary.patientName || `HN: ${savedSummary.patientHN}`],
              ['Blood Group ผู้ป่วย', savedSummary.patientBloodGroup],
              ['Blood Group ถุงเลือด', savedSummary.bagBloodGroup],
              ['Component', savedSummary.bagComponent],
              ['ปริมาณ', `${savedSummary.volumeMl} ml`],
              ['Barcode เลือด', savedSummary.bagId],
              ['Ward', savedSummary.wardName],
              ['พยาบาลคนที่ 1', savedSummary.nurse1Name],
              ['พยาบาลคนที่ 2', savedSummary.nurse2Name],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">{label}</span>
                <span className="text-sm text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">ผลการตรวจสอบ</span>
              <span className="text-sm font-semibold text-success">✅ PASS</span>
            </div>
          </div>
        )}

        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full border border-gray-200 text-sm font-medium text-gray-700 py-3 rounded hover:border-gray-400 transition-colors disabled:opacity-50"
        >
          {sharing ? 'กำลังสร้างภาพ...' : 'บันทึกภาพ / แชร์ไป LINE'}
        </button>

        <button
          onClick={() => { session.clearSession(); setSaved(false); setNurse2Name(''); setSavedSummary(null) }}
          className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
        >
          เริ่มผู้ป่วยรายต่อไป
        </button>
      </div>
    )
  }

  if (!session.bloodBag || !session.patientData) return null

  return (
    <div className="space-y-4">
      <ConfirmationSummary
        bloodBag={session.bloodBag}
        patientData={session.patientData}
        patientBloodGroup={session.patientBloodGroup}
      />
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">พยาบาลคนที่ 1</label>
          <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-700">
            {nurse1Name || '(โหลดจาก Session...)'}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">พยาบาลคนที่ 2</label>
          <input
            type="text"
            value={nurse2Name}
            onChange={e => { setNurse2Name(e.target.value); setError(null) }}
            placeholder="ชื่อพยาบาลผู้ยืนยัน..."
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      {error && <AlertBanner type="danger" title={error} />}
      <button
        onClick={handleConfirm}
        disabled={saving}
        className="w-full bg-success text-white text-sm font-semibold py-3 rounded disabled:opacity-50 transition-colors"
      >
        {saving ? 'กำลังบันทึก...' : 'ยืนยันเริ่มให้เลือด — บันทึกเวลา'}
      </button>
    </div>
  )
}
