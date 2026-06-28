'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleChange() {
    setError(null)
    if (!newPassword) { setError('กรุณากรอกรหัสผ่านใหม่'); return }
    if (newPassword.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (newPassword !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (updateError) { setError('เปลี่ยนรหัสผ่านไม่สำเร็จ — กรุณาลองใหม่'); return }
    setSuccess(true)
    setNewPassword(''); setConfirm('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-base font-semibold text-gray-900 mb-1">เปลี่ยนรหัสผ่าน</h1>
        <p className="text-xs text-gray-500 mb-6">รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร</p>

        {error && (
          <div className="bg-danger-light border border-danger text-danger text-sm font-medium rounded p-3 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-success-light border border-success text-success text-sm font-medium rounded p-3 mb-4">
            ✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(null); setSuccess(false) }}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null); setSuccess(false) }}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              onKeyDown={e => e.key === 'Enter' && handleChange()}
            />
          </div>
          <button
            onClick={handleChange}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}
