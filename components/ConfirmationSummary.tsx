import type { BloodBagData, PatientData } from '@/types'
import { fmtDate } from '@/lib/format'

interface Props { bloodBag: BloodBagData; patientData: PatientData; patientBloodGroup: string; orderedComponent: string }

export function ConfirmationSummary({ bloodBag, patientData, patientBloodGroup, orderedComponent }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-medium text-gray-500">สรุปก่อนยืนยัน</p>
      <Row label="ชื่อผู้ป่วย / HN" value={patientData.name || `HN: ${patientData.wristbandId}`} />
      <Row label="Blood Group ผู้ป่วย" value={patientBloodGroup} mono />
      <Row label="Blood Group ถุงเลือด" value={bloodBag.bloodGroup} mono />
      <Row label="ชนิดที่สั่ง" value={orderedComponent} />
      <Row label="ชนิดในถุงเลือด" value={bloodBag.component} />
      <Row label="หมายเลขถุง" value={bloodBag.id} mono />
      <Row label="วันหมดอายุ" value={fmtDate(bloodBag.expiryISO)} />
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-500">ผลการ Match</span>
        <span className="text-sm font-semibold text-success">✅ PASS</span>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
