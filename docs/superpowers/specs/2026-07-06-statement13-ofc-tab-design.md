# เมนู "ส่ง 13 แฟ้ม OFC" — Design

วันที่: 2026-07-06

## เป้าหมาย
เพิ่มแถบเมนูใหม่ในแดชบอร์ด NHIP ชื่อ **"ส่ง 13 แฟ้ม OFC"** แสดงทะเบียนหน่วยบริการ
(รพ.สต.) ที่ต้องส่ง 13 แฟ้ม OFC พร้อมค้นหา/กรองตาม เขต / จังหวัด / อำเภอ / ตำบล

แหล่งข้อมูล: `รายชื่อหน่วยบริการเบิกสิทธิ์ OFC_Hosxp.xlsx` (Sheet1, 81 หน่วยบริการ)

## ขอบเขต
- เป็นเมนู/หน้าใหม่แยกต่างหาก **ไม่แตะ** หน้า "รายชื่อ รพ.สต." เดิม หรือไฟล์ `statement13.json`
- ข้อมูล bundle เป็น static JSON (import) เหมือน `statement13.json`

## องค์ประกอบ

### 1. ไฟล์ข้อมูล — `src/data/statement13ofc.json`
81 records จาก Excel Sheet1 แต่ละ record:
```json
{ "hcode": "6582", "hname": "รพ.สต.หย่วน", "total_txn": 11,
  "tambon": "หย่วน", "amphoe": "เชียงคำ", "province": "พะเยา",
  "region": "เขต 1 เชียงใหม่", "vendor": "Hosxp" }
```
มีสคริปต์ `scripts/gen-statement13ofc.py` ในรีโปสำหรับ regenerate เมื่อ Excel อัปเดต
(map: statement_hcode→hcode, statement_hname→hname, total_txn, ตำบล/แขวง→tambon,
อำเภอ/เขต→amphoe, จังหวัด→province, เขต→region, Software Vendor→vendor)

### 2. หน้าใหม่ — `src/pages/StatementOFC.jsx`
โครงตาม `HospList.jsx` (หน้าตา/สไตล์เดียวกัน):
- **แถบสรุป:** ทั้งหมด · กรองแล้ว
- **ช่องค้นหา:** free-text ครอบคลุม รหัส / ชื่อ / จังหวัด / อำเภอ / ตำบล
- **ดรอปดาวน์กรอง (cascading):** เขต → จังหวัด → อำเภอ → ตำบล (ตัวเลือกของแต่ละชั้น
  แคบลงตามชั้นที่เลือกด้านบน) + โปรแกรม (vendor)
- **ตาราง:** # · รหัส (hcode) · ชื่อสถานพยาบาล (hname) · เขต · จังหวัด · อำเภอ ·
  ตำบล · โปรแกรม (Software Vendor)
- ปุ่ม **ล้างตัวกรอง** + pagination (PAGE_SIZE 50, pattern เดิม)

### 3. ลงทะเบียนเมนู
- `src/components/Sidebar.jsx` → เพิ่ม
  `{ key: 'statementofc', icon: '📁', label: 'ส่ง 13 แฟ้ม OFC', sub: 'Statement OFC' }`
  วางถัดจาก `รายชื่อ รพ.สต.`
- `src/App.jsx` → `import StatementOFC from './pages/StatementOFC'` +
  เพิ่ม `statementofc: StatementOFC` ใน `PAGES`

## Testing / ยืนยันผล
- `npm run build` ผ่าน
- รันแอป: เมนู "ส่ง 13 แฟ้ม OFC" ปรากฏ, คลิกแล้วเห็นทะเบียน 81 รายการ,
  ค้นหา + กรอง เขต/จังหวัด/อำเภอ/ตำบล ทำงาน (cascading), ล้างตัวกรองทำงาน
