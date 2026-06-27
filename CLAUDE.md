# CLAUDE.md — Safe Blood Transfusion System

## Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS utility classes เท่านั้น
- **Database + Auth**: Supabase (PostgreSQL + Row Level Security)
- **Barcode Scanner**: `html5-qrcode` library (เปิดกล้องผ่าน browser)
- **Deploy**: Vercel (HTTPS อัตโนมัติ — จำเป็นสำหรับ camera access)
- **State**: React useState / useReducer — ห้ามใช้ localStorage สำหรับข้อมูลผู้ป่วย

---

## หลักการ Stateless Design — ห้ามละเมิด

```
ข้อมูลผู้ป่วย (ชื่อ / วันเกิด / Blood Group) อยู่ใน React State เท่านั้น
ห้าม store ใน: localStorage / sessionStorage / Supabase / cookies / URL params
ล้าง State ทันทีหลัง Log ถูกบันทึก (หรือหลัง session timeout 5 นาที)
```

**เหตุผล**: PDPA compliance — ระบบนี้ไม่จัดเก็บข้อมูลสุขภาพส่วนบุคคล

---

## สี (Color Palette) — ห้าม hardcode hex อื่น

| Token | Hex | ใช้สำหรับ |
|---|---|---|
| `primary` | `#185FA5` | ปุ่มหลัก, active state, Wristband scan |
| `primary-dark` | `#0C447C` | hover state |
| `primary-light` | `#D6E8FA` | background Wristband section |
| `danger` | `#A32D2D` | Alert, FAIL, ห้ามให้เลือด |
| `danger-dark` | `#791F1F` | hover danger |
| `danger-light` | `#FADBD8` | background Alert section |
| `success` | `#1A7A4A` | PASS, ✅ ข้อมูลตรงกัน |
| `success-light` | `#D5F0E3` | background success section |
| `warning` | `#B7770D` | คำเตือน, ใกล้หมดอายุ, ขั้นตอนที่ต้องระวัง |
| `warning-light` | `#FDF3DC` | background warning |
| `blood` | `#C0392B` | Blood/ถุงเลือด section เท่านั้น |
| `blood-light` | `#FADBD8` | background Blood section |
| `neutral` | Tailwind `text-gray-500` | label, secondary text |
| `border` | Tailwind `border-gray-200` | border ทุก element |

### Alert Color Rules — สำคัญมาก
```
PASS / ตรง / สำเร็จ  → success (#1A7A4A) + success-light background
FAIL / ไม่ตรง / Alert → danger (#A32D2D) + danger-light background + เสียงเตือน
```
ห้ามใช้สีอื่นสำหรับ Alert — ต้องเห็นชัดเจนในแสงสว่างและแสงน้อย

---

## ฟอนต์ (Typography)
- **Font family**: `font-sans` (Tailwind default)
- ห้ามนำเข้า Google Fonts — ใช้งานบนมือถือใน Ward ต้องโหลดเร็ว
- **Heading**: `text-sm font-medium text-gray-700`
- **Body**: `text-sm text-gray-900`
- **Label**: `text-xs font-medium text-gray-500`
- **Alert text**: `text-base font-semibold` (ต้องอ่านง่ายขณะยืนข้างเตียง)
- **Barcode/ID value**: `font-mono text-sm` — แสดงค่า ID ต้องชัดเจน
- ห้ามใช้ `font-bold` (weight 700) — ใช้ `font-medium` หรือ `font-semibold` สูงสุด

---

## ภาษา (Language Rules)
- UI ภาษาไทยเป็นหลัก
- คงศัพท์อังกฤษไว้: `Blood Group`, `Scan`, `Wristband`, `Audit Log`, `PASS`, `FAIL`, `Alert`, `Session`, `Match`, `Ward`
- แสดง Blood Group format: `B+`, `O-`, `AB+` (ตัวพิมพ์ใหญ่เสมอ, font-mono)
- format วันที่: `DD/MM/YYYY` (พ.ศ. สำหรับแสดงผล, ค.ศ. สำหรับ store)
- format เวลา: `HH:MM:SS` แสดงทุก Transaction

---

## Supabase Schema — ห้ามแก้ไข

```typescript
// ตาราง transfusion_logs — เก็บเฉพาะ Non-PII
interface TransfusionLog {
  id: string              // uuid (auto)
  created_at: string      // timestamptz (auto)
  ward_id: string         // RLS filter key
  wristband_id: string    // Barcode ID ป้ายข้อมือ (ไม่ใช่ชื่อ)
  blood_bag_id: string    // รหัสถุงเลือด
  blood_component: string // PRC | FFP | Platelet | WB
  blood_group_bag: string // A+ | A- | B+ | B- | O+ | O- | AB+ | AB-
  match_result: string    // PASS | FAIL
  alert_reason: string | null  // เหตุผลถ้า FAIL
  nurse_1_name: string
  nurse_2_name: string
  started_at: string      // เวลาเริ่มให้เลือด
}

// ตาราง users (Supabase Auth)
// ward_id เชื่อมกับ transfusion_logs ผ่าน RLS
```

### Row Level Security (RLS) Rules
```sql
-- พยาบาลเห็นเฉพาะ Log ของ Ward ตัวเอง
CREATE POLICY "ward_isolation" ON transfusion_logs
  FOR ALL USING (ward_id = auth.jwt() ->> 'ward_id');

-- Admin เห็นทุก Ward
CREATE POLICY "admin_all" ON transfusion_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

---

## กฎ Component

```
ห้าม                                    อนุญาต
────────────────────────────────────────────────────
localStorage สำหรับข้อมูลผู้ป่วย         React State (clear หลัง log)
alert() / confirm() native browser       Custom modal component
display: none สำหรับ toggle content      Conditional render ด้วย JSX
position: fixed (ยกเว้น Alert banner)    position: sticky (navbar)
hardcode hex color                       Tailwind class หรือ token ด้านบน
<form> tag                               div + onClick handler
ข้ามขั้นตอน 2-Nurse Confirmation         ต้องบันทึกชื่อพยาบาลทั้ง 2 คนเสมอ
```

---

## Session Management — Critical
```javascript
const SESSION_TIMEOUT = 5 * 60 * 1000 // 5 นาที

// หลัง confirm transfusion หรือ session timeout
function clearPatientSession() {
  setPatientName(null)
  setPatientDOB(null)
  setPatientBloodGroup(null)
  setWristbandId(null)
  // ห้าม clear blood bag data — ใช้สำหรับ Audit Log
}
```

---

## Business Logic — ห้ามแก้ไข

### Blood Group Compatibility Check
```javascript
// Simple ABO + Rh check (ไม่ใช่ Cross-match จริง — Cross-match ทำที่ Blood Bank)
function isBloodGroupMatch(patientBG: string, bagBG: string): boolean {
  return patientBG.trim().toUpperCase() === bagBG.trim().toUpperCase()
}
// ถ้า FAIL → alert_reason = `Blood Group ไม่ตรง: ผู้ป่วย ${patientBG} / ถุงเลือด ${bagBG}`
```

### Expiry Check
```javascript
function isExpired(expiryDateISO: string): boolean {
  return new Date(expiryDateISO) < new Date()
}
function isExpiringSoon(expiryDateISO: string, daysThreshold = 1): boolean {
  const diff = new Date(expiryDateISO).getTime() - Date.now()
  return diff > 0 && diff < daysThreshold * 24 * 60 * 60 * 1000
}
```

### Alert Sound
```javascript
// เล่นเสียงเตือนเมื่อ FAIL — ใช้ Web Audio API
function playAlert() {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  osc.frequency.value = 880
  osc.connect(ctx.destination)
  osc.start(); setTimeout(() => osc.stop(), 800)
}
```

---

## Multi-Ward Architecture
- แต่ละ Ward มี `ward_id` ที่ set ตอน Login
- RLS แยกข้อมูลอัตโนมัติ — ไม่ต้อง filter ใน application code
- เพิ่ม Ward ใหม่ = เพิ่ม user ใน Supabase Auth พร้อม `ward_id` ใหม่
- Admin role: `role = 'admin'` ใน JWT — เห็นข้อมูลทุก Ward
