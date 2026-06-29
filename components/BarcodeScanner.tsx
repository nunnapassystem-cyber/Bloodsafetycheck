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
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = url
      })

      // Draw to canvas at capped size for performance
      const maxDim = 1600
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round((img.naturalWidth || img.width) * scale)
      canvas.height = Math.round((img.naturalHeight || img.height) * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ])

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.PDF_417,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)
      const result = reader.decodeFromCanvas(canvas)
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
