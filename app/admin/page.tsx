'use client'
import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { KPICard } from '@/components/KPICard'
import { AuditTable } from '@/components/AuditTable'
import { FilterBar } from '@/components/FilterBar'
import { AlertBanner } from '@/components/AlertBanner'
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs'
import { fmtTime } from '@/lib/format'
import { WARDS } from '@/lib/wards'
import type { TransfusionLog } from '@/types'

interface NurseUser {
  id: string
  email: string
  nurse_name: string
  ward_id: string
  ward_name: string
}

function todayISO(): string { return new Date().toISOString().slice(0, 10) }

export default function AdminPage() {
  const [date, setDate] = useState(todayISO())
  const [result, setResult] = useState<'all' | 'PASS' | 'FAIL'>('all')
  const [logs, setLogs] = useState<TransfusionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [failAlert, setFailAlert] = useState<TransfusionLog | null>(null)

  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [nurses, setNurses] = useState<NurseUser[]>([])
  const [nurseLoading, setNurseLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('Nurse1234')
  const [newNurseName, setNewNurseName] = useState('')
  const [newWardId, setNewWardId] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [creating, setCreating] = useState(false)

  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetMsg, setResetMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const [resetting, setResetting] = useState(false)

  async function handleResetPassword(userId: string) {
    if (!resetPassword) return
    setResetting(true)
    setResetMsg(null)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password: resetPassword }),
    })
    setResetting(false)
    if (!res.ok) {
      const d = await res.json()
      setResetMsg({ id: userId, ok: false, text: d.error ?? 'ไม่สำเร็จ' })
    } else {
      setResetMsg({ id: userId, ok: true, text: `✅ Reset แล้ว — รหัสใหม่: ${resetPassword}` })
      setResetPassword('')
      setResetUserId(null)
    }
  }

  const fetchNurses = useCallback(async () => {
    setNurseLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setNurses(Array.isArray(data) ? data : [])
    setNurseLoading(false)
  }, [])

  useEffect(() => {
    if (showUserMgmt) fetchNurses()
  }, [showUserMgmt, fetchNurses])

  async function handleCreateUser() {
    setCreateError(null)
    setCreateSuccess(false)
    if (!newEmail || !newPassword || !newNurseName || !newWardId) {
      setCreateError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return
    }
    const ward = WARDS.find(w => w.id === newWardId)!
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        nurse_name: newNurseName,
        ward_id: ward.id,
        ward_name: ward.name,
      }),
    })
    setCreating(false)
    if (!res.ok) {
      const d = await res.json()
      setCreateError(d.error ?? 'สร้าง User ไม่สำเร็จ')
      return
    }
    setCreateSuccess(true)
    setNewEmail(''); setNewPassword('Nurse1234'); setNewNurseName(''); setNewWardId('')
    fetchNurses()
  }

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

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowUserMgmt(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>จัดการ Nurse Users</span>
          <span className="text-gray-400">{showUserMgmt ? '▲' : '▼'}</span>
        </button>

        {showUserMgmt && (
          <div className="border-t border-gray-200 p-4 space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500">เพิ่ม Nurse User ใหม่</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">ชื่อพยาบาล</label>
                  <input
                    type="text"
                    value={newNurseName}
                    onChange={e => { setNewNurseName(e.target.value); setCreateError(null); setCreateSuccess(false) }}
                    placeholder="เช่น นางสาวสมใจ รักดี"
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ward</label>
                  <select
                    value={newWardId}
                    onChange={e => { setNewWardId(e.target.value); setCreateError(null); setCreateSuccess(false) }}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">เลือก Ward...</option>
                    {WARDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => { setNewEmail(e.target.value); setCreateError(null); setCreateSuccess(false) }}
                    placeholder="nurse@hospital.com"
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Password เริ่มต้น</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setCreateError(null); setCreateSuccess(false) }}
                    placeholder="เช่น Nurse1234"
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              {createError && (
                <p className="text-xs text-danger font-medium">{createError}</p>
              )}
              {createSuccess && (
                <p className="text-xs text-success font-medium">✅ สร้าง User สำเร็จแล้ว</p>
              )}
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
              >
                {creating ? 'กำลังสร้าง...' : 'สร้าง Nurse User'}
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">รายชื่อ Nurse ทั้งหมด</p>
              {nurseLoading
                ? <p className="text-sm text-gray-400 text-center py-4">กำลังโหลด...</p>
                : nurses.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">ยังไม่มี Nurse User</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">ชื่อพยาบาล</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Ward</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Email</th>
                            <th className="text-left text-xs font-medium text-gray-500 pb-2">Reset รหัสผ่าน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nurses.map(n => (
                            <>
                              <tr key={n.id} className="border-b border-gray-100">
                                <td className="py-2 pr-4 text-gray-900">{n.nurse_name}</td>
                                <td className="py-2 pr-4 text-gray-700">{n.ward_name || n.ward_id}</td>
                                <td className="py-2 pr-4 text-gray-500 font-mono text-xs">{n.email}</td>
                                <td className="py-2">
                                  {resetUserId === n.id ? (
                                    <button
                                      onClick={() => { setResetUserId(null); setResetPassword(''); setResetMsg(null) }}
                                      className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                      ยกเลิก
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setResetUserId(n.id); setResetPassword('Nurse1234'); setResetMsg(null) }}
                                      className="text-xs font-medium text-warning hover:text-warning underline"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {resetUserId === n.id && (
                                <tr key={`reset-${n.id}`} className="bg-warning-light border-b border-gray-100">
                                  <td colSpan={4} className="px-2 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600 whitespace-nowrap">รหัสผ่านใหม่:</span>
                                      <input
                                        type="text"
                                        value={resetPassword}
                                        onChange={e => setResetPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านใหม่"
                                        className="border border-gray-200 rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-primary"
                                        onKeyDown={e => e.key === 'Enter' && handleResetPassword(n.id)}
                                      />
                                      <button
                                        onClick={() => handleResetPassword(n.id)}
                                        disabled={resetting || !resetPassword}
                                        className="bg-warning text-white text-xs font-medium px-3 py-1 rounded disabled:opacity-50 whitespace-nowrap"
                                      >
                                        {resetting ? '...' : 'ยืนยัน Reset'}
                                      </button>
                                    </div>
                                    {resetMsg?.id === n.id && (
                                      <p className={`text-xs mt-1 font-medium ${resetMsg.ok ? 'text-success' : 'text-danger'}`}>
                                        {resetMsg.text}
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
