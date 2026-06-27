'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/KPICard'
import { AuditTable } from '@/components/AuditTable'
import { FilterBar } from '@/components/FilterBar'
import { AlertBanner } from '@/components/AlertBanner'
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs'
import { fmtTime } from '@/lib/format'
import type { TransfusionLog } from '@/types'

function todayISO(): string { return new Date().toISOString().slice(0, 10) }

export default function AdminPage() {
  const [date, setDate] = useState(todayISO())
  const [result, setResult] = useState<'all' | 'PASS' | 'FAIL'>('all')
  const [logs, setLogs] = useState<TransfusionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [failAlert, setFailAlert] = useState<TransfusionLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/logs?date=${date}&result=${result}`)
    const data = await res.json()
    setLogs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [date, result])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useRealtimeLogs((log) => { setFailAlert(log); fetchLogs() })

  const passCount = logs.filter(l => l.match_result === 'PASS').length
  const failCount = logs.filter(l => l.match_result === 'FAIL').length
  const wardCount = new Set(logs.map(l => l.ward_id)).size

  const wardIds = Array.from(new Set(logs.map(l => l.ward_id)))
  const wardChartData = wardIds.map(w => ({
    ward: w,
    PASS: logs.filter(l => l.ward_id === w && l.match_result === 'PASS').length,
    FAIL: logs.filter(l => l.ward_id === w && l.match_result === 'FAIL').length,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-base font-semibold text-gray-900">Admin Dashboard</h1>

      {failAlert && (
        <AlertBanner
          type="danger"
          title={`⚠️ มี Alert ใน Ward ${failAlert.ward_id} — ${fmtTime(failAlert.started_at)}`}
          message={failAlert.alert_reason ?? ''}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <KPICard label="รายการ (ทั้งหมด)" value={logs.length} />
        <KPICard label="PASS" value={passCount} />
        <KPICard label="FAIL / Alert" value={failCount} danger={failCount > 0} />
        <KPICard label="Ward ที่ใช้งาน" value={wardCount} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">PASS vs FAIL แยกตาม Ward</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={wardChartData}>
            <XAxis dataKey="ward" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {/* Recharts fill requires hex/CSS values — Tailwind class strings not supported here */}
            <Bar dataKey="PASS" fill="#1A7A4A" />
            <Bar dataKey="FAIL" fill="#A32D2D" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Log ทุก Ward</p>
        <FilterBar date={date} onDateChange={setDate} result={result} onResultChange={setResult} count={logs.length} />
        {loading
          ? <p className="text-sm text-gray-400 text-center py-8">กำลังโหลด...</p>
          : <AuditTable logs={logs} showWard />}
      </div>
    </div>
  )
}
