# 13-Files Status in Hospital List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดงสถานะ "ต้องส่ง 13 แฟ้ม" (คอลัมน์ + ป้าย + ตัวกรอง + การ์ดสรุป) ในหน้ารายชื่อ รพ.สต. โดย map จากรหัสสถานพยาบาลในไฟล์ Excel

**Architecture:** เก็บรายชื่อ 81 รพ.สต. ที่ต้องส่ง 13 แฟ้มเป็น static JSON (`src/data/statement13.json`) แล้วในหน้า `HospList.jsx` สร้าง `Set` ของ hcode เพื่อ lookup O(1) ต่อแถว เพิ่มคอลัมน์/ตัวกรอง/การ์ดโดยใช้ pattern เดิมที่มีอยู่ในไฟล์ (helper `badge()`, `<select>` style, summary card map)

**Tech Stack:** React 19, Vite 8, ESLint 9 (ไม่มี unit-test runner — verify ด้วย `npm run lint` + เปิดเบราว์เซอร์ดูจริง ตามแนวทางเดิมของโปรเจกต์)

## Global Constraints

- ห้ามเพิ่ม dependency ใหม่ (ใช้เฉพาะที่มีใน `package.json` เดิม)
- ห้ามเพิ่ม test framework (โปรเจกต์ไม่มี — verify แบบ manual/lint)
- hospcode เก็บเป็น `string` เลขล้วน — เทียบด้วย `String(x)` เสมอ
- คงสไตล์ inline-style เดิมของ `HospList.jsx` (ไม่แยกไฟล์ CSS ใหม่)
- ป้ายสถานะ: ข้อความ `📁 13 แฟ้ม` สีน้ำเงิน `#2563eb`

---

### Task 1: สร้าง data file `statement13.json`

**Files:**
- Create: `src/data/statement13.json`
- Source (scratchpad, มีอยู่แล้วใน session นี้): `C:\Users\MS-10\AppData\Local\Temp\claude\d--01--Project-Hospital-BGS-Dev-Project-BGS-Dashboard-NHIP\9f17d274-dc66-488e-bdc5-b92cec452634\scratchpad\stmt13.tsv`

**Interfaces:**
- Produces: ไฟล์ JSON ที่ default-export เป็น `Array<{ hcode: string, hname: string }>` ความยาว 81 รายการ ไม่มี hcode ซ้ำ

- [ ] **Step 1: สร้าง JSON จาก TSV ต้นทาง**

รันสคริปต์ Node แปลง TSV → JSON (อ่านจาก scratchpad, เขียนลง `src/data/`):

```bash
cd "d:/01. Project Hospital/BGS-Dev-Project/BGS Dashboard NHIP/nhip-dashboard"
node -e '
const fs=require("fs");
const src="C:/Users/MS-10/AppData/Local/Temp/claude/d--01--Project-Hospital-BGS-Dev-Project-BGS-Dashboard-NHIP/9f17d274-dc66-488e-bdc5-b92cec452634/scratchpad/stmt13.tsv";
const lines=fs.readFileSync(src,"utf8").split(/\r?\n/).filter(l=>l.trim());
const arr=lines.map(l=>{const[a,...b]=l.split("\t");return{hcode:a.trim(),hname:b.join("\t").trim()}});
if(arr.length!==81) throw new Error("expected 81 rows, got "+arr.length);
if(new Set(arr.map(x=>x.hcode)).size!==81) throw new Error("duplicate hcode");
fs.writeFileSync("src/data/statement13.json", JSON.stringify(arr,null,2)+"\n","utf8");
console.log("wrote",arr.length,"rows");
'
```

Expected output: `wrote 81 rows`

> **หมายเหตุ (fallback):** ถ้าไฟล์ scratchpad หายไป ให้สร้าง `stmt13.tsv` ใหม่จากข้อมูลใน spec/แชท (81 บรรทัด รูปแบบ `hcode<TAB>hname`) แล้วรันสคริปต์เดิม

- [ ] **Step 2: ตรวจความถูกต้องของไฟล์**

```bash
cd "d:/01. Project Hospital/BGS-Dev-Project/BGS Dashboard NHIP/nhip-dashboard"
node -e 'const d=require("./src/data/statement13.json"); console.log("rows:",d.length,"| first:",d[0].hcode,d[0].hname,"| has942:",d.some(x=>x.hcode==="942"))'
```

Expected output: `rows: 81 | first: 5406 รพ.สต.บ้านห้วยยางดง | has942: true`

- [ ] **Step 3: Commit**

```bash
cd "d:/01. Project Hospital/BGS-Dev-Project/BGS Dashboard NHIP/nhip-dashboard"
git add src/data/statement13.json
git commit -m "feat(data): add statement13 list (รพ.สต. ที่ต้องส่ง 13 แฟ้ม)"
```

---

### Task 2: เพิ่มคอลัมน์ / ตัวกรอง / การ์ดสรุป ใน HospList.jsx

**Files:**
- Modify: `src/pages/HospList.jsx`

**Interfaces:**
- Consumes: `statement13.json` จาก Task 1 (`Array<{hcode,hname}>`)
- Produces: (UI เท่านั้น — ไม่มี export ใหม่)

- [ ] **Step 1: import data + สร้าง Set (บนสุดของไฟล์)**

เพิ่ม import ใต้บรรทัด `import { useState, useMemo } from 'react'`:

```jsx
import statement13 from '../data/statement13.json'
```

เพิ่มค่าคงที่ระดับโมดูล (นอก component ใต้กลุ่ม `const ... COLOR` เดิม):

```jsx
const STMT13_SET = new Set(statement13.map(x => String(x.hcode)))
const mustSend13 = hospcode => STMT13_SET.has(String(hospcode))
```

- [ ] **Step 2: เพิ่ม state ตัวกรอง `filter13`**

ใต้ `const [filterRegion, setFReg] = useState('')` เพิ่ม:

```jsx
  const [filter13, setF13]          = useState('') // '', 'yes', 'no'
```

- [ ] **Step 3: รวม `filter13` เข้าเงื่อนไข `filtered`**

ในบล็อก `const filtered = useMemo(() => { ... })` เพิ่มเงื่อนไขก่อน `return true` (ในลูป `list.filter`):

```jsx
      if (filter13 === 'yes' && !mustSend13(r.hospcode)) return false
      if (filter13 === 'no'  &&  mustSend13(r.hospcode)) return false
```

และเพิ่ม `filter13` เข้า dependency array ของ `useMemo`:

```jsx
  }, [list, search, filterProgress, filterStatus, filterSummary, filterHIS, filterProvince, filterRegion, filter13])
```

- [ ] **Step 4: การ์ดสรุป "ต้องส่ง 13 แฟ้ม"**

ก่อน `return (` เพิ่มค่านับ (memoized):

```jsx
  const stmt13Count = useMemo(() => list.filter(r => mustSend13(r.hospcode)).length, [list])
```

ใน Summary bar array เพิ่ม object ท้ายสุด (ต่อจาก `{ label: 'กรองแล้ว', ... }`):

```jsx
          { label: 'ต้องส่ง 13 แฟ้ม', val: stmt13Count, color: '#2563eb' },
```

- [ ] **Step 5: ตัวกรอง dropdown "13 แฟ้ม"**

หลัง `<select>` ของ `filterHIS` (ก่อนบล็อกปุ่ม "ล้างตัวกรอง") เพิ่ม:

```jsx
        <select value={filter13} onChange={e => { setF13(e.target.value); resetPage() }}
          style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
          <option value="">13 แฟ้ม (ทั้งหมด)</option>
          <option value="yes">เฉพาะที่ต้องส่ง</option>
          <option value="no">เฉพาะที่ไม่ต้องส่ง</option>
        </select>
```

- [ ] **Step 6: รวม `filter13` เข้าปุ่ม/เงื่อนไข "ล้างตัวกรอง"**

แก้เงื่อนไขแสดงปุ่ม (เพิ่ม `|| filter13`):

```jsx
        {(search || filterProgress || filterStatus || filterSummary || filterHIS || filterProvince || filterRegion || filter13) && (
```

แก้ `onClick` ของปุ่มให้รีเซ็ต `filter13` (เพิ่ม `setF13('')`):

```jsx
          <button onClick={() => { setSearch(''); setFP(''); setFS(''); setFSumm(''); setFHIS(''); setFProv(''); setFReg(''); setF13(''); resetPage() }}
```

- [ ] **Step 7: เพิ่มหัวคอลัมน์ "13 แฟ้ม"**

ในอาเรย์หัวตาราง เพิ่ม `'13 แฟ้ม'` ต่อท้าย `'สรุปรายงาน'`:

```jsx
              {['#','รหัส','ชื่อ รพ.สต.','เขต','จังหวัด','อำเภอ','วันที่ติดตั้ง','Progress','สถานะงาน','สรุปรายงาน','13 แฟ้ม','ระบบ HIS เดิม','ผู้ติดตั้ง'].map((h,i) => (
```

- [ ] **Step 8: เพิ่มเซลล์ป้ายในแต่ละแถว**

ในลูป `rows.map(...)` เพิ่ม `<td>` ระหว่างเซลล์ `summary` และ `his`:

```jsx
                <td style={{ padding: '8px 12px' }}>
                  {mustSend13(r.hospcode)
                    ? <span style={{ background: '#2563eb22', color: '#2563eb', border: '1px solid #2563eb55', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>📁 13 แฟ้ม</span>
                    : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
```

- [ ] **Step 9: อัปเดต colSpan ของแถว "ไม่พบข้อมูล"**

เปลี่ยน `colSpan={12}` → `colSpan={13}`:

```jsx
              <tr><td colSpan={13} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
```

- [ ] **Step 10: Lint**

```bash
cd "d:/01. Project Hospital/BGS-Dev-Project/BGS Dashboard NHIP/nhip-dashboard"
npm run lint
```

Expected: ไม่มี error ใหม่จาก `src/pages/HospList.jsx` (คำเตือนเดิมของโปรเจกต์ที่มีอยู่ก่อนแล้วไม่นับ)

- [ ] **Step 11: Verify ในเบราว์เซอร์**

dev server รันอยู่ที่ `http://localhost:5173/nhip-data/` (ถ้าไม่ได้รัน: `npm run dev`)
เปิดเมนู **รายชื่อ รพ.สต.** แล้วตรวจ:
1. มีคอลัมน์ "13 แฟ้ม" — แถวรหัส `5406`, `7177`, `942` ขึ้นป้าย `📁 13 แฟ้ม` สีน้ำเงิน
2. การ์ด "ต้องส่ง 13 แฟ้ม" แสดงเลข `72`
3. เลือกตัวกรอง "เฉพาะที่ต้องส่ง" → การ์ด "กรองแล้ว" = 72 และทุกแถวมีป้าย
4. เลือก "เฉพาะที่ไม่ต้องส่ง" → ทุกแถวเป็น `–`
5. ปุ่ม "ล้างตัวกรอง" รีเซ็ตตัวกรอง 13 แฟ้มด้วย

- [ ] **Step 12: Commit**

```bash
cd "d:/01. Project Hospital/BGS-Dev-Project/BGS Dashboard NHIP/nhip-dashboard"
git add src/pages/HospList.jsx
git commit -m "feat(hosplist): show ต้องส่ง 13 แฟ้ม column, filter, summary card"
```

---

## Self-Review Notes

- **Spec coverage:** data file (§1)→Task 1; mapping (§2)→Task 2 Step 1; คอลัมน์+ป้าย (§3)→Steps 7-9; ตัวกรอง (§4)→Steps 2,3,5,6; การ์ดสรุป (§5)→Step 4. ครบทุกหัวข้อ
- **Verification:** ไม่มี test runner จึง verify ด้วย lint + browser ตามแนวทางเดิมของโปรเจกต์ (สอดคล้อง Global Constraints)
- **Type consistency:** `mustSend13(hospcode)` / `STMT13_SET` ใช้ชื่อเดียวกันทุก step; ป้ายใช้สี `#2563eb` ตรงกับการ์ดและ spec
