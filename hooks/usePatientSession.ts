'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { BloodBagData, PatientData } from '@/types'

const SESSION_TIMEOUT = 5 * 60 * 1000

export function usePatientSession(onTimeout?: () => void) {
  const [bloodBag, setBloodBagState] = useState<BloodBagData | null>(null)
  const [patientData, setPatientDataState] = useState<PatientData | null>(null)
  const [patientBloodGroup, setPatientBloodGroupState] = useState('')
  const [orderedComponent, setOrderedComponentState] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSession = useCallback(() => {
    setBloodBagState(null)
    setPatientDataState(null)
    setPatientBloodGroupState('')
    setOrderedComponentState('')
    setStep(1)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { clearSession(); onTimeout?.() }, SESSION_TIMEOUT)
  }, [clearSession])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function setBloodBag(bag: BloodBagData) { setBloodBagState(bag); resetTimer() }
  function setPatientData(p: PatientData) { setPatientDataState(p); resetTimer() }
  function setPatientBloodGroup(bg: string) { setPatientBloodGroupState(bg); resetTimer() }
  function setOrderedComponent(c: string) { setOrderedComponentState(c); resetTimer() }
  function nextStep() { setStep(s => (s < 3 ? (s + 1) as 1 | 2 | 3 : 3)); resetTimer() }
  function goBackToStep1() { setStep(1); resetTimer() }
  function nextBag() {
    setBloodBagState(null)
    setPatientBloodGroupState('')
    setOrderedComponentState('')
    setStep(1)
    resetTimer()
  }

  return { bloodBag, patientData, patientBloodGroup, orderedComponent, step, setBloodBag, setPatientData, setPatientBloodGroup, setOrderedComponent, nextStep, goBackToStep1, nextBag, clearSession }
}
