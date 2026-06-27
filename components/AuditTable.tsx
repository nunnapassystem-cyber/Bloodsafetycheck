import type { TransfusionLog } from '@/types'
import { fmtTime } from '@/lib/format'

interface Props { logs: TransfusionLog[]; showWard?: boolean }

export function AuditTable({ logs, showWard = false }: Props) {
  if (logs.length === 0) return <p className="text-sm text-gray-400 text-center py-8">ไม่มีรายการ</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {showWard && <Th>Ward</Th>}
            <Th>เวลา</Th><Th>Wristband ID</Th><Th>ถุงเลือด</Th>
            <Th>ชนิด</Th><Th>Blood Group</Th><Th>ผลการ Match</Th>
            <Th>พยาบาล 1</Th><Th>พยาบาล 2</Th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
              {showWard && <Td>{log.ward_id}</Td>}
              <Td>{fmtTime(log.started_at)}</Td>
              <Td mono>{log.wristband_id}</Td>
              <Td mono>{log.blood_bag_id}</Td>
              <Td>{log.blood_component}</Td>
              <Td mono>{log.blood_group_bag}</Td>
              <Td>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.match_result === 'PASS' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  {log.match_result === 'PASS' ? '✅ PASS' : '❌ FAIL'}
                </span>
                {log.alert_reason && <p className="text-xs text-danger mt-0.5">{log.alert_reason}</p>}
              </Td>
              <Td>{log.nurse_1_name}</Td>
              <Td>{log.nurse_2_name}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4 whitespace-nowrap">{children}</th>
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`py-2 pr-4 text-gray-900 whitespace-nowrap align-top ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
}
