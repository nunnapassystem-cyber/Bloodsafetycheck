import { describe, it, expect } from 'vitest'
import { parseBarcodeWristband } from '../barcode'

describe('parseBarcodeWristband', () => {
  it('returns null for empty string', () => {
    expect(parseBarcodeWristband('')).toBeNull()
  })
  it('parses plain HN', () => {
    expect(parseBarcodeWristband('0108858')).toEqual({ wristbandId: '0108858', name: '' })
  })
  it('parses HN|name format', () => {
    expect(parseBarcodeWristband('0108858|นายสมชาย ใจดี')).toEqual({ wristbandId: '0108858', name: 'นายสมชาย ใจดี' })
  })
  it('strips WB- prefix and parses name', () => {
    expect(parseBarcodeWristband('WB-0108858|นายสมชาย ใจดี')).toEqual({ wristbandId: '0108858', name: 'นายสมชาย ใจดี' })
  })
  it('strips WB- prefix from plain HN', () => {
    expect(parseBarcodeWristband('WB-0108858')).toEqual({ wristbandId: '0108858', name: '' })
  })
})
