'use client'
import { useState, useEffect, useCallback } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { OcrScanner } from '@/components/OcrScanner'
import { BloodBagCard } from '@/components/BloodBagCard'
import { PatientCard } from '@/components/PatientCard'
import { AlertBanner } from '@/components/AlertBanner'
import { PatientStep } from '@/components/PatientStep'
import { ConfirmStep } from '@/components/ConfirmStep'
import { usePatientSession } from '@/hooks/usePatientSession'
import { playAlert } from '@/lib/audio'
import { createClient } from '@/lib/supabase/client'
import type { BloodBagOcr } from '@/lib/ocr'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()

  const handleTimeout = useCallback(async () => {
    await createClient().auth.signOut()
    router.push('/login')
  }, [router])

  const session = usePatientSession(handleTimeout)
  const [nurse1Name, setNurse1Name] = useState('')

  // Step 2 state
  const [wristbandVerified, setWristbandVerified] = useState(false)
  const [step2Fail, setStep2Fail] = useState(false)
  const [step2FailReason, setStep2FailReason] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.nurse_name) setNurse1Name(user.user_metadata.nurse_name)
    })
  }, [])

  async function handleWristbandScan(hn: string) {
    const scannedHN = hn.trim()
    if (scannedHN !== session.patientData!.wristbandId) {
      playAlert()
      const reason = `HN ไม่ตรง: ชาร์ท ${session.patientData!.wristbandId} / ข้อมือ ${scannedHN}`
      setStep2Fail(true)
      setStep2FailReason(reason)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: scannedHN,
          blood_bag_id: session.bloodBag!.id,
          blood_component: session.bloodBag!.component,
          blood_group_bag: session.bloodBag!.bloodGroup,
          match_result: 'FAIL',
          alert_reason: reason,
          nurse_1_name: nurse1Name,
          nurse_2_name: '',
          started_at: new Date().toISOString(),
        }),
      })
    } else {
      setWristbandVerified(true)
    }
  }

  async function handleBagRescan(d: BloodBagOcr) {
    const scanned = (d.bagId ?? '').trim()
    if (!scanned || scanned !== session.bloodBag!.id) {
      playAlert()
      const reason = `ถุงเลือดไม่ตรง: บันทึก ${session.bloodBag!.id} / Scan ได้ ${scanned}`
      setStep2Fail(true)
      setStep2FailReason(reason)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: session.patientData!.wristbandId,
          blood_bag_id: scanned,
          blood_component: session.bloodBag!.component,
          blood_group_bag: session.bloodBag!.bloodGroup,
          match_result: 'FAIL',
          alert_reason: reason,
          nurse_1_name: nurse1Name,
          nurse_2_name: '',
          started_at: new Date().toISOString(),
        }),
      })
    } else {
      session.nextStep()
    }
  }

  function handleStep2Reset() {
    session.goBackToStep1()
    setStep2Fail(false)
    setStep2FailReason('')
    setWristbandVerified(false)
  }

  return (
    <div>
      <StepIndicator currentStep={session.step} />

      {session.step === 1 && <PatientStep session={session} nurse1Name={nurse1Name} />}

      {session.step === 2 && (
        <div className="space-y-4">
          {session.patientData && (
            <PatientCard
              patient={session.patientData}
              bloodGroup={session.patientBloodGroup}
              orderedComponent={session.orderedComponent}
            />
          )}

          {step2Fail && (
            <div className="space-y-3">
              <AlertBanner type="danger" title="ตรวจสอบไม่ผ่าน — ห้ามให้เลือด" message={step2FailReason} />
              <button
                onClick={handleStep2Reset}
                className="w-full border border-gray-200 text-sm text-gray-600 py-2 rounded hover:border-gray-400 transition-colors"
              >
                ตรวจสอบซ้ำ — ย้อนกลับขั้นตอน 1
              </button>
            </div>
          )}

          {!step2Fail && !wristbandVerified && (
            <OcrScanner mode="wristband" onResult={(hn) => handleWristbandScan(hn)} />
          )}

          {!step2Fail && wristbandVerified && (
            <div className="space-y-3">
              <AlertBanner type="success" title="✅ ผู้ป่วยถูกคน" />
              {session.bloodBag && <BloodBagCard bag={session.bloodBag} />}
              <OcrScanner mode="bloodbag" onResult={handleBagRescan} />
            </div>
          )}
        </div>
      )}

      {session.step === 3 && <ConfirmStep session={session} />}
    </div>
  )
}
