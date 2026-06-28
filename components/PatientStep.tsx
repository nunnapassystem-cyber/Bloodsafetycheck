'use client'
import { useState } from 'react'
import { BarcodeScanner } from '@/components/BarcodeScanner'
import { AlertBanner } from '@/components/AlertBanner'
import { parseBarcodeWristband } from '@/lib/barcode'
import { isBloodGroupMatch } from '@/lib/blood-logic'
import { playAlert } from '@/lib/audio'
import type { usePatientSession } from '@/hooks/usePatientSession'
import type { BloodBagData } from '@/types'

const ABO_GROUPS = ['A', 'B', 'O', 'AB'] as const
const RH_OPTIONS = ['Positive', 'Negative'] as const
const COMPONENTS = ['PRC', 'LPRC', 'FFP', 'Platelet', 'WB'] as const

interface Props {
  session: ReturnType<typeof usePatientSession>
  nurse1Name: string
}

export function PatientStep({ session, nurse1Name }: Props) {
  const [chartHN, setChartHN] = useState('')
  const [bagBarcode, setBagBarcode] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patABO, setPatABO] = useState('')
  const [patRh, setPatRh] = useState('')
  const [bagABO, setBagABO] = useState('')
  const [bagRh, setBagRh] = useState('')
  const [orderedComponent, setOrderedComponent] = useState('')
  const [bagComponent, setBagComponent] = useState('')
  const [volumeMl, setVolumeMl] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingHN, setEditingHN] = useState(false)
  const [bgFail, setBgFail] = useState(false)
  const [bgFailReason, setBgFailReason] = useState('')

  function handleChartScan(raw: string) {
    setScanError(null)
    const parsed = parseBarcodeWristband(raw)
    if (!parsed) { setScanError('ไม่พบ HN — กรุณาลองใหม่'); return }
    setChartHN(parsed.wristbandId)
    if (parsed.name) setPatientName(parsed.name)
  }

  function handleBagScan(raw: string) {
    const id = raw.trim()
    if (!id) return
    setBagBarcode(id)
  }

  async function handleConfirm() {
    setFormError(null)
    if (!patientName.trim()) { setFormError('กรุณากรอกชื่อผู้ป่วย'); return }
    if (!patABO || !patRh) { setFormError('กรุณาเลือก Blood Group ผู้ป่วย'); return }
    if (!bagABO || !bagRh) { setFormError('กรุณาเลือก Blood Group ถุงเลือด'); return }
    if (!orderedComponent) { setFormError('กรุณาเลือกชนิดเลือดที่สั่ง (Order แพทย์)'); return }
    if (!bagComponent) { setFormError('กรุณาเลือกชนิดเลือดในถุง'); return }
    const vol = parseInt(volumeMl)
    if (!volumeMl || isNaN(vol) || vol < 1) { setFormError('กรุณากรอกปริมาณ (ml) ที่ถูกต้อง'); return }

    const patientBG = patABO + (patRh === 'Positive' ? '+' : '-')
    const bagBG = bagABO + (bagRh === 'Positive' ? '+' : '-')
    const bgOk = isBloodGroupMatch(patientBG, bagBG)
    const compOk = orderedComponent === bagComponent

    if (!bgOk || !compOk) {
      playAlert()
      const reasons: string[] = []
      if (!bgOk) reasons.push(`Blood Group ไม่ตรง: ผู้ป่วย ${patientBG} / ถุงเลือด ${bagBG}`)
      if (!compOk) reasons.push(`ชนิดเลือดไม่ตรง: สั่ง ${orderedComponent} / ถุงเลือด ${bagComponent}`)
      const reason = reasons.join(' | ')
      setBgFail(true)
      setBgFailReason(reason)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: chartHN,
          blood_bag_id: bagBarcode,
          blood_component: bagComponent,
          blood_group_bag: bagBG,
          match_result: 'FAIL',
          alert_reason: reason,
          nurse_1_name: nurse1Name,
          nurse_2_name: '',
          started_at: new Date().toISOString(),
        }),
      })
      return
    }

    const bag: BloodBagData = {
      id: bagBarcode,
      component: bagComponent as BloodBagData['component'],
      bloodGroup: bagBG,
      volumeMl: vol,
    }
    session.setPatientData({ wristbandId: chartHN, name: patientName.trim() })
    session.setPatientBloodGroup(patientBG)
    session.setOrderedComponent(orderedComponent)
    session.setBloodBag(bag)
    session.nextStep()
  }

  function handleReset() {
    session.clearSession()
    setBgFail(false); setBgFailReason('')
    setChartHN(''); setBagBarcode(''); setPatientName('')
    setPatABO(''); setPatRh(''); setBagABO(''); setBagRh('')
    setOrderedComponent(''); setBagComponent(''); setVolumeMl('')
    setFormError(null); setScanError(null); setEditingHN(false)
  }

  return (
    <div className="space-y-4">
      {bgFail && (
        <div className="space-y-3">
          <AlertBanner type="danger" title="ไม่ตรง — ห้ามให้เลือด" message={bgFailReason} />
          <button
            onClick={handleReset}
            className="w-full border border-gray-200 text-sm text-gray-600 py-2 rounded hover:border-gray-400 transition-colors"
          >
            ล้างข้อมูล เริ่มใหม่
          </button>
        </div>
      )}

      {!bgFail && !chartHN && (
        <div className="space-y-3">
          <BarcodeScanner onScan={handleChartScan} label="Scan สติ๊กเกอร์ชาร์ท (ได้ HN + ชื่อ)" />
          {scanError && <AlertBanner type="warning" title={scanError} />}
        </div>
      )}

      {!bgFail && chartHN && !bagBarcode && (
        <div className="space-y-3">
          {editingHN ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={chartHN}
                onChange={e => setChartHN(e.target.value)}
                className="flex-1 border border-primary rounded px-3 py-2 text-sm font-mono focus:outline-none"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') setEditingHN(false) }}
              />
              <button
                onClick={() => setEditingHN(false)}
                className="px-3 py-2 bg-primary text-white text-xs rounded"
              >
                ยืนยัน
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center bg-primary-light border border-primary rounded px-3 py-2">
              <span className="text-xs font-medium text-primary">HN (จากชาร์ท)</span>
              <span className="font-mono text-sm font-semibold text-primary">{chartHN}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setChartHN(''); setPatientName(''); setScanError(null); setEditingHN(false) }}
              className="flex-1 border border-gray-200 text-xs text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
            >
              Scan ใหม่
            </button>
            <button
              onClick={() => setEditingHN(true)}
              className="flex-1 border border-gray-200 text-xs text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
            >
              พิมพ์ HN เอง
            </button>
          </div>
          <BarcodeScanner onScan={handleBagScan} label="Scan ถุงเลือด" />
        </div>
      )}

      {!bgFail && chartHN && bagBarcode && (
        <div className="border border-primary rounded-lg overflow-hidden">
          <div className="bg-primary-light px-4 py-2 border-b border-primary">
            <span className="text-xs font-medium text-primary">ข้อมูลจากแบบบันทึกการให้โลหิต + ถุงเลือด</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">HN (จากชาร์ท)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{chartHN}</span>
                  <button
                    onClick={() => { setChartHN(''); setPatientName(''); setBagBarcode(''); setScanError(null); setEditingHN(false) }}
                    className="text-xs text-primary underline"
                  >
                    Scan ใหม่
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">รหัสถุงเลือด</span>
                <span className="font-mono text-sm font-semibold text-blood">{bagBarcode}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ชื่อ-สกุล ผู้ป่วย (จากแบบบันทึกการให้โลหิต)</label>
              <input
                type="text"
                value={patientName}
                onChange={e => { setPatientName(e.target.value); setFormError(null) }}
                placeholder="ชื่อ-สกุล ผู้ป่วย..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 block">Blood Group ผู้ป่วย (จากแบบบันทึกการให้โลหิต)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={patABO}
                  onChange={e => { setPatABO(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                >
                  <option value="">ABO...</option>
                  {ABO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={patRh}
                  onChange={e => { setPatRh(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Rh...</option>
                  {RH_OPTIONS.map(r => <option key={r} value={r}>{r === 'Positive' ? 'Positive (+)' : 'Negative (-)'}</option>)}
                </select>
              </div>
              {patABO && patRh && (
                <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">Blood Group ผู้ป่วย</span>
                  <span className="font-mono text-base font-semibold text-primary">{patABO}{patRh === 'Positive' ? '+' : '-'}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 block">Blood Group ถุงเลือด (จากป้ายถุงเลือด)</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={bagABO}
                  onChange={e => { setBagABO(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blood"
                >
                  <option value="">ABO...</option>
                  {ABO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={bagRh}
                  onChange={e => { setBagRh(e.target.value); setFormError(null) }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blood"
                >
                  <option value="">Rh...</option>
                  {RH_OPTIONS.map(r => <option key={r} value={r}>{r === 'Positive' ? 'Positive (+)' : 'Negative (-)'}</option>)}
                </select>
              </div>
              {bagABO && bagRh && (
                <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">Blood Group ถุงเลือด</span>
                  <span className="font-mono text-base font-semibold text-blood">{bagABO}{bagRh === 'Positive' ? '+' : '-'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ชนิดเลือดที่สั่ง (Order แพทย์)</label>
              <select
                value={orderedComponent}
                onChange={e => { setOrderedComponent(e.target.value); setFormError(null) }}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">เลือกชนิด...</option>
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ชนิดเลือดในถุง (จากป้ายถุงเลือด)</label>
              <select
                value={bagComponent}
                onChange={e => { setBagComponent(e.target.value); setFormError(null) }}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blood"
              >
                <option value="">เลือกชนิด...</option>
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ปริมาณ (ml)</label>
              <input
                type="number"
                value={volumeMl}
                onChange={e => { setVolumeMl(e.target.value); setFormError(null) }}
                placeholder="เช่น 250, 300, 400"
                min="1"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {formError && <AlertBanner type="warning" title={formError} />}

            <button
              onClick={handleConfirm}
              className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
            >
              ยืนยัน → ตรวจสอบ Blood Group + ชนิดเลือด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
