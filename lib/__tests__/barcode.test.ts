import { describe, it, expect } from 'vitest'
import { parseBarcodeBloodBag, parseBarcodeWristband } from '../barcode'

describe('parseBarcodeBloodBag', () => {
  it('parses a valid blood bag barcode', () => {
    const raw = 'BL-2024-08847|PRC|B+|2025-12-31T00:00:00Z|Compatible'
    expect(parseBarcodeBloodBag(raw)).toEqual({
      id: 'BL-2024-08847',
      component: 'PRC',
      bloodGroup: 'B+',
      expiryISO: '2025-12-31T00:00:00Z',
      crossMatch: 'Compatible',
    })
  })
  it('returns null for invalid format', () => {
    expect(parseBarcodeBloodBag('INVALID')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseBarcodeBloodBag('')).toBeNull()
  })
  it('parses Incompatible cross-match', () => {
    const raw = 'BL-2024-00001|FFP|O-|2025-06-01T00:00:00Z|Incompatible'
    expect(parseBarcodeBloodBag(raw)?.crossMatch).toBe('Incompatible')
  })
})

describe('parseBarcodeWristband', () => {
  it('parses a valid wristband barcode', () => {
    const raw = 'WB-2024-12345|นายสมชาย ใจดี'
    expect(parseBarcodeWristband(raw)).toEqual({
      wristbandId: 'WB-2024-12345',
      name: 'นายสมชาย ใจดี',
    })
  })
  it('returns null for invalid format', () => {
    expect(parseBarcodeWristband('INVALID')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseBarcodeWristband('')).toBeNull()
  })
})
