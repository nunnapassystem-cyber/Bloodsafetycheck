'use client'
import { useState } from 'react'
import { OcrScanner } from '@/components/OcrScanner'
import { AlertBanner } from '@/components/AlertBanner'
import { isBloodGroupMatch } from '@/lib/blood-logic'
import { playAlert } from '@/lib/audio'
import type { usePatientSession } from '@/hooks/usePatientSession'
import type { BloodBagData } from '@/types'
import type { BloodBagOcr } from '@/lib/ocr'

const ABO_GROUPS = ['A', 'B', 'O', 'AB'] as const
const RH_OPTIONS = ['Positive', 'Negative'] as const
const COMPONENTS = ['PRC', 'LPRC', 'FFP', 'Platelet', 'WB'] as const

interface Props {
  session: ReturnType<typeof usePatientSession>
  nurse1Name: string
}

function normalizeName(s: string) {
  return s.replace(/\s+/g, '').toLowerCase()
}

export function PatientStep({ session, nurse1Name }: Props) {
  const [wristbandOcr, setWristbandOcr] = useState<{ hn: string; name: string } | null>(null)
  const [bloodBagOcr, setBloodBagOcr]   = useState<BloodBagOcr | null>(null)

  const [patientName, setPatientName]           = useState('')
  const [patABO, setPatABO]                     = useState('')
  const [patRh, setPatRh]                       = useState('')
  const [orderedComponent, setOrderedComponent] = useState('')
  const [bagComponent, setBagComponent]         = useState('')
  const [bagABO, setBagABO]                     = useState('')
  const [bagRh, setBagRh]                       = useState('')
  const [bagBarcode, setBagBarcode]             = useState('')
  const [volumeMl, setVolumeMl]                 = useState('')

  const [hnMismatch, setHnMismatch]   = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [bgFail, setBgFail]           = useState(false)
  const [bgFailReason, setBgFailReason] = useState('')

  // ── computed ──
  const hnMatch = wristbandOcr && bloodBagOcr
    ? !bloodBagOcr.patientHN || bloodBagOcr.patientHN === wristbandOcr.hn
    : true
  const nameMatch = wristbandOcr && bloodBagOcr
    ? normalizeName(wristbandOcr.name) === normalizeName(bloodBagOcr.patientName ?? '')
    : true

  function handleBagOcrResult(d: BloodBagOcr) {
    setBloodBagOcr(d)
    if (d.patientHN && wristbandOcr && d.patientHN !== wristbandOcr.hn) {
      playAlert()
      setHnMismatch(true)
      return
    }
    setHnMismatch(false)
    if (d.bagId)    setBagBarcode(d.bagId)
    if (d.component) setBagComponent(d.component)
    if (d.abo)      setBagABO(d.abo)
    if (d.rh)       setBagRh(d.rh)
    if (d.volumeMl) setVolumeMl(String(d.volumeMl))
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
    const bagBG     = bagABO + (bagRh === 'Positive' ? '+' : '-')
    const bgOk   = isBloodGroupMatch(patientBG, bagBG)
    const compOk = orderedComponent === bagComponent

    if (!bgOk || !compOk) {
      playAlert()
      const reasons: string[] = []
      if (!bgOk)   reasons.push(`Blood Group ไม่ตรง: ผู้ป่วย ${patientBG} / ถุงเลือด ${bagBG}`)
      if (!compOk) reasons.push(`ชนิดเลือดไม่ตรง: สั่ง ${orderedComponent} / ถุงเลือด ${bagComponent}`)
      const reason = reasons.join(' | ')
      setBgFail(true); setBgFailReason(reason)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: wristbandOcr?.hn ?? '',
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
    session.setPatientData({ wristbandId: wristbandOcr?.hn ?? '', name: patientName.trim() })
    session.setPatientBloodGroup(patientBG)
    session.setOrderedComponent(orderedComponent)
    session.setBloodBag(bag)
    session.nextStep()
  }

  function handleReset() {
    session.clearSession()
    setWristbandOcr(null); setBloodBagOcr(null)
    setPatientName(''); setPatABO(''); setPatRh('')
    setBagABO(''); setBagRh(''); setOrderedComponent('')
    setBagComponent(''); setBagBarcode(''); setVolumeMl('')
    setHnMismatch(false); setFormError(null)
    setBgFail(false); setBgFailReason('')
  }

  // ── helper row ──
  function ResultRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
    if (!value) return null
    return (
      <div className="flex justify-between items-center py-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''} text-gray-900`}>{value}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── FAIL alert ── */}
      {bgFail && (
        <div className="space-y-3">
          <AlertBanner type="danger" title="ไม่ตรง — ห้ามให้เลือด" message={bgFailReason} />
          <button onClick={handleReset}
                  className="w-full border border-gray-200 text-sm text-gray-600 py-2 rounded hover:border-gray-400 transition-colors">
            ล้างข้อมูล เริ่มใหม่
          </button>
        </div>
      )}

      {!bgFail && (
        <div className="space-y-4">

          {/* ══ Section ก: สติ๊กเกอร์ข้อมือ ══ */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ก. สติ๊กเกอร์ข้อมือ</p>

            {!wristbandOcr ? (
              <OcrScanner
                mode="wristband"
                onResult={(hn, name) => {
                  setWristbandOcr({ hn, name })
                  if (name) setPatientName(name)
                }}
              />
            ) : (
              <div className="border border-primary rounded-lg overflow-hidden">
                <div className="bg-primary-light px-3 py-2 border-b border-primary flex justify-between items-center">
                  <span className="text-xs font-medium text-primary">ผลจากสติ๊กเกอร์ข้อมือ</span>
                  <button
                    onClick={() => { setWristbandOcr(null); setBloodBagOcr(null); setPatientName(''); setHnMismatch(false) }}
                    className="text-xs text-primary underline"
                  >
                    ถ่ายรูปใหม่
                  </button>
                </div>
                <div className="px-3 py-2 divide-y divide-gray-100">
                  <ResultRow label="ชื่อ-สกุล" value={wristbandOcr.name} />
                  <ResultRow label="HN" value={wristbandOcr.hn} mono />
                </div>
              </div>
            )}
          </div>

          {/* ══ Section ข: บัตรคล้องถุงเลือด ══ */}
          {wristbandOcr && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ข. บัตรคล้องถุงเลือด</p>

              {!bloodBagOcr ? (
                <OcrScanner mode="bloodbag" onResult={handleBagOcrResult} />
              ) : (
                <div className="border border-blood rounded-lg overflow-hidden">
                  <div className="bg-danger-light px-3 py-2 border-b border-blood flex justify-between items-center">
                    <span className="text-xs font-medium text-blood">ผลจากบัตรคล้องถุงเลือด</span>
                    <button
                      onClick={() => { setBloodBagOcr(null); setHnMismatch(false); setBagBarcode(''); setBagComponent(''); setBagABO(''); setBagRh(''); setVolumeMl('') }}
                      className="text-xs text-blood underline"
                    >
                      ถ่ายรูปใหม่
                    </button>
                  </div>
                  <div className="px-3 py-2 divide-y divide-gray-100">
                    <ResultRow label="ชื่อ/สกุล"       value={bloodBagOcr.patientName} />
                    <ResultRow label="HN"              value={bloodBagOcr.patientHN} mono />
                    <ResultRow label="ชนิดเลือด"       value={bloodBagOcr.component} mono />
                    <ResultRow label="Blood Gr."       value={bloodBagOcr.abo} mono />
                    <ResultRow label="Rh"              value={bloodBagOcr.rh} mono />
                    <ResultRow label="หมายเลขถุงเลือด" value={bloodBagOcr.bagId} mono />
                    <ResultRow label="ปริมาณ"          value={bloodBagOcr.volumeMl ? `${bloodBagOcr.volumeMl} mL` : null} mono />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ Section ค: สรุปเปรียบเทียบ ══ */}
          {wristbandOcr && bloodBagOcr && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-600">ตรวจสอบข้อมูลที่ตรงกัน</span>
              </div>
              <div className="p-3 space-y-2">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-medium pb-1 border-b border-gray-100">
                  <span></span>
                  <span>สติ๊กเกอร์</span>
                  <span>ถุงเลือด</span>
                </div>

                {/* ชื่อ-สกุล row */}
                <div className="grid grid-cols-3 gap-2 items-start">
                  <span className="text-xs text-gray-500 pt-0.5">ชื่อ-สกุล</span>
                  <span className="text-xs font-medium text-gray-900 break-all">{wristbandOcr.name || '—'}</span>
                  <div className="flex items-start gap-1">
                    <span className="text-xs font-medium text-gray-900 break-all flex-1">{bloodBagOcr.patientName || '—'}</span>
                    <span className={`text-sm flex-shrink-0 ${nameMatch ? 'text-success' : 'text-warning'}`}>
                      {nameMatch ? '✅' : '⚠️'}
                    </span>
                  </div>
                </div>

                {/* HN row */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-xs text-gray-500">HN</span>
                  <span className="text-sm font-mono font-semibold text-gray-900">{wristbandOcr.hn}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono font-semibold text-gray-900 flex-1">{bloodBagOcr.patientHN || '—'}</span>
                    <span className={`text-sm flex-shrink-0 ${hnMatch ? 'text-success' : 'text-danger'}`}>
                      {hnMatch ? '✅' : '❌'}
                    </span>
                  </div>
                </div>

                {!nameMatch && (
                  <p className="text-xs text-warning font-medium">⚠️ ชื่อ-สกุล ต่างกัน — กรุณาตรวจสอบอีกครั้ง</p>
                )}
                {hnMismatch && (
                  <AlertBanner type="danger" title="HN ไม่ตรงกัน — ห้ามให้เลือดถุงนี้" />
                )}
              </div>
            </div>
          )}

          {/* ══ Section ง: Manual Form ══ */}
          {wristbandOcr && bloodBagOcr && !hnMismatch && (
            <div className="border border-primary rounded-lg overflow-hidden">
              <div className="bg-primary-light px-4 py-2 border-b border-primary">
                <span className="text-xs font-medium text-primary">กรอกข้อมูลเพิ่มเติม (จากแบบบันทึกการให้โลหิต)</span>
              </div>
              <div className="p-4 space-y-4">

                <div>
                  <label className="text-xs font-medium text-primary block mb-1">ชื่อ-สกุล ผู้ป่วย</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => { setPatientName(e.target.value); setFormError(null) }}
                    placeholder="ชื่อ-สกุล ผู้ป่วย..."
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-primary block">Blood Group ผู้ป่วย (จากแบบบันทึกการให้โลหิต)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={patABO} onChange={e => { setPatABO(e.target.value); setFormError(null) }}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary">
                      <option value="">ABO...</option>
                      {ABO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={patRh} onChange={e => { setPatRh(e.target.value); setFormError(null) }}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
                      <option value="">Rh...</option>
                      {RH_OPTIONS.map(r => <option key={r} value={r}>{r === 'Positive' ? 'Positive (+)' : 'Negative (-)'}</option>)}
                    </select>
                  </div>
                  {patABO && patRh && (
                    <div className="flex justify-between items-center bg-primary-light rounded px-3 py-2">
                      <span className="text-xs font-medium text-primary">Blood Group ผู้ป่วย</span>
                      <span className="font-mono text-base font-semibold text-primary">{patABO}{patRh === 'Positive' ? '+' : '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-primary block mb-1">ชนิดเลือดที่สั่ง (Order แพทย์)</label>
                  <select value={orderedComponent} onChange={e => { setOrderedComponent(e.target.value); setFormError(null) }}
                          className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
                    <option value="">เลือกชนิด...</option>
                    {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Blood bag fields — auto-filled แต่แก้ไขได้ */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-blood block">Blood Group ถุงเลือด (จากบัตรคล้องถุงเลือด)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={bagABO} onChange={e => { setBagABO(e.target.value); setFormError(null) }}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blood">
                      <option value="">ABO...</option>
                      {ABO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={bagRh} onChange={e => { setBagRh(e.target.value); setFormError(null) }}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blood">
                      <option value="">Rh...</option>
                      {RH_OPTIONS.map(r => <option key={r} value={r}>{r === 'Positive' ? 'Positive (+)' : 'Negative (-)'}</option>)}
                    </select>
                  </div>
                  {bagABO && bagRh && (
                    <div className="flex justify-between items-center bg-danger-light rounded px-3 py-2">
                      <span className="text-xs font-medium text-blood">Blood Group ถุงเลือด</span>
                      <span className="font-mono text-base font-semibold text-blood">{bagABO}{bagRh === 'Positive' ? '+' : '-'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-blood block mb-1">ชนิดเลือดในถุง</label>
                  <select value={bagComponent} onChange={e => { setBagComponent(e.target.value); setFormError(null) }}
                          className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blood">
                    <option value="">เลือกชนิด...</option>
                    {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-blood block mb-1">รหัสถุงเลือด</label>
                  <input type="text" value={bagBarcode}
                         onChange={e => { setBagBarcode(e.target.value); setFormError(null) }}
                         placeholder="รหัสถุงเลือด"
                         className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blood" />
                </div>

                <div>
                  <label className="text-xs font-medium text-blood block mb-1">ปริมาณ (ml)</label>
                  <input type="number" value={volumeMl}
                         onChange={e => { setVolumeMl(e.target.value); setFormError(null) }}
                         placeholder="เช่น 250, 265, 300"
                         min="1"
                         className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blood" />
                </div>

                {formError && <AlertBanner type="warning" title={formError} />}

                <button onClick={handleConfirm}
                        className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors">
                  ยืนยัน → ตรวจสอบ Blood Group + ชนิดเลือด
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
