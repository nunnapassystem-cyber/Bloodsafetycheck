import type { BloodBagData } from '@/types'

interface Props { bag: BloodBagData }

export function BloodBagCard({ bag }: Props) {
  return (
    <div className="border border-blood rounded-lg overflow-hidden">
      <div className="bg-blood-light px-4 py-2 border-b border-blood">
        <span className="text-xs font-medium text-blood">ข้อมูลถุงเลือด</span>
      </div>
      <div className="p-4 space-y-3">
        <Row label="หมายเลขถุงเลือด" value={bag.id} mono />
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">Blood Group</span>
          <span className="font-mono text-base font-semibold text-blood">{bag.bloodGroup}</span>
        </div>
        <Row label="ชนิดเลือด (Component)" value={bag.component} />
        <Row label="ปริมาณ" value={`${bag.volumeMl} ml`} />
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
