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

// Blood bag card format (บัตรคล้องถุงเลือด):
// ชื่อ/สกุล : พ.จ.อ.วัชระ พลอยงาม
// HN : 0108858
// LPRC    Gr. : A    Rh : POSITIVE
// หมายเลขถุงเลือด : 302.69.0.04210
// 265 mL.
export function parseBloodBag(text: string): BloodBagOcr {
  // HN — 7 digits preferred
  const hn =
    text.match(/HN\s*[:：]\s*(\d{7})/i)?.[1] ??
    text.match(/HN\s*[:：]\s*(\d{4,10})/i)?.[1] ??
    null

  // ชื่อ/สกุล : or ชื่อ-สกุล : (up to 8 chars between ชื่อ and :)
  const nameM = text.match(/(?:ชื่อ[^:：\n]{0,8}[:：]\s*)(.+)/)?.[1]?.trim() ?? null

  // ชนิดเลือด: LPRC, PRC, FFP, Platelet, WB
  // ใช้ L\s*P\s*R\s*C เพื่อรับทุกกรณีที่ OCR อาจใส่ space กลาง ("L PRC", "LP RC", "L P R C")
  let comp: string | null = null
  if      (/L\s*D\s*P\s*R\s*C/i.test(text))          comp = 'LDPRC'
  else if (/L\s*D\s*P\s*P\s*C/i.test(text))          comp = 'LDPPC'
  else if (/L\s*P\s*R\s*C[\s-]*N\b/i.test(text))     comp = 'LPRC-N'
  else if (/L\s*P\s*R\s*C/i.test(text))              comp = 'LPRC'
  else if (/L\s*P\s*P\s*C/i.test(text))              comp = 'LPPC'
  else if (/\bCRYO\b|Cryoprecipitate/i.test(text))   comp = 'CRYO'
  else if (/\bFFP\b/i.test(text))                     comp = 'FFP'
  else if (/\bSDP\b/i.test(text))                     comp = 'SDP'
  else if (/\bCRP\b/i.test(text))                     comp = 'CRP'
  else if (/\bPC\b/i.test(text))                      comp = 'PC'
  else if (/\bPRC\b/i.test(text))                     comp = 'PRC'

  // Gr. : A  — blood group ถุงเลือด
  // Fallback 1: "Gr. : A" หรือ "Gr, : A" (OCR อาจอ่าน period เป็น comma)
  // Fallback 2: "A Rh :" — หา ABO ที่อยู่ก่อน Rh เสมอ
  const aboRaw =
    text.match(/Gr\s*[.,]?\s*[:：]\s*([ABO]{1,2})\b/i)?.[1]?.toUpperCase() ??
    text.match(/\b(AB|[ABO])\s+Rh\s*[:：]/i)?.[1]?.toUpperCase() ??
    null
  const abo = aboRaw === 'OO' ? 'O' : (aboRaw ?? null)

  // Rh : POSITIVE — ในกล่องชนิดเลือด มี space ก่อน : (vs "Rh:" ที่ Patient Bl.gr ไม่มี space)
  const rhRaw =
    text.match(/Rh\s+[:：]\s*(POSITIVE|NEGATIVE)/i)?.[1] ??  // "Rh : POSITIVE" (ชนิดเลือด section)
    text.match(/Rh[:：]\s*(POSITIVE|NEGATIVE)/i)?.[1]         // "Rh: POSITIVE" fallback
  const rh = rhRaw ? (rhRaw.toUpperCase() === 'POSITIVE' ? 'Positive' : 'Negative') : null

  // หมายเลขถุงเลือด : 302.69.0.04210  (OCR อาจใส่ space กลางตัวเลข → strip ออก)
  const bagIdRaw =
    text.match(/หมายเลขถุงเลือด\s*[:：]\s*(\d[\d.\s]*\d)/)?.[1] ??
    text.match(/ถุงเลือด\s*[:：]\s*(\d[\d.\s]*\d)/)?.[1] ??
    null
  const bagId = bagIdRaw?.replace(/\s+/g, '') ?? null

  // 265 mL.
  const vol = text.match(/(\d{2,4})\s*mL/i)?.[1]
  return {
    patientHN: hn, patientName: nameM, component: comp, abo, rh, bagId,
    volumeMl: vol ? parseInt(vol) : null,
  }
}

export interface BloodSummaryOcr {
  patientHN: string | null
  patientName: string | null
  component: string | null
  bags: Array<{ id: string; abo: string | null; rh: string | null; volumeMl: number | null }>
}

export function parseBloodSummary(text: string): BloodSummaryOcr {
  const hn =
    text.match(/HN\s*[:：]\s*(\d{7})/i)?.[1] ??
    text.match(/HN\s*[:：]\s*(\d{4,10})/i)?.[1] ??
    null

  const nameM = text.match(/(?:ชื่อ[^:：\n]{0,8}[:：]\s*)(.+)/)?.[1]?.trim() ?? null

  let component: string | null = null
  if      (/L\s*D\s*P\s*R\s*C/i.test(text))        component = 'LDPRC'
  else if (/L\s*D\s*P\s*P\s*C/i.test(text))        component = 'LDPPC'
  else if (/L\s*P\s*R\s*C[\s-]*N\b/i.test(text))   component = 'LPRC-N'
  else if (/L\s*P\s*R\s*C/i.test(text))            component = 'LPRC'
  else if (/L\s*P\s*P\s*C/i.test(text))            component = 'LPPC'
  else if (/\bCRYO\b|Cryoprecipitate/i.test(text)) component = 'CRYO'
  else if (/\bFFP\b/i.test(text))                   component = 'FFP'
  else if (/\bSDP\b/i.test(text))                   component = 'SDP'
  else if (/\bCRP\b/i.test(text))                   component = 'CRP'
  else if (/\bPC\b/i.test(text))                    component = 'PC'
  else if (/\bPRC\b/i.test(text))                   component = 'PRC'

  const bagIdRe = /\b(\d{3}\.\d{2}\.\d\.[\d]+)\b/
  const bags: BloodSummaryOcr['bags'] = []

  for (const line of text.split('\n')) {
    const idMatch = line.match(bagIdRe)
    if (!idMatch) continue
    const id = idMatch[1].replace(/\s+/g, '')

    const aboRhM = line.match(/\b(AB|[ABO])\s*([+\-])/)
    const abo = aboRhM?.[1]?.toUpperCase() ?? null
    const rh  = aboRhM?.[2] === '+' ? 'Positive' : aboRhM?.[2] === '-' ? 'Negative' : null

    const volM = line.match(/(\d{2,4})\s*ml/i)
    const volumeMl = volM ? parseInt(volM[1]) : null

    bags.push({ id, abo, rh, volumeMl })
    if (bags.length >= 10) break
  }

  return { patientHN: hn, patientName: nameM, component, bags }
}

export async function ocrImage(
  file: File,
  onProgress?: (pct: number) => void,
  psm?: number,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('tha+eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100))
      }
    },
  })
  if (psm !== undefined) {
    await worker.setParameters({ tessedit_pageseg_mode: String(psm) as Parameters<typeof worker.setParameters>[0]['tessedit_pageseg_mode'] })
  }
  const { data: { text } } = await worker.recognize(file)
  await worker.terminate()
  return text
}
