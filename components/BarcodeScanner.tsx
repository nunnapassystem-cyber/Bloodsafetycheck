'use client'
import { useEffect, useRef, useState, useId, useCallback } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (text: string) => void
  label: string
}

export function BarcodeScanner({ onScan, label }: Props) {
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const rawId = useId()
  const uid = 'qr' + rawId.replace(/:/g, '')

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    if (!scanning) return
    let cancelled = false

    async function init() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      if (cancelled) return
      try {
        const scanner = new Html5Qrcode(uid, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
        })
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 300, height: 100 } },
          (text: string) => {
            if (!cancelled) { stopScan(); onScan(text) }
          },
          undefined
        )
      } catch {
        if (!cancelled) {
          setScanning(false)
          setError('ไม่สามารถเปิดกล้องได้ — กรุณากรอกรหัสด้วยมือ')
        }
      }
    }

    init()
    return () => { cancelled = true; stopScan() }
  }, [scanning]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopScan() }, [stopScan])

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
          <div id={uid} className="w-full rounded overflow-hidden" />
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
