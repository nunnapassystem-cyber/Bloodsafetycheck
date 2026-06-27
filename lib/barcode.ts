import type { BloodBagData, PatientData } from '@/types'

const VALID_COMPONENTS = ['PRC', 'FFP', 'Platelet', 'WB'] as const
const VALID_CROSS_MATCH = ['Compatible', 'Incompatible'] as const

export function parseBarcodeBloodBag(raw: string): BloodBagData | null {
  if (!raw) return null
  const parts = raw.split('|')
  if (parts.length !== 5) return null
  const [id, component, bloodGroup, expiryISO, crossMatch] = parts
  if (!VALID_COMPONENTS.includes(component as BloodBagData['component'])) return null
  if (!VALID_CROSS_MATCH.includes(crossMatch as BloodBagData['crossMatch'])) return null
  return {
    id,
    component: component as BloodBagData['component'],
    bloodGroup,
    expiryISO,
    crossMatch: crossMatch as BloodBagData['crossMatch'],
  }
}

export function parseBarcodeWristband(raw: string): PatientData | null {
  if (!raw) return null
  const parts = raw.split('|')
  if (parts.length !== 2) return null
  const [wristbandId, name] = parts
  if (!wristbandId || !name) return null
  return { wristbandId, name }
}
