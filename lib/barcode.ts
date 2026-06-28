import type { PatientData } from '@/types'

export function parseBarcodeWristband(raw: string): PatientData | null {
  if (!raw) return null
  const str = raw.trim()
  if (str.includes('|')) {
    const parts = str.split('|')
    const hn = parts[0].replace(/^WB-/i, '').trim()
    const name = parts[1]?.trim() ?? ''
    if (!hn) return null
    return { wristbandId: hn, name }
  }
  const hn = str.replace(/^WB-/i, '').trim()
  if (!hn) return null
  return { wristbandId: hn, name: '' }
}
