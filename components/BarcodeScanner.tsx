'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onScan: (text: string) => void
  label: string
}

export function BarcodeScanner({ onScan, label }: Props) {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const stopScan = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop() } catch {}
      controlsRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    if (!scanning) return
    let cancelled = false

    async function init() {
      if (!videoRef.current) return
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      if (cancelled || !videoRef.current) return
      try {
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              stopScan()
              onScan(result.getText())
            }
          }
        )
        if (!cancelled) {
          controlsRef.current = controls
        } else {
          controls.stop()
        }
      } catch {
        if (!cancelled) {
          setScanning(false)
          setError('ไม่สามารถเปิดกล้องได้ — กรุณากรอกรหัสด้วยมือ')
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (controlsRef.current) {
        try { controlsRef.current.stop() } catch {}
        controlsRef.current = null
      }
    }
  }, [scanning, stopScan, onScan])

  useEffect(() => () => stopScan(), [stopScan])

  function handleManualSubmit() {
    if (!manualInput.trim()) return
    onScan(manualInput.trim())
    setManualInput('')
    setManual(false)
  }

  return (
    <div className="space-y-3">
      {!scanning && !manual && (
        <div className="flex gap-2">
          <button
            onClick={() => { setError(null); setScanning(true) }}
            className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
          >
            {label}
          </button>
          <button
            onClick={() => setManual(true)}
            className="px-3 py-3 border border-gray-200 rounded text-xs text-gray-500 hover:border-gray-400 transition-colors"
          >
            กรอกรหัสด้วยมือ
          </button>
        </div>
      )}

      {scanning && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded border border-gray-200"
            style={{ maxHeight: 360 }}
          />
          <button
            onClick={stopScan}
            className="w-full border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {manual && (
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
      )}

      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  )
}
