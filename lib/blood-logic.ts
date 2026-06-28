export function isBloodGroupMatch(patientBG: string, bagBG: string): boolean {
  return patientBG.trim().toUpperCase() === bagBG.trim().toUpperCase()
}

export function isComponentMatch(ordered: string, bagComponent: string): boolean {
  return ordered === bagComponent
}

export function isExpired(expiryDateISO: string): boolean {
  return new Date(expiryDateISO) < new Date()
}

export function isExpiringSoon(expiryDateISO: string, daysThreshold = 1): boolean {
  const diff = new Date(expiryDateISO).getTime() - Date.now()
  return diff > 0 && diff < daysThreshold * 24 * 60 * 60 * 1000
}
