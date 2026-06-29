'use client'
import { useRef, useState } from 'react'
import { parseWristband, parseBloodBag } from '@/lib/ocr'
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

// ปรับภาพก่อน OCR: grayscale → Otsu binarization
// Binarization (ขาว/ดำ) ช่วย Tesseract ได้ดีกว่า sharpen เพราะลด noise และ ambiguity
function enhanceForOcr(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const n = w * h

  // 1. Convert to grayscale
  const gray = new Uint8Array(n)
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    gray[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }

  // 2. Otsu's threshold — หา threshold ที่แยก foreground/background ได้ดีที่สุด
  const hist = new Array(256).fill(0)
  for (let p = 0; p < n; p++) hist[gray[p]]++
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, max = 0, thresh = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = n - wB
    if (!wF) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > max) { max = between; thresh = t }
  }

  // 3. Binarize: ตัวอักษร → ดำ (0), พื้นหลัง → ขาว (255)
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    const v = gray[p] >= thresh ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = v
    data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
}

function cropImageToBlob(
  src: string,
  crop: { x: number; y: number; w: number; h: number },
): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const sw = Math.round(img.naturalWidth  * crop.w)
      const sh = Math.round(img.naturalHeight * crop.h)
      const canvas = document.createElement('canvas')
      canvas.width = sw; canvas.height = sh
      canvas.getContext('2d')!.drawImage(
        img,
        Math.round(img.naturalWidth  * crop.x),
        Math.round(img.naturalHeight * crop.y),
        sw, sh, 0, 0, sw, sh,
      )
      canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92)
    }
    img.src = src
  })
}

export function OcrScanner(props: Props) {
  const [dataUrl, setDataUrl]         = useState<string | null>(null)
  const [cropTop, setCropTop]         = useState(0.15)
  const [cropBottom, setCropBottom]   = useState(0.55)
  const [cropLeft, setCropLeft]       = useState(0)
  const [cropRight, setCropRight]     = useState(1)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [rawText, setRawText]         = useState<string | null>(null)
  const [manualHN, setManualHN]       = useState('')
  const [showManual, setShowManual]   = useState(false)
  const inputRef     = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null); setRawText(null); setShowManual(false)
    const d = props.mode === 'wristband'
      ? { top: 0.15, bottom: 0.55, left: 0, right: 1 }
      : { top: 0.28, bottom: 0.73, left: 0, right: 1 }
    setCropTop(d.top); setCropBottom(d.bottom)
    setCropLeft(d.left); setCropRight(d.right)
    const reader = new FileReader()
    reader.onload = () => setDataUrl(reader.result as string)
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleCropConfirm() {
    if (!dataUrl) return
    setDataUrl(null)
    setLoading(true)
    try {
      // Crop only — Vision API ทำ preprocessing เองดีกว่า (ไม่เรียก enhanceForOcr)
      const blob = await cropImageToBlob(dataUrl, {
        x: cropLeft,
        y: cropTop,
        w: cropRight - cropLeft,
        h: cropBottom - cropTop,
      })

      // Convert blob → base64 แล้วส่ง server-side Vision API
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(`OCR Error ${res.status}: ${body.error ?? 'unknown'}`)
        return
      }
      const { text } = await res.json()
      setRawText(text)

      if (props.mode === 'wristband') {
        const result = parseWristband(text)
        if (!result) {
          setError('ไม่พบข้อมูล HN — กรุณาถ่ายใหม่ หรือกรอก HN เอง')
          return
        }
        props.onResult(result.hn, result.name)
      } else {
        props.onResult(parseBloodBag(text))
      }
    } catch {
      setError('อ่านรูปไม่ได้ — กรุณาถ่ายใหม่')
    } finally {
      setLoading(false)
    }
  }

  function handleManualSubmit() {
    if (!manualHN.trim() || props.mode !== 'wristband') return
    props.onResult(manualHN.trim(), '')
    setManualHN(''); setShowManual(false); setError(null); setRawText(null)
  }

  const isProcessing = loading
  const isCropping   = dataUrl !== null && !isProcessing

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

      {/* ── Idle ── */}
      {!isProcessing && !isCropping && !showManual && (
        <button
          onClick={() => { setError(null); setRawText(null); inputRef.current?.click() }}
          className="w-full bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
        >
          📷 {LABEL[props.mode]}
        </button>
      )}

      {/* ── Crop UI ── */}
      {isCropping && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 text-center">
            ลากแถบรอบด้านให้ครอบเฉพาะข้อความ แล้วกด ตกลง
          </p>

          {/* wrapper centers the crop box; inline-block makes container shrink-wrap to img */}
          <div className="text-center">
          <div
            ref={containerRef}
            className="relative select-none overflow-hidden rounded inline-block"
            style={{ touchAction: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUrl} style={{ maxHeight: '55vh', display: 'block', width: 'auto' }} alt="" />

            {/* ── Masks ── */}
            {/* บน */}
            <div className="absolute left-0 right-0 top-0 bg-black/50 pointer-events-none"
                 style={{ height: `${cropTop * 100}%` }} />
            {/* ล่าง */}
            <div className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none"
                 style={{ height: `${(1 - cropBottom) * 100}%` }} />
            {/* ซ้าย (ระหว่าง top–bottom) */}
            <div className="absolute left-0 bg-black/50 pointer-events-none"
                 style={{
                   top: `${cropTop * 100}%`,
                   height: `${(cropBottom - cropTop) * 100}%`,
                   width: `${cropLeft * 100}%`,
                 }} />
            {/* ขวา (ระหว่าง top–bottom) */}
            <div className="absolute right-0 bg-black/50 pointer-events-none"
                 style={{
                   top: `${cropTop * 100}%`,
                   height: `${(cropBottom - cropTop) * 100}%`,
                   width: `${(1 - cropRight) * 100}%`,
                 }} />

            {/* กรอบ crop สีฟ้า */}
            <div className="absolute border-2 border-primary pointer-events-none"
                 style={{
                   top:    `${cropTop   * 100}%`,
                   height: `${(cropBottom - cropTop)  * 100}%`,
                   left:   `${cropLeft  * 100}%`,
                   width:  `${(cropRight - cropLeft) * 100}%`,
                 }} />

            {/* ── Handle บน ── */}
            <div className="absolute left-0 right-0 flex items-center justify-center"
                 style={{ top: `calc(${cropTop * 100}% - 16px)`, height: 32, cursor: 'ns-resize' }}
                 onTouchMove={e => {
                   e.preventDefault()
                   const rect = containerRef.current!.getBoundingClientRect()
                   setCropTop(Math.max(0, Math.min(cropBottom - 0.08,
                     (e.touches[0].clientY - rect.top) / rect.height)))
                 }}>
              <div className="w-10 h-2 bg-primary rounded-full opacity-90" />
            </div>

            {/* ── Handle ล่าง ── */}
            <div className="absolute left-0 right-0 flex items-center justify-center"
                 style={{ top: `calc(${cropBottom * 100}% - 16px)`, height: 32, cursor: 'ns-resize' }}
                 onTouchMove={e => {
                   e.preventDefault()
                   const rect = containerRef.current!.getBoundingClientRect()
                   setCropBottom(Math.max(cropTop + 0.08, Math.min(1,
                     (e.touches[0].clientY - rect.top) / rect.height)))
                 }}>
              <div className="w-10 h-2 bg-primary rounded-full opacity-90" />
            </div>

            {/* ── Handle ซ้าย ── */}
            <div className="absolute top-0 bottom-0 flex items-center justify-center"
                 style={{ left: `calc(${cropLeft * 100}% - 16px)`, width: 32, cursor: 'ew-resize' }}
                 onTouchMove={e => {
                   e.preventDefault()
                   const rect = containerRef.current!.getBoundingClientRect()
                   setCropLeft(Math.max(0, Math.min(cropRight - 0.05,
                     (e.touches[0].clientX - rect.left) / rect.width)))
                 }}>
              <div className="h-10 w-2 bg-primary rounded-full opacity-90" />
            </div>

            {/* ── Handle ขวา ── */}
            <div className="absolute top-0 bottom-0 flex items-center justify-center"
                 style={{ left: `calc(${cropRight * 100}% - 16px)`, width: 32, cursor: 'ew-resize' }}
                 onTouchMove={e => {
                   e.preventDefault()
                   const rect = containerRef.current!.getBoundingClientRect()
                   setCropRight(Math.max(cropLeft + 0.05, Math.min(1,
                     (e.touches[0].clientX - rect.left) / rect.width)))
                 }}>
              <div className="h-10 w-2 bg-primary rounded-full opacity-90" />
            </div>
          </div>
          </div>{/* end centering wrapper */}

          <div className="flex gap-2">
            <button
              onClick={handleCropConfirm}
              className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-3 rounded transition-colors"
            >
              ตกลง อ่านข้อความ
            </button>
            <button
              onClick={() => { setDataUrl(null); inputRef.current?.click() }}
              className="px-4 border border-gray-200 text-sm text-gray-500 py-3 rounded hover:border-gray-400 transition-colors"
            >
              ถ่ายใหม่
            </button>
          </div>
        </div>
      )}

      {/* ── Processing ── */}
      {isProcessing && (
        <div className="border border-primary rounded p-4 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-primary">กำลังวิเคราะห์ภาพ...</p>
        </div>
      )}

      {/* ── Error ── */}
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

      {/* ── Manual HN ── */}
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
