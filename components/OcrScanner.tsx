'use client'
import { useRef, useState } from 'react'
import { ocrImage, parseWristband, parseBloodBag } from '@/lib/ocr'
import type { BloodBagOcr } from '@/lib/ocr'

interface WristbandProps {
  mode: 'wristband'
  onResult: (hn: string, name: string) => void
}
interface BloodBagProps {
  mode: 'bloodbag'
  onResult: (data: BloodBagOcr) => void
}
type Props = WristbandProps | BloodBagProps

const LABEL = {
  wristband: 'ถ่ายรูปสติ๊กเกอร์ข้อมือ',
  bloodbag:  'ถ่ายรูปบัตรคล้องถุงเลือด',
}

export function OcrScanner(props: Props) {
  const [progress, setProgress]     = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [rawText, setRawText]       = useState<string | null>(null)
  const [manualHN, setManualHN]     = useState('')
  const [showManual, setShowManual] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setRawText(null)
    setShowManual(false)
    setProgress(0)

    try {
      const text = await ocrImage(file, setProgress)
      setProgress(null)

      if (props.mode === 'wristband') {
        const result = parseWristband(text)
        if (!result) {
          setRawText(text)
          setError('ไม่พบข้อมูล HN — กรุณาถ่ายใหม่ หรือกรอก HN เอง')
          return
        }
        props.onResult(result.hn, result.name)
      } else {
        const result = parseBloodBag(text)
        props.onResult(result)
      }
    } catch {
      setProgress(null)
      setError('อ่านรูปไม่ได้ — กรุณาถ่ายใหม่')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleManualSubmit() {
    if (!manualHN.trim() || props.mode !== 'wristband') return
    props.onResult(manualHN.trim(), '')
    setManualHN('')
    setShowManual(false)
    setError(null)
    setRawText(null)
  }

  const isProcessing = progress !== null

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      {!isProcessing && !showManual && (
        <button
          onClick={() => { setError(null); setRawText(null); inputRef.current?.click() }}
          className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
        >
          📷 {LABEL[props.mode]}
        </button>
      )}

      {isProcessing && (
        <div className="border border-primary rounded p-4 space-y-2">
          <p className="text-xs font-medium text-primary text-center">กำลังอ่านข้อมูล... {progress}%</p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && !showManual && (
        <div className="space-y-2">
          <p className="text-xs text-danger font-medium">{error}</p>
          {rawText && (
            <details className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
              <summary className="cursor-pointer">ข้อความที่ OCR อ่านได้ (กดดู)</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all">{rawText}</pre>
            </details>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setError(null); setRawText(null); inputRef.current?.click() }}
              className="flex-1 border border-danger text-danger text-xs py-2 rounded"
            >
              ถ่ายรูปใหม่
            </button>
            {props.mode === 'wristband' && (
              <button
                onClick={() => setShowManual(true)}
                className="flex-1 border border-gray-300 text-gray-600 text-xs py-2 rounded"
              >
                กรอก HN เอง
              </button>
            )}
          </div>
        </div>
      )}

      {showManual && props.mode === 'wristband' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 block">กรอก HN จากสติ๊กเกอร์ข้อมือ</label>
          <input
            type="text"
            inputMode="numeric"
            value={manualHN}
            onChange={e => setManualHN(e.target.value)}
            placeholder="เช่น 0108858"
            className="w-full border border-primary rounded px-3 py-2 text-sm font-mono focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleManualSubmit}
              disabled={!manualHN.trim()}
              className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded transition-colors disabled:opacity-40"
            >
              ยืนยัน HN
            </button>
            <button
              onClick={() => { setShowManual(false); setError(null); setRawText(null) }}
              className="px-4 border border-gray-200 text-sm text-gray-500 py-2 rounded"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
