'use client'
import { useRef, useState } from 'react'

interface Props {
  onScan: (text: string) => void
  label: string
}

export function BarcodeScanner({ onScan, label }: Props) {
  const [processing, setProcessing] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProcessing(true)
    setError(null)

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
      })
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageElement(img)
      onScan(result.getText())
    } catch {
      setError('ไม่พบ Barcode — กรุณาถ่ายใหม่ หรือกรอกรหัสด้วยมือ')
    } finally {
      setProcessing(false)
      URL.revokeObjectURL(url)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleManualSubmit() {
    if (!manualInput.trim()) return
    onScan(manualInput.trim())
    setManualInput('')
    setManual(false)
  }

  if (manual) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          placeholder="กรอกรหัส Barcode..."
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleManualSubmit}
            className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded transition-colors"
          >
            ยืนยัน
          </button>
          <button
            onClick={() => { setManual(false); setManualInput('') }}
            className="px-4 border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input — triggers native camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <div className="flex gap-2">
        <button
          onClick={() => { setError(null); inputRef.current?.click() }}
          disabled={processing}
          className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors disabled:opacity-60"
        >
          {processing ? 'กำลังอ่าน Barcode...' : label}
        </button>
        <button
          onClick={() => { setError(null); setManual(true) }}
          className="px-3 py-3 border border-gray-200 rounded text-xs text-gray-500 hover:border-gray-400 transition-colors"
        >
          กรอกรหัสด้วยมือ
        </button>
      </div>

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
