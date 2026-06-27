'use client'
import { useState } from 'react'
import { StepIndicator } from '@/components/StepIndicator'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { BloodBagCard } from '@/components/BloodBagCard'
import { AlertBanner } from '@/components/AlertBanner'
import { PatientStep } from '@/components/PatientStep'
import { ConfirmStep } from '@/components/ConfirmStep'
import { usePatientSession } from '@/hooks/usePatientSession'
import { parseBarcodeBloodBag } from '@/lib/barcode'
import { isExpired } from '@/lib/blood-logic'

export default function ScanPage() {
  const session = usePatientSession()
  const [scanError, setScanError] = useState<string | null>(null)
  const [scannedBagIds] = useState(() => new Set<string>())

  function handleBloodBagScan(raw: string) {
    setScanError(null)
    const bag = parseBarcodeBloodBag(raw)
    if (!bag) { setScanError('รูปแบบ Barcode ไม่ถูกต้อง — กรุณาลองใหม่'); return }
    if (scannedBagIds.has(bag.id)) { setScanError('⚠️ ถุงเลือดนี้ถูกใช้แล้ว — ตรวจสอบก่อนดำเนินการต่อ'); return }
    scannedBagIds.add(bag.id)
    session.setBloodBag(bag)
  }

  const bag = session.bloodBag
  const blocked = bag ? (isExpired(bag.expiryISO) || bag.crossMatch === 'Incompatible') : false

  return (
    <div>
      <StepIndicator currentStep={session.step} />

      {session.step === 1 && (
        <div className="space-y-4">
          <BarcodeScanner onScan={handleBloodBagScan} label="Scan ถุงเลือด" />
          {scanError && <AlertBanner type="warning" title={scanError} />}

          {bag && (
            <div className="space-y-4">
              <BloodBagCard bag={bag} />
              {isExpired(bag.expiryISO) && (
                <AlertBanner type="danger" title="ถุงเลือดหมดอายุ — ห้ามใช้" message="ส่งถุงเลือดคืน Blood Bank" />
              )}
              {bag.crossMatch === 'Incompatible' && (
                <AlertBanner type="danger" title="Cross-match: Incompatible — ห้ามให้เลือด" message="ส่งถุงเลือดคืน Blood Bank" />
              )}
              {!blocked && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500">เปรียบเทียบกับ Doctor Order</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">ชนิด</span>
                    <span className="font-medium">{bag.component}</span>
                    <span className="text-gray-500">Blood Group</span>
                    <span className="font-mono font-medium">{bag.bloodGroup}</span>
                  </div>
                  <button
                    onClick={() => session.nextStep()}
                    className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded transition-colors"
                  >
                    ยืนยันตรงกับ Order — ไปขั้นตอนที่ 2
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {session.step === 2 && <PatientStep session={session} />}
      {session.step === 3 && <ConfirmStep session={session} />}
    </div>
  )
}
