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
  const [askedName, setAskedName] = useState(false)
  const [bagVerifyIndex, setBagVerifyIndex] = useState(0)

  // derived — multi-bag support
  const allBagIds = session.bloodBag
    ? [session.bloodBag.id, ...(session.bloodBag.extraBags?.map(b => b.id) ?? [])]
    : []
  const currentBagToVerify = allBagIds[bagVerifyIndex] ?? ''
  const isMultiBag = allBagIds.length > 1

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
    if (!scanned || scanned !== currentBagToVerify) {
      playAlert()
      const reason = `ถุงเลือดไม่ตรง: รายการ ${currentBagToVerify} / Scan ได้ ${scanned}`
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
      const nextIndex = bagVerifyIndex + 1
      if (nextIndex >= allBagIds.length) {
        session.nextStep()
      } else {
        setBagVerifyIndex(nextIndex)
      }
    }
  }

  function handleStep2Reset() {
    session.goBackToStep1()
    setStep2Fail(false)
    setStep2FailReason('')
    setWristbandVerified(false)
    setAskedName(false)
    setBagVerifyIndex(0)
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
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setAskedName(prev => !prev)}
                className="w-full flex items-start gap-3 text-left border border-gray-200 rounded-lg px-4 py-3 bg-gray-50"
              >
                <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  askedName ? 'bg-success border-success' : 'border-gray-300 bg-white'
                }`}>
                  {askedName && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className={`text-sm leading-snug ${askedName ? 'text-success font-medium' : 'text-gray-700'}`}>
                  สอบถามชื่อ-สกุลผู้ป่วยก่อนให้การพยาบาลแล้ว
                </span>
              </button>
              {askedName && (
                <OcrScanner mode="wristband" label="ถ่ายรูปสติ๊กเกอร์ชื่อผู้ป่วย (ป้ายข้อมือ)" onResult={(hn) => handleWristbandScan(hn)} />
              )}
            </div>
          )}

          {!step2Fail && wristbandVerified && (
            <div className="space-y-3">
              <AlertBanner type="success" title="✅ ผู้ป่วยถูกคน" />
              {session.bloodBag && <BloodBagCard bag={session.bloodBag} />}
              {isMultiBag && (
                <div className="border border-primary rounded-lg px-3 py-2.5 bg-primary-light">
                  <p className="text-xs font-medium text-primary">
                    ตรวจสอบถุงที่ {bagVerifyIndex + 1} / {allBagIds.length}
                  </p>
                  <p className="font-mono text-sm text-primary mt-0.5">{currentBagToVerify}</p>
                  <div className="flex gap-1 mt-2">
                    {allBagIds.map((id, i) => (
                      <div key={id} className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < bagVerifyIndex ? 'bg-success' : i === bagVerifyIndex ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                    ))}
                  </div>
                </div>
              )}
              <OcrScanner mode="bloodbag" onResult={handleBagRescan} />
            </div>
          )}
        </div>
      )}

      {session.step === 3 && <ConfirmStep session={session} />}
    </div>
  )
}
