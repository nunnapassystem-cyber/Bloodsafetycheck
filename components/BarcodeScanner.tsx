'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onScan: (text: string) => void
  label: string
}

declare class BarcodeDetector {
  constructor(options: { formats: string[] })
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

const FORMATS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'pdf417', 'itf', 'data_matrix', 'aztec']

export function BarcodeScanner({ onScan, label }: Props) {
  const supportsNativeScan = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<BarcodeDetector | null>(null)

  const stopScan = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  function scanLoop() {
    async function detect() {
      if (!videoRef.current || !streamRef.current || !detectorRef.current) return
      if (videoRef.current.readyState >= 2) {
        try {
          const results = await detectorRef.current.detect(videoRef.current)
          if (results.length > 0) { stopScan(); onScan(results[0].rawValue); return }
        } catch {}
      }
      rafRef.current = requestAnimationFrame(detect)
    }
    rafRef.current = requestAnimationFrame(detect)
  }

  async function startScan() {
    setError(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      detectorRef.current = new BarcodeDetector({ formats: FORMATS })
      scanLoop()
    } catch {
      setScanning(false)
      setError('ไม่สามารถเปิดกล้องได้ — กรุณากรอก HN ด้วยมือ')
    }
  }

  useEffect(() => () => stopScan(), [stopScan])

  function handleManualSubmit() {
    if (!manualInput.trim()) return
    onScan(manualInput.trim())
    setManualInput('')
    setManual(false)
  }

  // Manual input view (shared by both iOS and Android fallback)
  if (manual || !supportsNativeScan) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 block">
          กรอก HN จากสติ๊กเกอร์ข้อมือ
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          placeholder="เช่น 0051422"
          className="w-full border border-primary rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded transition-colors disabled:opacity-40"
          >
            ยืนยัน HN
          </button>
          {supportsNativeScan && (
            <button
              onClick={() => { setManual(false); setManualInput('') }}
              className="px-4 border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>
    )
  }

  // Live scan view (Android Chrome / desktop Chrome)
  return (
    <div className="space-y-3">
      {!scanning && (
        <div className="flex gap-2">
          <button
            onClick={startScan}
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

      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  )
}
