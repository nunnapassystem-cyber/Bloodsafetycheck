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

// ── inline editable text row ──
function EditRow({
  label, value, onChange, mono, inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className="flex justify-between items-center py-1.5 gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`text-sm font-semibold ${mono ? 'font-mono' : ''} text-gray-900 text-right bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-primary flex-1 min-w-0`}
      />
    </div>
  )
}

// ── inline editable select row ──
function EditSelectRow({
  label, value, options, onChange, mono, placeholder = '—',
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
  mono?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex justify-between items-center py-1.5 gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`text-sm font-semibold ${mono ? 'font-mono' : ''} text-gray-900 text-right bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-primary flex-1 min-w-0 max-w-[55%]`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function PatientStep({ session, nurse1Name }: Props) {
  const [wristbandOcr, setWristbandOcr] = useState<{ hn: string; name: string } | null>(null)
  const [bloodBagOcr, setBloodBagOcr]   = useState<BloodBagOcr | null>(null)

  // chart fields (manual only)
  const [patABO, setPatABO]             = useState('')
  const [patRh, setPatRh]               = useState('')
  const [orderedComponent, setOrderedComponent] = useState('')

  const [hnMismatch, setHnMismatch]     = useState(false)
  const [formError, setFormError]       = useState<string | null>(null)
  const [bgFail, setBgFail]             = useState(false)
  const [bgFailReason, setBgFailReason] = useState('')

  // ── computed ──
  const hnMatch = wristbandOcr && bloodBagOcr
    ? !bloodBagOcr.patientHN || bloodBagOcr.patientHN === wristbandOcr.hn
    : true
  const nameMatch = wristbandOcr && bloodBagOcr
    ? normalizeName(wristbandOcr.name) === normalizeName(bloodBagOcr.patientName ?? '')
    : true

  // ── mutators ──
  function updateWristband(patch: Partial<{ hn: string; name: string }>) {
    if (!wristbandOcr) return
    const updated = { ...wristbandOcr, ...patch }
    setWristbandOcr(updated)
    if (bloodBagOcr?.patientHN) {
      setHnMismatch(bloodBagOcr.patientHN !== updated.hn)
    }
  }

  function updateBloodBag(patch: Partial<BloodBagOcr>) {
    if (!bloodBagOcr) return
    const updated = { ...bloodBagOcr, ...patch }
    setBloodBagOcr(updated)
    if ('patientHN' in patch && wristbandOcr) {
      setHnMismatch(!!patch.patientHN && patch.patientHN !== wristbandOcr.hn)
    }
  }

  function handleBagOcrResult(d: BloodBagOcr) {
    setBloodBagOcr(d)
    if (d.patientHN && wristbandOcr && d.patientHN !== wristbandOcr.hn) {
      playAlert()
      setHnMismatch(true)
      return
    }
    setHnMismatch(false)
  }

  async function handleConfirm() {
    setFormError(null)
    const whn   = wristbandOcr?.hn?.trim() ?? ''
    const wname = wristbandOcr?.name?.trim() ?? ''
    if (!whn)             { setFormError('กรุณากรอก HN ในสติ๊กเกอร์ข้อมือ'); return }
    if (!patABO || !patRh)    { setFormError('กรุณาเลือก Blood Group ผู้ป่วย'); return }
    if (!orderedComponent)    { setFormError('กรุณาเลือกชนิดเลือดที่สั่ง (Order แพทย์)'); return }
    if (!bloodBagOcr?.abo || !bloodBagOcr?.rh) { setFormError('กรุณาเลือก Blood Group ถุงเลือด (แก้ไขในช่อง ข)'); return }
    if (!bloodBagOcr?.component)               { setFormError('กรุณาเลือกชนิดเลือดในถุง (แก้ไขในช่อง ข)'); return }
    if (!bloodBagOcr?.bagId?.trim())           { setFormError('กรุณากรอกรหัสถุงเลือด (แก้ไขในช่อง ข)'); return }
    const vol = bloodBagOcr.volumeMl ?? 0
    if (vol < 1) { setFormError('กรุณากรอกปริมาณ (mL) ในช่อง ข'); return }

    const patientBG = patABO + (patRh === 'Positive' ? '+' : '-')
    const bagBG     = bloodBagOcr.abo + (bloodBagOcr.rh === 'Positive' ? '+' : '-')
    const bgOk      = isBloodGroupMatch(patientBG, bagBG)
    const compOk    = orderedComponent === bloodBagOcr.component

    if (!bgOk || !compOk) {
      playAlert()
      const reasons: string[] = []
      if (!bgOk)   reasons.push(`Blood Group ไม่ตรง: ผู้ป่วย ${patientBG} / ถุงเลือด ${bagBG}`)
      if (!compOk) reasons.push(`ชนิดเลือดไม่ตรง: สั่ง ${orderedComponent} / ถุงเลือด ${bloodBagOcr.component}`)
      const reason = reasons.join(' | ')
      setBgFail(true); setBgFailReason(reason)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wristband_id: whn,
          blood_bag_id: bloodBagOcr.bagId,
          blood_component: bloodBagOcr.component,
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
      id: bloodBagOcr.bagId!,
      component: bloodBagOcr.component as BloodBagData['component'],
      bloodGroup: bagBG,
      volumeMl: vol,
    }
    session.setPatientData({ wristbandId: whn, name: wname })
    session.setPatientBloodGroup(patientBG)
    session.setOrderedComponent(orderedComponent)
    session.setBloodBag(bag)
    session.nextStep()
  }

  function handleReset() {
    session.clearSession()
    setWristbandOcr(null); setBloodBagOcr(null)
    setPatABO(''); setPatRh(''); setOrderedComponent('')
    setHnMismatch(false); setFormError(null)
    setBgFail(false); setBgFailReason('')
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

          {/* ══ ก. สติ๊กเกอร์ข้อมือ ══ */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ก. สติ๊กเกอร์ข้อมือ</p>
            {!wristbandOcr ? (
              <OcrScanner
                mode="wristband"
                onResult={(hn, name) => setWristbandOcr({ hn, name })}
              />
            ) : (
              <div className="border border-primary rounded-lg overflow-hidden">
                <div className="bg-primary-light px-3 py-2 border-b border-primary flex justify-between items-center">
                  <span className="text-xs font-medium text-primary">ผลจากสติ๊กเกอร์ข้อมือ</span>
                  <button
                    onClick={() => { setWristbandOcr(null); setBloodBagOcr(null); setHnMismatch(false) }}
                    className="text-xs text-primary underline"
                  >
                    ถ่ายรูปใหม่
                  </button>
                </div>
                <div className="px-3 py-1 divide-y divide-gray-100">
                  <EditRow label="ชื่อ-สกุล" value={wristbandOcr.name}
                           onChange={v => updateWristband({ name: v })} />
                  <EditRow label="HN" value={wristbandOcr.hn}
                           onChange={v => updateWristband({ hn: v })} mono inputMode="numeric" />
                </div>
              </div>
            )}
          </div>

          {/* ══ ข. บัตรคล้องถุงเลือด ══ */}
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
                      onClick={() => { setBloodBagOcr(null); setHnMismatch(false) }}
                      className="text-xs text-blood underline"
                    >
                      ถ่ายรูปใหม่
                    </button>
                  </div>
                  <div className="px-3 py-1 divide-y divide-gray-100">
                    <EditRow label="ชื่อ/สกุล"
                             value={bloodBagOcr.patientName ?? ''}
                             onChange={v => updateBloodBag({ patientName: v })} />
                    <EditRow label="HN"
                             value={bloodBagOcr.patientHN ?? ''}
                             onChange={v => updateBloodBag({ patientHN: v })} mono inputMode="numeric" />
                    <EditSelectRow label="ชนิดเลือด"
                                   value={bloodBagOcr.component ?? ''}
                                   options={COMPONENTS}
                                   onChange={v => updateBloodBag({ component: v || null })} mono />
                    <EditSelectRow label="Blood Gr."
                                   value={bloodBagOcr.abo ?? ''}
                                   options={ABO_GROUPS}
                                   onChange={v => updateBloodBag({ abo: v || null })} mono />
                    <EditSelectRow label="Rh"
                                   value={bloodBagOcr.rh ?? ''}
                                   options={RH_OPTIONS}
                                   onChange={v => updateBloodBag({ rh: v || null })} mono />
                    <EditRow label="หมายเลขถุงเลือด"
                             value={bloodBagOcr.bagId ?? ''}
                             onChange={v => updateBloodBag({ bagId: v })} mono />
                    <EditRow label="ปริมาณ (mL)"
                             value={bloodBagOcr.volumeMl ? String(bloodBagOcr.volumeMl) : ''}
                             onChange={v => updateBloodBag({ volumeMl: parseInt(v) || null })}
                             mono inputMode="numeric" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ ค. สรุปเปรียบเทียบ ══ */}
          {wristbandOcr && bloodBagOcr && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-600">ตรวจสอบข้อมูลที่ตรงกัน</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 font-medium pb-1 border-b border-gray-100">
                  <span></span>
                  <span>สติ๊กเกอร์</span>
                  <span>ถุงเลือด</span>
                </div>
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

          {/* ══ ง. กรอกข้อมูลจาก chart ══ */}
          {wristbandOcr && bloodBagOcr && !hnMismatch && (
            <div className="border border-primary rounded-lg overflow-hidden">
              <div className="bg-primary-light px-4 py-2 border-b border-primary">
                <span className="text-xs font-medium text-primary">กรอกข้อมูลจากแบบบันทึกการให้โลหิต</span>
              </div>
              <div className="p-4 space-y-4">

                <div className="space-y-2">
                  <label className="text-xs font-medium text-primary block">Blood Group ผู้ป่วย</label>
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
