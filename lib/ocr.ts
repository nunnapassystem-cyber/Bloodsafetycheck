export interface WristbandOcr {
  hn: string
  name: string
}

export interface BloodBagOcr {
  patientHN: string | null
  patientName: string | null
  component: string | null
  abo: string | null
  rh: string | null
  bagId: string | null
  volumeMl: number | null
}

// Wristband sticker format (same across the hospital):
// Line 1: ชื่อ-สกุล  e.g. "พ.จ.อ. วัชระ พลอยงาม"
// Line 2: หอผู้ป่วยXXX
// Line 3: HN : 0108858   AN : A6907480   ← HN always 7 digits
// Line 4: วันเกิด : DD/MM/YYYY อายุ: XX ปี
export function parseWristband(text: string): WristbandOcr | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // HN patterns from most to least specific
  const hnMatch =
    text.match(/HN\s*[:：]\s*(\d{7})/i) ??         // exact: HN : 0108858
    text.match(/H\s*N\s*[:：.]\s*(\d{7})/i) ??     // OCR noise: H N : 0108858
    text.match(/HN\s*[:：]\s*(\d{4,10})/i) ??      // any digit count
    text.match(/H\s*N\s*[:：.]\s*(\d{4,10})/i) ??  // loose + any count
    text.match(/\b(0\d{6})\b/) ??                   // 7-digit starting with 0 (Thai HN pattern)
    text.match(/\b(\d{7})\b/)                        // any 7-digit fallback

  if (!hnMatch) return null
  const hn = hnMatch[1]

  // Name = first line that is not a ward/date/number line
  const nameLine = lines.find(l =>
    l.length > 3 &&
    !l.match(/HN|AN|วันเกิด|หอผู้ป่วย|อายุ|\d{2}\/\d{2}\/\d{2}|\d{5,}/)
  )
  return { hn, name: nameLine ?? '' }
}

export function parseBloodBag(text: string): BloodBagOcr {
  const hn     = text.match(/HN\s*[:：]\s*(\d{4,10})/i)?.[1] ?? null
  const nameM  = text.match(/(?:ชื่อ[^:：\n]{0,6}[:：]\s*)(.+)/)?.[1]?.trim() ?? null
  const comp   = text.match(/\b(LPRC|PRC|FFP|Platelet|WB)\b/i)?.[1]?.toUpperCase() ?? null
  const aboRaw = text.match(/Gr\s*\.?\s*[:：]\s*([ABOO]{1,2})\b/i)?.[1]?.toUpperCase()
  const abo    = aboRaw === 'OO' ? 'O' : (aboRaw ?? null)
  const rhRaw  = text.match(/Rh\s*[:：]\s*(POSITIVE|NEGATIVE)/i)?.[1] ?? null
  const rh     = rhRaw ? (rhRaw.toUpperCase() === 'POSITIVE' ? 'Positive' : 'Negative') : null
  const bagId  = text.match(/ถุงเลือด\s*[:：]\s*([\d.]+)/)?.[1]
    ?? text.match(/\b(\d{10,13})\b/)?.[1]
    ?? null
  const vol    = text.match(/(\d{2,4})\s*mL/i)?.[1]
  return {
    patientHN: hn, patientName: nameM, component: comp, abo, rh, bagId,
    volumeMl: vol ? parseInt(vol) : null,
  }
}

export async function ocrImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('tha+eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100))
      }
    },
  })
  const { data: { text } } = await worker.recognize(file)
  await worker.terminate()
  return text
}
