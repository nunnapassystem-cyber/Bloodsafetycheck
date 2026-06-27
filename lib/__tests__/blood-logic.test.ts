import { describe, it, expect } from 'vitest'
import { isBloodGroupMatch, isExpired, isExpiringSoon } from '../blood-logic'

describe('isBloodGroupMatch', () => {
  it('returns true when blood groups match exactly', () => {
    expect(isBloodGroupMatch('B+', 'B+')).toBe(true)
  })
  it('returns false when blood groups differ', () => {
    expect(isBloodGroupMatch('A+', 'B+')).toBe(false)
  })
  it('trims whitespace and uppercases before comparing', () => {
    expect(isBloodGroupMatch(' b+ ', 'B+')).toBe(true)
  })
  it('returns false for AB+ vs A+', () => {
    expect(isBloodGroupMatch('AB+', 'A+')).toBe(false)
  })
})

describe('isExpired', () => {
  it('returns true for a past date', () => {
    expect(isExpired('2020-01-01T00:00:00Z')).toBe(true)
  })
  it('returns false for a future date', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(isExpired(future)).toBe(false)
  })
})

describe('isExpiringSoon', () => {
  it('returns true when expiry is within 24 hours', () => {
    const soon = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    expect(isExpiringSoon(soon)).toBe(true)
  })
  it('returns false when expiry is more than 24 hours away', () => {
    const later = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    expect(isExpiringSoon(later)).toBe(false)
  })
  it('returns false when already expired', () => {
    expect(isExpiringSoon('2020-01-01T00:00:00Z')).toBe(false)
  })
})
