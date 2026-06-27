import type { BloodBagData } from '@/types'
import { isExpired, isExpiringSoon } from '@/lib/blood-logic'

interface Props { bag: BloodBagData }

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function BloodBagCard({ bag }: Props) {
  const expired = isExpired(bag.expiryISO)
  const soon = isExpiringSoon(bag.expiryISO)
  const incompat = bag.crossMatch === 'Incompatible'

  return (
    <div className="border border-blood rounded-lg overflow-hidden">
      <div className="bg-blood-light px-4 py-2 border-b border-blood">
        <span className="text-xs font-medium text-blood">ข้อมูลถุงเลือด</span>
      </div>
      <div className="p-4 space-y-3">
        <Row label="หมายเลขถุงเลือด" value={bag.id} mono />
        <Row label="ชนิดเลือด (Component)" value={bag.component} />
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">Blood Group</span>
          <span className="font-mono text-base font-semibold text-blood">{bag.bloodGroup}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">วันหมดอายุ</span>
          <span className={`font-mono text-sm font-medium ${expired ? 'text-danger' : soon ? 'text-warning' : 'text-gray-900'}`}>
            {fmtDate(bag.expiryISO)}
            {expired ? ' (หมดอายุแล้ว)' : soon ? ' (< 24 ชม.)' : ''}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-500">Cross-match result</span>
          <span className={`text-sm font-medium ${incompat ? 'text-danger' : 'text-success'}`}>
            {bag.crossMatch}
          </span>
        </div>
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
