'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/types'

export function Navbar() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setProfile(null); return }
      setProfile({
        id: user.id,
        email: user.email ?? '',
        wardId: user.user_metadata?.ward_id ?? '',
        wardName: user.user_metadata?.ward_name ?? '',
        nurseName: user.user_metadata?.nurse_name ?? user.email ?? '',
        role: user.user_metadata?.role ?? 'nurse',
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setProfile(null); return }
      const user = session.user
      setProfile({
        id: user.id,
        email: user.email ?? '',
        wardId: user.user_metadata?.ward_id ?? '',
        wardName: user.user_metadata?.ward_name ?? '',
        nurseName: user.user_metadata?.nurse_name ?? user.email ?? '',
        role: user.user_metadata?.role ?? 'nurse',
      })
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!profile) return null

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-500">Ward</span>
        <span className="text-sm font-semibold text-primary">{profile.wardName || profile.wardId}</span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-700">{profile.nurseName}</span>
        <span className="text-gray-300">|</span>
        <a href="/audit" className="text-xs font-medium text-gray-500 hover:text-primary transition-colors">
          Audit Log
        </a>
        {profile.role === 'admin' && (
          <a href="/admin" className="text-xs font-medium text-primary hover:text-primary-dark transition-colors">
            Admin
          </a>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="text-xs font-medium text-gray-500 hover:text-danger transition-colors"
      >
        ออกจากระบบ
      </button>
    </nav>
  )
}
