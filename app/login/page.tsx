'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { WARDS } from '@/lib/wards'

interface NurseOption {
  nurse_name: string
  email: string
}

export default function LoginPage() {
  const [wardId, setWardId] = useState('')
  const [nurses, setNurses] = useState<NurseOption[]>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [nurseLoading, setNurseLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!wardId) { setNurses([]); setSelectedEmail(''); return }
    setNurseLoading(true)
    setSelectedEmail('')
    fetch(`/api/nurses?ward_id=${wardId}`)
      .then(r => r.json())
      .then(data => { setNurses(Array.isArray(data) ? data : []) })
      .catch(() => setNurses([]))
      .finally(() => setNurseLoading(false))
  }, [wardId])

  async function handleLogin() {
    if (!wardId) { setError('กรุณาเลือก Ward ก่อนเข้าระบบ'); return }
    if (!selectedEmail) { setError('กรุณาเลือกชื่อพยาบาล'); return }
    if (!password) { setError('กรุณากรอก Password'); return }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email: selectedEmail, password })
    if (authError) { setLoading(false); setError('ชื่อหรือรหัสผ่านไม่ถูกต้อง'); return }

    const ward = WARDS.find(w => w.id === wardId)!
    await supabase.auth.updateUser({ data: { ward_id: ward.id, ward_name: ward.name } })

    setLoading(false)
    router.push('/scan')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          SRK Safe Blood Transfusion System
        </h1>
        <p className="text-sm text-gray-500 mb-6">ระบบตรวจสอบความปลอดภัยการให้เลือด</p>

        {error && (
          <div className="bg-danger-light border border-danger text-danger text-sm font-medium rounded p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Ward</label>
            <select
              value={wardId}
              onChange={e => { setWardId(e.target.value); setError(null) }}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">เลือก Ward...</option>
              {WARDS.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">ชื่อพยาบาล</label>
            <select
              value={selectedEmail}
              onChange={e => { setSelectedEmail(e.target.value); setError(null) }}
              disabled={!wardId || nurseLoading}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {nurseLoading ? 'กำลังโหลด...' : !wardId ? 'เลือก Ward ก่อน' : 'เลือกชื่อ...'}
              </option>
              {nurses.map(n => (
                <option key={n.email} value={n.email}>{n.nurse_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
