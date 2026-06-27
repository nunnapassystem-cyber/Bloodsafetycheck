'use client'
import { useState, useEffect } from 'react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { PatientCard } from '@/components/PatientCard'
import { AlertBanner } from '@/components/AlertBanner'
import { parseBarcodeWristband } from '@/lib/barcode'
import { isBloodGroupMatch } from '@/lib/blood-logic'
import { playAlert } from '@/lib/audio'
import type { usePatientSession } from '@/hooks/usePatientSession'

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']

interface Props { session: ReturnType<typeof usePatientSession> }

export function PatientStep({ session }: Props) {
  const [scanError, setScanError] = useState<string | null>(null)
  const [matchFailed, setMatchFailed] = useState(false)
  const [nurse1Name, setNurse1Name] = useState('')
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.nurse_name) setNurse1Name(user.user_metadata.nurse_name)
      })
    })
  }, [])

  function handleWristbandScan(raw: string) {
    setScanError(null)
    const patient = parseBarcodeWristband(raw)
    if (!patient) { setScanError('รูปแบบ Barcode ไม่ถูกต้อง — กรุณาลองใหม่'); return }
    session.setPatientData(patient)
    setMatchFailed(false)
  }

  async function handleMatch() {
    if (!session.patientData || !session.patientBloodGroup || !session.bloodBag) return
    const ok = isBloodGroupMatch(session.patientBloodGroup, session.bloodBag.bloodGroup)
    if (ok) {
      session.nextStep()
    } else {
      playAlert()
      setMatchFailed(true)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: session.patientData.wristbandId,
          blood_bag_id: session.bloodBag.id,
          blood_component: session.bloodBag.component,
          blood_group_bag: session.bloodBag.bloodGroup,
          match_result: 'FAIL',
          alert_reason: `Blood Group ไม่ตรง: ผู้ป่วย ${session.patientBloodGroup} / ถุงเลือด ${session.bloodBag.bloodGroup}`,
          nurse_1_name: nurse1Name,
          nurse_2_name: '',
          started_at: new Date().toISOString(),
        }),
      })
      session.clearSession()
    }
  }

  return (
    <div className="space-y-4">
      <BarcodeScanner onScan={handleWristbandScan} label="Scan ป้ายข้อมือ" />
      {scanError && <AlertBanner type="danger" title={scanError} />}

      {session.patientData && (
        <>
          <PatientCard patient={session.patientData} bloodGroup={session.patientBloodGroup} />
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Blood Group ผู้ป่วย</label>
            <select
              value={session.patientBloodGroup}
              onChange={e => session.setPatientBloodGroup(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            >
              <option value="">เลือก Blood Group...</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>

          {matchFailed && (
            <AlertBanner
              type="danger"
              title="Blood Group ไม่ตรง — ห้ามให้เลือด"
              message="ส่งถุงเลือดคืน Blood Bank — บันทึก FAIL Log แล้ว"
            />
          )}

          {!matchFailed && session.patientBloodGroup && (
            <button
              onClick={handleMatch}
              className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
            >
              ผู้ป่วยยืนยันแล้ว — ตรวจสอบ Blood Group
            </button>
          )}
        </>
      )}
    </div>
  )
}
