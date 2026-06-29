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

export function parseWristband(text: string): WristbandOcr | null {
  const hnMatch = text.match(/HN\s*[:：]\s*(\d{4,10})/i)
  if (!hnMatch) return null
  const hn = hnMatch[1]
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const nameLine = lines.find(l =>
    l.length > 3 &&
    !l.match(/HN|AN|วันเกิด|หอผู้ป่วย|\d{2}\/\d{2}|\d{5,}/)
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
