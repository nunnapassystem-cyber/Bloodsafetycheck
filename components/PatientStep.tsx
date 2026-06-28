'use client'
import { useState } from 'react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { AlertBanner } from '@/components/AlertBanner'
import { parseBarcodeWristband } from '@/lib/barcode'
import type { usePatientSession } from '@/hooks/usePatientSession'

const ABO_GROUPS = ['A', 'B', 'O', 'AB'] as const
const RH_OPTIONS = ['Positive', 'Negative'] as const
const COMPONENTS = ['PRC', 'FFP', 'Platelet', 'WB'] as const

interface Props { session: ReturnType<typeof usePatientSession> }

export function PatientStep({ session }: Props) {
  const [scannedHN, setScannedHN] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [abo, setAbo] = useState('')
  const [rh, setRh] = useState('')
  const [component, setComponent] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function handleWristbandScan(raw: string) {
    setScanError(null)
    const parsed = parseBarcodeWristband(raw)
    if (!parsed) { setScanError('รูปแบบ Barcode ไม่ถูกต้อง — กรุณาลองใหม่'); return }
    setScannedHN(parsed.wristbandId)
    if (parsed.name) setPatientName(parsed.name)
    setFormError(null)
  }

  function handleConfirm() {
    if (!scannedHN) { setFormError('กรุณา Scan ป้ายข้อมือก่อน'); return }
    if (!patientName.trim()) { setFormError('กรุณากรอกชื่อผู้ป่วย'); return }
    if (!abo) { setFormError('กรุณาเลือกหมู่เลือด (ABO)'); return }
    if (!rh) { setFormError('กรุณาเลือก Rh'); return }
    if (!component) { setFormError('กรุณาเลือกชนิดเลือดที่สั่ง'); return }

    const bloodGroup = abo + (rh === 'Positive' ? '+' : '-')
    session.setPatientData({ wristbandId: scannedHN, name: patientName.trim() })
    session.setPatientBloodGroup(bloodGroup)
    session.setOrderedComponent(component)
    session.nextStep()
  }

  return (
    <div className="space-y-4">
      <BarcodeScanner onScan={handleWristbandScan} label="Scan ป้ายข้อมือ" />
      {scanError && <AlertBanner type="warning" title={scanError} />}

      {scannedHN && (
        <div className="border border-primary rounded-lg overflow-hidden">
          <div className="bg-primary-light px-4 py-2 border-b border-primary">
            <span className="text-xs font-medium text-primary">ข้อมูลจาก Order แพทย์</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">HN</span>
              <span className="font-mono text-sm font-semibold text-gray-900">{scannedHN}</span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ชื่อ-สกุล ผู้ป่วย</label>
              <input
                type="text"
                value={patientName}
                onChange={e => { setPatientName(e.target.value); setFormError(null) }}
                placeholder="ชื่อ-สกุล ตามป้ายข้อมือ / ใบสั่งเลือด..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">หมู่เลือด (ABO)</label>
                <select
                  value={abo}
                  onChange={e => { setAbo(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                >
                  <option value="">เลือก...</option>
                  {ABO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Rh</label>
                <select
                  value={rh}
                  onChange={e => { setRh(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">เลือก...</option>
                  {RH_OPTIONS.map(r => (
                    <option key={r} value={r}>{r === 'Positive' ? 'Positive (+)' : 'Negative (-)'}</option>
                  ))}
                </select>
              </div>
            </div>

            {abo && rh && (
              <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                <span className="text-xs font-medium text-gray-500">Blood Group รวม</span>
                <span className="font-mono text-base font-semibold text-primary">
                  {abo}{rh === 'Positive' ? '+' : '-'}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ชนิดเลือดที่สั่ง (Component)</label>
              <select
                value={component}
                onChange={e => { setComponent(e.target.value); setFormError(null) }}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">เลือกชนิด...</option>
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {formError && <AlertBanner type="warning" title={formError} />}

            <button
              onClick={handleConfirm}
              className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
            >
              ยืนยัน → Scan ถุงเลือด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
