# PRD — Safe Blood Transfusion System

**Version**: 1.0  
**Design**: Stateless Verification — ไม่จัดเก็บข้อมูลผู้ป่วย (PDPA-safe)  
**Stack**: Next.js 14 + Tailwind + Supabase + Vercel  
**Scope**: Web app, 5 หน้า, Multi-Ward

---

## Navigation & Auth

- Login ด้วย Supabase Auth (Email + Password)
- หลัง Login ระบบ detect `ward_id` และ `role` จาก JWT อัตโนมัติ
- Navbar แสดง: ชื่อ Ward | ชื่อพยาบาลที่ Login | ปุ่ม Logout
- Role `nurse` / `head_nurse` → เห็นเฉพาะ Ward ตัวเอง
- Role `admin` → เห็นทุก Ward + Admin Dashboard

---

## หน้า 1 — Login

### Fields
| Field | Type | Validation |
|---|---|---|
| Email | Text input | Required, email format |
| Password | Password input | Required |

### Behavior
- Login สำเร็จ → redirect ไปหน้า Scan ถุงเลือด (Step 1)
- Login ล้มเหลว → แสดง error "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
- Session หมดอายุ → redirect กลับ Login อัตโนมัติ

---

## หน้า 2 — กระบวนการให้เลือด (Main Flow)

หน้านี้คือหัวใจของระบบ — แสดง 3 Step ตามลำดับ ไม่สามารถข้ามได้

### Step Indicator
- แสดง progress: Step 1 → Step 2 → Step 3
- Step ที่ผ่านแล้วแสดงเป็น ✅
- ไม่สามารถย้อนกลับ Step ที่ผ่านแล้วได้ (ต้องเริ่มใหม่)

---

### STEP 1 — Scan Barcode ถุงเลือด

**Input**: Barcode จากถุงเลือด (Blood Bank)

**การทำงาน**:
1. กดปุ่ม "Scan ถุงเลือด" → เปิดกล้องผ่าน html5-qrcode
2. Scan สำเร็จ → แสดงข้อมูลถุงเลือดทันที
3. ตรวจสอบ Expiry อัตโนมัติ

**ข้อมูลที่แสดงหลัง Scan**:
| Field | แหล่งข้อมูล | หมายเหตุ |
|---|---|---|
| หมายเลขถุงเลือด | Barcode | font-mono |
| ชนิดเลือด (Component) | Barcode | PRC / FFP / Platelet / WB |
| Blood Group | Barcode | แสดง font-mono ตัวใหญ่ สีแดง |
| วันหมดอายุ | Barcode | สีส้มถ้า < 24 ชม. / สีแดงถ้าหมดแล้ว |
| Cross-match result | Barcode | Compatible / Incompatible |

**Validation**:
- ถ้าเลือดหมดอายุ → Alert สีแดง "ถุงเลือดหมดอายุ — ห้ามใช้" + ล็อค Step ถัดไป
- ถ้า Cross-match = Incompatible → Alert สีแดง + ล็อค

**Doctor Order Comparison** (manual):
- แสดงตารางเปรียบเทียบ: ชนิด / Blood Group / จำนวน
- พยาบาลกด "ยืนยันตรงกับ Order" เพื่อไป Step 2

---

### STEP 2 — Scan ป้ายข้อมือผู้ป่วย

**Input**: Barcode จากป้ายข้อมือผู้ป่วย

**Critical**: ต้อง Scan ที่เตียงผู้ป่วย ต่อหน้าผู้ป่วย

**การทำงาน**:
1. กดปุ่ม "Scan ป้ายข้อมือ" → เปิดกล้อง
2. Scan สำเร็จ → แสดงชื่อผู้ป่วยบนหน้าจอ (จาก React State เท่านั้น)
3. พยาบาลอ่านชื่อออกเสียงให้ผู้ป่วยยืนยัน
4. พยาบาลกรอก Blood Group ผู้ป่วย (จากป้ายข้อมือหรือใบ Order)
5. กด "ผู้ป่วยยืนยันแล้ว" เพื่อ Match

**ข้อมูลที่แสดง** (ชั่วคราวใน Session Memory):
| Field | หมายเหตุ |
|---|---|
| ชื่อ-สกุลผู้ป่วย | แสดงตัวใหญ่ชัดเจน อ่านง่าย |
| Wristband ID | font-mono — ใช้บันทึกใน Log |

**ข้อมูลที่พยาบาลกรอก**:
| Field | Type | หมายเหตุ |
|---|---|---|
| Blood Group ผู้ป่วย | Select: A+ / A- / B+ / B- / O+ / O- / AB+ / AB- | Required |

**Auto-Match**:
- ระบบเปรียบเทียบ Blood Group ผู้ป่วย vs Blood Group ถุงเลือด
- ✅ ตรง → แสดง Success + ไป Step 3
- ❌ ไม่ตรง → Alert สีแดง + เสียงเตือน + ล็อคระบบ + บันทึก FAIL Log ทันที

**หมายเหตุ PDPA**:
- ห้าม store ชื่อผู้ป่วยใน Supabase หรือ localStorage
- ข้อมูลอยู่ใน React State เท่านั้น ล้างหลัง Step 3 เสมอ

---

### STEP 3 — 2-Nurse Confirmation

**จุดประสงค์**: บันทึกว่าพยาบาล 2 คนยืนยันร่วมกัน

**Fields**:
| Field | Type | Validation |
|---|---|---|
| ชื่อพยาบาลคนที่ 1 | Auto-fill จาก Login | Read-only |
| ชื่อพยาบาลคนที่ 2 | Text input | Required, ห้ามซ้ำกับคนที่ 1 |

**Summary ก่อนยืนยัน** (แสดงครบ):
- ชื่อผู้ป่วย (จาก Session)
- Blood Group ผู้ป่วย vs Blood Group ถุงเลือด
- ชนิดเลือด / หมายเลขถุง / วันหมดอายุ
- ผลการ Match: ✅ PASS

**ปุ่มยืนยัน**: "ยืนยันเริ่มให้เลือด — บันทึกเวลา"

**หลังยืนยัน**:
1. บันทึก Audit Log ใน Supabase (Non-PII เท่านั้น)
2. แสดง Success: "บันทึกสำเร็จ — เริ่มให้เลือด HH:MM:SS"
3. ล้าง Patient Session ทันที
4. ปุ่ม "เริ่มผู้ป่วยรายต่อไป" → กลับ Step 1

---

## หน้า 3 — Audit Log (Ward)

**สิทธิ์**: nurse, head_nurse, admin (เห็นเฉพาะ Ward ตัวเอง ยกเว้น admin)

### Filter Bar
- Date picker: วันที่ (default: วันนี้)
- Filter: ทั้งหมด / PASS / FAIL
- Counter: "ทั้งหมด X รายการ"

### ตาราง Log
| Column | แหล่งข้อมูล | หมายเหตุ |
|---|---|---|
| เวลา | started_at | HH:MM:SS |
| Wristband ID | wristband_id | font-mono |
| ถุงเลือด | blood_bag_id | font-mono |
| ชนิด | blood_component | |
| Blood Group | blood_group_bag | font-mono |
| ผลการ Match | match_result | Badge: ✅ PASS (สีเขียว) / ❌ FAIL (สีแดง) |
| เหตุผล (FAIL) | alert_reason | แสดงเฉพาะกรณี FAIL |
| พยาบาล 1 | nurse_1_name | |
| พยาบาล 2 | nurse_2_name | |

### Export
- ปุ่ม "Export Excel" → ดาวน์โหลด .xlsx ตาม filter ปัจจุบัน
- ใช้ SheetJS library

---

## หน้า 4 — Admin Dashboard

**สิทธิ์**: admin เท่านั้น

### KPI Cards (แถวบนสุด)
| Card | ค่า |
|---|---|
| รายการวันนี้ (ทั้งหมด) | count(today) |
| PASS | count(match_result=PASS, today) |
| FAIL / Alert | count(match_result=FAIL, today) — สีแดง |
| จำนวน Ward ที่ใช้งาน | count(distinct ward_id, today) |

### กราฟ
- Bar chart: จำนวน PASS vs FAIL แยกตาม Ward (ใช้ Recharts)
- Line chart: แนวโน้ม 30 วัน (PASS/FAIL)

### ตาราง Log รวมทุก Ward
- เหมือนหน้า Audit Log แต่มีคอลัมน์ Ward เพิ่ม
- Filter เพิ่ม: Ward dropdown

### การแจ้งเตือน
- ถ้ามี FAIL ใหม่ → แสดง Banner แดงบนสุด: "⚠️ มี Alert ใน Ward [ชื่อ Ward] — HH:MM:SS"
- ใช้ Supabase Realtime สำหรับ live update

---

## หน้า 5 — Login (ดูหน้า 1)

---

## Edge Cases

| กรณี | พฤติกรรม |
|---|---|
| Scan ล้มเหลว (กล้องไม่ชัด) | แสดงปุ่ม "กรอกรหัสด้วยมือ" (manual input) |
| ถุงเลือดหมดอายุ | Alert สีแดง ล็อค ไม่ให้ไป Step 2 |
| Blood Group ไม่ตรง | Alert + เสียง + ล็อค + บันทึก FAIL Log ทันที |
| พยาบาล 2 คนชื่อเดียวกัน | Error "ต้องเป็นพยาบาลคนละคน" |
| Session หมดอายุ 5 นาที | ล้าง Patient State อัตโนมัติ + แสดง toast warning |
| ไม่มีสัญญาณ internet ชั่วคราว | แสดง banner "ไม่มีการเชื่อมต่อ — กรุณาตรวจสอบ Wi-Fi" |
| Scan Barcode ซ้ำ (ถุงเดิม) | Warning "ถุงเลือดนี้ถูกใช้แล้ว — ตรวจสอบก่อนดำเนินการต่อ" |

---

## Rollout Plan

| Phase | Ward | ระยะเวลา |
|---|---|---|
| Pilot | ศัลยกรรมชาย | สัปดาห์ที่ 1-6 |
| ประเมินผล | ศัลยกรรมชาย | สัปดาห์ที่ 7-8 |
| ขยาย Phase 1 | อายุรกรรม / สูติกรรม | สัปดาห์ที่ 9-10 |
| ขยายเต็มรูปแบบ | ทุก Ward ที่ต้องการ | สัปดาห์ที่ 11-12 |

การเพิ่ม Ward ใหม่: เพิ่ม user ใน Supabase Auth + กำหนด ward_id → พร้อมใช้ใน 1-2 วัน
