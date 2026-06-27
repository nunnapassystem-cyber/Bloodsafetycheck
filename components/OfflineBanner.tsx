'use client'
import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setIsOffline(!navigator.onLine)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-warning-light border-b border-warning text-warning px-4 py-2 text-sm font-medium text-center">
      ⚠️ ไม่มีการเชื่อมต่อ — กรุณาตรวจสอบ Wi-Fi
    </div>
  )
}
