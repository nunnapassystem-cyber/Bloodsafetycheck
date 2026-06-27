import * as XLSX from 'xlsx'
import type { TransfusionLog } from '@/types'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

export function exportLogsToExcel(logs: TransfusionLog[]): void {
  const rows = logs.map(l => ({
    'เวลา': fmtTime(l.started_at),
    'Wristband ID': l.wristband_id,
    'ถุงเลือด': l.blood_bag_id,
    'ชนิด': l.blood_component,
    'Blood Group': l.blood_group_bag,
    'ผลการ Match': l.match_result,
    'เหตุผล (FAIL)': l.alert_reason ?? '',
    'พยาบาล 1': l.nurse_1_name,
    'พยาบาล 2': l.nurse_2_name,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Log')
  XLSX.writeFile(wb, `audit-log-${new Date().toISOString().slice(0,10)}.xlsx`)
}
