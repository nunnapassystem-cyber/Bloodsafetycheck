import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePatientSession } from '../usePatientSession'

const MOCK_BAG = {
  id: 'BL-001', component: 'PRC' as const, bloodGroup: 'B+',
  expiryISO: '2099-12-31T00:00:00Z', crossMatch: 'Compatible' as const,
}

describe('usePatientSession', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts at step 1 with null data', () => {
    const { result } = renderHook(() => usePatientSession())
    expect(result.current.step).toBe(1)
    expect(result.current.bloodBag).toBeNull()
    expect(result.current.patientData).toBeNull()
  })

  it('advances to step 2 after setBloodBag + nextStep', () => {
    const { result } = renderHook(() => usePatientSession())
    act(() => { result.current.setBloodBag(MOCK_BAG); result.current.nextStep() })
    expect(result.current.step).toBe(2)
  })

  it('clearSession resets step and data to initial state', () => {
    const { result } = renderHook(() => usePatientSession())
    act(() => { result.current.setBloodBag(MOCK_BAG); result.current.nextStep(); result.current.clearSession() })
    expect(result.current.step).toBe(1)
    expect(result.current.bloodBag).toBeNull()
  })

  it('auto-clears after 5-minute inactivity', () => {
    const { result } = renderHook(() => usePatientSession())
    act(() => { result.current.setBloodBag(MOCK_BAG); result.current.nextStep() })
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000 + 100) })
    expect(result.current.step).toBe(1)
    expect(result.current.bloodBag).toBeNull()
  })
})
