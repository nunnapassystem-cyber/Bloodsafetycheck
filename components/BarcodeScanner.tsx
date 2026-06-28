'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

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
  const containerId = `qr-${label.replace(/\s+/g, '-')}`

  async function startScan() {
    setError(null)
    setScanning(true)
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => { stopScan(); onScan(decodedText) },
        undefined
      )
    } catch {
      setScanning(false)
      setError('ไม่สามารถเปิดกล้องได้ — กรุณากรอกรหัสด้วยมือ')
    }
  }

  async function stopScan() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  function handleManualSubmit() {
    if (!manualInput.trim()) return
    onScan(manualInput.trim())
    setManualInput('')
    setManual(false)
  }

  useEffect(() => () => { stopScan() }, [])

  return (
    <div className="space-y-3">
      {!scanning && !manual && (
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
          <div id={containerId} className="w-full rounded overflow-hidden border border-gray-200 min-h-[60vw] max-h-[360px] bg-gray-900" />
          <button onClick={stopScan} className="w-full border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors">
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
            <button onClick={handleManualSubmit} className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2 rounded transition-colors">
              ยืนยัน
            </button>
            <button onClick={() => { setManual(false); setManualInput('') }} className="px-4 border border-gray-200 text-sm text-gray-500 py-2 rounded hover:border-gray-400 transition-colors">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  )
}
