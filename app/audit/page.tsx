'use client'
import { useState, useEffect, useCallback } from 'react'
import { FilterBar } from '@/components/FilterBar'
import { AuditTable } from '@/components/AuditTable'
import { exportLogsToExcel } from '@/lib/excel'
import type { TransfusionLog } from '@/types'

function todayISO(): string { return new Date().toISOString().slice(0, 10) }

export default function AuditPage() {
  const [date, setDate] = useState(todayISO())
  const [result, setResult] = useState<'all' | 'PASS' | 'FAIL'>('all')
  const [logs, setLogs] = useState<TransfusionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocrCount, setOcrCount] = useState<number | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/logs?date=${date}&result=${result}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ — กรุณารีเฟรช')
    } finally {
      setLoading(false)
    }
  }, [date, result])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    fetch('/api/ocr-stats').then(r => r.json()).then(d => setOcrCount(d.thisMonth ?? 0)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-gray-900">Audit Log</h1>
        <button
          onClick={() => exportLogsToExcel(logs)}
          disabled={logs.length === 0}
          className="text-xs font-medium text-primary border border-primary rounded px-3 py-1.5 hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          Export Excel
        </button>
      </div>
      {ocrCount !== null && (
        <div className={`text-xs rounded px-3 py-2 mb-3 flex items-center justify-between ${ocrCount >= 900 ? 'bg-warning-light text-warning' : 'bg-gray-50 text-gray-500'}`}>
          <span>OCR Scans เดือนนี้</span>
          <span className="font-mono font-medium text-gray-900">
            {ocrCount.toLocaleString()} / 1,000
            {ocrCount >= 900 && ' ⚠️ ใกล้ถึงลิมิต'}
          </span>
        </div>
      )}
      <FilterBar date={date} onDateChange={setDate} result={result} onResultChange={setResult} count={logs.length} />
      {loading
        ? <p className="text-sm text-gray-400 text-center py-8">กำลังโหลด...</p>
        : error
          ? <p className="text-sm text-danger text-center py-8">{error}</p>
          : <AuditTable logs={logs} />}
    </div>
  )
}
