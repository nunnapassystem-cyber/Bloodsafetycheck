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
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setProgress(0)

    try {
      const text = await ocrImage(file, setProgress)
      setProgress(null)

      if (props.mode === 'wristband') {
        const result = parseWristband(text)
        if (!result) { setError('ไม่พบข้อมูล HN — กรุณาถ่ายใหม่ หรือกรอกเอง'); return }
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

      {!isProcessing && (
        <button
          onClick={() => { setError(null); inputRef.current?.click() }}
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

      {error && (
        <div className="space-y-2">
          <p className="text-xs text-danger font-medium">{error}</p>
          <button
            onClick={() => { setError(null); inputRef.current?.click() }}
            className="w-full border border-danger text-danger text-xs py-2 rounded"
          >
            ถ่ายรูปใหม่
          </button>
        </div>
      )}
    </div>
  )
}
