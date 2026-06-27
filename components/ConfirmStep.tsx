'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmationSummary } from '@/components/ConfirmationSummary'
import { AlertBanner } from '@/components/AlertBanner'
import type { usePatientSession } from '@/hooks/usePatientSession'

interface Props { session: ReturnType<typeof usePatientSession> }

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export function ConfirmStep({ session }: Props) {
  const [nurse1Name, setNurse1Name] = useState('')
  const [nurse2Name, setNurse2Name] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedTime, setSavedTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.nurse_name) setNurse1Name(user.user_metadata.nurse_name)
    })
  }, [])

  async function handleConfirm() {
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
    if (!res.ok) { setError('บันทึกไม่สำเร็จ — กรุณาลองใหม่'); return }

    setSavedTime(fmtTime(startedAt))
    setSaved(true)
    session.clearSession()
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <AlertBanner type="success" title={`บันทึกสำเร็จ — เริ่มให้เลือด ${savedTime}`} />
        <button
          onClick={() => { setSaved(false); setNurse2Name('') }}
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
