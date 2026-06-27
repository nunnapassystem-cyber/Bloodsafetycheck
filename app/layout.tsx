import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { OfflineBanner } from '@/components/OfflineBanner'

export const metadata: Metadata = {
  title: 'Safe Blood Transfusion System',
  description: 'ระบบตรวจสอบความปลอดภัยการให้เลือด',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-sm text-gray-900 antialiased">
        <Navbar />
        <OfflineBanner />
        <main className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
