'use client'
import { useState, useEffect } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { BloodBagCard } from '@/components/BloodBagCard'
import { PatientCard } from '@/components/PatientCard'
import { AlertBanner } from '@/components/AlertBanner'
import { PatientStep } from '@/components/PatientStep'
import { ConfirmStep } from '@/components/ConfirmStep'
import { usePatientSession } from '@/hooks/usePatientSession'
import { parseBarcodeBloodBag } from '@/lib/barcode'
import { isExpired, isBloodGroupMatch, isComponentMatch } from '@/lib/blood-logic'
import { playAlert } from '@/lib/audio'
import { createClient } from '@/lib/supabase/client'

export default function ScanPage() {
  const session = usePatientSession()
  const [scanError, setScanError] = useState<string | null>(null)
  const [matchFailed, setMatchFailed] = useState(false)
  const [matchPassed, setMatchPassed] = useState(false)
  const [nurse1Name, setNurse1Name] = useState('')
  const [scannedBagIds] = useState(() => new Set<string>())

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.nurse_name) setNurse1Name(user.user_metadata.nurse_name)
    })
  }, [])

  async function handleBloodBagScan(raw: string) {
    setScanError(null)
    setMatchFailed(false)
    setMatchPassed(false)

    const bag = parseBarcodeBloodBag(raw)
    if (!bag) { setScanError('รูปแบบ Barcode ไม่ถูกต้อง — กรุณาลองใหม่'); return }
    if (scannedBagIds.has(bag.id)) { setScanError('⚠️ ถุงเลือดนี้ถูกใช้แล้ว — ตรวจสอบก่อนดำเนินการต่อ'); return }
    scannedBagIds.add(bag.id)
    session.setBloodBag(bag)

    // blocked states — แสดง alert แต่ไม่ match
    if (isExpired(bag.expiryISO) || bag.crossMatch === 'Incompatible') return

    // auto-match: blood group + component
    const bgOk = isBloodGroupMatch(session.patientBloodGroup, bag.bloodGroup)
    const compOk = isComponentMatch(session.orderedComponent, bag.component)

    if (!bgOk || !compOk) {
      playAlert()
      setMatchFailed(true)

      const reasons: string[] = []
      if (!bgOk) reasons.push(`Blood Group ไม่ตรง: ผู้ป่วย ${session.patientBloodGroup} / ถุงเลือด ${bag.bloodGroup}`)
      if (!compOk) reasons.push(`ชนิดเลือดไม่ตรง: สั่ง ${session.orderedComponent} / ได้ ${bag.component}`)

      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: session.patientData!.wristbandId,
          blood_bag_id: bag.id,
          blood_component: bag.component,
          blood_group_bag: bag.bloodGroup,
          match_result: 'FAIL',
          alert_reason: reasons.join(' | '),
          nurse_1_name: nurse1Name,
          nurse_2_name: '',
          started_at: new Date().toISOString(),
        }),
      })
      session.clearSession()
    } else {
      setMatchPassed(true)
    }
  }

  const bag = session.bloodBag
  const blocked = bag ? (isExpired(bag.expiryISO) || bag.crossMatch === 'Incompatible') : false

  return (
    <div>
      <StepIndicator currentStep={session.step} />

      {session.step === 1 && <PatientStep session={session} />}

      {session.step === 2 && (
        <div className="space-y-4">
          {session.patientData && (
            <PatientCard
              patient={session.patientData}
              bloodGroup={session.patientBloodGroup}
              orderedComponent={session.orderedComponent}
            />
          )}

          {!matchFailed && (
            <BarcodeScanner onScan={handleBloodBagScan} label="Scan ถุงเลือด" />
          )}

          {scanError && <AlertBanner type="warning" title={scanError} />}

          {matchFailed && (
            <div className="space-y-3">
              <AlertBanner
                type="danger"
                title="ไม่ตรง — ห้ามให้เลือด"
                message="บันทึก FAIL Log แล้ว — ส่งถุงเลือดคืน Blood Bank"
              />
              <button
                onClick={() => { setMatchFailed(false); setMatchPassed(false); setScanError(null) }}
                className="w-full border border-gray-200 text-sm text-gray-600 py-2 rounded hover:border-gray-400 transition-colors"
              >
                เริ่มผู้ป่วยรายใหม่
              </button>
            </div>
          )}

          {bag && !matchFailed && (
            <div className="space-y-4">
              <BloodBagCard bag={bag} />

              {isExpired(bag.expiryISO) && (
                <AlertBanner type="danger" title="ถุงเลือดหมดอายุ — ห้ามใช้" message="ส่งถุงเลือดคืน Blood Bank" />
              )}
              {bag.crossMatch === 'Incompatible' && (
                <AlertBanner type="danger" title="Cross-match: Incompatible — ห้ามให้เลือด" message="ส่งถุงเลือดคืน Blood Bank" />
              )}

              {matchPassed && !blocked && (
                <div className="space-y-3">
                  <AlertBanner type="success" title="✅ ตรวจสอบผ่าน — หมู่เลือดและชนิดตรงกัน" />
                  <button
                    onClick={() => session.nextStep()}
                    className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
                  >
                    ยืนยัน → ขั้นตอนยืนยัน 2 พยาบาล
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {session.step === 3 && <ConfirmStep session={session} />}
    </div>
  )
}
