import type { BloodBagData, PatientData } from '@/types'

interface Props { bloodBag: BloodBagData; patientData: PatientData; patientBloodGroup: string }

export function ConfirmationSummary({ bloodBag, patientData, patientBloodGroup }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-medium text-gray-500">สรุปก่อนยืนยัน</p>
      <Row label="ชื่อผู้ป่วย / HN" value={patientData.name || `HN: ${patientData.wristbandId}`} />
      <Row label="Blood Group ผู้ป่วย" value={patientBloodGroup} mono />
      <Row label="Blood Group ถุงเลือด" value={bloodBag.bloodGroup} mono />
      {bloodBag.extraBags && bloodBag.extraBags.length > 0 ? (
        <>
          <Row label="Component / จำนวนถุง" value={`${bloodBag.component} — ${1 + bloodBag.extraBags.length} ถุง`} />
          {[{ id: bloodBag.id, volumeMl: bloodBag.volumeMl }, ...bloodBag.extraBags].map((b, i) => (
            <Row key={b.id} label={`ถุง ${i + 1}`} value={`${b.id}  (${b.volumeMl} ml)`} mono />
          ))}
          <Row label="ปริมาณรวม"
               value={`${bloodBag.volumeMl + bloodBag.extraBags.reduce((s, b) => s + b.volumeMl, 0)} ml`} />
        </>
      ) : (
        <>
          <Row label="Component" value={bloodBag.component} />
          <Row label="ปริมาณ" value={`${bloodBag.volumeMl} ml`} />
          <Row label="Barcode เลือด" value={bloodBag.id} mono />
        </>
      )}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-500">ผลการตรวจสอบ</span>
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
